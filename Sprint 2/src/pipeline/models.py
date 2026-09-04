from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Any


@dataclass(frozen=True)
class QualityIssue:
    logical_name: str
    source_row: int | None
    record_ref_hash: str
    rule_id: str
    severity: str
    action: str
    message: str

    @property
    def issue_id(self) -> str:
        return stable_hash(self.logical_name, self.source_row, self.record_ref_hash, self.rule_id)


@dataclass
class PipelineBundle:
    run_id: str
    bundle_sha256: str
    generated_at: str
    manifests: list[dict[str, Any]]
    tables: dict[str, list[dict[str, Any]]]
    issues: list[QualityIssue] = field(default_factory=list)
    quarantine: list[QualityIssue] = field(default_factory=list)
    bronze_record_count: int = 0

    @property
    def blocking_count(self) -> int:
        return sum(issue.severity == "blocking" for issue in self.issues)

    @property
    def warning_count(self) -> int:
        return sum(issue.severity == "warning" for issue in self.issues)

    @property
    def run_blocked(self) -> bool:
        return any(issue.action == "reject_run" for issue in self.issues)

    @property
    def quarantined_count(self) -> int:
        return len(self.quarantine)


@dataclass
class CuratedBundle:
    run_id: str
    tables: dict[str, list[dict[str, Any]]]
    lineage: list[dict[str, Any]]

    @property
    def record_count(self) -> int:
        return sum(len(rows) for rows in self.tables.values())


def stable_hash(*values: object) -> str:
    payload = json.dumps(values, ensure_ascii=True, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def safe_code(prefix: str, *values: object, length: int = 12) -> str:
    return f"{prefix}_{stable_hash(*values)[:length].upper()}"


def json_ready(value: Any) -> Any:
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, dict):
        return {key: json_ready(item) for key, item in value.items()}
    if isinstance(value, list):
        return [json_ready(item) for item in value]
    return value
