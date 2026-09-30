CREATE TABLE IF NOT EXISTS tickets (
  ticket_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  created_by BIGINT UNSIGNED NOT NULL,
  title VARCHAR(160) NOT NULL,
  description VARCHAR(2000) NOT NULL,
  category ENUM('DATA_QUALITY','PERFORMANCE','ALLOCATION','RISK','RECONCILIATION','OTHER') NOT NULL,
  priority ENUM('LOW','NORMAL','HIGH') NOT NULL DEFAULT 'NORMAL',
  related_fund_code VARCHAR(32) NULL,
  related_context VARCHAR(64) NULL,
  status ENUM('OPEN','IN_REVIEW','RESOLVED') NOT NULL DEFAULT 'OPEN',
  analyst_response VARCHAR(2000) NOT NULL DEFAULT '',
  assigned_analyst BIGINT UNSIGNED NULL,
  revision INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ticket_creator FOREIGN KEY (created_by) REFERENCES app_users(user_id),
  CONSTRAINT fk_ticket_analyst FOREIGN KEY (assigned_analyst) REFERENCES app_users(user_id),
  CONSTRAINT fk_ticket_fund FOREIGN KEY (related_fund_code) REFERENCES funds(fund_code),
  KEY idx_ticket_creator_time (created_by,created_at,ticket_id),
  KEY idx_ticket_queue (status,priority,updated_at,ticket_id),
  KEY idx_ticket_category (category,related_fund_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ticket_events (
  ticket_event_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  ticket_id BIGINT UNSIGNED NOT NULL,
  actor_user_id BIGINT UNSIGNED NOT NULL,
  actor_role ENUM('EXECUTIVE','ANALYST') NOT NULL,
  event_type ENUM('CREATED','STATUS_CHANGED','RESPONSE_ADDED','RESOLVED') NOT NULL,
  previous_status ENUM('OPEN','IN_REVIEW','RESOLVED') NULL,
  new_status ENUM('OPEN','IN_REVIEW','RESOLVED') NOT NULL,
  response_text VARCHAR(2000) NULL,
  occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ticket_event_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(ticket_id),
  CONSTRAINT fk_ticket_event_actor FOREIGN KEY (actor_user_id) REFERENCES app_users(user_id),
  KEY idx_ticket_event_history (ticket_id,ticket_event_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
