from __future__ import annotations

import argparse
import json
import sys
import os
import time
import hashlib
from pathlib import Path

PIPELINE_DIR = Path(__file__).resolve().parent
SRC_ROOT = PIPELINE_DIR.parent
if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

from pipeline.config import DEFAULT_INPUT, DEFAULT_OUTPUT, DEFAULT_SCHEMA, DatabaseConfig
from pipeline.ingest import ingest_sources
from pipeline.models import json_ready
from pipeline.mysql_loader import apply_schema, load_bundle, run_mysql
from pipeline.transform import transform_to_curated
from pipeline.operations import PipelineBusy, atomic_json, event, run_lock
from pipeline.monitoring import PipelineAttempt


def safe_report(source, curated, database_counts=None) -> dict[str, object]:
    return {
        "run_id": source.run_id,
        "bundle_sha256": source.bundle_sha256,
        "generated_at": source.generated_at,
        "classification": "local-restricted",
        "status": "blocked" if source.run_blocked else ("completed_with_quarantine" if source.quarantined_count else ("completed_with_warnings" if source.warning_count else "completed")),
        "source_files": source.manifests,
        "quality": {
            "blocking": source.blocking_count,
            "warnings": source.warning_count,
            "quarantined": source.quarantined_count,
            "issues": [
                {
                    "issue_id": issue.issue_id,
                    "logical_name": issue.logical_name,
                    "source_row": issue.source_row,
                    "record_ref_hash": issue.record_ref_hash,
                    "rule_id": issue.rule_id,
                    "severity": issue.severity,
                    "action": issue.action,
                    "message": issue.message,
                }
                for issue in source.issues
            ],
        },
        "stage_counts": {
            "raw": sum(item["row_count"] for item in source.manifests),
            "bronze": source.bronze_record_count,
            "silver": sum(len(rows) for rows in source.tables.values()),
            "gold": 0 if curated is None else sum(len(curated.tables.get(name, [])) for name in ("gold_allocations", "gold_fund_latest")),
            "serving": 0 if curated is None else sum(len(curated.tables.get(name, [])) for name in ("gold_allocations", "gold_fund_latest")),
            "curated": 0 if curated is None else curated.record_count,
            "lineage": 0 if curated is None else len(curated.lineage),
        },
        "database_counts": database_counts,
    }


def write_report(output_dir: Path, report: dict[str, object]) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    target = output_dir / "sprint3_run_report.json"
    atomic_json(target, json_ready(report))


def main() -> int:
    parser = argparse.ArgumentParser(description="Build the governed Sprint 3 MySQL database from immutable YvY CSV sources.")
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--schema", type=Path, default=DEFAULT_SCHEMA)
    parser.add_argument("--database", default=None)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--skip-schema", action="store_true")
    parser.add_argument("--reset-database", action="store_true")
    args = parser.parse_args()

    started = time.monotonic()
    try:
        config = DatabaseConfig.from_environment(args.database)
        if args.reset_database and not config.database.lower().endswith('_qa'):
            event("configuration", "blocked", error_code="RESET_REQUIRES_QA_DATABASE")
            return 2
        identity = f"{config.host.lower()}:{config.port}:{config.database.lower()}"
        lock_root = Path(os.environ.get("FUNDS_MANAGER_LOCK_DIR", str(PIPELINE_DIR / ".work" / "locks")))
        lock_path = lock_root / (hashlib.sha256(identity.encode()).hexdigest() + ".lock")
        with run_lock(lock_path):
            return execute(args, config, started)
    except PipelineBusy:
        event("pipeline", "blocked", error_code="PIPELINE_BUSY")
        return 3
    except Exception:
        event("pipeline", "failed", error_code="PIPELINE_FAILED",
              duration_ms=round((time.monotonic() - started) * 1000))
        return 2


def execute(args, config: DatabaseConfig, started: float) -> int:
    if not args.dry_run:
        if args.reset_database:
            run_mysql(config, f"DROP DATABASE IF EXISTS `{config.database}`;", select_database=False)
        if not args.skip_schema:
            apply_schema(config, args.schema.resolve())
    with PipelineAttempt(config, enabled=not args.dry_run) as attempt:
        with attempt.stage('ingestion'):
            source = ingest_sources(args.input.resolve())
            attempt.run_id = source.run_id
        for manifest in source.manifests:
            alias = "SRC_" + hashlib.sha256(manifest["logical_name"].encode()).hexdigest()[:12]
            event("source", "observed", run_id=source.run_id,
                  source_alias=alias, source_rows=manifest["row_count"])
        event("validation", "blocked" if source.run_blocked else "completed",
              run_id=source.run_id, quarantined=source.quarantined_count, warnings=source.warning_count)
        with attempt.stage('transformation'):
            curated = None if source.run_blocked else transform_to_curated(source)
        counts = None
        if not args.dry_run:
            with attempt.stage('database_load'):
                counts = load_bundle(config, source, curated)
        with attempt.stage('report'):
            report = safe_report(source, curated, counts)
            write_report(args.output.resolve(), report)
        attempt.finish(report['status'], 'VALIDATION_BLOCKED' if source.run_blocked else None)
    event("pipeline", report["status"], run_id=source.run_id,
          duration_ms=round((time.monotonic() - started) * 1000),
          accepted=0 if curated is None else curated.record_count)
    print(json.dumps({"run_id": source.run_id, "status": report["status"], "database": None if args.dry_run else config.database, "quality": report["quality"] | {"issues": len(source.issues)}}))
    return 1 if source.run_blocked else 0


if __name__ == "__main__":
    raise SystemExit(main())
