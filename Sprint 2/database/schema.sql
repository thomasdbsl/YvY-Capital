-- Funds Manager Sprint 2 - local synthetic demonstration database.
-- Compatible with the MySQL 5.7 server bundled with MAMP for Windows.

CREATE DATABASE IF NOT EXISTS yvy_funds_manager_demo
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE yvy_funds_manager_demo;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS lineage_proofs;
DROP TABLE IF EXISTS anomalies;
DROP TABLE IF EXISTS peer_samples;
DROP TABLE IF EXISTS fund_kpis;
DROP TABLE IF EXISTS performance_history;
DROP TABLE IF EXISTS positions;
DROP TABLE IF EXISTS allocations;
DROP TABLE IF EXISTS funds;
DROP TABLE IF EXISTS dataset_runs;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE dataset_runs (
  run_id VARCHAR(64) NOT NULL,
  status VARCHAR(40) NOT NULL,
  generated_at DATETIME NOT NULL,
  accepted_records INT UNSIGNED NOT NULL,
  quarantined_records INT UNSIGNED NOT NULL,
  manifest_ref VARCHAR(255) NOT NULL,
  classification VARCHAR(40) NOT NULL,
  publication_allowed TINYINT(1) NOT NULL DEFAULT 0,
  business_date DATE NOT NULL,
  PRIMARY KEY (run_id),
  KEY idx_dataset_runs_generated_at (generated_at),
  KEY idx_dataset_runs_business_date (business_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE funds (
  fund_id VARCHAR(32) NOT NULL,
  label VARCHAR(80) NOT NULL,
  coverage VARCHAR(40) NOT NULL,
  aum_brl DECIMAL(20,2) NOT NULL,
  nav_per_share DECIMAL(20,8) NOT NULL,
  daily_return DECIMAL(18,10) NOT NULL,
  quality_status VARCHAR(32) NOT NULL,
  freshness_status VARCHAR(32) NOT NULL,
  lineage_ref VARCHAR(80) NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (fund_id),
  UNIQUE KEY uq_funds_label (label),
  UNIQUE KEY uq_funds_lineage_ref (lineage_ref),
  KEY idx_funds_sort_order (sort_order),
  KEY idx_funds_quality_status (quality_status),
  KEY idx_funds_freshness_status (freshness_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE allocations (
  allocation_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  run_id VARCHAR(64) NOT NULL,
  fund_id VARCHAR(32) NULL,
  asset_class VARCHAR(80) NOT NULL,
  weight DECIMAL(18,10) NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (allocation_id),
  UNIQUE KEY uq_allocations_run_sort (run_id, sort_order),
  KEY idx_allocations_fund (fund_id),
  CONSTRAINT fk_allocations_run FOREIGN KEY (run_id) REFERENCES dataset_runs (run_id),
  CONSTRAINT fk_allocations_fund FOREIGN KEY (fund_id) REFERENCES funds (fund_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE positions (
  position_id VARCHAR(32) NOT NULL,
  fund_id VARCHAR(32) NOT NULL,
  instrument_alias VARCHAR(80) NOT NULL,
  issuer_alias VARCHAR(80) NOT NULL,
  custodian_alias VARCHAR(80) NOT NULL,
  asset_class VARCHAR(80) NOT NULL,
  value_brl DECIMAL(20,2) NOT NULL,
  weight DECIMAL(18,10) NOT NULL,
  price_age_days SMALLINT UNSIGNED NOT NULL,
  lineage_ref VARCHAR(80) NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (position_id),
  UNIQUE KEY uq_positions_lineage_ref (lineage_ref),
  KEY idx_positions_fund_sort (fund_id, sort_order),
  KEY idx_positions_fund_asset_class (fund_id, asset_class),
  CONSTRAINT fk_positions_fund FOREIGN KEY (fund_id) REFERENCES funds (fund_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE performance_history (
  fund_id VARCHAR(32) NOT NULL,
  business_date DATE NOT NULL,
  nav_index DECIMAL(20,8) NOT NULL,
  benchmark_index DECIMAL(20,8) NOT NULL,
  lineage_ref VARCHAR(80) NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (fund_id, business_date),
  UNIQUE KEY uq_performance_lineage_ref (lineage_ref),
  KEY idx_performance_fund_sort (fund_id, sort_order),
  CONSTRAINT fk_performance_fund FOREIGN KEY (fund_id) REFERENCES funds (fund_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE fund_kpis (
  kpi_id VARCHAR(32) NOT NULL,
  fund_id VARCHAR(32) NULL,
  name VARCHAR(160) NOT NULL,
  value DECIMAL(24,10) NULL,
  unit VARCHAR(64) NOT NULL,
  quality_status VARCHAR(32) NOT NULL,
  implementation_status VARCHAR(64) NOT NULL,
  lineage_ref VARCHAR(80) NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (kpi_id),
  UNIQUE KEY uq_fund_kpis_lineage_ref (lineage_ref),
  KEY idx_fund_kpis_fund_sort (fund_id, sort_order),
  KEY idx_fund_kpis_quality_status (quality_status),
  CONSTRAINT fk_fund_kpis_fund FOREIGN KEY (fund_id) REFERENCES funds (fund_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE peer_samples (
  peer_id VARCHAR(32) NOT NULL,
  run_id VARCHAR(64) NOT NULL,
  return_index DECIMAL(20,8) NOT NULL,
  status VARCHAR(32) NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (peer_id),
  KEY idx_peer_samples_run_sort (run_id, sort_order),
  CONSTRAINT fk_peer_samples_run FOREIGN KEY (run_id) REFERENCES dataset_runs (run_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE anomalies (
  anomaly_id VARCHAR(96) NOT NULL,
  run_id VARCHAR(64) NOT NULL,
  rule_id VARCHAR(32) NOT NULL,
  severity VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL,
  title VARCHAR(255) NOT NULL,
  record_ref VARCHAR(96) NOT NULL,
  action VARCHAR(32) NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (anomaly_id),
  KEY idx_anomalies_run_sort (run_id, sort_order),
  KEY idx_anomalies_severity_status (severity, status),
  KEY idx_anomalies_rule (rule_id),
  CONSTRAINT fk_anomalies_run FOREIGN KEY (run_id) REFERENCES dataset_runs (run_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE lineage_proofs (
  screen_value_id VARCHAR(80) NOT NULL,
  kpi_id VARCHAR(32) NOT NULL,
  lineage_ref VARCHAR(80) NOT NULL,
  source_id VARCHAR(80) NOT NULL,
  source_record_id VARCHAR(96) NOT NULL,
  run_id VARCHAR(64) NOT NULL,
  business_date DATE NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (screen_value_id),
  UNIQUE KEY uq_lineage_proofs_lineage_ref (lineage_ref),
  KEY idx_lineage_proofs_run_sort (run_id, sort_order),
  KEY idx_lineage_proofs_kpi (kpi_id),
  CONSTRAINT fk_lineage_proofs_run FOREIGN KEY (run_id) REFERENCES dataset_runs (run_id),
  CONSTRAINT fk_lineage_proofs_kpi FOREIGN KEY (kpi_id) REFERENCES fund_kpis (kpi_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
