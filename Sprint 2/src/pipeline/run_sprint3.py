from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

PIPELINE_DIR = Path(__file__).resolve().parent
SRC_ROOT = PIPELINE_DIR.parent
if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

from pipeline.config import DEFAULT_INPUT, DEFAULT_OUTPUT, DEFAULT_SCHEMA, DatabaseConfig
from pipeline.ingest import ingest_sources
from pipeline.models import json_ready
from pipeline.mysql_loader import apply_schema, load_bundle
from pipeline.transform import transform_to_curated


def safe_report(source, curated, database_counts=None) -> dict[str, object]:
    return {
        "run_id": source.run_id,
        "bundle_sha256": source.bundle_sha256,
        "generated_at": source.generated_at,
        "classification": "local-restricted",
        "status": "blocked" if source.run_blocked else ("completed_with_quarantine" if source.quarantined_count else "completed"),
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
            "silver": sum(len(rows) for rows in source.tables.values()),
            "curated": 0 if curated is None else curated.record_count,
            "lineage": 0 if curated is None else len(curated.lineage),
        },
        "database_counts": database_counts,
    }


def write_report(output_dir: Path, report: dict[str, object]) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    target = output_dir / "sprint3_run_report.json"
    target.write_text(json.dumps(json_ready(report), ensure_ascii=True, indent=2, sort_keys=True) + "\n", encoding="utf-8", newline="\n")


def main() -> int:
    parser = argparse.ArgumentParser(description="Build the governed Sprint 3 MySQL database from immutable YvY CSV sources.")
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--schema", type=Path, default=DEFAULT_SCHEMA)
    parser.add_argument("--database", default=None)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--skip-schema", action="store_true")
    args = parser.parse_args()

    source = ingest_sources(args.input.resolve())
    curated = None if source.run_blocked else transform_to_curated(source)
    counts = None
    if not args.dry_run:
        config = DatabaseConfig.from_environment(args.database)
        if not args.skip_schema:
            apply_schema(config, args.schema.resolve())
        counts = load_bundle(config, source, curated)
    report = safe_report(source, curated, counts)
    write_report(args.output.resolve(), report)
    print(json.dumps({"run_id": source.run_id, "status": report["status"], "database": None if args.dry_run else (args.database or "yvy_funds_manager"), "quality": report["quality"] | {"issues": len(source.issues)}}))
    return 1 if source.run_blocked else 0


if __name__ == "__main__":
    raise SystemExit(main())
