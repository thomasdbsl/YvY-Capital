from __future__ import annotations

import os
import subprocess
from datetime import datetime
from decimal import Decimal
from pathlib import Path
from typing import Any

from pipeline.config import DatabaseConfig
from pipeline.ingest import TRANSFORM_VERSION
from pipeline.models import CuratedBundle, PipelineBundle, stable_hash


TABLE_COLUMNS: dict[str, tuple[str, ...]] = {
    "funds": ("source_fund_id", "fund_code", "display_name", "currency_id", "is_internal", "is_active", "last_run_id"),
    "fund_nav_snapshots": ("source_fund_id", "snapshot_date", "nav_brl", "last_run_id"),
    "portfolio_holdings": ("source_fund_id", "snapshot_date", "group_identifier", "item_id", "holding_code", "instrument_code", "issuer_code", "asset_name_restricted", "instrument_id_restricted", "instrument_type_identifier", "quantity", "nav_value_brl", "exposure_raw", "isin_restricted", "issuer_name_restricted", "last_run_id"),
    "return_series": ("source_fund_id", "series_type", "business_date", "series_name_restricted", "index_value", "last_run_id"),
    "transaction_summaries": ("source_fund_id", "start_date", "end_date", "total_subscription_brl", "total_redemption_brl", "total_tax_brl", "nav_brl", "last_run_id"),
    "cash_flows": ("source_fund_id", "business_date", "net_value_brl", "subscriptions_brl", "redemptions_brl", "last_run_id"),
    "corporate_payments": ("event_key", "source_fund_id", "ex_date", "gross_value_per_unit_brl", "description_restricted", "last_run_id"),
    "drawdowns": ("source_fund_id", "business_date", "drawdown", "last_run_id"),
    "liquidity_horizons": ("source_fund_id", "as_of_date", "projection_days", "nav_percent", "last_run_id"),
    "stress_results": ("source_fund_id", "business_date", "stress_mask_ids", "success", "error_message", "result_json_restricted", "last_run_id"),
    "dv01_results": ("source_fund_id", "business_date", "success", "error_message", "item_count", "items_sha256", "last_run_id"),
    "dv01_items": ("item_key", "source_fund_id", "business_date", "item_code", "instrument_code", "instrument_category", "strategy_name_restricted", "risk_factor_code", "risk_factor_vertex", "dv01_notional_value", "financial_value", "exposure_unit_json_restricted", "last_run_id"),
    "bond_instruments": ("source_fund_id", "instrument_id_restricted", "instrument_code", "cetip_code_restricted", "isin_restricted", "maturity_date", "last_run_id"),
    "var_mask_configs": ("var_mask_id_restricted", "mask_code", "name_restricted", "time_horizon", "period_value", "probability", "method_type", "monte_carlo_iterations", "benchmark_id_restricted", "last_run_id"),
    "gold_allocations": ("source_fund_id", "snapshot_date", "group_identifier", "nav_value_brl", "weight", "holdings_count", "quality_status", "last_run_id"),
    "gold_fund_latest": ("source_fund_id", "snapshot_date", "nav_brl", "daily_return", "holdings_available", "freshness_days", "quality_status", "last_run_id"),
}

DELETE_ORDER = (
    "gold_allocations",
    "gold_fund_latest",
    "bond_instruments",
    "dv01_items",
    "dv01_results",
    "stress_results",
    "liquidity_horizons",
    "drawdowns",
    "corporate_payments",
    "cash_flows",
    "transaction_summaries",
    "return_series",
    "portfolio_holdings",
    "fund_nav_snapshots",
    "funds",
)

INSERT_ORDER = tuple(reversed(DELETE_ORDER))


def sql_value(value: Any) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "1" if value else "0"
    if isinstance(value, (int, Decimal)):
        return str(value)
    encoded = str(value).encode("utf-8").hex()
    return f"CONVERT(0x{encoded} USING utf8mb4)"


def insert_statement(table: str, columns: tuple[str, ...], rows: list[dict[str, Any]], *, upsert: bool = False) -> str:
    if not rows:
        return ""
    values = []
    for row in rows:
        values.append("(" + ",".join(sql_value(row[column]) for column in columns) + ")")
    statement = f"INSERT INTO `{table}` (" + ",".join(f"`{column}`" for column in columns) + ") VALUES\n" + ",\n".join(values)
    if upsert:
        updates = ",".join(f"`{column}`=VALUES(`{column}`)" for column in columns[1:])
        statement += f" ON DUPLICATE KEY UPDATE {updates}"
    return statement + ";\n"


def insert_statements(table: str, columns: tuple[str, ...], rows: list[dict[str, Any]], *, upsert: bool = False, chunk_size: int = 100) -> list[str]:
    return [insert_statement(table, columns, rows[start : start + chunk_size], upsert=upsert) for start in range(0, len(rows), chunk_size)]


def mysql_environment(config: DatabaseConfig) -> dict[str, str]:
    environment = os.environ.copy()
    if config.password:
        environment["MYSQL_PWD"] = config.password
    return environment


def run_mysql(config: DatabaseConfig, sql: str, *, select_database: bool) -> str:
    if not config.mysql_executable.is_file():
        raise FileNotFoundError(f"MySQL client not found: {config.mysql_executable}")
    command = [
        str(config.mysql_executable),
        f"--host={config.host}",
        f"--port={config.port}",
        f"--user={config.user}",
        "--default-character-set=utf8mb4",
        "--batch",
        "--skip-column-names",
    ]
    if select_database:
        command.append(f"--database={config.database}")
    result = subprocess.run(command, input=sql, text=True, encoding="utf-8", capture_output=True, env=mysql_environment(config), check=False)
    if result.returncode != 0:
        detail = (result.stderr or "unknown MySQL error").strip().splitlines()[0]
        raise RuntimeError(f"MySQL command failed ({result.returncode}): {detail}")
    return result.stdout


def apply_schema(config: DatabaseConfig, schema_path: Path) -> None:
    schema = schema_path.read_text(encoding="utf-8")
    bootstrap = f"CREATE DATABASE IF NOT EXISTS `{config.database}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\nUSE `{config.database}`;\n"
    run_mysql(config, bootstrap + schema, select_database=False)


def load_bundle(config: DatabaseConfig, source: PipelineBundle, curated: CuratedBundle | None) -> dict[str, int]:
    blocked = source.run_blocked
    status = "blocked" if blocked else ("completed_with_quarantine" if source.quarantined_count else "completed")
    completed_at = datetime.fromisoformat(source.generated_at.replace("Z", "+00:00")).strftime("%Y-%m-%d %H:%M:%S")
    curated_count = 0 if curated is None else curated.record_count
    sql = ["SET NAMES utf8mb4;\nSTART TRANSACTION;\n"]
    run_row = {
        "run_id": source.run_id,
        "bundle_sha256": source.bundle_sha256,
        "transform_version": TRANSFORM_VERSION,
        "classification": "local-restricted",
        "status": status,
        "started_at": completed_at,
        "completed_at": completed_at,
        "source_file_count": len(source.manifests),
        "accepted_records": curated_count,
        "warning_records": source.warning_count,
        "quarantined_records": source.quarantined_count,
        "blocking_records": source.blocking_count,
    }
    sql.append(insert_statement("ingestion_runs", tuple(run_row), [run_row], upsert=True))

    source_rows = []
    for manifest in source.manifests:
        modified_at = datetime.fromisoformat(manifest["modified_at"].replace("Z", "+00:00")).strftime("%Y-%m-%d %H:%M:%S")
        source_rows.append({"run_id": source.run_id, **manifest, "modified_at": modified_at})
    source_columns = ("run_id", "logical_name", "byte_size", "modified_at", "row_count", "sha256", "contract_version", "status")
    sql.append(insert_statement("source_files", source_columns, source_rows, upsert=True))

    issue_rows = []
    quarantine_rows = []
    for item in source.issues:
        database_issue_id = stable_hash(source.run_id, item.issue_id)
        issue_rows.append(
            {
                "issue_id": database_issue_id,
                "run_id": source.run_id,
                "logical_name": item.logical_name,
                "source_row": item.source_row,
                "record_ref_hash": item.record_ref_hash,
                "rule_id": item.rule_id,
                "severity": item.severity,
                "action": item.action,
                "message": item.message,
                "status": "open",
            }
        )
        if item.action == "quarantine":
            quarantine_rows.append(
                {
                    "quarantine_id": database_issue_id,
                    "run_id": source.run_id,
                    "logical_name": item.logical_name,
                    "source_row": item.source_row,
                    "record_ref_hash": item.record_ref_hash,
                    "rule_id": item.rule_id,
                    "reason": item.message,
                }
            )
    issue_columns = ("issue_id", "run_id", "logical_name", "source_row", "record_ref_hash", "rule_id", "severity", "action", "message", "status")
    quarantine_columns = ("quarantine_id", "run_id", "logical_name", "source_row", "record_ref_hash", "rule_id", "reason")
    sql.append(insert_statement("quality_issues", issue_columns, issue_rows, upsert=True))
    sql.append(insert_statement("quarantine_records", quarantine_columns, quarantine_rows, upsert=True))

    raw_count = sum(item["row_count"] for item in source.manifests)
    silver_count = sum(len(rows) for rows in source.tables.values())
    gold_count = 0 if curated is None else sum(len(curated.tables.get(name, [])) for name in ("gold_allocations", "gold_fund_latest"))
    stage_rows = [
        {"run_id": source.run_id, "stage_name": "raw", "accepted_records": raw_count, "warning_records": 0, "quarantined_records": 0},
        {"run_id": source.run_id, "stage_name": "silver", "accepted_records": silver_count, "warning_records": source.warning_count, "quarantined_records": source.quarantined_count},
        {"run_id": source.run_id, "stage_name": "gold", "accepted_records": gold_count, "warning_records": 0, "quarantined_records": 0},
    ]
    stage_columns = ("run_id", "stage_name", "accepted_records", "warning_records", "quarantined_records")
    sql.append(insert_statement("pipeline_stage_counts", stage_columns, stage_rows, upsert=True))

    if curated is not None and not blocked:
        sql.extend(f"DELETE FROM `{table}`;\n" for table in DELETE_ORDER)
        for table in INSERT_ORDER:
            sql.extend(insert_statements(table, TABLE_COLUMNS[table], curated.tables.get(table, [])))
        lineage_columns = ("lineage_id", "run_id", "logical_name", "source_row", "source_sha256", "target_table", "target_key_hash")
        sql.extend(insert_statements("lineage_records", lineage_columns, curated.lineage, upsert=True))

    sql.append("COMMIT;\n")
    run_mysql(config, "".join(sql), select_database=True)
    return database_counts(config)


def database_counts(config: DatabaseConfig) -> dict[str, int]:
    table_names = ("ingestion_runs", "source_files", "quality_issues", "quarantine_records", *TABLE_COLUMNS.keys(), "lineage_records")
    query = "\n".join(f"SELECT {sql_value(table)}, COUNT(*) FROM `{table}`;" for table in table_names)
    rows = run_mysql(config, query, select_database=True).splitlines()
    counts: dict[str, int] = {}
    for row in rows:
        name, value = row.split("\t", 1)
        counts[name] = int(value)
    return counts
