# Funds Manager - Sprint 5 / 1.0.0

Funds Manager is the Inteli x YvY Capital fund-monitoring application. This Sprint 5 source release preserves the governed data path and Sprint 4 features, adding operational monitoring, account lifecycle controls, backup/restore and technical handover documentation:

`immutable CSV files -> Python ingestion and quality pipeline -> MySQL -> PHP API and business services -> dashboard`

This is a **local restricted application**, not a production deployment or a claim of partner acceptance. See the handover gap matrix for verified delivery evidence and outstanding release gates. The browser receives aliased fund, holding, instrument, and issuer codes; restricted source identifiers remain in the local database and are never selected by the API.

## Security boundary

The GitHub repository is public. Never commit or package:

- `data_YvY/`, `data_YvY.zip`, portfolio exports, or a database data directory;
- real fund names, CNPJ, private ISIN, source instrument identifiers, or personal data;
- `.env`, `Sprint 2/api/config.php`, passwords, tokens, or private keys;
- generated pipeline outputs, caches, screenshots, reports, or temporary files.

The real CSV files are required locally to build the database, but they remain immutable and outside the delivery ZIP. Synthetic fixtures under `Sprint 2/tests/fixtures/` are versioned only for isolated and edge-case tests.

## Architecture

```text
Authorized CSV files (local only)
  -> Python contracts, parsing, validation, quarantine, normalization
  -> MySQL 5.7 relational Silver and Gold tables
  -> PHP 8 / PDO repositories
  -> PHP business services
  -> authenticated JSON endpoints with controlled review and ticket writes
  -> existing HTML/CSS/JavaScript dashboard
```

| Path | Responsibility |
|---|---|
| `Sprint 2/src/pipeline/` | deterministic ingestion, DQ, masking, transformation, lineage, and MySQL load |
| `Sprint 2/database/` | MySQL 5.7 base schema plus ordered Sprint 4 migrations, PK/FK, unique constraints, and indexes |
| `Sprint 2/scripts/setup_database.ps1` | one-command idempotent build or complete reset |
| `Sprint 2/api/repositories/` | parameterized MySQL queries |
| `Sprint 2/api/services/` | financial calculations and response composition |
| `Sprint 2/api/*.php` | authenticated HTTP validation, read endpoints, and CSRF-protected workflow writes |
| `Sprint 2/src/app/` | preserved Sprint 2 dashboard connected to the API |
| `Sprint 2/tests/` | data, database, business, API, privacy, and browser tests |
| `docs/architecture/` | backend architecture, Sequence Diagram, and ERD |
| `docs/sprint3/` | initial audit, implementation plan, and final report |

## 1. Prerequisites

Install the following locally:

- Windows 10 or 11 with PowerShell;
- [MAMP for Windows](https://www.mamp.info/en/windows/) with MySQL running;
- Python 3.12 available as `py -3.12`;
- Node.js 20 or later and npm;
- the MAMP PHP runtime with `pdo_mysql` enabled;
- the MAMP MySQL client, normally `C:\MAMP\bin\mysql\bin\mysql.exe`.

The project has been validated with MAMP MySQL 5.7 and PHP 8.3. MySQL 8 should also accept the schema, but the committed SQL intentionally stays MySQL 5.7 compatible.

## 2. Prepare the local source data

Create `data_YvY/` at the repository root and place the authorized structured CSV files directly inside it:

```text
data_YvY/
  funds.csv
  fund_nav_snapshot.csv
  portfolio_holdings.csv
  returns_navps.csv
  transactions_summary.csv
  cash_flow_daily.csv
  corporate_payments.csv
  drawdown.csv
  liquidity_by_horizon.csv
  stress_risk.csv
  dv01.csv
  bond_instruments.csv
  var_mask_configs.csv
  external_debenture_data_raw.csv
```

Do not rename, edit, normalize, or open-save these files before ingestion. The pipeline reads them, records their byte size, modification timestamp, row count, and SHA-256, and verifies through tests that their hashes do not change.

## 3. Start MAMP and MySQL

1. Open MAMP.
2. Start **MySQL**. Apache is optional when using `npm start`.
3. Note the MySQL port, user, and local password shown by your MAMP configuration.
4. Confirm that `pdo_mysql` is enabled for the selected MAMP PHP version.

No manual table creation or CSV import in phpMyAdmin is required.

## 4. Configure the current terminal

Copy the values from `.env.example` into the current PowerShell session and replace only the local placeholders:

```powershell
$env:FUNDS_MANAGER_DB_HOST = "127.0.0.1"
$env:FUNDS_MANAGER_DB_PORT = "3306"
$env:FUNDS_MANAGER_DB_NAME = "yvy_funds_manager"
$env:FUNDS_MANAGER_DB_USER = "root"
$env:FUNDS_MANAGER_DB_PASSWORD = "<LOCAL_MYSQL_PASSWORD>"
$env:MAMP_MYSQL_EXECUTABLE = "C:\MAMP\bin\mysql\bin\mysql.exe"
```

Environment variables are preferred because the password stays in memory. An optional local `Sprint 2/api/config.php` may be copied from `config.example.php`; it is ignored by Git and must never be committed.

## 5. Install project dependencies

From the repository root:

```powershell
npm install
```

## 6. Create the schema and import the real datasets

Run the idempotent setup command:

```powershell
npm run database:setup
```

The command:

1. validates exact CSV headers and parses typed values;
2. detects missing fields, duplicates, invalid references, invalid ranges, and portfolio/NAV mismatches;
3. quarantines invalid rows before curated storage;
4. creates or migrates the MySQL schema;
5. loads Silver and Gold tables in one transaction;
6. persists source manifests, quality issues, quarantine records, stage counts, and lineage;
7. produces the same run ID and row counts when the same bytes are imported again.

The local run report is written to `Sprint 2/src/pipeline/output_sprint3/sprint3_run_report.json`. It contains only metadata, counts, hashes, and opaque record references; this generated directory is ignored by Git.

Apply the additive Sprint 4 migrations, then provision one local account for each role. Passwords must contain 12-72 bytes and stay in environment variables only.

```powershell
npm run database:migrate
$env:FUNDS_MANAGER_PROVISION_USERNAME = "executive"
$env:FUNDS_MANAGER_PROVISION_ROLE = "EXECUTIVE"
$env:FUNDS_MANAGER_PROVISION_PASSWORD = Read-Host "Local account password" -MaskInput
npm run auth:provision
Remove-Item Env:FUNDS_MANAGER_PROVISION_PASSWORD
```

Repeat the provisioning command with username `analyst` and role `ANALYST`. `Read-Host -MaskInput` requires PowerShell 7; use an equivalent secure environment configuration on Windows PowerShell 5.1. Sessions expire after 30 minutes of inactivity by default, with an eight-hour absolute lifetime.

## 7. Launch the API and dashboard

Keep MAMP MySQL running and use the same configured terminal:

```powershell
npm start
```

Open:

- Dashboard: `http://127.0.0.1:4173/src/app/`
- API health: `http://127.0.0.1:4173/api/health.php`

The start script discovers the installed MAMP PHP runtime, serves the `Sprint 2` directory, checks the health endpoint, and keeps the API and dashboard on the same origin. Stop it with `Ctrl+C`.

For an Apache-based MAMP setup instead, see [`MAMP_MYSQL_SETUP.md`](MAMP_MYSQL_SETUP.md).

## 8. Data layers and database

| Layer | Current implementation |
|---|---|
| Raw | immutable local files plus persisted manifest metadata and SHA-256 |
| Bronze | exact contract parsing, initial typing, source row, and logical filename in memory |
| Silver | rows remaining after DQ, normalization, deduplication, and referential checks |
| Gold | validated allocation aggregates and latest-fund projections |
| Serving | PHP repositories and services composing safe dashboard responses |

The schema includes business tables for funds, NAV snapshots, holdings, return series, transactions, cash flow, corporate payments, drawdown, liquidity, stress, DV01 items, bond instruments, and VaR configurations. Governance tables store runs, files, stage counts, quality issues, quarantine, lineage, authenticated users, audit events, issue reviews, reconciliation evidence, tickets, and immutable ticket events. See [`docs/architecture/sprint3_erd.md`](docs/architecture/sprint3_erd.md) for the Sprint 3 core; Sprint 4 additions are applied by the ordered migrations.

## 9. API endpoints

All endpoints validate inputs, use PDO native prepared statements, return JSON, and require an authenticated session except the authentication entry point. Analyst governance endpoints enforce backend RBAC. The only application writes are CSRF-protected issue reviews and ticket workflow actions, with immutable audit evidence.

| Endpoint | Purpose |
|---|---|
| `GET/POST /api/auth.php` | session state, login, and logout |
| `GET /api/health.php` | database, classification, fund count, and latest run |
| `GET /api/dashboard.php` | initial dashboard contract |
| `GET /api/funds.php` | ordered aliased fund list |
| `GET /api/fund.php?id=FUND_01&snapshot_date=2026-08-11` | one fund and selected portfolio |
| `GET /api/allocation.php?fund_id=FUND_01&snapshot_date=2026-08-11` | fund-specific allocation and masked holdings |
| `GET /api/performance.php?fund_id=FUND_01&period=12m` | aligned fund/CDI series and calculated metrics |
| `GET /api/internal_comparison.php?period=6m` | all funds on one common calculation window plus the default targeted pair |
| `GET /api/internal_comparison.php?period=12m&fund_a=FUND_01&fund_b=FUND_05` | targeted two-fund metrics and rebased series on exact common dates, while preserving the global ranking |
| `GET /api/kpis.php?fund_id=FUND_01&period=12m` | calculated KPI list |
| `GET /api/risk.php?fund_id=FUND_01&period=12m` | shared risk metrics, drawdown, liquidity, Stress, and normalized DV01 |
| `GET /api/peers.php` | certified-source gate and current peer availability |
| `GET /api/anomalies.php?severity=blocking&status=open` | persisted DQ issues |
| `GET /api/reconciliation.php?fund_id=FUND_08&result=fail` | persisted reconciliation evidence and review status |
| `GET/POST /api/review.php` | issue detail and audited Analyst review workflow |
| `GET/POST /api/tickets.php` | Executive-owned requests, Analyst queue/response/status workflow, immutable history, and governance audit |
| `GET /api/runs.php` | ingestion runs, file manifests, stage counts, and lineage |

## 10. Business logic

Financial formulas are centralized in `Sprint 2/api/services/FinancialMath.php` and composed by `FundsService.php`:

- period return: `index_end / index_start - 1`;
- CDI percentage: `fund_period_return / benchmark_period_return * 100`, using the same dates;
- daily return: `index_t / index_t-1 - 1`;
- annualized volatility: sample standard deviation of daily returns multiplied by `sqrt(252)`;
- Sharpe and Sortino: annualized daily excess-return statistics;
- reconstructed NAV, when explicitly requested by code: `NAV_anchor * index_target / index_anchor`;
- allocation weight: grouped holding `nav_value / matching snapshot NAV`.
- Allocation Net Return: the two latest fund return-index observations on or before the selected snapshot, calculated as `latest_index / previous_index - 1`; the API returns both exact dates and reports unavailable when no prior observation exists.

Portfolio-wide Sharpe and Sortino come from the same backend `FinancialMath` implementation and shared comparison window used elsewhere. The browser renders these values and never recalculates them.

The requested period and actual common period are returned separately. When a fund does not contain the full requested history, `coverage_status: partial` is explicit in the API and dashboard. If a required series, shared window, snapshot, or validated metric is absent, the API returns `null` and `status: unavailable`; it never invents a fallback value. Peer comparison remains unavailable pending source certification.

## 11. Run tests

With MAMP MySQL running, configure a dedicated QA database ending in `_sprint4_qa` and import the authorized sources there first. Never run mutation suites on the main database. For example:

```powershell
$env:FUNDS_MANAGER_RUN_DB_TESTS = "1"
$env:FUNDS_MANAGER_DB_NAME = "yvy_funds_manager_final_sprint4_qa"
npm run lint
npm test
```

The suite covers schema parsing, required fields, duplicates, fund and instrument references, DQ quarantine, immutable source hashes, deterministic transformation, database idempotence, formulas (including the deterministic 125% of CDI case and a zero benchmark), exact Allocation Net Return dates, portfolio-wide Sharpe/Sortino parity, ticket RBAC/CSRF/audit, invalid parameters, two-fund comparison validation, database failure, CORS, API privacy, fund/date/period behavior, all 12 dashboard views, chart axes, keyboard navigation, and desktop/mobile overflow.

`npm run build` verifies local application assets/imports and JavaScript/PHP syntax. This vanilla application requires no transpilation, and build does not generate or import financial data. Historical synthetic tests generate their own temporary fixtures. `npm run validate:sprint3` separately checks governed source contracts using test CSVs without writing to MySQL.

## 12. Complete reset

Destructive reset is restricted to explicitly designated database names ending in `_qa`. It is not an upgrade procedure. Back up before migrations; use the operations guide for recovery of a non-QA database.

```powershell
powershell -ExecutionPolicy Bypass -File ".\Sprint 2\scripts\setup_database.ps1" -Reset
```

Without `-Reset`, rerunning the script is idempotent and updates the canonical tables transactionally. Never point the configuration at a shared or production database.

After the session, remove the password variable:

```powershell
Remove-Item Env:FUNDS_MANAGER_DB_PASSWORD -ErrorAction SilentlyContinue
Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue
```

## Troubleshooting

### `MySQL client not found`

Set `MAMP_MYSQL_EXECUTABLE` to the actual `mysql.exe` location under your MAMP installation.

### `Database is unavailable`

Confirm that MySQL is green in MAMP, the configured port matches MAMP, the password is set in the current terminal, and `pdo_mysql` is enabled in the PHP runtime.

### `Source directory not found` or missing source error

Confirm that `data_YvY/` exists at the repository root and contains every required filename. A missing required source blocks the run by design.

### Run completes with quarantine

Open the Data Quality page or the local run report. The curated database is still built from valid rows, while rejected records remain traceable through hashes and source row numbers. Do not edit the original CSV to hide an issue.

### Port `4173` is already in use

Stop the older server or choose another local port:

```powershell
$env:FUNDS_MANAGER_HTTP_PORT = "4174"
npm start
```

### CORS error

Prefer the same-origin start command. If the dashboard is intentionally served elsewhere, add its exact origin to `FUNDS_MANAGER_ALLOWED_ORIGINS`; never use `*` outside an isolated local test.

### Blank or error dashboard state

Open `/api/health.php`, then `/api/dashboard.php`. Check the browser Network panel. The frontend intentionally stays in a visible error state instead of falling back to local JSON.

## Documentation and delivery

- [User guide](docs/handover/USER_GUIDE.md)
- [Operations and backup/restore](docs/handover/OPERATIONS_GUIDE.md)
- [Maintenance guide](docs/handover/MAINTENANCE_GUIDE.md)
- [Deployment guide](docs/handover/DEPLOYMENT_GUIDE.md)
- [Known limitations](docs/handover/KNOWN_LIMITATIONS.md)
- [Post-project backlog](docs/handover/POST_PROJECT_BACKLOG.md)
- [Working release gates](docs/handover/SPRINT5_GAP_MATRIX.md)

- [Current architecture audit](docs/sprint3/CURRENT_ARCHITECTURE_AUDIT.md)
- [Sprint 3 implementation plan](docs/sprint3/SPRINT3_IMPLEMENTATION_PLAN.md)
- [Backend architecture](docs/architecture/BACKEND_ARCHITECTURE.md)
- [Sequence Diagram](docs/architecture/sprint3_sequence_diagram.md)
- [Entity Relationship Diagram](docs/architecture/sprint3_erd.md)
- [Sprint 3 implementation report](docs/sprint3/SPRINT3_IMPLEMENTATION_REPORT.md)
- [Source-to-screen mapping](docs/sprint3/SOURCE_TO_SCREEN_MAPPING.md)
- [Database migration plan](docs/sprint3/DATABASE_MIGRATION_PLAN.md)
- [Decision log](docs/sprint3/DECISION_LOG.md)
- [Assumptions and open questions](docs/sprint3/ASSUMPTIONS_AND_OPEN_QUESTIONS.md)
- [Final QA audit](docs/sprint3/FINAL_QA_AUDIT.md)
- [Release notes](RELEASE_NOTES.md)

Build the data-free source release with:

```powershell
npm run release:package
```

The resulting `delivery/YvY_Capital_Funds_Manager_Final_Release.zip` contains source code, all migrations, scripts, technical documentation, tests and the SHA-256 manifest. It excludes partner data, private configuration, backups, caches and presentation artifacts. Synthetic historical schema/seed assets remain solely for regression tests. The builder scans content, validates every archive entry against its allowlist and verifies all manifest hashes. A separate ZIP checksum accompanies it. The old `package_sprint3.ps1` remains a historical tool, not the final packaging command.
