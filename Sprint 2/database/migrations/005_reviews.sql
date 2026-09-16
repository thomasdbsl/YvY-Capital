CREATE TABLE IF NOT EXISTS issue_reviews (
  issue_id CHAR(64) COLLATE utf8mb4_unicode_ci NOT NULL PRIMARY KEY,
  status ENUM('open','resolved','quarantined') NOT NULL,
  analyst_note VARCHAR(1000) NOT NULL DEFAULT '',
  reviewed_by BIGINT UNSIGNED NOT NULL,
  reviewed_at DATETIME NOT NULL,
  revision INT UNSIGNED NOT NULL,
  CONSTRAINT fk_review_issue FOREIGN KEY (issue_id) REFERENCES quality_issues(issue_id),
  CONSTRAINT fk_review_actor FOREIGN KEY (reviewed_by) REFERENCES app_users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
