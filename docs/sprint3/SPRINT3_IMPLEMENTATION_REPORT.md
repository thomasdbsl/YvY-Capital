# Funds Manager Sprint 3 Implementation Report

## Executive result

Sprint 3 preserves the Sprint 2 dashboard and replaces its normal synthetic JSON runtime with a governed local path from authorized structured YvY CSV files to MySQL, PHP services, and the existing frontend. The implementation prioritizes validated data, deterministic reconstruction, backend-owned financial logic, traceability, and explicit unavailable states.

The verified real-source bundle produces deterministic run `S3-09F87790A5D78492470A` from SHA-256 `09f87790a5d78492470a44fcadcb75acd91dfdc6247b10575919b00d78b64567`.

## Current architecture before Sprint 3

The initial audit is recorded in [`CURRENT_ARCHITECTURE_AUDIT.md`](CURRENT_ARCHITECTURE_AUDIT.md). Before Sprint 3:

- the modular HTML/CSS/JavaScript dashboard and its nine navigation sections worked;
- the visual system, navigation, charts, modal, state patterns, and responsive behavior were suitable for reuse;
- normal browser data came from a generated synthetic `serving_data.json` payload or equivalent in-memory values;
- fund selection, holdings, KPI values, period behavior, quality events, and run history were not backed by the authorized YvY sources;
- the browser still owned presentation-level calculations and fallback data behavior;
- no production-like PHP service/repository path connected the interface to the real relational model;
- Sprint 2 deterministic fixtures, privacy checks, and documentation provided useful foundations but were not the Sprint 3 runtime.

## Changes implemented

- Added strict source contracts for all canonical structured CSV files.
- Added immutable source hashing and deterministic bundle/run identifiers.
- Added typed parsing, duplicate detection, domain validation, quarantine, and clean-before-load behavior.
- Added explicit Raw, Bronze, Silver, Gold, and Serving stage evidence.
- Added safe deterministic aliases for funds, holdings, instruments, issuers, risk factors, and masks.
- Normalized nested DV01 items into relational rows.
- Added a MySQL 5.7 schema with natural/composite keys, foreign keys, unique constraints, indexes, quality, quarantine, manifests, stage counts, and lineage.
- Added one-command idempotent setup and complete reset.
- Added PHP controllers, PDO repositories, business services, and documented financial calculations.
- Connected existing dashboard pages to fund-, snapshot-, and period-specific API requests.
- Replaced unavailable peer and unsupported metric values with explicit unavailable states.
- Added data, business, database, API, privacy, and Playwright coverage.
- Added backend documentation, an implemented Sequence Diagram, an implemented ERD, release notes, and a source-free delivery package process.

## Data sources

The pipeline uses these local canonical files:

| Source | Domain | Real bundle rows | Treatment |
|---|---|---:|---|
| `funds.csv` | fund master | 14 | required |
| `fund_nav_snapshot.csv` | NAV snapshots | 88 | 14 non-positive NAV rows quarantined |
| `portfolio_holdings.csv` | holdings | 1,013 | 10 rows without a valid matching NAV snapshot quarantined |
| `returns_navps.csv` | fund and benchmark indexes | 2,733 | 6 invalid indexes quarantined |
| `transactions_summary.csv` | subscriptions/redemptions | 14 | validated and loaded |
| `cash_flow_daily.csv` | daily cash flow | 32 | validated and loaded |
| `corporate_payments.csv` | corporate events | 16 | validated and loaded with restricted descriptions |
| `drawdown.csv` | drawdown series | 1,350 | 6 values outside `[-1, 0]` quarantined |
| `liquidity_by_horizon.csv` | liquidity horizons | 84 | 9 percentages outside `[0, 1]` quarantined; null permitted |
| `stress_risk.csv` | stress results | 14 | validated and stored locally as restricted detail |
| `dv01.csv` | DV01 results | 14 | parent rows plus normalized nested items |
| `bond_instruments.csv` | bond references | 67 | validated against funds; used for bond-holding references |
| `var_mask_configs.csv` | VaR configurations | 1 | validated and stored locally |
| `external_debenture_data_raw.csv` | external debenture source | 0 | unavailable warning; no fabricated replacement |

Original files are never modified. The source directory, raw values, and source archives are excluded from Git and the delivery ZIP.

## Database

The authoritative schema is `Sprint 2/database/sprint3_schema.sql` and contains 22 tables.

### Governance

- `ingestion_runs`, `source_files`, and `pipeline_stage_counts`;
- `quality_issues`, `quarantine_records`, and `lineage_records`.

### Silver business domains

- `funds`, `fund_nav_snapshots`, `portfolio_holdings`, and `return_series`;
- `transaction_summaries`, `cash_flows`, and `corporate_payments`;
- `drawdowns`, `liquidity_horizons`, and `stress_results`;
- `dv01_results`, `dv01_items`, `bond_instruments`, and `var_mask_configs`.

### Gold/Serving projections

- `gold_allocations`;
- `gold_fund_latest`.

The real verified load contains 14 funds, 74 valid NAV snapshots, 1,003 validated holdings, 2,727 valid return-index rows, 1,030 normalized DV01 items, 252 Gold allocation rows, 10 latest valid fund projections, 46 persisted quality issues, 45 quarantine records, and 6,425 lineage records.

Primary, foreign, and unique keys prevent duplicate natural records and invalid fund/run/snapshot relationships. The full ERD is in [`../architecture/sprint3_erd.md`](../architecture/sprint3_erd.md).

## Pipeline

The implemented flow is:

```text
Immutable files
  -> manifest and SHA-256
  -> exact contract parsing and typing (Bronze)
  -> domain DQ, deduplication, quarantine (Silver)
  -> safe relational transformation and aggregates (Gold)
  -> one MySQL transaction
  -> PHP repositories/services (Serving)
```

Measured stage evidence for the real bundle:

| Stage | Records | Meaning |
|---|---:|---|
| Raw | 5,440 | physical CSV rows recorded in manifests |
| Bronze | 5,440 | schema-valid parsed rows before domain rules |
| Silver | 5,395 | rows remaining after 45 quarantines |
| Gold | 262 | allocation and latest-fund projections |
| Serving | 262 | materialized projections available to services |
| Curated total | 6,687 | all relational rows, including expanded DV01 items |
| Lineage | 6,425 | source-to-target proof records |

`run_sprint3.py` exits non-zero for missing required sources or invalid headers. Recoverable row errors continue only after the affected rows are removed. `mysql_loader.py` loads governance and domain rows transactionally and reproduces the same run/key counts for identical source bytes.

## Data quality

Implemented rule families include:

- exact required schema and UTF-8 CSV parsing;
- required-field completeness and typed date/decimal/integer/boolean/JSON parsing;
- duplicate natural-key quarantine;
- fund referential integrity;
- required holding instruments and bond-reference integrity;
- positive NAV and return-index checks;
- drawdown and liquidity range checks;
- exact holding snapshot to NAV existence;
- holdings-to-NAV reconciliation within 1%;
- explicit warning when a NAV snapshot has no usable holdings;
- restricted-field masking and API privacy tests.

Issues are persisted with rule, severity, action, status, source row, and opaque record hash. Rejected source values are not copied into quality or quarantine responses.

## Business logic

`FinancialMath.php` implements the documented formulas:

- `period_return = index_end / index_start - 1`;
- `% CDI = fund_period_return / benchmark_period_return * 100` on exactly the same dates;
- `daily_return = index_t / index_t-1 - 1`;
- annualized volatility = sample standard deviation of daily returns times `sqrt(252)`;
- Sharpe = annualized mean daily excess return divided by fund-return standard deviation;
- Sortino = annualized mean daily excess return divided by downside standard deviation;
- reconstructed NAV = `NAV_anchor * index_target / index_anchor` when that operation is explicitly used;
- allocation = grouped `nav_value / matching NAV`.

`FundsService.php` enforces fund existence, snapshot selection, aligned fund/benchmark dates, one common comparison window, and unavailable results when inputs are insufficient. No 100-based index level is displayed as a percentage return.

## API

The request path is `controller -> service -> repository -> MySQL`, followed by service calculation and a JSON response.

| Endpoint | Responsibility |
|---|---|
| `health.php` | database and latest-run health |
| `dashboard.php` | initial dashboard composition |
| `funds.php` | safe fund list |
| `fund.php` | one fund and portfolio context |
| `allocation.php` | selected fund/snapshot allocation and masked holdings |
| `performance.php` | selected fund/period series and calculations |
| `internal_comparison.php` | targeted Fund A/Fund B metrics and series plus all real funds on a shared date window |
| `kpis.php` | calculated KPI summary |
| `anomalies.php` | persisted quality issues |
| `runs.php` | runs, manifests, stages, quarantine totals, and lineage |

PDO native prepared statements are used for every dynamic query. Invalid methods, origins, parameters, fund IDs, periods, and dates return controlled errors. Database failures return a generic `503` response.

## Dashboard integration

The existing visual design and navigation are preserved. These sections now use the API:

- **Overview:** actual aliased funds, latest validated AUM/NAV coverage, quality counts, freshness, and calculated performance.
- **Funds:** all authorized funds represented by stable safe aliases and explicit availability.
- **Allocation:** fund-specific snapshots, groups, values, weights, and masked holdings drill-down.
- **Performance:** period-specific aligned index history, explicit requested/actual coverage, separate return and `% of CDI` metrics, and backend-calculated risk metrics.
- **Internal Comparison:** Fund A/Fund B selectors with exact common dates and base-100 series, plus the existing real-fund ranking.
- **Peer Comparison:** explicitly unavailable pending certification; no fake peer values.
- **Data Quality:** persisted rules, counts, quarantine actions, and opaque references.
- **Import and Validation:** read-only evidence of the executed pipeline stages.
- **Runs and Lineage:** real run, manifest, stage, hash, and lineage data.

Loading, error, empty, incomplete, denied, no-result, and hypothesis states remain demonstrable without changing business records. There is no runtime `serving_data.json` fallback.

## Final functional corrections

### CDI verification

No formula defect or double multiplication by 100 was found. The apparent `FUND_05` inconsistency came from a requested 12M period being calculated on the shorter history that is actually common to the fund and CDI. The API now returns `requested_start`, `requested_end`, actual `start`/`end`, `coverage_status`, and observation count; the UI identifies partial coverage instead of implying that a full year exists.

The formula remains `% of CDI = fund_period_return / benchmark_period_return * 100`. The service now carries the exact common-date list through fixed-window comparisons instead of filtering only by the first and last date.

| Fund | Requested window | Actual common window | Fund index | CDI index | Fund return | CDI return | % of CDI |
|---|---|---|---|---|---:|---:|---:|
| `FUND_01` | 2025-08-11 to 2026-08-11 | 2025-12-01 to 2026-08-11 | 100 to 106.474313975434 | 100 to 109.043390534312 | 6.47431398% | 9.04339053% | 71.59166632% |
| `FUND_02` | 2025-08-11 to 2026-08-11 | 2025-12-01 to 2026-08-11 | 100 to 106.872146985168 | 100 to 109.043390534312 | 6.87214699% | 9.04339053% | 75.99082401% |
| `FUND_05` | 2025-08-11 to 2026-08-11 | 2026-01-30 to 2026-08-11 | 100 to 110.587821077982 | 100 to 107.291050719745 | 10.58782108% | 7.29105072% | 145.21667020% |
| `FUND_11` | 2025-08-11 to 2026-08-11 | 2026-06-25 to 2026-08-11 | 100 to 100 | 100 to 101.745514540015 | 0% | 1.74551454% | 0% |

The deterministic business test also proves `100 -> 110` versus `100 -> 108` returns exactly `125% of CDI`; a benchmark return of zero returns `null`.

### Performance chart

- the X axis displays a responsive maximum of six date ticks on normal widths and three below 520 px;
- the Y axis is labeled `Performance Index`, uses numeric index ticks without `%`, and applies one shared domain to both series;
- native point tooltips identify the date, fund index, and CDI/benchmark index;
- Playwright verifies axes and no horizontal overflow at 1024, 768, and 390 px.

### Targeted internal fund comparison

- Fund A and Fund B selectors are populated from the real API/MySQL fund list;
- the opposite selected fund is disabled and backend validation rejects A = B;
- the backend intersects both fund and both benchmark series, then calculates both metric sets on the exact same dates;
- Period Return, `% of CDI`, latest NAV/AUM, Volatility, Sharpe, Sortino, and Max Drawdown are shown or explicitly unavailable;
- two performance series are rebased to 100 for the targeted chart;
- the original portfolio-wide 14-fund ranking remains available below the targeted comparison;
- API and browser tests cover `FUND_01/FUND_02`, `FUND_01/FUND_05`, and `FUND_05/FUND_11`, equal funds, unknown funds, partial history, and exact common windows.

## Tests

The automated suite includes:

- Python data-contract, duplicate, reference, range, immutability, transformation, privacy, documentation, and database idempotence tests;
- PHP business-logic assertions for return, NAV reconstruction, aligned metrics, and invalid inputs;
- API integration tests for success, unknown/invalid fund, invalid period/date, injection attempts, CORS, privacy, lineage, and unavailable database;
- Playwright smoke coverage for all nine views, real fund/snapshot/period requests, unavailable peers, DQ details, analyst flow, error states, keyboard navigation, and 1024/768/390 px layouts;
- Python, JavaScript, and PHP syntax lint.

### Final verification evidence

Final QA was executed on September 4, 2026 against a separate database created from scratch as `yvy_funds_manager_sprint3_qa`:

| Verification | Result |
|---|---|
| `setup_database.ps1 -DatabaseName yvy_funds_manager_sprint3_qa -Reset` | Passed from an absent database |
| Second identical setup without reset | Passed; one run and identical counts |
| Real run ID | `S3-09F87790A5D78492470A` on both imports |
| `npm run lint` | Passed Python compile, JavaScript syntax, and 18 PHP files |
| `npm test` with DB tests enabled | Passed |
| Python tests | 31 passed, including MySQL idempotence |
| PHP business tests | Passed |
| API integration | Passed with real MySQL data and database-error path |
| Playwright smoke | Passed all nine views, responsive and keyboard checks |

Final functional-correction QA was rerun on September 5, 2026 against `yvy_funds_manager_sprint3`: `npm run lint` passed, `npm run build` passed, all 31 Python tests passed including the isolated MySQL idempotence test, PHP financial tests passed, API/MySQL integration passed with four printed CDI diagnostics, and Playwright passed all nine views plus the new axes and targeted comparison.

After both real imports the QA database still contained exactly one ingestion run, 14 source manifests, 14 funds, 74 NAV snapshots, 1,003 holdings, 2,727 return rows, 1,030 DV01 items, 1 VaR mask configuration, 262 Gold/Serving rows, 46 quality issues, 45 quarantine records, and 6,425 lineage records.

## Remaining synthetic/mock elements

The following synthetic elements remain intentionally and do not feed the Sprint 3 runtime:

- `Sprint 2/tests/fixtures/` and `tests/fixtures/sprint3_source/` for isolated tests and edge cases;
- the legacy Sprint 2 generator and ignored `src/pipeline/output/serving_data.json` for regression tests;
- `Sprint 2/database/schema.sql`, `seed.sql`, `build_seed.py`, and `reset_database.ps1` as the historical Sprint 2 demo database;
- `Sprint 2/wireframes/` as a historical hardcoded Sprint 2 mockup; it is not imported or linked by the Sprint 3 application and is excluded from the delivery ZIP;
- the compatibility response key `peer_sample`, which is always an empty array while peer data remains uncertified;
- the unused `.badge.sample` CSS selector retained for visual compatibility; it does not create or load data;
- UI display-state scenarios that demonstrate loading/error/empty behavior without mutating database records.

No synthetic financial value is used as a runtime fallback for a Sprint 3 page.

## Known limitations

- The system is a local restricted prototype without authentication, RBAC, or managed deployment controls.
- Peer comparison is not certified and intentionally remains unavailable.
- Some source rows are invalid; 45 are quarantined rather than silently corrected.
- The external debenture source is empty and remains unavailable.
- Funds without a positive validated latest NAV or matching portfolio explicitly show incomplete/unavailable states.
- Advanced risk analytics are not exposed unless the source and formula are validated for the current scope.
- Partner certification of calculations and source interpretations remains pending.
- The Python pipeline calls the local MySQL command-line client and has no production scheduler.

## Deferred to Sprint 4

- authentication, authorization, and RBAC;
- governed peer-data classification and certification;
- production orchestration, monitoring, retry policy, and managed secrets;
- incremental ingestion beyond the current deterministic canonical rebuild;
- deeper certified risk analytics and partner-approved KPI expansion;
- production deployment, UAT, and operational support controls.

## Leonardo requests

| Request | Implementation | Evidence/File | Status |
|---|---|---|---|
| Use real authorized data | Canonical local CSV contracts and real-source run | `contracts.py`, run `S3-09F87790A5D78492470A` | Implemented |
| Relational database | MySQL 5.7 schema with 22 tables, PK/FK/indexes | `sprint3_schema.sql`, `sprint3_erd.md` | Implemented |
| Clean before load | Typed validation, domain DQ, row quarantine before transform/load | `ingest.py`, `transform.py` | Implemented |
| Reproducible and idempotent import | Deterministic checksums/run ID, natural keys, transaction, repeat-import test | `run_sprint3.py`, `mysql_loader.py`, `test_sprint3_pipeline.py` | Implemented |
| Clear backend architecture | Controller/service/repository/PDO split | `BACKEND_ARCHITECTURE.md` | Implemented |
| Correct business logic | Documented formulas centralized in backend | `FinancialMath.php`, `FundsService.php`, business tests | Implemented |
| Existing dashboard on real data | API requests for overview, funds, portfolio, performance, comparison, DQ, runs | `data.js`, `app.js`, `pages.js`, smoke test | Implemented |
| Sequence Diagram | Ingestion, quarantine, query, calculation, response, rendering | `sprint3_sequence_diagram.md` and `.mmd` | Implemented |
| ERD | Exact schema entities, keys, and relationships | `sprint3_erd.md` and `.mmd` | Implemented |
| Code/database delivery package | Source-free reproducible ZIP builder | `package_sprint3.ps1`, delivery ZIP | Implemented |

## Acceptance summary

| Acceptance criterion | Evidence | Status |
|---|---|---|
| Existing dashboard still works | Playwright tests all nine sections | Passed |
| Sprint 2 visual direction preserved | Existing HTML/CSS/components retained; only functional responsive rule added | Passed |
| No synthetic JSON on Sprint 3 runtime pages | `data.js` API-only checks and runtime request assertions | Passed |
| Real authorized sources feed the pipeline | deterministic real run and manifests for 14 files | Passed |
| Reproducible and idempotent pipeline | fresh build plus identical second import | Passed |
| Original source bytes remain unchanged | pre/post SHA-256 immutability test | Passed |
| Validation and cleaning precede curated storage | DQ/quarantine before `transform_to_curated` and transactional load | Passed |
| Relational database with PK/FK | 22-table SQL schema and schema/ERD parity test | Passed |
| Main queries use backend/API | controller/service/repository/PDO path | Passed |
| Visible KPI values are calculated or unavailable | `FinancialMath`, service tests, unavailable states | Passed |
| Fund and snapshot selection are data-specific | API and browser assertions across funds/snapshots | Passed |
| Period selection changes data and results | 1M/12M API and browser assertions | Passed |
| Internal comparison uses real shared-window data | service implementation and API assertions for 14 funds | Passed |
| `% of CDI` is mathematically verified | deterministic 125% test and four live API diagnostics including `FUND_05` | Passed |
| Requested versus actual history is explicit | API window metadata and partial-period UI label | Passed |
| Performance axes are readable and accurate | shared Y domain, `Performance Index`, date ticks, responsive Playwright checks | Passed |
| Targeted comparison uses exactly two real funds | Fund A/Fund B API contract, common history, seven metrics, browser test | Passed |
| Existing global ranking is preserved | API and browser assertions for 14 rows | Passed |
| DQ errors, manifests, checksums, and lineage are traceable | governance tables, endpoints, and run-page smoke test | Passed |
| Sequence Diagram matches code | diagram participant/file mapping and documentation test | Passed |
| ERD matches SQL | exact 22-table set comparison test | Passed |
| Backend architecture documented | `BACKEND_ARCHITECTURE.md` and documentation test | Passed |
| Setup from scratch works | separate QA database reset/build | Passed |
| Delivery ZIP can be produced without secrets | package builder, inventory and content gates | Passed |

The implementation satisfies the Sprint 3 functional scope. It does not claim production readiness, partner approval, LGPD certification, peer certification, or Sprint 4 capabilities.
