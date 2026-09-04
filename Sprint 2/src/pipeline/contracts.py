from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class SourceContract:
    filename: str
    columns: tuple[str, ...]
    natural_key: tuple[str, ...]
    required: tuple[str, ...]
    dates: tuple[str, ...] = ()
    decimals: tuple[str, ...] = ()
    integers: tuple[str, ...] = ()
    booleans: tuple[str, ...] = ()
    json_fields: tuple[str, ...] = ()
    allow_zero_bytes: bool = False


CONTRACT_VERSION = "sprint3-structured-csv-v1"


CONTRACTS = (
    SourceContract("funds.csv", ("fund_id", "name", "currency_id", "is_internal", "is_active"), ("fund_id",), ("fund_id", "name", "currency_id", "is_internal", "is_active"), booleans=("is_internal", "is_active")),
    SourceContract("fund_nav_snapshot.csv", ("fund_id", "fund_name", "snapshot_date", "nav"), ("fund_id", "snapshot_date"), ("fund_id", "fund_name", "snapshot_date", "nav"), dates=("snapshot_date",), decimals=("nav",)),
    SourceContract("portfolio_holdings.csv", ("fund_id", "fund_name", "snapshot_date", "group_identifier", "item_id", "asset_name", "instrument_id", "instrument_type_identifier", "quantity", "nav_value", "exposure", "nav_percentage", "isin_code", "issuer_name"), ("fund_id", "snapshot_date", "group_identifier", "item_id"), ("fund_id", "fund_name", "snapshot_date", "group_identifier", "item_id", "asset_name", "nav_value", "exposure"), dates=("snapshot_date",), decimals=("quantity", "nav_value", "exposure", "nav_percentage")),
    SourceContract("returns_navps.csv", ("fund_id", "fund_name", "series_type", "series_name", "date", "accrued_return_pct"), ("fund_id", "series_type", "date"), ("fund_id", "fund_name", "series_type", "series_name", "date", "accrued_return_pct"), dates=("date",), decimals=("accrued_return_pct",)),
    SourceContract("transactions_summary.csv", ("fund_id", "fund_name", "start_date", "end_date", "total_subscription", "total_redemption", "total_tax", "nav"), ("fund_id", "start_date", "end_date"), ("fund_id", "fund_name", "start_date", "end_date", "total_subscription", "total_redemption", "total_tax", "nav"), dates=("start_date", "end_date"), decimals=("total_subscription", "total_redemption", "total_tax", "nav")),
    SourceContract("cash_flow_daily.csv", ("fund_id", "fund_name", "date", "net_value", "subscriptions", "redemptions"), ("fund_id", "date"), ("fund_id", "fund_name", "date", "net_value", "subscriptions", "redemptions"), dates=("date",), decimals=("net_value", "subscriptions", "redemptions")),
    SourceContract("corporate_payments.csv", ("fund_id", "fund_name", "ex_date", "gross_value_per_unit", "description"), ("fund_id", "ex_date", "description"), ("fund_id", "fund_name", "ex_date", "gross_value_per_unit", "description"), dates=("ex_date",), decimals=("gross_value_per_unit",)),
    SourceContract("drawdown.csv", ("fund_id", "fund_name", "date", "drawdown"), ("fund_id", "date"), ("fund_id", "fund_name", "date", "drawdown"), dates=("date",), decimals=("drawdown",)),
    SourceContract("liquidity_by_horizon.csv", ("fund_id", "fund_name", "as_of_date", "projection_days", "nav_percent"), ("fund_id", "as_of_date", "projection_days"), ("fund_id", "fund_name", "as_of_date", "projection_days"), dates=("as_of_date",), decimals=("nav_percent",), integers=("projection_days",)),
    SourceContract("stress_risk.csv", ("fund_id", "fund_name", "date", "stress_mask_ids", "success", "error_msg", "risk_list_json"), ("fund_id", "date"), ("fund_id", "fund_name", "date", "stress_mask_ids", "success"), dates=("date",), booleans=("success",), json_fields=("risk_list_json",)),
    SourceContract("dv01.csv", ("fund_id", "fund_name", "date", "success", "error_msg", "items_json"), ("fund_id", "date"), ("fund_id", "fund_name", "date", "success"), dates=("date",), booleans=("success",), json_fields=("items_json",)),
    SourceContract("bond_instruments.csv", ("instrument_id", "fund_id", "cetip_code", "isin_code", "maturity_date"), ("fund_id", "instrument_id"), ("instrument_id", "fund_id"), dates=("maturity_date",)),
    SourceContract("var_mask_configs.csv", ("var_mask_id", "name", "time_horizon", "period", "probability", "type", "monte_carlo_iterations", "benchmark_id"), ("var_mask_id",), ("var_mask_id", "name", "time_horizon", "period", "probability", "type"), decimals=("probability",), integers=("time_horizon", "period", "monte_carlo_iterations")),
    SourceContract("external_debenture_data_raw.csv", (), (), (), allow_zero_bytes=True),
)


CONTRACT_BY_FILE = {contract.filename: contract for contract in CONTRACTS}
