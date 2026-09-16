CREATE TABLE IF NOT EXISTS reconciliation_evidence (
  evidence_id CHAR(64) NOT NULL PRIMARY KEY,
  run_id VARCHAR(80) NOT NULL,
  fund_code VARCHAR(32) NULL,
  snapshot_date DATE NOT NULL,
  expected_nav DECIMAL(30,12) NULL,
  holdings_total DECIMAL(30,12) NULL,
  difference_value DECIMAL(30,12) NULL,
  difference_fraction DECIMAL(30,12) NULL,
  rule_id VARCHAR(32) NOT NULL,
  rule_status ENUM('pass','fail','unavailable') NOT NULL,
  severity VARCHAR(16) NOT NULL,
  issue_id CHAR(64) NULL,
  CONSTRAINT fk_reconciliation_run FOREIGN KEY (run_id) REFERENCES ingestion_runs(run_id),
  CONSTRAINT fk_reconciliation_issue FOREIGN KEY (issue_id) REFERENCES quality_issues(issue_id),
  KEY idx_reconciliation_run_fund (run_id,fund_code,snapshot_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
