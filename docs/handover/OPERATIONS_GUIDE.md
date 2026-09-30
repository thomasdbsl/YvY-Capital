# Operations guide

## Configuration and startup

Run commands from the repository root. Use Python 3.12, Node.js, PHP with PDO MySQL, and MySQL. Windows MAMP is the tested local environment. The database administrator supplies credentials through environment variables; no default application passwords are distributed.

Configure `FUNDS_MANAGER_DB_HOST`, `FUNDS_MANAGER_DB_PORT`, `FUNDS_MANAGER_DB_NAME`, `FUNDS_MANAGER_DB_USER`, `FUNDS_MANAGER_DB_PASSWORD` and `MAMP_MYSQL_EXECUTABLE`. For PHP outside the automatic MAMP discovery, configure `PHP_EXECUTABLE` and `PHP_INI`. Consult the root README for environment syntax.

1. Start MySQL and verify its configured port.
2. Install development/test dependencies with `npm ci`.
3. Put authorized immutable source files in the restricted local input directory.
4. Run `npm run database:setup` for schema and controlled ingestion.
5. Run `npm run database:migrate` for the application migrations.
6. Provision the required role accounts as described below.
7. Run `npm start`; keep the process open.
8. Open `http://127.0.0.1:4173/src/app/` and authenticate.

Stop the local application with Ctrl+C. Stop MySQL only after imports and backups have finished. The development PHP server is a local demonstration environment; use the deployment guide for a managed installation.

## Provisioning and password reset

Set `FUNDS_MANAGER_PROVISION_USERNAME`, `FUNDS_MANAGER_PROVISION_ROLE` (`EXECUTIVE` or `ANALYST`), and `FUNDS_MANAGER_PROVISION_PASSWORD` to an operator-selected password of 12-72 bytes. Run `npm run auth:provision`, then clear the password environment variable. Repeating this command for an existing username resets its password, updates its role and reactivates it. Do not print or store the password in logs or a script committed to Git.

Passwords and database credentials are separate. An HTTP 503 during login can indicate a database connection problem; changing the user's password is not a repair for unavailable MySQL.

Password reset or role change invalidates existing sessions on their next authenticated request. Users must sign in again. Sessions created before the credential-fingerprint update also require a new sign-in.

To disable an account, set `FUNDS_MANAGER_PROVISION_USERNAME` and `FUNDS_MANAGER_PROVISION_ACTION=disable`, then run `npm run auth:provision`. No password is required for this operation. Existing sessions are rejected on their next request and new sign-ins are refused. Clear the action variable afterward. To reactivate, set the action to `provision` and provide the intended role and a new password. Account administration requires trusted local CLI/database access; it is not an Executive or Analyst browser permission.

## Controlled ingestion

```text
py -3.12 "Sprint 2/src/pipeline/run_sprint3.py" --input "<authorized-source-directory>" --database <configured-database>
```

Never edit original source files to suppress quality issues. Invalid rows are quarantined with evidence. An accepted run may complete with warnings or quarantine; inspect status and counts before deciding whether the data is suitable for use.

`--reset-database` is destructive and is restricted to explicitly designated database names ending in `_qa`. Never use it for an upgrade or routine ingestion. Back up the configured database before migrations; normal ingestion does not require a reset.

CLI exit codes: 0 means completed (possibly with warnings/quarantine); 1 means validation blocked; 2 means an operational failure; 3 means a concurrent local process holds the lock. Stdout contains the final JSON summary. Stderr contains allowlisted JSON operational events; retain it in access-controlled logs and rotate according to the operator's policy.

After ingestion, each source manifest emits a `source` / `observed` event with the deterministic run ID, `source_rows`, and a stable `SRC_` alias derived from the logical source name. These events identify which source categories were observed without printing file paths, names or row contents. The alias is not a content checksum: use the governed manifest's SHA-256 to identify the exact input bytes. An observed source is not proof of successful publication; check the final exit code, load stage and run status.

The report is atomically replaced at `Sprint 2/src/pipeline/output_sprint3/sprint3_run_report.json`. An older report can remain after a failed attempt, so always inspect the exit code and execution logs, not just the presence of this file.

Migration 009 adds `pipeline_attempts`. Each non-dry invocation after schema setup receives a unique attempt ID, independent of the deterministic data run ID. It records UTC start/end, current stage, duration, status and a safe error code in separate transactions. An ingestion/load/report failure does not erase its attempt when financial loading rolls back. A blocked validation records `blocked`, not a successful publication. Stage durations are emitted as structured stderr events.

Failures before schema setup, or while MySQL is unreachable, cannot be guaranteed to reach the database; monitor stderr/exit code as well. A forcibly killed process can leave `running` evidence: check the process and logs rather than assuming it is still active. A failure during report writing can follow an already committed data load; inspect the stage and last successful run before retrying.

Replaying a dataset preserves fund identities referenced by tickets. A change that reassigns an existing alias is rejected for controlled mapping review. Removing a fund still referenced by workflow records also fails transactionally rather than deleting the ticket or silently redirecting it. Coordinate such source-universe changes with the maintainer.

`FUNDS_MANAGER_LOCK_DIR` overrides the local lock directory. Processes targeting the same database on one host must share this directory, including separate release checkouts. The OS releases the lock on process termination; the persistent lock file is normal and must not be deleted during execution. Local locking is not distributed coordination: designate one ingestion host until database-level coordination is verified.

## Health and freshness

Unexpected API failures write a JSON operational event through PHP's configured `error_log`: UTC timestamp, component, safe error code and HTTP status. Database failures use `DATABASE_UNAVAILABLE` (503); unexpected failures use `UNEXPECTED_API_ERROR` (500). Exception text, SQL, request bodies and credentials are deliberately omitted. Configure a protected server log destination outside the web root and retention/rotation in the deployment environment. Do not enable `display_errors` on a shared installation.

Authenticate as Analyst and request `/api/health.php`. Inspect database connectivity, latest successful ingestion, source timestamps and warning/quarantine counts. `/api/runs.php` and the Runs & Lineage screen provide the persisted evidence. HTTP 401 requires authentication; 403 indicates insufficient permission. File modification timestamps and financial observation dates describe different events and must not be presented as today's business data.

Health includes `operations.latest_attempt`, `operations.latest_failed_attempt`, `operations.latest_business_date`, stage counts and quality counts. `status=degraded` means the latest recorded attempt is failed or blocked; it does not mean the retained financial data was erased. `source_freshness` is based on the last successful input manifest. Business dashboard lineage and default reconciliation remain attached to the last successful run, while operational history retains failed/blocked runs.

## Date and timestamp conventions

Financial dates are source business dates, not instants to convert into the browser's timezone. Preserve snapshot and return dates as `YYYY-MM-DD`. New PHP database connections explicitly select UTC, so new ticket/review/audit `CURRENT_TIMESTAMP` values use UTC; pipeline attempt timestamps also use UTC. Pipeline JSON logs use an explicit `+00:00` UTC offset; API logs use UTC timestamps. Historical `DATETIME` workflow rows have no stored timezone and are not silently rewritten during upgrade: retain the original installation's timezone provenance when interpreting them.

Health also returns the application release version and configured environment. Neither application uptime nor a recent successful login implies that the financial source date is current.

## Backup and restore

Backup files contain restricted data and authentication hashes. Keep them outside the web root, in access-controlled storage with an agreed retention/encryption policy. The root `backups/` directory is ignored by Git and excluded from release packaging. Configure `FUNDS_MANAGER_MYSQLDUMP` when mysqldump is not beside the configured MySQL client.

```text
py -3.12 "Sprint 2/scripts/database_backup.py" backup --database <source-database> --file backups/pre-release.sql
py -3.12 "Sprint 2/scripts/database_backup.py" restore --database <new-restore-database> --file backups/pre-release.sql
```

The script creates a SHA-256 sidecar. Keep both files together. It refuses existing backup destinations, altered dumps and existing destination databases. Restore only backups produced by this script from trusted, controlled storage; a checksum verifies integrity, not SQL trustworthiness. Do not import an arbitrary third-party dump.

Back up only while no schema migration is running. Single-transaction dumps assume InnoDB business tables. After restoration, compare table counts/checksums and run authenticated API/browser smoke checks before switching the application configuration. An interrupted restore can leave a partial target database: retain it for inspection and retry into a new, absent target. The script never automatically drops it.

## Rollback

Before an upgrade, retain the previous source package, its manifest, the environment configuration separately, and a verified database backup. Stop application writes and ingestion, restore into a separate database, verify it with the matching previous release, then point the application at the restored database. Do not rewrite Git history or run blind reverse migrations. Reconcile post-backup writes with the operator before switching.

## Common failures

- Database unavailable: check MySQL, port, database name, credentials and PDO MySQL extension in the PHP process environment.
- Session unavailable: verify the PHP session directory is writable by the service account and outside the served directory.
- Pipeline busy: identify the active import and wait; do not remove its lock file.
- Invalid source: preserve input bytes, inspect safe quality evidence and request corrected authorized exports.
- Restore failure: inspect target state and use a new destination; do not overwrite the primary database.

## Verification evidence

2026-09-30: scripts from the cleanly extracted 1.0.0 release backed up its dedicated QA database and restored it into a separate absent QA database. All 29 tables and 13,360 rows matched by table-content hashes. API integration and the twelve-view browser smoke then passed against the restored database. The restricted dump is retained locally outside the release archive; its SHA-256 is `5d2a56ade6d4c90e26968162116df966a878b13b13bffde9705b84ea537ff54d` (3,705,094 bytes). Earlier Sprint 4 upgrade evidence remains in the gap matrix.
