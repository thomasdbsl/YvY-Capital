-- Funds Manager Sprint 3 - local restricted database.
-- MySQL 5.7 compatible. The setup script selects the target database.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS ingestion_runs (
  run_id VARCHAR(80) NOT NULL,
  bundle_sha256 CHAR(64) NOT NULL,
  transform_version VARCHAR(64) NOT NULL,
  classification VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL,
  started_at DATETIME NOT NULL,
  completed_at DATETIME NULL,
  source_file_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  accepted_records INT UNSIGNED NOT NULL DEFAULT 0,
  warning_records INT UNSIGNED NOT NULL DEFAULT 0,
  quarantined_records INT UNSIGNED NOT NULL DEFAULT 0,
  blocking_records INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (run_id),
  UNIQUE KEY uq_ingestion_runs_bundle_version (bundle_sha256, transform_version),
  KEY idx_ingestion_runs_completed (completed_at),
  KEY idx_ingestion_runs_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS source_files (
  run_id VARCHAR(80) NOT NULL,
  logical_name VARCHAR(128) NOT NULL,
  byte_size BIGINT UNSIGNED NOT NULL,
  modified_at DATETIME NOT NULL,
  row_count INT UNSIGNED NOT NULL,
  sha256 CHAR(64) NOT NULL,
  contract_version VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL,
  PRIMARY KEY (run_id, logical_name),
  KEY idx_source_files_sha256 (sha256),
  CONSTRAINT fk_source_files_run FOREIGN KEY (run_id) REFERENCES ingestion_runs (run_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pipeline_stage_counts (
  run_id VARCHAR(80) NOT NULL,
  stage_name VARCHAR(24) NOT NULL,
  accepted_records INT UNSIGNED NOT NULL,
  warning_records INT UNSIGNED NOT NULL,
  quarantined_records INT UNSIGNED NOT NULL,
  PRIMARY KEY (run_id, stage_name),
  CONSTRAINT fk_stage_counts_run FOREIGN KEY (run_id) REFERENCES ingestion_runs (run_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quality_issues (
  issue_id CHAR(64) NOT NULL,
  run_id VARCHAR(80) NOT NULL,
  logical_name VARCHAR(128) NOT NULL,
  source_row INT UNSIGNED NULL,
  record_ref_hash CHAR(64) NOT NULL,
  rule_id VARCHAR(32) NOT NULL,
  severity VARCHAR(16) NOT NULL,
  action VARCHAR(24) NOT NULL,
  message VARCHAR(255) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'open',
  PRIMARY KEY (issue_id),
  KEY idx_quality_run_severity (run_id, severity),
  KEY idx_quality_status (status),
  CONSTRAINT fk_quality_run FOREIGN KEY (run_id) REFERENCES ingestion_runs (run_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quarantine_records (
  quarantine_id CHAR(64) NOT NULL,
  run_id VARCHAR(80) NOT NULL,
  logical_name VARCHAR(128) NOT NULL,
  source_row INT UNSIGNED NULL,
  record_ref_hash CHAR(64) NOT NULL,
  rule_id VARCHAR(32) NOT NULL,
  reason VARCHAR(255) NOT NULL,
  PRIMARY KEY (quarantine_id),
  KEY idx_quarantine_run_file (run_id, logical_name),
  CONSTRAINT fk_quarantine_run FOREIGN KEY (run_id) REFERENCES ingestion_runs (run_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS funds (
  source_fund_id VARCHAR(64) NOT NULL,
  fund_code VARCHAR(32) NOT NULL,
  display_name VARCHAR(80) NOT NULL,
  currency_id VARCHAR(32) NOT NULL,
  is_internal TINYINT(1) NOT NULL,
  is_active TINYINT(1) NOT NULL,
  last_run_id VARCHAR(80) NOT NULL,
  PRIMARY KEY (source_fund_id),
  UNIQUE KEY uq_funds_code (fund_code),
  KEY idx_funds_active (is_active, fund_code),
  CONSTRAINT fk_funds_run FOREIGN KEY (last_run_id) REFERENCES ingestion_runs (run_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fund_nav_snapshots (
  source_fund_id VARCHAR(64) NOT NULL,
  snapshot_date DATE NOT NULL,
  nav_brl DECIMAL(30,10) NOT NULL,
  last_run_id VARCHAR(80) NOT NULL,
  PRIMARY KEY (source_fund_id, snapshot_date),
  KEY idx_nav_date (snapshot_date),
  CONSTRAINT fk_nav_fund FOREIGN KEY (source_fund_id) REFERENCES funds (source_fund_id),
  CONSTRAINT fk_nav_run FOREIGN KEY (last_run_id) REFERENCES ingestion_runs (run_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS portfolio_holdings (
  source_fund_id VARCHAR(64) NOT NULL,
  snapshot_date DATE NOT NULL,
  group_identifier VARCHAR(64) NOT NULL,
  item_id VARCHAR(96) NOT NULL,
  holding_code VARCHAR(32) NOT NULL,
  instrument_code VARCHAR(32) NULL,
  issuer_code VARCHAR(32) NULL,
  asset_name_restricted VARCHAR(255) NOT NULL,
  instrument_id_restricted VARCHAR(96) NULL,
  instrument_type_identifier VARCHAR(96) NULL,
  quantity DECIMAL(30,10) NULL,
  nav_value_brl DECIMAL(30,10) NOT NULL,
  exposure_raw DECIMAL(30,12) NOT NULL,
  isin_restricted VARCHAR(32) NULL,
  issuer_name_restricted VARCHAR(255) NULL,
  last_run_id VARCHAR(80) NOT NULL,
  PRIMARY KEY (source_fund_id, snapshot_date, group_identifier, item_id),
  UNIQUE KEY uq_holdings_code_date (source_fund_id, snapshot_date, holding_code),
  KEY idx_holdings_fund_date_group (source_fund_id, snapshot_date, group_identifier),
  CONSTRAINT fk_holdings_fund FOREIGN KEY (source_fund_id) REFERENCES funds (source_fund_id),
  CONSTRAINT fk_holdings_nav FOREIGN KEY (source_fund_id, snapshot_date) REFERENCES fund_nav_snapshots (source_fund_id, snapshot_date),
  CONSTRAINT fk_holdings_run FOREIGN KEY (last_run_id) REFERENCES ingestion_runs (run_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS return_series (
  source_fund_id VARCHAR(64) NOT NULL,
  series_type VARCHAR(24) NOT NULL,
  business_date DATE NOT NULL,
  series_name_restricted VARCHAR(160) NOT NULL,
  index_value DECIMAL(30,12) NOT NULL,
  last_run_id VARCHAR(80) NOT NULL,
  PRIMARY KEY (source_fund_id, series_type, business_date),
  KEY idx_returns_date (business_date),
  CONSTRAINT fk_returns_fund FOREIGN KEY (source_fund_id) REFERENCES funds (source_fund_id),
  CONSTRAINT fk_returns_run FOREIGN KEY (last_run_id) REFERENCES ingestion_runs (run_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS transaction_summaries (
  source_fund_id VARCHAR(64) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_subscription_brl DECIMAL(30,10) NOT NULL,
  total_redemption_brl DECIMAL(30,10) NOT NULL,
  total_tax_brl DECIMAL(30,10) NOT NULL,
  nav_brl DECIMAL(30,10) NOT NULL,
  last_run_id VARCHAR(80) NOT NULL,
  PRIMARY KEY (source_fund_id, start_date, end_date),
  CONSTRAINT fk_transactions_fund FOREIGN KEY (source_fund_id) REFERENCES funds (source_fund_id),
  CONSTRAINT fk_transactions_run FOREIGN KEY (last_run_id) REFERENCES ingestion_runs (run_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cash_flows (
  source_fund_id VARCHAR(64) NOT NULL,
  business_date DATE NOT NULL,
  net_value_brl DECIMAL(30,10) NOT NULL,
  subscriptions_brl DECIMAL(30,10) NOT NULL,
  redemptions_brl DECIMAL(30,10) NOT NULL,
  last_run_id VARCHAR(80) NOT NULL,
  PRIMARY KEY (source_fund_id, business_date),
  CONSTRAINT fk_cash_flows_fund FOREIGN KEY (source_fund_id) REFERENCES funds (source_fund_id),
  CONSTRAINT fk_cash_flows_run FOREIGN KEY (last_run_id) REFERENCES ingestion_runs (run_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS corporate_payments (
  event_key CHAR(64) NOT NULL,
  source_fund_id VARCHAR(64) NOT NULL,
  ex_date DATE NOT NULL,
  gross_value_per_unit_brl DECIMAL(30,10) NOT NULL,
  description_restricted VARCHAR(255) NOT NULL,
  last_run_id VARCHAR(80) NOT NULL,
  PRIMARY KEY (event_key),
  KEY idx_payments_fund_date (source_fund_id, ex_date),
  CONSTRAINT fk_payments_fund FOREIGN KEY (source_fund_id) REFERENCES funds (source_fund_id),
  CONSTRAINT fk_payments_run FOREIGN KEY (last_run_id) REFERENCES ingestion_runs (run_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS drawdowns (
  source_fund_id VARCHAR(64) NOT NULL,
  business_date DATE NOT NULL,
  drawdown DECIMAL(24,12) NOT NULL,
  last_run_id VARCHAR(80) NOT NULL,
  PRIMARY KEY (source_fund_id, business_date),
  CONSTRAINT fk_drawdowns_fund FOREIGN KEY (source_fund_id) REFERENCES funds (source_fund_id),
  CONSTRAINT fk_drawdowns_run FOREIGN KEY (last_run_id) REFERENCES ingestion_runs (run_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS liquidity_horizons (
  source_fund_id VARCHAR(64) NOT NULL,
  as_of_date DATE NOT NULL,
  projection_days SMALLINT UNSIGNED NOT NULL,
  nav_percent DECIMAL(24,12) NULL,
  last_run_id VARCHAR(80) NOT NULL,
  PRIMARY KEY (source_fund_id, as_of_date, projection_days),
  CONSTRAINT fk_liquidity_fund FOREIGN KEY (source_fund_id) REFERENCES funds (source_fund_id),
  CONSTRAINT fk_liquidity_run FOREIGN KEY (last_run_id) REFERENCES ingestion_runs (run_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stress_results (
  source_fund_id VARCHAR(64) NOT NULL,
  business_date DATE NOT NULL,
  stress_mask_ids VARCHAR(255) NOT NULL,
  success TINYINT(1) NOT NULL,
  error_message VARCHAR(255) NULL,
  result_json_restricted LONGTEXT NULL,
  last_run_id VARCHAR(80) NOT NULL,
  PRIMARY KEY (source_fund_id, business_date),
  CONSTRAINT fk_stress_fund FOREIGN KEY (source_fund_id) REFERENCES funds (source_fund_id),
  CONSTRAINT fk_stress_run FOREIGN KEY (last_run_id) REFERENCES ingestion_runs (run_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dv01_results (
  source_fund_id VARCHAR(64) NOT NULL,
  business_date DATE NOT NULL,
  success TINYINT(1) NOT NULL,
  error_message VARCHAR(255) NULL,
  item_count INT UNSIGNED NOT NULL,
  items_sha256 CHAR(64) NOT NULL,
  last_run_id VARCHAR(80) NOT NULL,
  PRIMARY KEY (source_fund_id, business_date),
  CONSTRAINT fk_dv01_fund FOREIGN KEY (source_fund_id) REFERENCES funds (source_fund_id),
  CONSTRAINT fk_dv01_run FOREIGN KEY (last_run_id) REFERENCES ingestion_runs (run_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dv01_items (
  item_key CHAR(64) NOT NULL,
  source_fund_id VARCHAR(64) NOT NULL,
  business_date DATE NOT NULL,
  item_code VARCHAR(32) NOT NULL,
  instrument_code VARCHAR(32) NOT NULL,
  instrument_category VARCHAR(96) NOT NULL,
  strategy_name_restricted VARCHAR(160) NOT NULL,
  risk_factor_code VARCHAR(32) NOT NULL,
  risk_factor_vertex INT NULL,
  dv01_notional_value DECIMAL(30,12) NULL,
  financial_value DECIMAL(30,12) NULL,
  exposure_unit_json_restricted TEXT NULL,
  last_run_id VARCHAR(80) NOT NULL,
  PRIMARY KEY (item_key),
  KEY idx_dv01_items_fund_date (source_fund_id, business_date),
  KEY idx_dv01_items_instrument (instrument_code),
  CONSTRAINT fk_dv01_items_result FOREIGN KEY (source_fund_id, business_date) REFERENCES dv01_results (source_fund_id, business_date),
  CONSTRAINT fk_dv01_items_run FOREIGN KEY (last_run_id) REFERENCES ingestion_runs (run_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bond_instruments (
  source_fund_id VARCHAR(64) NOT NULL,
  instrument_id_restricted VARCHAR(96) NOT NULL,
  instrument_code VARCHAR(32) NOT NULL,
  cetip_code_restricted VARCHAR(32) NULL,
  isin_restricted VARCHAR(32) NULL,
  maturity_date DATE NULL,
  last_run_id VARCHAR(80) NOT NULL,
  PRIMARY KEY (source_fund_id, instrument_id_restricted),
  KEY idx_bonds_code (instrument_code),
  CONSTRAINT fk_bonds_fund FOREIGN KEY (source_fund_id) REFERENCES funds (source_fund_id),
  CONSTRAINT fk_bonds_run FOREIGN KEY (last_run_id) REFERENCES ingestion_runs (run_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS var_mask_configs (
  var_mask_id_restricted VARCHAR(64) NOT NULL,
  mask_code VARCHAR(32) NOT NULL,
  name_restricted VARCHAR(160) NOT NULL,
  time_horizon INT NOT NULL,
  period_value INT NOT NULL,
  probability DECIMAL(12,10) NOT NULL,
  method_type VARCHAR(32) NOT NULL,
  monte_carlo_iterations INT NULL,
  benchmark_id_restricted VARCHAR(64) NULL,
  last_run_id VARCHAR(80) NOT NULL,
  PRIMARY KEY (var_mask_id_restricted),
  UNIQUE KEY uq_var_mask_code (mask_code),
  CONSTRAINT fk_var_masks_run FOREIGN KEY (last_run_id) REFERENCES ingestion_runs (run_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gold_allocations (
  source_fund_id VARCHAR(64) NOT NULL,
  snapshot_date DATE NOT NULL,
  group_identifier VARCHAR(64) NOT NULL,
  nav_value_brl DECIMAL(30,10) NOT NULL,
  weight DECIMAL(24,12) NOT NULL,
  holdings_count INT UNSIGNED NOT NULL,
  quality_status VARCHAR(24) NOT NULL,
  last_run_id VARCHAR(80) NOT NULL,
  PRIMARY KEY (source_fund_id, snapshot_date, group_identifier),
  KEY idx_gold_allocations_date (snapshot_date),
  CONSTRAINT fk_gold_allocations_fund FOREIGN KEY (source_fund_id) REFERENCES funds (source_fund_id),
  CONSTRAINT fk_gold_allocations_nav FOREIGN KEY (source_fund_id, snapshot_date) REFERENCES fund_nav_snapshots (source_fund_id, snapshot_date),
  CONSTRAINT fk_gold_allocations_run FOREIGN KEY (last_run_id) REFERENCES ingestion_runs (run_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gold_fund_latest (
  source_fund_id VARCHAR(64) NOT NULL,
  snapshot_date DATE NOT NULL,
  nav_brl DECIMAL(30,10) NOT NULL,
  daily_return DECIMAL(24,12) NULL,
  holdings_available TINYINT(1) NOT NULL,
  freshness_days INT NOT NULL,
  quality_status VARCHAR(24) NOT NULL,
  last_run_id VARCHAR(80) NOT NULL,
  PRIMARY KEY (source_fund_id),
  KEY idx_gold_latest_date (snapshot_date),
  CONSTRAINT fk_gold_latest_fund FOREIGN KEY (source_fund_id) REFERENCES funds (source_fund_id),
  CONSTRAINT fk_gold_latest_nav FOREIGN KEY (source_fund_id, snapshot_date) REFERENCES fund_nav_snapshots (source_fund_id, snapshot_date),
  CONSTRAINT fk_gold_latest_run FOREIGN KEY (last_run_id) REFERENCES ingestion_runs (run_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lineage_records (
  lineage_id CHAR(64) NOT NULL,
  run_id VARCHAR(80) NOT NULL,
  logical_name VARCHAR(128) NOT NULL,
  source_row INT UNSIGNED NOT NULL,
  source_sha256 CHAR(64) NOT NULL,
  target_table VARCHAR(64) NOT NULL,
  target_key_hash CHAR(64) NOT NULL,
  PRIMARY KEY (lineage_id),
  KEY idx_lineage_run_target (run_id, target_table),
  KEY idx_lineage_target_key (target_key_hash),
  CONSTRAINT fk_lineage_run FOREIGN KEY (run_id) REFERENCES ingestion_runs (run_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
