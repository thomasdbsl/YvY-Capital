CREATE TABLE IF NOT EXISTS pipeline_attempts (
  attempt_id CHAR(32) NOT NULL PRIMARY KEY,
  run_id VARCHAR(64) NULL,
  status ENUM('running','completed','completed_with_warnings','completed_with_quarantine','blocked','failed') NOT NULL,
  stage VARCHAR(32) NOT NULL,
  started_at DATETIME(6) NOT NULL,
  completed_at DATETIME(6) NULL,
  duration_ms BIGINT UNSIGNED NULL,
  error_code VARCHAR(64) NULL,
  KEY idx_attempt_latest (started_at,attempt_id),
  KEY idx_attempt_failure (status,started_at,attempt_id),
  KEY idx_attempt_run (run_id,started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
