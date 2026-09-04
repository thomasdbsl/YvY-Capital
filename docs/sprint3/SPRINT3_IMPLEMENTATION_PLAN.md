# Sprint 3 Implementation Plan

## Objective

Convert the validated Sprint 2 interface into a local, reproducible Funds Manager application backed by the supplied structured partner datasets, a governed MySQL model, a traceable PHP backend, and documented financial calculations. Preserve the existing visual direction and keep all sensitive inputs local.

## Non-negotiable constraints

- Do not redesign the Sprint 2 dashboard.
- Do not modify files in `data_YvY`.
- Do not use synthetic data as a runtime fallback for connected Sprint 3 screens.
- Do not expose source fund ids, ISINs, issuer names, asset names, source rows, or local paths through the API.
- Do not invent missing values or financial formulas.
- Keep MAMP, MySQL 5.7, PHP/PDO, native JavaScript, Python, and Node orchestration.
- Keep peer comparison unavailable/sample-labelled until an approved source exists.
- Keep authentication, RBAC, and production orchestration out of Sprint 3.

## Target runtime architecture

```text
Immutable local CSV files
  -> Python manifest and source contracts
  -> Bronze parsing in memory
  -> Silver validation, normalization, privacy handling, and quarantine
  -> MySQL transaction with deterministic UPSERTs
  -> Gold allocation aggregates and governed source tables
  -> PHP repositories
  -> PHP business services
  -> JSON API controllers
  -> existing JavaScript dashboard
```

The database receives only validated Silver/Gold rows plus metadata, quality issues, and opaque lineage references. Raw source values are not copied to logs or repository artifacts.

## Source scope

### Connected to the Sprint 3 dashboard

- `funds.csv`
- `fund_nav_snapshot.csv`
- `portfolio_holdings.csv`
- `returns_navps.csv`
- `drawdown.csv`
- `liquidity_by_horizon.csv`

### Ingested and governed for future/secondary views

- `transactions_summary.csv`
- `cash_flow_daily.csv`
- `corporate_payments.csv`
- `stress_risk.csv`
- `dv01.csv`
- `bond_instruments.csv`
- `var_mask_configs.csv`

### Recorded as unavailable

- `external_debenture_data_raw.csv`, which is currently zero bytes because of source permissions.

Detailed PortfolioView exports remain supplementary and are not canonical while the structured CSVs cover the required domains. The peer workbook is not a certified Sprint 3 runtime source.

## Privacy model

- `source_fund_id`, ISIN, CETIP, issuer, and asset labels may exist only in the local restricted database tables required for reconciliation.
- Each fund receives a stable safe `fund_code` such as `FUND_01` for the API and dashboard.
- Each holding receives a deterministic safe instrument and issuer code for display.
- API repositories select only allowed serving columns.
- Quality issues store rule, severity, source file alias, row number, and an opaque record hash, never the rejected value.
- Manifests store logical filenames, byte size, modification time, row count, and SHA-256, never an absolute source path.
- The delivery ZIP excludes raw source files, source archives, local configuration, logs, caches, and private database tables/dumps.

## Pipeline design

### Configuration

Add environment-driven configuration with safe defaults and `.env.example` documentation. Secrets remain in environment variables or ignored local PHP configuration.

### Manifest

For every canonical source file, capture:

- logical filename;
- byte size;
- UTC modification timestamp;
- row count;
- SHA-256;
- parser/contract version;
- deterministic bundle checksum.

The run id will derive from the bundle checksum and transform version. Identical inputs and configuration therefore reuse the same run id.

### Bronze

- Open CSV files with UTF-8 BOM support and strict headers.
- Preserve logical filename and source row number in memory.
- Parse nested JSON only for structural validation; retain the original local-restricted JSON in its dedicated table when valid.
- Never modify source files.

### Silver

- Normalize booleans, ISO dates, decimal numbers, nulls, and enumerations.
- Validate required columns and source-specific natural keys.
- Validate `fund_id` references against the registry.
- Use `(fund_id, snapshot_date, group_identifier, item_id)` as the holdings natural key because the documented shorter key has six real collisions.
- Treat missing instrument fields on cash/provision rows as expected.
- Treat missing liquidity percentages as unavailable.
- Quarantine invalid or duplicate conflicting rows before database insertion.
- Block curated publication for blocking schema, key, privacy, or NAV-domain failures.

### Gold and serving

- Reconcile holdings `sum(nav_value)` against matching NAV.
- Calculate allocation weight as grouped `sum(nav_value) / NAV`.
- Keep twelve NAV-only snapshots valid but expose holdings as unavailable for those dates.
- Persist safe latest-fund summaries and allocation aggregates.
- Leave period return and risk-return window calculations in the PHP service layer so user-selected periods are computed from exact queried observations.

### Idempotence

- Use deterministic run ids and row lineage ids.
- Add unique constraints matching each source grain.
- Use `INSERT ... ON DUPLICATE KEY UPDATE` for canonical entities.
- Load all accepted rows inside a transaction.
- Re-running the same bundle must leave domain row counts unchanged and must not create a second run.
- Add an integration test that proves counts and run identity before and after a second load.

## Database model

### Governance tables

- `ingestion_runs`
- `source_files`
- `pipeline_stage_counts`
- `quality_issues`
- `quarantine_records`
- `lineage_records`

### Silver domain tables

- `funds`
- `fund_nav_snapshots`
- `portfolio_holdings`
- `return_series`
- `transaction_summaries`
- `cash_flows`
- `corporate_payments`
- `drawdowns`
- `liquidity_horizons`
- `stress_results`
- `dv01_results`
- `bond_instruments`
- `var_mask_configs`

### Gold tables

- `gold_allocations`
- `gold_fund_latest`

Views may expose safe serving columns, but the PHP API will remain the only browser-facing database access path.

## Business logic

Add PHP services with pure functions where possible:

- exact period-window selection from dated observations;
- period return from base-100 index endpoints;
- benchmark return on the same dates;
- percentage of CDI with zero/missing denominator handling;
- daily returns from consecutive ordered index values;
- sample standard deviation and annualized volatility using 252 business days;
- Sharpe using mean daily excess return divided by fund-return standard deviation, annualized by `sqrt(252)`;
- Sortino using downside deviation of negative daily excess returns;
- latest NAV and freshness;
- fund/snapshot allocation and holding drill-down;
- internal comparison using the same resolved date window for every fund.

Minimum-observation rules and the Sharpe/Sortino convention will be documented and surfaced as unavailable when unmet.

## API design

Preserve the current `.php` endpoint convention while separating responsibilities:

```text
endpoint controller
  -> domain service
  -> domain repository
  -> PDO/MySQL
```

Planned endpoints:

- `GET /api/health.php`
- `GET /api/dashboard.php`
- `GET /api/funds.php`
- `GET /api/fund.php?id=FUND_01&snapshot_date=YYYY-MM-DD`
- `GET /api/allocation.php?fund_id=FUND_01&snapshot_date=YYYY-MM-DD`
- `GET /api/performance.php?fund_id=FUND_01&period=1m|3m|6m|12m`
- `GET /api/internal_comparison.php?period=1m|3m|6m|12m`
- `GET /api/anomalies.php?severity=...&status=...`
- `GET /api/runs.php`

No write endpoint will be added without authentication. Sprint 3 quality and lineage pages will display persisted pipeline evidence rather than simulate server mutations.

## Frontend integration

Keep the current shell and components. Limit edits to data integration:

- replace the synthetic-only payload assertion with a Sprint 3 contract check;
- fetch fund portfolio and performance when fund, period, or snapshot changes;
- fetch internal comparison for the selected period;
- render backend-calculated values and explicit unavailable states;
- remove global allocation and `FUND_01` position fallback;
- remove literal financial numbers and generated volatility;
- change source/run labels to real local-restricted evidence;
- show actual quality issues and actual run/lineage metadata;
- keep peer comparison visibly unavailable pending certification;
- retain loading, error, empty, denied, and no-result components.

## Tests

### Data and pipeline

- source header/schema validation;
- date/decimal/boolean parsing;
- missing critical field handling;
- duplicate and conflicting-key handling;
- fund referential integrity;
- expected nullable holding fields;
- holdings/NAV reconciliation;
- privacy-field containment;
- deterministic manifest;
- source immutability;
- database idempotence.

### Business logic

- period return;
- aligned benchmark return and percentage of CDI;
- NAV reconstruction from an exact anchor;
- allocation totals;
- volatility, Sharpe, and Sortino;
- internal comparison with common windows;
- insufficient observations, zero denominators, missing snapshots, and null risk values.

### API

- successful responses;
- invalid fund, period, date, severity, and status;
- empty data and unavailable metrics;
- database error response;
- prepared statements and injection attempts;
- no private identifiers or absolute paths in JSON.

### Frontend

- all existing smoke coverage;
- real fund selection changes holdings;
- period selection changes observations and metrics;
- unavailable holdings and peer states;
- quality and lineage evidence;
- no synthetic runtime labels on connected screens;
- desktop and mobile visual stability.

## File-level implementation map

### Add

- `.env.example`
- `Sprint 2/src/pipeline/config.py`
- `Sprint 2/src/pipeline/contracts.py`
- `Sprint 2/src/pipeline/models.py`
- `Sprint 2/src/pipeline/ingest.py`
- `Sprint 2/src/pipeline/transform.py`
- `Sprint 2/src/pipeline/mysql_loader.py`
- `Sprint 2/src/pipeline/business.py`
- `Sprint 2/api/repositories/*.php`
- `Sprint 2/api/services/*.php`
- `Sprint 2/api/internal_comparison.php`
- `Sprint 2/database/sprint3_schema.sql`
- `Sprint 2/scripts/setup_database.ps1`
- `Sprint 2/scripts/package_sprint3.ps1`
- `Sprint 2/tests/fixtures/sprint3_source/*.csv`
- Sprint 3 pipeline, business, database, API, and frontend tests
- `docs/architecture/BACKEND_ARCHITECTURE.md`
- `docs/architecture/sprint3_sequence_diagram.md`
- `docs/architecture/sprint3_sequence_diagram.mmd`
- `docs/architecture/sprint3_erd.md`
- `docs/architecture/sprint3_erd.mmd`
- `docs/sprint3/SPRINT3_IMPLEMENTATION_REPORT.md`
- `RELEASE_NOTES.md`

### Modify

- `.gitignore` only to allow safe Sprint 3 Markdown/Mermaid documents while keeping private `docs` inputs ignored
- `package.json`
- root `README.md`
- `Sprint 2/README.md`
- `Sprint 2/api/bootstrap.php`
- existing PHP endpoints and repository organization
- `Sprint 2/src/app/js/config.js`
- `Sprint 2/src/app/js/data.js`
- `Sprint 2/src/app/js/state.js`
- `Sprint 2/src/app/js/app.js`
- `Sprint 2/src/app/js/pages.js`
- existing tests where their synthetic-only assumptions are replaced by Sprint 3 behavior

### Preserve

- `Sprint 2/src/app/index.html` except for version/status copy if necessary
- all existing CSS unless a minimal state or unavailable treatment is required
- all existing synthetic fixtures for isolated tests
- source documents and raw partner files unchanged

## Delivery strategy

Create a reproducible local ZIP containing code, schema, scripts, tests, safe technical documentation, diagrams, release notes, and launch instructions. Exclude raw partner files, the raw archive, private documents, `node_modules`, caches, pipeline work directories, local PHP config, credentials, and browser artifacts.

A separate local-restricted curated SQL export may be generated for YvY inspection only if it contains no source identifiers prohibited by the project policy. It will never be pushed to the public GitHub remote.

## Completion gates

1. Existing design and navigation regression tests pass.
2. Real structured source import succeeds from scratch.
3. Repeating the import creates no additional domain rows or run.
4. All blocking validation occurs before curated writes.
5. Fund and period selections change actual backend queries and results.
6. No connected screen displays a synthetic or hardcoded financial value.
7. API and delivery-package privacy scans pass.
8. Sequence diagram, ERD, backend documentation, README, and implementation report match the final code.
9. Full lint, data, business, API, and frontend suites pass.
10. The final ZIP rebuilds deterministically and contains no prohibited file category.
