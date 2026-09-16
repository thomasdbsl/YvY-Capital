CREATE TABLE IF NOT EXISTS app_users (
  user_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('EXECUTIVE','ANALYST') NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  failed_attempts INT UNSIGNED NOT NULL DEFAULT 0,
  locked_until DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_app_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_events (
  event_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  actor_role ENUM('EXECUTIVE','ANALYST') NOT NULL,
  occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  action VARCHAR(64) NOT NULL,
  target_type VARCHAR(48) NOT NULL,
  target_id VARCHAR(128) NOT NULL,
  previous_state JSON NULL,
  new_state JSON NULL,
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES app_users(user_id),
  KEY idx_audit_target (target_type,target_id,event_id),
  KEY idx_audit_time (occurred_at,event_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
