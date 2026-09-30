# Deployment guide

## Target and release gate

YvY's managed deployment target, hostname, operator and infrastructure policy remain **TO BE DEFINED BY YVY**. No production deployment or partner acceptance is claimed. The current tested local stack is Windows, MAMP MySQL/PHP, Python 3.12 and Node.js for startup/tests. A final release must pass the gap matrix gates before being labeled handover-ready.

## Local installation flow

Use the repository root as the command working directory. Install PHP with PDO MySQL, MySQL and its command-line tools, Python 3.12 and Node.js. MAMP is the tested local distribution, not a dependency on a particular user's directory.

1. Review `.env.example`. Set environment variables in the terminal/service environment; the example itself is not a secret store and is not automatically loaded by PHP/Python.
2. Configure DB host, port, name, user and password. Set `MAMP_MYSQL_EXECUTABLE` if MySQL is not in the discovered/default MAMP location. Set `PHP_EXECUTABLE` and `PHP_INI` where needed.
3. Run `npm ci`. Keep immutable authorized CSV exports outside the served directories; do not ship them in the public source package.
4. Run `powershell -ExecutionPolicy Bypass -File "Sprint 2/scripts/setup_database.ps1" -InputPath "<authorized-source-directory>"`. This creates/applies the schema and imports sources without manual SQL edits.
5. Run `npm run database:migrate`, then provision role accounts using the operations guide. Choose unique strong passwords, not the historic demonstration credentials.
6. Run `npm start` and open `http://127.0.0.1:4173/src/app/`. Authenticate with both roles and inspect Analyst health, freshness and quarantine evidence.

The setup requires authorized data; the release must not silently substitute test fixtures. `--dry-run` validates input but does not populate MySQL. Browser tests need the Playwright browser installed for the configured local runtime.

## Managed PHP/MySQL installation

Agree the target before provisioning it. Do not use PHP's development server as a public production server. The operator must configure a supported PHP web server, HTTPS, a private MySQL connection, an appropriately restricted application DB account, and a separate migration/ingestion account when privileges differ.

Serve only intended application assets and API routes. Preserve the routing restrictions in `Sprint 2/.htaccess` or implement equivalent rules for the chosen server. Deny source exports, scripts, migrations, tests, configuration, backups and hidden files. Verify denial with HTTP requests; merely placing an `.htaccess` file does not prove that the server honors it.

Set allowed origins to the deployed origin, secure session cookies for HTTPS, `display_errors=Off`, protected PHP logs and a writable session directory outside public paths. Keep DB credentials in protected service configuration, not a URL, Git commit or browser bundle. Review filesystem access for input, operational state and backup locations.

For the managed target, set `FUNDS_MANAGER_ENV=production` (`local` and `test` are the other accepted values). Production requires `FUNDS_MANAGER_SECURE_COOKIE=1`, debug disabled, exact HTTPS origins without paths/wildcards, a non-root database user and a non-placeholder password. Invalid configuration is rejected before normal API operation. This guard does not configure TLS, least-privilege grants or protected log/session storage for the operator.

## Scheduled ingestion

No scheduler is installed by this project. The operator can configure Windows Task Scheduler to run Python 3.12 with `"Sprint 2/src/pipeline/run_sprint3.py" --input "<authorized-source-directory>"` from the release root. Provide credentials through the service account's protected environment and capture stderr JSON to protected logs. Monitor exit code and counts, not just process completion.

Designate one ingestion host. Separate checkouts targeting the same database must share `FUNDS_MANAGER_LOCK_DIR`. Local file locks do not coordinate independent hosts. Prevent scheduling overlap and alert on nonzero exit codes and stale business dates. Agree retention and alert ownership with YvY.

## Upgrade, rollback and acceptance

Stop writes and ingestion during the controlled upgrade window. Retain the previous release, separate environment configuration and a verified backup. Test migrations against a QA restore first, then apply them to the intended database. Compare financial and workflow records and rerun authenticated smoke tests before reopening access.

Rollback uses the matching prior release and a separate restored database, not reverse Git history or destructive resets. Resolve any post-backup workflow changes with the operator before switching. Detailed backup/restore commands are in `OPERATIONS_GUIDE.md`.

YvY must nominate Executive and Analyst reviewers, confirm risk units and approve the business interpretation. Infrastructure readiness, technical QA and formal partner acceptance are separate decisions.
