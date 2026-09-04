from __future__ import annotations

from collections import defaultdict
from decimal import Decimal
import json
from typing import Any

from pipeline.models import CuratedBundle, PipelineBundle, safe_code, stable_hash


def transform_to_curated(bundle: PipelineBundle) -> CuratedBundle:
    source_tables = bundle.tables
    fund_rows = sorted(source_tables["funds.csv"], key=lambda row: row["fund_id"])
    fund_codes = {row["fund_id"]: f"FUND_{index:02d}" for index, row in enumerate(fund_rows, start=1)}
    manifest_sha = {item["logical_name"]: item["sha256"] for item in bundle.manifests}
    tables: dict[str, list[dict[str, Any]]] = defaultdict(list)
    lineage: list[dict[str, Any]] = []

    def append(target: str, values: dict[str, Any], source: dict[str, Any], key: object) -> None:
        tables[target].append(values)
        filename = source["_logical_name"]
        source_row = source["_source_row"]
        target_hash = stable_hash(target, key)
        lineage.append(
            {
                "lineage_id": stable_hash(bundle.run_id, filename, source_row, target, target_hash),
                "run_id": bundle.run_id,
                "logical_name": filename,
                "source_row": source_row,
                "source_sha256": manifest_sha[filename],
                "target_table": target,
                "target_key_hash": target_hash,
            }
        )

    for row in fund_rows:
        code = fund_codes[row["fund_id"]]
        append(
            "funds",
            {
                "source_fund_id": row["fund_id"],
                "fund_code": code,
                "display_name": code.replace("_", " ").title(),
                "currency_id": row["currency_id"],
                "is_internal": row["is_internal"],
                "is_active": row["is_active"],
                "last_run_id": bundle.run_id,
            },
            row,
            row["fund_id"],
        )

    simple_mappings = {
        "fund_nav_snapshot.csv": ("fund_nav_snapshots", {"fund_id": "source_fund_id", "snapshot_date": "snapshot_date", "nav": "nav_brl"}, ("fund_id", "snapshot_date")),
        "returns_navps.csv": ("return_series", {"fund_id": "source_fund_id", "series_type": "series_type", "date": "business_date", "series_name": "series_name_restricted", "accrued_return_pct": "index_value"}, ("fund_id", "series_type", "date")),
        "transactions_summary.csv": ("transaction_summaries", {"fund_id": "source_fund_id", "start_date": "start_date", "end_date": "end_date", "total_subscription": "total_subscription_brl", "total_redemption": "total_redemption_brl", "total_tax": "total_tax_brl", "nav": "nav_brl"}, ("fund_id", "start_date", "end_date")),
        "cash_flow_daily.csv": ("cash_flows", {"fund_id": "source_fund_id", "date": "business_date", "net_value": "net_value_brl", "subscriptions": "subscriptions_brl", "redemptions": "redemptions_brl"}, ("fund_id", "date")),
        "drawdown.csv": ("drawdowns", {"fund_id": "source_fund_id", "date": "business_date", "drawdown": "drawdown"}, ("fund_id", "date")),
        "liquidity_by_horizon.csv": ("liquidity_horizons", {"fund_id": "source_fund_id", "as_of_date": "as_of_date", "projection_days": "projection_days", "nav_percent": "nav_percent"}, ("fund_id", "as_of_date", "projection_days")),
    }
    for source_name, (target_name, columns, key_columns) in simple_mappings.items():
        for row in source_tables[source_name]:
            values = {target: row[source] for source, target in columns.items()}
            values["last_run_id"] = bundle.run_id
            append(target_name, values, row, tuple(row[column] for column in key_columns))

    for row in source_tables["portfolio_holdings.csv"]:
        key = (row["fund_id"], row["snapshot_date"], row["group_identifier"], row["item_id"])
        values = {
            "source_fund_id": row["fund_id"],
            "snapshot_date": row["snapshot_date"],
            "group_identifier": row["group_identifier"],
            "item_id": row["item_id"],
            "holding_code": safe_code("HLD", *key, length=12),
            "instrument_code": safe_code("INS", row["instrument_id"] or row["asset_name"], length=12),
            "issuer_code": safe_code("ISS", row["issuer_name"], length=12) if row["issuer_name"] else None,
            "asset_name_restricted": row["asset_name"],
            "instrument_id_restricted": row["instrument_id"],
            "instrument_type_identifier": row["instrument_type_identifier"],
            "quantity": row["quantity"],
            "nav_value_brl": row["nav_value"],
            "exposure_raw": row["exposure"],
            "isin_restricted": row["isin_code"],
            "issuer_name_restricted": row["issuer_name"],
            "last_run_id": bundle.run_id,
        }
        append("portfolio_holdings", values, row, key)

    for row in source_tables["corporate_payments.csv"]:
        key = (row["fund_id"], row["ex_date"], row["description"])
        values = {
            "event_key": stable_hash(*key),
            "source_fund_id": row["fund_id"],
            "ex_date": row["ex_date"],
            "gross_value_per_unit_brl": row["gross_value_per_unit"],
            "description_restricted": row["description"],
            "last_run_id": bundle.run_id,
        }
        append("corporate_payments", values, row, key)

    for row in source_tables["stress_risk.csv"]:
        values = {
            "source_fund_id": row["fund_id"],
            "business_date": row["date"],
            "stress_mask_ids": row["stress_mask_ids"],
            "success": row["success"],
            "error_message": row["error_msg"],
            "result_json_restricted": row["risk_list_json"],
            "last_run_id": bundle.run_id,
        }
        append("stress_results", values, row, (row["fund_id"], row["date"]))

    for row in source_tables["dv01.csv"]:
        items = json.loads(row["items_json"] or "[]")
        result_values = {
            "source_fund_id": row["fund_id"],
            "business_date": row["date"],
            "success": row["success"],
            "error_message": row["error_msg"],
            "item_count": len(items),
            "items_sha256": stable_hash(row["items_json"]),
            "last_run_id": bundle.run_id,
        }
        append("dv01_results", result_values, row, (row["fund_id"], row["date"]))
        for index, item in enumerate(items):
            item_key = stable_hash(row["fund_id"], row["date"], item.get("id"), index)
            item_values = {
                "item_key": item_key,
                "source_fund_id": row["fund_id"],
                "business_date": row["date"],
                "item_code": safe_code("DVI", item_key, length=12),
                "instrument_code": safe_code("INS", item.get("instrumentSymbol"), length=12),
                "instrument_category": item.get("instrumentCategory") or "unavailable",
                "strategy_name_restricted": item.get("strategyName") or "",
                "risk_factor_code": safe_code("RSK", item.get("riskFactorSymbol"), length=12),
                "risk_factor_vertex": item.get("riskFactorVertex"),
                "dv01_notional_value": item.get("dv01NotionalValue"),
                "financial_value": item.get("financialValue"),
                "exposure_unit_json_restricted": json.dumps(item.get("exposureUnit"), ensure_ascii=False, separators=(",", ":")) if item.get("exposureUnit") is not None else None,
                "last_run_id": bundle.run_id,
            }
            append("dv01_items", item_values, row, item_key)

    for row in source_tables["bond_instruments.csv"]:
        key = (row["fund_id"], row["instrument_id"])
        values = {
            "source_fund_id": row["fund_id"],
            "instrument_id_restricted": row["instrument_id"],
            "instrument_code": safe_code("INS", row["instrument_id"], length=12),
            "cetip_code_restricted": row["cetip_code"],
            "isin_restricted": row["isin_code"],
            "maturity_date": row["maturity_date"],
            "last_run_id": bundle.run_id,
        }
        append("bond_instruments", values, row, key)

    for row in source_tables["var_mask_configs.csv"]:
        values = {
            "var_mask_id_restricted": row["var_mask_id"],
            "mask_code": safe_code("MASK", row["var_mask_id"], length=12),
            "name_restricted": row["name"],
            "time_horizon": row["time_horizon"],
            "period_value": row["period"],
            "probability": row["probability"],
            "method_type": row["type"],
            "monte_carlo_iterations": row["monte_carlo_iterations"],
            "benchmark_id_restricted": row["benchmark_id"],
            "last_run_id": bundle.run_id,
        }
        append("var_mask_configs", values, row, row["var_mask_id"])

    nav_by_key = {(row["fund_id"], row["snapshot_date"]): row["nav"] for row in source_tables["fund_nav_snapshot.csv"]}
    allocation_groups: dict[tuple[str, str, str], list[dict[str, Any]]] = defaultdict(list)
    for row in source_tables["portfolio_holdings.csv"]:
        allocation_groups[(row["fund_id"], row["snapshot_date"], row["group_identifier"])].append(row)
    for (fund_id, snapshot_date, group_identifier), rows in sorted(allocation_groups.items()):
        nav = nav_by_key[(fund_id, snapshot_date)]
        nav_value = sum((row["nav_value"] for row in rows), Decimal(0))
        tables["gold_allocations"].append(
            {
                "source_fund_id": fund_id,
                "snapshot_date": snapshot_date,
                "group_identifier": group_identifier,
                "nav_value_brl": nav_value,
                "weight": nav_value / nav,
                "holdings_count": len(rows),
                "quality_status": "reconciled",
                "last_run_id": bundle.run_id,
            }
        )

    holdings_keys = {(row["fund_id"], row["snapshot_date"]) for row in source_tables["portfolio_holdings.csv"]}
    nav_rows_by_fund: dict[str, list[dict[str, Any]]] = defaultdict(list)
    return_rows_by_fund: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in source_tables["fund_nav_snapshot.csv"]:
        nav_rows_by_fund[row["fund_id"]].append(row)
    for row in source_tables["returns_navps.csv"]:
        if row["series_type"] == "fund":
            return_rows_by_fund[row["fund_id"]].append(row)
    latest_global_date = max(row["snapshot_date"] for row in source_tables["fund_nav_snapshot.csv"])
    for fund_id, rows in sorted(nav_rows_by_fund.items()):
        latest = max(rows, key=lambda row: row["snapshot_date"])
        observations = sorted(return_rows_by_fund[fund_id], key=lambda row: row["date"])
        eligible = [row for row in observations if row["date"] <= latest["snapshot_date"]]
        daily_return = None
        if len(eligible) >= 2:
            daily_return = eligible[-1]["accrued_return_pct"] / eligible[-2]["accrued_return_pct"] - Decimal(1)
        holding_available = (fund_id, latest["snapshot_date"]) in holdings_keys
        tables["gold_fund_latest"].append(
            {
                "source_fund_id": fund_id,
                "snapshot_date": latest["snapshot_date"],
                "nav_brl": latest["nav"],
                "daily_return": daily_return,
                "holdings_available": holding_available,
                "freshness_days": (date_from_iso(latest_global_date) - date_from_iso(latest["snapshot_date"])).days,
                "quality_status": "current" if holding_available else "incomplete",
                "last_run_id": bundle.run_id,
            }
        )

    return CuratedBundle(bundle.run_id, dict(tables), lineage)


def date_from_iso(value: str):
    from datetime import date

    return date.fromisoformat(value)
