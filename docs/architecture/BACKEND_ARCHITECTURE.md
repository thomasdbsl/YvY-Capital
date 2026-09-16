# Funds Manager Sprint 3 Backend Architecture

## Purpose

Sprint 3 keeps the validated Sprint 2 frontend and introduces a traceable local backend for authorized YvY data. The browser no longer reads a generated JSON dataset or performs financial calculations. Its responsibility is to send filters, receive safe JSON, and render the existing components.

## Technology stack

| Concern | Implementation |
|---|---|
| Source ingestion | Python 3.12 standard library |
| Database | MAMP MySQL 5.7, InnoDB, `utf8mb4` |
| Backend runtime | MAMP PHP 8 with PDO MySQL |
| HTTP API | read-only PHP endpoint controllers |
| Business logic | PHP service layer |
| Query layer | PHP repositories with native prepared statements |
| Frontend | existing HTML, CSS, and ES modules |
| Tests | Python `unittest`, PHP assertions, Node.js, and Playwright |

## End-to-end components

```text
data_YvY/*.csv
  -> setup_database.ps1
  -> run_sprint3.py
  -> ingest.py (contracts, parsing, DQ, quarantine)
  -> transform.py (safe identifiers, relational rows, Gold projections)
  -> mysql_loader.py (transactional load)
  -> MySQL
  -> API controller
  -> service
  -> repository
  -> MySQL prepared query
  -> service calculation and safe response
  -> data.js
  -> app.js/pages.js
```

## 1. Where data is imported

`Sprint 2/scripts/setup_database.ps1` is the operator entry point. It validates that the local source directory and a password environment variable exist, then calls `Sprint 2/src/pipeline/run_sprint3.py`.

`run_sprint3.py` orchestrates the complete build. It never edits a source file. Each source is opened read-only and fingerprinted with SHA-256 before its parsed rows are transformed.

## 2. When data is cleaned

Cleaning happens **before** the business tables are loaded:

1. `contracts.py` defines the exact columns, natural keys, required fields, and types for each canonical CSV.
2. `ingest.py` verifies headers, parses dates/numbers/booleans/JSON, detects missing fields and duplicate natural keys, and retains source filename and row number in memory.
3. Domain rules validate fund references, instrument requirements, bond references, NAV, return indexes, drawdown, liquidity, holding/NAV relationships, and allocation reconciliation.
4. Invalid rows are removed from the in-memory Silver set. Their values are not copied to quarantine; only file, row, opaque reference hash, rule, and reason are persisted.
5. A missing required file or invalid schema produces `reject_run`; a row-level problem produces quarantine and permits valid rows to continue.
6. `transform.py` receives only the cleaned rows and creates the relational and Gold records.

There is no query-time cleanup and no raw-to-final shortcut.

## 3. Data layers

| Layer | Representation |
|---|---|
| Raw | immutable files plus manifest metadata in `source_files` |
| Bronze | exact parsed and typed rows with source provenance in the Python process |
| Silver | domain-valid rows mapped into relational MySQL tables |
| Gold | `gold_allocations` and `gold_fund_latest` |
| Serving | repositories and services that expose selected safe fields through JSON |

`pipeline_stage_counts` persists counts for Raw, Bronze, Silver, Gold, and Serving. `lineage_records` links each accepted target record to a source filename, source row, source SHA-256, and opaque target-key hash.

## 4. Database model

The database is created from `Sprint 2/database/sprint3_schema.sql`.

Business domains:

- `funds`, `fund_nav_snapshots`, `portfolio_holdings`, and `return_series`;
- `transaction_summaries`, `cash_flows`, and `corporate_payments`;
- `drawdowns`, `liquidity_horizons`, `stress_results`, `dv01_results`, and `dv01_items`;
- `bond_instruments` and `var_mask_configs`;
- `gold_allocations` and `gold_fund_latest`.

Governance domains:

- `ingestion_runs` and `source_files`;
- `pipeline_stage_counts`;
- `quality_issues` and `quarantine_records`;
- `lineage_records`.

Natural and composite primary keys prevent duplicates. Foreign keys connect domain rows to funds and runs, and connect snapshot-dependent records to the exact NAV snapshot. The same bundle checksum and transform version are unique in `ingestion_runs`.

See [`sprint3_erd.md`](sprint3_erd.md) for the implemented relationships.

## 5. Transaction and idempotence

`mysql_loader.py` builds one transaction for governance and canonical data. It uses deterministic keys, chunked inserts, and UPSERT for run metadata. On a valid run, canonical domain tables are replaced in foreign-key-safe order and committed together.

The deterministic run ID is derived from the ordered source file SHA-256 values and transform version. Importing identical bytes twice therefore updates the same run and reproduces identical table counts instead of duplicating funds, NAV, holdings, or series.

The database integration test imports the same fixture twice and asserts one ingestion run and unchanged counts.

## 6. Backend responsibility split

The application query path is `controller -> service -> repository -> MySQL`; calculated results then return through the service and controller to the frontend.

### Controllers

Files such as `performance.php`, `allocation.php`, and `runs.php` accept HTTP requests. `bootstrap.php` enforces:

- `GET`/`OPTIONS` only;
- exact allowed query keys;
- safe fund-ID, period, and ISO-date formats;
- configured CORS origins;
- JSON errors without database details unless local debug is explicitly enabled.

Controllers do not contain SQL or formulas.

### Repositories

`FundRepository.php` and `GovernanceRepository.php` are the only components that issue application queries. Every dynamic value is passed through a PDO prepared statement with emulated prepares disabled.

Repositories return database rows; they do not format cards or calculate financial indicators.

### Services

`FundsService.php` coordinates fund existence, selected snapshots, shared date windows, portfolio composition, targeted Fund A/Fund B comparison, the portfolio-wide ranking, and safe response fields. A fixed comparison window carries its exact date set, so two funds cannot silently use different intermediate observations. `GovernanceService.php` exposes persisted run, file, stage, quality, quarantine, and lineage evidence.

`FinancialMath.php` owns the documented formulas for period return, NAV reconstruction, daily returns, annualized volatility, Sharpe, Sortino, and CDI percentage. It returns `null` when the mathematical inputs are insufficient or invalid.

### Serving API

`repository.php` wires PDO repositories to services and composes the initial dashboard response. API responses expose aliases such as `FUND_01`, hashed holding/instrument/issuer codes, dates, values, status, and opaque lineage references. They never select source fund names, asset names, issuer names, CNPJ, private ISIN, or local paths.

## 7. Concrete request: user selects Fund X and 12M

Assume the safe fund alias is `FUND_01`.

1. The user selects `FUND_01` and `12 months` in the existing dashboard.
2. `app.js` calls `requestPerformance("FUND_01", "12m")` in `data.js`.
3. The browser sends `GET /api/performance.php?fund_id=FUND_01&period=12m`.
4. `performance.php` validates both parameters and calls `FundsService::performance()`.
5. The service calls `FundRepository::exists()` and `returnSeries()`.
6. The repository queries `funds` and `return_series` with PDO prepared statements.
7. The service intersects fund and benchmark dates, resolves the calendar 12-month window, and sends aligned index arrays to `FinancialMath::metrics()`.
8. `FinancialMath` calculates `index_end / index_start - 1`, CDI percentage on the same window, daily observations, annualized volatility, Sharpe, and Sortino.
9. The service asks the repository for `drawdowns` on the resolved dates and adds the minimum validated drawdown.
10. The controller returns the selected window, ordered history, metrics, and `status: current` as JSON.
11. `app.js` updates application state and `pages.js` renders the existing chart and KPI cards.
12. If fewer than two aligned observations exist, the same response contains empty history, null metrics, and `status: unavailable`; the UI displays that state without a synthetic fallback.

Portfolio requests follow the same controller/service/repository path through `allocation.php`, `gold_allocations`, `portfolio_holdings`, and `fund_nav_snapshots`.

### Targeted two-fund comparison

`GET /api/internal_comparison.php?period=12m&fund_a=FUND_01&fund_b=FUND_05` reuses the same service and repository path. The controller requires both fund parameters together; the service rejects equal or unknown funds, intersects Fund A, Fund A benchmark, Fund B, and Fund B benchmark dates, resolves one window, and applies that exact date list to both calculations. The response contains two metric rows, two base-100 performance series, the actual common window, and the unchanged portfolio-wide ranking. Fewer than two common observations return `status: unavailable` and no calculated comparison.

## 8. Error behavior

| Condition | Result |
|---|---|
| Invalid method, parameter, fund format, period, or date | `400`, `403`, or `405` JSON response |
| Well-formed but unknown fund | `404` JSON response |
| Equal targeted funds or only one targeted fund parameter | `400` JSON response |
| Missing validated series or portfolio | `200` with explicit unavailable state |
| Database connection failure | `503` with generic message |
| Unexpected backend failure | `500` with generic message |
| Frontend request failure | visible error state and retry path; no JSON fallback |

## 9. Local state

No fund, KPI, quality issue, run, lineage record, or financial value is persisted in browser local storage. Current fund/date/period and Fund A/Fund B choices live only in JavaScript application state and are refreshed from the API.

## 10. Current limitations

- This is a local demonstration architecture without authentication or RBAC.
- Peer data is intentionally unavailable pending source classification and certification.
- Advanced risk metrics not supported by validated source/formula combinations remain unavailable.
- Restricted fields exist only in the local database; deployment and access controls for a managed environment are deferred.
- The Python loader invokes the local MySQL client and is designed for a controlled MAMP environment, not a production orchestrator.

The complete interaction is shown in [`sprint3_sequence_diagram.md`](sprint3_sequence_diagram.md).
