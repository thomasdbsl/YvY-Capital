from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

from pipeline import LOGICAL_TIMESTAMP, RUN_ID, TRANSFORM_VERSION


def canonical_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=True, indent=2, sort_keys=True) + "\n"


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()


def build_manifest(input_dir: Path, mode: str) -> dict[str, Any]:
    files = []
    for path in sorted(item for item in input_dir.rglob("*") if item.is_file()):
        relative = path.relative_to(input_dir).as_posix()
        files.append(
            {
                "source_alias": f"FIXTURE_{len(files) + 1:02d}",
                "relative_path": relative,
                "bytes": path.stat().st_size,
                "sha256": sha256_file(path),
            }
        )
    return {
        "run_id": RUN_ID,
        "generated_at": LOGICAL_TIMESTAMP,
        "transform_version": TRANSFORM_VERSION,
        "mode": mode,
        "classification": "synthetic-example" if mode == "synthetic" else "local-restricted",
        "files": files,
    }


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(canonical_json(value), encoding="utf-8", newline="\n")


def output_checksums(output_dir: Path) -> dict[str, Any]:
    names = ["manifest.json", "quality_report.json", "run_log.json", "serving_data.json"]
    files = []
    for name in names:
        path = output_dir / name
        if path.exists():
            files.append({"path": name, "sha256": sha256_file(path), "bytes": path.stat().st_size})
    return {"run_id": RUN_ID, "files": files}
