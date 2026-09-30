# Maintenance guide

## Architecture and ownership

The active application is in `Sprint 2/`; the directory name is historical, not a synthetic-data runtime mode. Preserve the current vanilla JavaScript frontend, PHP services and MySQL storage. Requests follow controller -> service -> repository/PDO -> MySQL. Authorized CSV exports enter through `src/pipeline/run_sprint3.py`.

| Responsibility | Location relative to Sprint 2 |
| --- | --- |
| Navigation, interaction and formatting | `src/app/js/` and `src/app/styles/` |
| Input validation, sessions and generic errors | `api/bootstrap.php`, `api/services/AuthService.php` |
| Financial conventions | `api/services/FinancialMath.php` |
| Common windows, allocation and comparison | `api/services/FundsService.php` |
| Source-backed risk and Stress parsing | `api/services/RiskService.php`, `StressParser.php` |
| Authorized SQL access | `api/repositories/` |
| Tickets and reviews | `TicketService.php`, `ReviewService.php`, `ReconciliationService.php` |
| Source contracts and validation | `src/pipeline/contracts.py`, `ingest.py` |
| Curated projections and loading | `src/pipeline/transform.py`, `mysql_loader.py` |
| Locks and atomic operational reports | `src/pipeline/operations.py` |

Do not duplicate financial calculations in JavaScript. Display formatting must preserve unavailable values, ratio units, selected dates and source freshness. Drawdown, Liquidity, Stress and DV01 contain source-provided measures; changing them requires source-methodology evidence, not an aesthetic adjustment.

## Data governance

Source files remain immutable and restricted. Raw evidence records input identity, SHA-256 and row counts. Bronze parsing applies declared types and keys; Silver validation rejects invalid evidence; Gold provides business projections; serving combines curated data through authorized services. The deterministic run identity includes source fingerprints and transformation version. Financial loading is transactional; quarantine is retained for investigation.

Reviewing an exception is a workflow action, not a source repair. Preserve original run evidence and audit events. A corrected export requires controlled re-ingestion. Trace a displayed value through its fund, date, API, repository table, run, lineage fingerprint and source manifest. Do not put original rows or private identifiers into diagnostic screenshots or issues.

## Schema changes

The baseline schema is `database/sprint3_schema.sql`; ordered migrations are in `database/migrations/`. Python setup applies the schema and sorted migrations. The PHP migration entry point is `scripts/migrate_sprint4.php`; keep its upgrade chain synchronized when adding a migration.

Before changing the schema, back up a QA copy and examine actual constraints and dependent queries. New migrations must be rerunnable and preserve financial rows, users, tickets, reviews and audit. Test both an absent database and an upgraded Sprint 4 copy. Do not use `--reset-database` to implement an upgrade. MySQL DDL can auto-commit: a failed migration is not proof that previous DDL rolled back. Restore into a separate database if recovery is needed.

## Extending the data path

1. For a source, agree its authorization, semantics, units, encoding, columns and natural key. Add the contract in `contracts.py` and safe validation in `ingest.py`.
2. Add accepted-row transformation, target schema and load order. Include lineage and define null semantics explicitly.
3. For a quality rule, assign a stable rule ID, severity, blocking scope and safe message. Add passing, warning, malformed, duplicate and missing-reference tests as applicable.
4. Add service/repository access only for authorized fields. Extend the source-to-screen mapping and manifest tests.
5. Verify repeat import cardinalities, rollback, privacy and the unavailable UI state. Never repair a failed test by inserting a synthetic runtime fallback.

`quality.py`, `generate.py` and the historical `run_pipeline.py` belong to earlier prototype tooling; do not assume they are the governed ingestion entry point.

## Adding an API or workflow

Use `run_endpoint`, explicit methods and allowed query keys. Validate fund aliases and dates, use prepared PDO statements, and allowlist response fields. A new Analyst-only route must be covered by backend role enforcement, not just hidden navigation. Writes require CSRF, object ownership/role checks, appropriate optimistic revision handling and an audit entry without sensitive payload duplication.

Test unauthorized, forbidden, missing CSRF, malformed input, SQL/XSS-like input, cross-user access and concurrent revision cases. Preserve generic errors and safe operational logging. Keep passwords and session identifiers out of all test output.

## Peer adapter

`PeerSourceAdapter.php` defines the adapter boundary; `PeerService.php` enforces certification before exposing a dataset. Connect only a written, authorized source with agreed entity/category mapping, permitted metrics and compatible dates. Extend duplicate/reference/date/privacy tests and common-window comparisons. An adapter that passes fixtures is not a certified live peer integration.

## Regression commands

Run `npm run lint`, `npm run build`, and `npm test` from the root with an isolated QA database configured. Current legacy integration helpers require a database name ending in `_sprint4_qa`; the account lifecycle test accepts `_qa`. Never point test provisioning or mutation suites at the primary database. `npm run test:accounts` covers reset, role change, disable and session invalidation. `npm run test:business` covers financial conventions, peer/Stress parsing and safe error handling.

Before release, also test fresh setup, upgrade preservation, replay, rollback, backup/restore and clean extraction; inspect all views and both roles in the browser. Automated green results alone do not establish partner acceptance. Record actual versions, dates, counts and limitations in release evidence.
