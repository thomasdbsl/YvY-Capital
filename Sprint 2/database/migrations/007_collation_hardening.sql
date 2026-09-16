-- Align authentication and audit identifiers with the governed Sprint 3 schema.
-- This is safe to re-run and repairs databases created before the explicit
-- utf8mb4_unicode_ci default was added to migration 004.
ALTER TABLE app_users CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE audit_events CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
