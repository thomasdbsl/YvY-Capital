from __future__ import annotations

import csv
import hashlib
import json
from collections import Counter, defaultdict
from datetime import date, datetime, timezone
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any

from pipeline.contracts import CONTRACTS, CONTRACT_VERSION, SourceContract
from pipeline.models import PipelineBundle, QualityIssue, stable_hash

csv.field_size_limit(16 * 1024 * 1024)
TRANSFORM_VERSION = "sprint3-pipeline-v1"


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def parse_boolean(value: str) -> bool:
    normalized = value.strip().lower()
    if normalized in {"true", "1", "yes"}:
        return True
    if normalized in {"false", "0", "no"}:
        return False
    raise ValueError("invalid boolean")


def normalize_row(contract: SourceContract, row: dict[str, str]) -> dict[str, Any]:
    normalized: dict[str, Any] = {}
    for column in contract.columns:
        value = (row.get(column) or "").strip()
        if value == "":
            normalized[column] = None
        elif column in contract.dates:
            normalized[column] = date.fromisoformat(value).isoformat()
        elif column in contract.decimals:
            normalized[column] = Decimal(value)
        elif column in contract.integers:
            normalized[column] = int(value)
        elif column in contract.booleans:
            normalized[column] = parse_boolean(value)
        elif column in contract.json_fields:
            json.loads(value)
            normalized[column] = value
        else:
            normalized[column] = value
    return normalized


def issue(filename: str, row_number: int | None, key: object, rule: str, severity: str, action: str, message: str) -> QualityIssue:
    return QualityIssue(filename, row_number, stable_hash(filename, key), rule, severity, action, message)


def read_contract(input_dir: Path, contract: SourceContract) -> tuple[list[dict[str, Any]], dict[str, Any], list[QualityIssue]]:
    path = input_dir / contract.filename
    if not path.exists():
        manifest = {"logical_name": contract.filename, "byte_size": 0, "modified_at": "1970-01-01T00:00:00Z", "row_count": 0, "sha256": "0" * 64, "contract_version": CONTRACT_VERSION, "status": "missing"}
        return [], manifest, [issue(contract.filename, None, "file", "DQ01", "blocking", "reject_run", "Required source file is missing")]

    digest = sha256_file(path)
    modified_at = datetime.fromtimestamp(path.stat().st_mtime, timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    if path.stat().st_size == 0 and contract.allow_zero_bytes:
        manifest = {"logical_name": contract.filename, "byte_size": 0, "modified_at": modified_at, "row_count": 0, "sha256": digest, "contract_version": CONTRACT_VERSION, "status": "unavailable"}
        return [], manifest, [issue(contract.filename, None, "file", "DQ02", "warning", "review", "Source is unavailable because the supplied file is empty")]

    findings: list[QualityIssue] = []
    accepted: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        actual_columns = tuple(reader.fieldnames or ())
        if actual_columns != contract.columns:
            findings.append(issue(contract.filename, 1, actual_columns, "DQ03", "blocking", "reject_run", "CSV header does not match the source contract"))
            rows = list(reader)
        else:
            rows = list(reader)
            for row_number, raw in enumerate(rows, start=2):
                key = tuple(raw.get(column, "") for column in contract.natural_key) or row_number
                missing = [column for column in contract.required if not (raw.get(column) or "").strip()]
                if missing:
                    findings.append(issue(contract.filename, row_number, key, "DQ04", "blocking", "quarantine", "Required field is missing"))
                    continue
                try:
                    normalized = normalize_row(contract, raw)
                except (ValueError, InvalidOperation, json.JSONDecodeError):
                    findings.append(issue(contract.filename, row_number, key, "DQ05", "blocking", "quarantine", "A typed field cannot be parsed"))
                    continue
                normalized["_source_row"] = row_number
                normalized["_logical_name"] = contract.filename
                accepted.append(normalized)

    if contract.natural_key:
        counts = Counter(tuple(row[column] for column in contract.natural_key) for row in accepted)
        duplicates = {key for key, count in counts.items() if count > 1}
        if duplicates:
            filtered = []
            for row in accepted:
                key = tuple(row[column] for column in contract.natural_key)
                if key in duplicates:
                    findings.append(issue(contract.filename, row["_source_row"], key, "DQ06", "blocking", "quarantine", "Duplicate natural key"))
                else:
                    filtered.append(row)
            accepted = filtered

    manifest = {"logical_name": contract.filename, "byte_size": path.stat().st_size, "modified_at": modified_at, "row_count": len(rows), "sha256": digest, "contract_version": CONTRACT_VERSION, "status": "parsed" if not any(item.severity == "blocking" for item in findings) else "blocked"}
    return accepted, manifest, findings


def validate_domains(tables: dict[str, list[dict[str, Any]]]) -> list[QualityIssue]:
    findings: list[QualityIssue] = []
    invalid_rows: dict[str, set[int]] = defaultdict(set)
    fund_ids = {row["fund_id"] for row in tables["funds.csv"]}
    for filename, rows in tables.items():
        for row in rows:
            if "fund_id" in row and row["fund_id"] not in fund_ids:
                findings.append(issue(filename, row["_source_row"], row.get("fund_id"), "DQ07", "blocking", "quarantine", "Fund reference does not exist"))
                invalid_rows[filename].add(row["_source_row"])

    for row in tables["fund_nav_snapshot.csv"]:
        if row["nav"] <= 0:
            findings.append(issue("fund_nav_snapshot.csv", row["_source_row"], (row["fund_id"], row["snapshot_date"]), "DQ08", "blocking", "quarantine", "NAV must be positive"))
            invalid_rows["fund_nav_snapshot.csv"].add(row["_source_row"])
    for row in tables["returns_navps.csv"]:
        if row["series_type"] not in {"fund", "benchmark"} or row["accrued_return_pct"] <= 0:
            findings.append(issue("returns_navps.csv", row["_source_row"], (row["fund_id"], row["series_type"], row["date"]), "DQ09", "blocking", "quarantine", "Return series type or index is invalid"))
            invalid_rows["returns_navps.csv"].add(row["_source_row"])
    for row in tables["drawdown.csv"]:
        if not Decimal("-1") <= row["drawdown"] <= Decimal("0"):
            findings.append(issue("drawdown.csv", row["_source_row"], (row["fund_id"], row["date"]), "DQ10", "blocking", "quarantine", "Drawdown is outside [-1, 0]"))
            invalid_rows["drawdown.csv"].add(row["_source_row"])
    for row in tables["liquidity_by_horizon.csv"]:
        value = row["nav_percent"]
        if value is not None and not Decimal("0") <= value <= Decimal("1"):
            findings.append(issue("liquidity_by_horizon.csv", row["_source_row"], (row["fund_id"], row["as_of_date"], row["projection_days"]), "DQ11", "blocking", "quarantine", "Liquidity percentage is outside [0, 1]"))
            invalid_rows["liquidity_by_horizon.csv"].add(row["_source_row"])

    for filename, source_rows in invalid_rows.items():
        if source_rows:
            tables[filename] = [row for row in tables[filename] if row["_source_row"] not in source_rows]

    nav = {(row["fund_id"], row["snapshot_date"]): row["nav"] for row in tables["fund_nav_snapshot.csv"]}
    holding_sums: dict[tuple[str, str], Decimal] = defaultdict(Decimal)
    for row in tables["portfolio_holdings.csv"]:
        holding_sums[(row["fund_id"], row["snapshot_date"])] += row["nav_value"]
    invalid_holding_snapshots: dict[tuple[str, str], tuple[str, str]] = {}
    for key, total in holding_sums.items():
        if key not in nav:
            invalid_holding_snapshots[key] = ("DQ12", "Holdings snapshot has no matching NAV")
        elif nav[key] and abs(total - nav[key]) / abs(nav[key]) > Decimal("0.01"):
            invalid_holding_snapshots[key] = ("DQ13", "Holdings do not reconcile to NAV within 1%")

    valid_holdings = []
    for row in tables["portfolio_holdings.csv"]:
        snapshot_key = (row["fund_id"], row["snapshot_date"])
        if snapshot_key in invalid_holding_snapshots:
            rule_id, message = invalid_holding_snapshots[snapshot_key]
            row_key = (*snapshot_key, row["group_identifier"], row["item_id"])
            findings.append(issue("portfolio_holdings.csv", row["_source_row"], row_key, rule_id, "blocking", "quarantine", message))
        else:
            valid_holdings.append(row)
    tables["portfolio_holdings.csv"] = valid_holdings

    holding_keys = {(row["fund_id"], row["snapshot_date"]) for row in tables["portfolio_holdings.csv"]}
    for key in sorted(set(nav) - holding_keys):
        findings.append(issue("portfolio_holdings.csv", None, key, "DQ14", "warning", "review", "NAV snapshot has no holdings; portfolio is unavailable for this date"))
    return findings


def ingest_sources(input_dir: Path) -> PipelineBundle:
    tables: dict[str, list[dict[str, Any]]] = {}
    manifests: list[dict[str, Any]] = []
    findings: list[QualityIssue] = []
    for contract in CONTRACTS:
        rows, manifest, contract_findings = read_contract(input_dir, contract)
        tables[contract.filename] = rows
        manifests.append(manifest)
        findings.extend(contract_findings)
    findings.extend(validate_domains(tables))
    bundle_sha = stable_hash([(item["logical_name"], item["sha256"]) for item in manifests], TRANSFORM_VERSION)
    run_id = f"S3-{bundle_sha[:20].upper()}"
    generated_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    quarantine = [item for item in findings if item.action == "quarantine"]
    return PipelineBundle(run_id, bundle_sha, generated_at, manifests, tables, findings, quarantine)
