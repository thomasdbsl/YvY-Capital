from __future__ import annotations

import csv
import json
from datetime import date
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any


def parse_br_decimal(value: str) -> Decimal:
    normalized = value.strip().replace(".", "").replace(",", ".")
    try:
        return Decimal(normalized)
    except InvalidOperation as exc:
        raise ValueError("invalid Brazilian decimal") from exc


def inspect_csv(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8", newline="") as handle:
        rows = list(csv.reader(handle))
    width = len(rows[0]) if rows else 0
    return {
        "source": path.name,
        "columns": width,
        "rows": max(0, len(rows) - 1),
        "valid_width": width in {38, 51},
        "section_state": "empty" if len(rows) == 1 else "present",
    }


def _anomaly(case_id: str, rule_id: str, severity: str, title: str, action: str) -> dict[str, str]:
    return {
        "anomaly_id": f"ANOM_{case_id}",
        "rule_id": rule_id,
        "severity": severity,
        "status": "open",
        "title": title,
        "record_ref": f"REC_{case_id}",
        "action": action,
    }


def evaluate_quality(input_dir: Path, staleness_days: int = 30) -> dict[str, Any]:
    anomalies: list[dict[str, str]] = []
    csv_profiles = [inspect_csv(path) for path in sorted(input_dir.glob("*.csv"))]
    for profile in csv_profiles:
        source_key = profile["source"].upper().replace(".", "_").replace("-", "_")
        if not profile["valid_width"]:
            anomalies.append(_anomaly(source_key, "DQ06", "blocking", "Largeur de fichier invalide", "quarantine"))
        if profile["section_state"] == "empty":
            anomalies.append(_anomaly(source_key, "DQ23", "info", "Section presente mais vide", "review"))

    cases_path = input_dir / "quality_cases.json"
    cases = json.loads(cases_path.read_text(encoding="utf-8")) if cases_path.exists() else []
    peer_seen: set[str] = set()
    for case in cases:
        case_id = case["case_id"]
        kind = case["kind"]
        if kind == "invalid_duration":
            anomalies.append(_anomaly(case_id, "DQ12", "warning", "Duration non convertible", "quarantine"))
        elif kind == "stale_price":
            age = (date.fromisoformat(case["business_date"]) - date.fromisoformat(case["price_date"])).days
            if age > staleness_days:
                anomalies.append(_anomaly(case_id, "DQ15", "warning", "Prix en retard", "review"))
        elif kind == "nav" and Decimal(str(case["value"])) <= 0:
            anomalies.append(_anomaly(case_id, "DQ07", "blocking", "NAV non positive", "quarantine"))
        elif kind == "drawdown" and not -1 <= Decimal(str(case["value"])) <= 0:
            anomalies.append(_anomaly(case_id, "DQ24", "blocking", "Drawdown hors domaine", "quarantine"))
        elif kind == "forbidden_name":
            anomalies.append(_anomaly(case_id, "DQ20", "blocking", "Nom interdit detecte dans l'entree", "quarantine"))
        elif kind == "private_identifier":
            anomalies.append(_anomaly(case_id, "DQ21", "blocking", "Identifiant prive detecte dans l'entree", "quarantine"))
        elif kind == "peer_identifier":
            peer_id = case["value"]
            if peer_id in peer_seen:
                anomalies.append(_anomaly(case_id, "DQ22", "warning", "Doublon synthetique de pair", "quarantine"))
            peer_seen.add(peer_id)
        elif kind == "empty_section":
            anomalies.append(_anomaly(case_id, "DQ23", "info", "Section presente mais vide", "review"))
        elif kind == "uncertain_bridge":
            anomalies.append(_anomaly(case_id, "DQ30", "warning", "Relation fonds-dans-fonds a valider", "review"))

    counts = {severity: sum(1 for item in anomalies if item["severity"] == severity) for severity in ("blocking", "warning", "info")}
    return {
        "csv_profiles": csv_profiles,
        "anomalies": anomalies,
        "counts": counts,
        "quarantined": sum(1 for item in anomalies if item["action"] == "quarantine"),
        "publication_policy": "blocking input cases are removed before synthetic Serving publication",
    }
