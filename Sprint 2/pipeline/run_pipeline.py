from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

PIPELINE_DIR = Path(__file__).resolve().parent
SPRINT2_ROOT = PIPELINE_DIR.parent
if str(SPRINT2_ROOT) not in sys.path:
    sys.path.insert(0, str(SPRINT2_ROOT))

from pipeline import LOGICAL_TIMESTAMP, RUN_ID, TRANSFORM_VERSION
from pipeline.core import build_manifest, output_checksums, sha256_file, write_json
from pipeline.generate import build_serving_data
from pipeline.privacy import scan_shareable_tree
from pipeline.quality import evaluate_quality


DEFAULT_INPUT = SPRINT2_ROOT / "tests" / "fixtures"
DEFAULT_OUTPUT = PIPELINE_DIR / "output"
WORK_ROOT = PIPELINE_DIR / ".work"


def run(input_dir: Path, output_dir: Path, mode: str = "synthetic") -> dict[str, object]:
    if not input_dir.exists():
        raise FileNotFoundError(f"Input directory does not exist: {input_dir}")
    output_dir.mkdir(parents=True, exist_ok=True)
    generated_names = {
        "manifest.json",
        "quality_report.json",
        "run_log.json",
        "serving_data.json",
        "output_checksums.json",
        "privacy_report.json",
    }
    for name in generated_names:
        (output_dir / name).unlink(missing_ok=True)

    manifest = build_manifest(input_dir, mode)
    quality = evaluate_quality(input_dir)
    run_log = {
        "run_id": RUN_ID,
        "generated_at": LOGICAL_TIMESTAMP,
        "transform_version": TRANSFORM_VERSION,
        "mode": mode,
        "steps": ["manifest", "parse", "quality", "anonymize", "gold", "serving"],
        "source_values_logged": False,
        "status": "completed-local" if mode != "synthetic" else "published-synthetic",
    }
    write_json(output_dir / "manifest.json", manifest)
    write_json(output_dir / "quality_report.json", quality)
    write_json(output_dir / "run_log.json", run_log)
    if mode == "synthetic":
        write_json(output_dir / "serving_data.json", build_serving_data(quality))

    checksums = output_checksums(output_dir)
    write_json(output_dir / "output_checksums.json", checksums)
    privacy = scan_shareable_tree(output_dir, ["FORBIDDEN_ENTITY_TEST"])
    privacy["scanned_path"] = "."
    write_json(output_dir / "privacy_report.json", privacy)
    return {"manifest": manifest, "quality": quality, "privacy": privacy, "checksums": checksums}


def verify(input_dir: Path) -> bool:
    WORK_ROOT.mkdir(parents=True, exist_ok=True)
    first_path = WORK_ROOT / "verify_a"
    second_path = WORK_ROOT / "verify_b"
    run(input_dir, first_path)
    run(input_dir, second_path)
    first_files = {path.name: sha256_file(path) for path in first_path.iterdir() if path.is_file()}
    second_files = {path.name: sha256_file(path) for path in second_path.iterdir() if path.is_file()}
    return first_files == second_files and bool(first_files)


def main() -> int:
    parser = argparse.ArgumentParser(description="Run the deterministic Sprint 2 proof pipeline.")
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--mode", choices=["synthetic", "local-sensitive"], default="synthetic")
    parser.add_argument("--verify", action="store_true")
    parser.add_argument("--check-shareable", type=Path)
    args = parser.parse_args()

    if args.check_shareable:
        result = scan_shareable_tree(args.check_shareable, ["FORBIDDEN_ENTITY_TEST"])
        print(json.dumps(result, sort_keys=True))
        return 0 if result["publication_allowed"] else 1
    if args.verify:
        success = verify(args.input)
        print(json.dumps({"run_id": RUN_ID, "idempotent": success}, sort_keys=True))
        return 0 if success else 1
    result = run(args.input, args.output, args.mode)
    print(json.dumps({"run_id": RUN_ID, "privacy": result["privacy"]["publication_allowed"], "output": str(args.output)}, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
