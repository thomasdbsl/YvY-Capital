from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from pipeline import LOGICAL_TIMESTAMP, RUN_ID


SPRINT2_ROOT = Path(__file__).resolve().parents[2]


def _funds() -> list[dict[str, Any]]:
    funds = []
    for number in range(1, 15):
        fund_id = f"FUND_{number:02d}"
        funds.append(
            {
                "id": fund_id,
                "label": fund_id,
                "coverage": "snapshot-and-history" if number <= 7 else "history-only",
                "aum_brl": 12_000_000 + number * 1_375_000,
                "nav_per_share": round(98 + number * 1.25, 4),
                "daily_return": round((number - 7) * 0.0007, 5),
                "quality_status": "current" if number not in {4, 11} else "incomplete",
                "freshness_status": "current" if number != 6 else "late",
                "lineage_ref": f"LIN_FUND_{number:02d}",
            }
        )
    return funds


def _positions() -> list[dict[str, Any]]:
    classes = ["Private credit", "Sovereign debt", "Funds", "Equities", "Cash", "Derivatives"]
    positions = []
    for index in range(1, 19):
        positions.append(
            {
                "id": f"POS_{index:02d}",
                "fund_id": "FUND_01",
                "instrument": f"INSTR_{index:02d}",
                "issuer": f"EMET_{((index - 1) % 6) + 1:02d}",
                "custodian": f"CUSTO_{((index - 1) % 3) + 1:02d}",
                "asset_class": classes[(index - 1) % len(classes)],
                "value_brl": 900_000 - index * 21_000,
                "weight": round((20 - index) / 210, 4),
                "price_age_days": 6 + index,
                "lineage_ref": f"LIN_POS_{index:02d}",
            }
        )
    return positions


def _history() -> list[dict[str, Any]]:
    values = []
    for index in range(12):
        values.append(
            {
                "date": f"2026-{index + 1:02d}-01",
                "fund_id": "FUND_01",
                "nav_index": round(100 + index * 1.15 + (index % 3) * 0.4, 4),
                "benchmark_index": round(100 + index * 0.82, 4),
                "lineage_ref": f"LIN_HIST_{index + 1:02d}",
            }
        )
    return values


def build_serving_data(quality_report: dict[str, Any]) -> dict[str, Any]:
    catalog = json.loads((SPRINT2_ROOT / "data" / "contracts" / "kpi_catalog.json").read_text(encoding="utf-8"))
    kpis = []
    for index, item in enumerate(catalog, start=1):
        value = None if item["implementation_status"] == "contract-only" else round(0.0125 * index, 4)
        status = "hypothesis" if value is None or "Pending" in str(item["tolerances"]) else "current"
        kpis.append(
            {
                "id": item["id"],
                "name": item["name"],
                "value": value,
                "unit": item["unit"],
                "quality_status": status,
                "lineage_ref": f"LIN_KPI_{item['id']}",
                "implementation_status": item["implementation_status"],
            }
        )

    lineage_proofs = [
        {"screen_value_id": "executive-aum", "kpi_id": "K01", "lineage_ref": "LIN_KPI_K01", "source_id": "SRC_SYNTHETIC_FIXTURES", "source_record_id": "REC_SNAPSHOT_01", "run_id": RUN_ID, "business_date": "2026-08-22"},
        {"screen_value_id": "allocation-credit", "kpi_id": "K05", "lineage_ref": "LIN_KPI_K05", "source_id": "SRC_SYNTHETIC_FIXTURES", "source_record_id": "REC_POSITION_01", "run_id": RUN_ID, "business_date": "2026-08-22"},
        {"screen_value_id": "quality-blocking", "kpi_id": "K16", "lineage_ref": "LIN_KPI_K16", "source_id": "SRC_SYNTHETIC_FIXTURES", "source_record_id": "REC_QUALITY_01", "run_id": RUN_ID, "business_date": "2026-08-22"},
    ]
    return {
        "meta": {"run_id": RUN_ID, "classification": "synthetic-example", "generated_at": LOGICAL_TIMESTAMP, "publication_allowed": True, "business_date": "2026-08-22"},
        "funds": _funds(),
        "positions": _positions(),
        "history": _history(),
        "kpis": kpis,
        "allocation": [
            {"asset_class": "Private credit", "weight": 0.32},
            {"asset_class": "Sovereign debt", "weight": 0.24},
            {"asset_class": "Funds", "weight": 0.18},
            {"asset_class": "Equities", "weight": 0.13},
            {"asset_class": "Cash", "weight": 0.08},
            {"asset_class": "Derivatives", "weight": 0.05}
        ],
        "anomalies": quality_report["anomalies"],
        "runs": [{"run_id": RUN_ID, "status": "published-synthetic", "generated_at": LOGICAL_TIMESTAMP, "accepted_records": 49, "quarantined_records": quality_report["quarantined"], "manifest_ref": "manifest.json"}],
        "lineage_proofs": lineage_proofs,
        "peer_sample": [{"peer_id": f"PEER_{index:02d}", "return_index": round(98 + index * 1.7, 2), "status": "sample"} for index in range(1, 7)],
    }
