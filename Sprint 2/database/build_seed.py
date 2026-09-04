from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = ROOT / "src" / "pipeline" / "output" / "serving_data.json"
DEFAULT_OUTPUT = Path(__file__).resolve().with_name("seed.sql")

CNPJ_RE = re.compile(r"\b\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}\b")
ISIN_RE = re.compile(r"\b[A-Z]{2}[A-Z0-9]{9}[0-9]\b")


def sql_value(value: Any) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "1" if value else "0"
    if isinstance(value, (int, float)):
        return format(value, ".15g")
    return "'" + str(value).replace("\\", "\\\\").replace("'", "''") + "'"


def insert(table: str, columns: list[str], rows: list[list[Any]]) -> str:
    values = ",\n".join("  (" + ", ".join(sql_value(value) for value in row) + ")" for row in rows)
    return f"INSERT INTO {table} ({', '.join(columns)}) VALUES\n{values};\n"


def validate_fixture(data: dict[str, Any], raw_text: str) -> None:
    meta = data.get("meta", {})
    if meta.get("classification") != "synthetic-example":
        raise ValueError("Seed source must be classified as synthetic-example")
    if meta.get("publication_allowed") is not True:
        raise ValueError("Seed source is not marked as publication_allowed")
    if CNPJ_RE.search(raw_text) or ISIN_RE.search(raw_text):
        raise ValueError("A private identifier pattern was found in the seed source")

    aliases = {
        "fund": (data.get("funds", []), "id", r"FUND_\d{2}"),
        "position": (data.get("positions", []), "id", r"POS_\d{2}"),
        "instrument": (data.get("positions", []), "instrument", r"INSTR_\d{2}"),
        "issuer": (data.get("positions", []), "issuer", r"EMET_\d{2}"),
        "custodian": (data.get("positions", []), "custodian", r"CUSTO_\d{2}"),
        "peer": (data.get("peer_sample", []), "peer_id", r"PEER_\d{2}"),
    }
    for label, (records, field, pattern) in aliases.items():
        invalid = [record.get(field) for record in records if not re.fullmatch(pattern, str(record.get(field, "")))]
        if invalid:
            raise ValueError(f"Unexpected {label} aliases: {invalid}")


def build_seed(data: dict[str, Any]) -> str:
    meta = data["meta"]
    run = data["runs"][0]
    run_id = meta["run_id"]
    chunks = [
        "-- Deterministic seed generated only from the current synthetic dashboard fixture.\n",
        "USE yvy_funds_manager_demo;\n",
        "SET NAMES utf8mb4;\n",
        "SET FOREIGN_KEY_CHECKS = 0;\n",
        "DELETE FROM lineage_proofs;\nDELETE FROM anomalies;\nDELETE FROM peer_samples;\n",
        "DELETE FROM fund_kpis;\nDELETE FROM performance_history;\nDELETE FROM positions;\n",
        "DELETE FROM allocations;\nDELETE FROM funds;\nDELETE FROM dataset_runs;\n",
        "SET FOREIGN_KEY_CHECKS = 1;\nSTART TRANSACTION;\n",
    ]

    chunks.append(insert(
        "dataset_runs",
        ["run_id", "status", "generated_at", "accepted_records", "quarantined_records", "manifest_ref", "classification", "publication_allowed", "business_date"],
        [[run_id, run["status"], run["generated_at"].replace("T", " ").replace("Z", ""), run["accepted_records"], run["quarantined_records"], run["manifest_ref"], meta["classification"], meta["publication_allowed"], meta["business_date"]]],
    ))

    chunks.append(insert(
        "funds",
        ["fund_id", "label", "coverage", "aum_brl", "nav_per_share", "daily_return", "quality_status", "freshness_status", "lineage_ref", "sort_order"],
        [[item["id"], item["label"], item["coverage"], item["aum_brl"], item["nav_per_share"], item["daily_return"], item["quality_status"], item["freshness_status"], item["lineage_ref"], index] for index, item in enumerate(data["funds"], 1)],
    ))
    chunks.append(insert(
        "allocations",
        ["run_id", "fund_id", "asset_class", "weight", "sort_order"],
        [[run_id, None, item["asset_class"], item["weight"], index] for index, item in enumerate(data["allocation"], 1)],
    ))
    chunks.append(insert(
        "positions",
        ["position_id", "fund_id", "instrument_alias", "issuer_alias", "custodian_alias", "asset_class", "value_brl", "weight", "price_age_days", "lineage_ref", "sort_order"],
        [[item["id"], item["fund_id"], item["instrument"], item["issuer"], item["custodian"], item["asset_class"], item["value_brl"], item["weight"], item["price_age_days"], item["lineage_ref"], index] for index, item in enumerate(data["positions"], 1)],
    ))
    chunks.append(insert(
        "performance_history",
        ["fund_id", "business_date", "nav_index", "benchmark_index", "lineage_ref", "sort_order"],
        [[item["fund_id"], item["date"], item["nav_index"], item["benchmark_index"], item["lineage_ref"], index] for index, item in enumerate(data["history"], 1)],
    ))
    chunks.append(insert(
        "fund_kpis",
        ["kpi_id", "fund_id", "name", "value", "unit", "quality_status", "implementation_status", "lineage_ref", "sort_order"],
        [[item["id"], None, item["name"], item["value"], item["unit"], item["quality_status"], item["implementation_status"], item["lineage_ref"], index] for index, item in enumerate(data["kpis"], 1)],
    ))
    chunks.append(insert(
        "peer_samples",
        ["peer_id", "run_id", "return_index", "status", "sort_order"],
        [[item["peer_id"], run_id, item["return_index"], item["status"], index] for index, item in enumerate(data["peer_sample"], 1)],
    ))
    chunks.append(insert(
        "anomalies",
        ["anomaly_id", "run_id", "rule_id", "severity", "status", "title", "record_ref", "action", "sort_order"],
        [[item["anomaly_id"], run_id, item["rule_id"], item["severity"], item["status"], item["title"], item["record_ref"], item["action"], index] for index, item in enumerate(data["anomalies"], 1)],
    ))
    chunks.append(insert(
        "lineage_proofs",
        ["screen_value_id", "kpi_id", "lineage_ref", "source_id", "source_record_id", "run_id", "business_date", "sort_order"],
        [[item["screen_value_id"], item["kpi_id"], item["lineage_ref"], item["source_id"], item["source_record_id"], item["run_id"], item["business_date"], index] for index, item in enumerate(data["lineage_proofs"], 1)],
    ))
    chunks.append("COMMIT;\n")
    return "\n".join(chunks)


def main() -> None:
    parser = argparse.ArgumentParser(description="Build the deterministic synthetic MySQL seed.")
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    raw_text = args.source.read_text(encoding="utf-8")
    data = json.loads(raw_text)
    validate_fixture(data, raw_text)
    args.output.write_text(build_seed(data), encoding="utf-8", newline="\n")
    print(args.output)


if __name__ == "__main__":
    main()
