# Current Architecture Audit

## Purpose and scope

This audit records the verified state of Funds Manager immediately before Sprint 3 implementation. It is based on the working tree as inspected on 4 September 2026, the running dashboard, the PHP API, the local MySQL database, the Python pipeline, all current automated tests, the structured YvY datasets, the Feature Guide, the Data Dictionary, the TAPI, the Sprint 1 roadmap, the internal sprint plan, and the Sprint 2 synthesis report.

No application architecture was changed while producing this audit. Generated Sprint 2 test outputs were refreshed only by the existing test commands.

## Executive conclusion

Sprint 2 is a functioning interactive prototype with a coherent visual system and a real local runtime path:

```text
Browser -> PHP API -> MySQL
```

That runtime is operational and tested, but its database is populated entirely from deterministic synthetic fixtures. The Python pipeline does not ingest the structured YvY CSVs into MySQL, and the API does not calculate the financial metrics required for Sprint 3. Several interactions are visual simulations rather than persisted backend operations.

The Sprint 2 frontend, navigation, layouts, components, typography, colors, responsive behavior, and accessibility affordances should be retained. Sprint 3 should replace the synthetic data model and add a reproducible local ingestion pipeline, a relational source-to-serving schema, backend business services, period-aware endpoints, persisted quality evidence, and real lineage.

## Repository and security state

- The active branch is `main`, tracking the public GitHub remote `https://github.com/thomasdbsl/YvY-Capital.git`.
- The working tree contains existing uncommitted Sprint 2 MySQL/PHP integration work. It is treated as authoritative in this audit and must not be discarded.
- `data_YvY/`, `data_YvY.zip`, `docs/`, and `Sprint 1/` are listed in `.gitignore`, but they are already tracked by Git from earlier commits. Ignore rules do not remove tracked content.
- The tracked private-data area includes structured partner CSVs, detailed portfolio exports, an archive, internal documents, and files containing ISINs and issuer/asset labels.
- No future public push is safe until tracked sensitive paths and the remote visibility/history issue are handled through an explicitly approved security process.
- Sprint 3 implementation can proceed locally. Raw source files must remain immutable and must never be copied into tests, logs, public artifacts, or browser responses.

## Current project structure

```text
repository root
|-- package.json                 npm orchestration
|-- MAMP_MYSQL_SETUP.md          current synthetic database setup
|-- data_YvY/                    local partner inputs, currently also Git-tracked
|-- docs/                        source documents and project deliverables
`-- Sprint 2/
    |-- src/app/                 HTML/CSS/JavaScript dashboard
    |-- src/pipeline/            deterministic synthetic Python proof pipeline
    |-- api/                     PHP HTTP controllers and query functions
    |-- database/                synthetic MySQL schema and generated seed
    |-- data/contracts/          Sprint 2 JSON contracts and KPI catalogue
    |-- tests/                   Python, API, privacy, and browser tests
    |-- scripts/                 local PHP server launcher
    `-- docs/                    Sprint 2 architecture and governance notes
```

## Frontend

### Stack and composition

- Native HTML, CSS, and ES modules; no frontend framework and no bundler.
- A single document, `Sprint 2/src/app/index.html`, contains the persistent shell.
- `app.js` controls navigation and DOM events.
- `state.js` holds transient in-memory UI state.
- `pages.js` renders all page bodies as HTML strings.
- `components.js` and `charts.js` provide reusable cards, tables, badges, SVG charts, and state panels.
- CSS is separated into tokens, base rules, layout, and components. Manrope is the principal typeface.

### Verified screens

The running dashboard exposes nine sections:

| Journey | Screen | Current runtime evidence |
|---|---|---|
| Executive | Overview | Synthetic aggregate cards, chart, five priority funds, four alerts |
| Executive | Funds | 14 synthetic fund aliases |
| Executive | Allocation / Fund detail | Global allocation plus 18 static `FUND_01` positions |
| Executive | Performance | 12 synthetic index observations |
| Executive | Internal comparison | Seven generated fund rows |
| Executive | Peer comparison | Six explicitly synthetic peers |
| Analyst | Data quality | Ten fixture anomalies |
| Analyst | Import and validation | Seven-step simulated workflow |
| Analyst | Runs and lineage | One synthetic run and three lineage proofs |

Desktop and mobile navigation, keyboard navigation, scenario states, the allocation drill-down, and the Analyst workflow pass the existing Playwright smoke test.

### Data loading and state

- The browser makes one request to `GET /api/dashboard.php` at startup.
- `data.js` rejects every payload whose classification is not exactly `synthetic-example` with `publication_allowed: true`.
- There is no local JSON runtime fallback in the browser.
- There is no `localStorage` or `sessionStorage` usage.
- Fund, period, scenario, role, search, workflow step, and anomaly changes exist only in memory and disappear on reload.
- Anomaly resolution and quarantine buttons mutate the in-memory API response; they do not update MySQL.

### Frontend calculations and hardcoded values

The following behavior is synthetic or hardcoded and must not remain as real Sprint 3 output:

- Overview AUM sums the first seven funds rather than a backend-curated portfolio definition.
- Overview trends, look-through AUM, publication score, and 12-month return are literal display values.
- The overview chart uses the single global synthetic history array.
- Fund detail always selects positions belonging to `FUND_01`, even when another fund is selected.
- Allocation uses one global array and is not fund- or snapshot-specific.
- Performance ignores the selected period in the page renderer and receives no new API data after filter changes.
- Internal-comparison volatility is generated from the row index with `6.5 + index * 0.4`.
- Peer comparison is correctly labelled synthetic, but it is not an approved peer universe.
- Import, validation, quarantine, publication, and lineage are scripted presentation states, not pipeline actions.
- Several source footnotes are fixed to `SRC_SYNTHETIC_FIXTURES` and `SPRINT2-WF-001`.

## Backend and API

### Stack

- PHP 8.3.1 from MAMP.
- PDO MySQL with native prepared statements, exception mode, UTF-8, and associative fetches.
- MySQL 5.7 on the local MAMP server.
- The PHP built-in development server is launched through Node for local use and tests.

### Current separation of responsibilities

```text
Frontend fetch
  -> endpoint PHP file
  -> procedural functions in repository.php
  -> PDO query
  -> MySQL
```

The controllers validate the HTTP method and accepted query keys. Fund identifiers, periods, anomaly severity, and status values are allowlisted. SQL parameters are bound rather than concatenated. CORS is restricted to configured local origins.

There is no business-service layer. `repository.php` combines queries, row mapping, payload composition, and limited response logic.

### Existing endpoints

| Endpoint | Actual behavior |
|---|---|
| `GET /api/health.php` | Tests database access and reports the latest synthetic run |
| `GET /api/dashboard.php` | Returns the complete synthetic dashboard payload |
| `GET /api/funds.php` | Returns all rows from the synthetic `funds` table |
| `GET /api/fund.php?id=...` | Returns one fund with global allocation and fund-filtered synthetic data |
| `GET /api/kpis.php?fund_id=...` | Returns global or fund-specific stored KPI rows |
| `GET /api/performance.php?fund_id=...&period=...` | Limits rows by count, not by calendar window |
| `GET /api/allocation.php?fund_id=...` | Filters positions by fund but returns global allocation |
| `GET /api/anomalies.php` | Reads synthetic anomaly rows with optional filters |
| `GET /api/runs.php` | Reads the synthetic run and three proof rows |

### Missing backend capabilities

- No source ingestion endpoint or command integration.
- No explicit controller/service/repository separation.
- No real NAV, allocation, return, CDI, volatility, or comparison calculations.
- No snapshot-date selection.
- No database-backed anomaly workflow.
- No real run manifest or source-file query surface.
- No empty-result semantics for partially covered real datasets.
- No endpoint-level serving contract for real/local-restricted data.

## Current MySQL database

The current database is `yvy_funds_manager_demo`. It contains nine Sprint 2 tables:

| Table | Current purpose | Current rows |
|---|---|---:|
| `dataset_runs` | One synthetic proof run | 1 |
| `funds` | Denormalized synthetic fund cards | 14 |
| `allocations` | One global synthetic allocation | 6 |
| `positions` | Static positions for `FUND_01` | 18 |
| `performance_history` | Synthetic base-100 series for `FUND_01` | 12 |
| `fund_kpis` | Generated values or null placeholders | 24 |
| `peer_samples` | Synthetic peer universe | 6 |
| `anomalies` | Fixture quality cases | 10 |
| `lineage_proofs` | Three synthetic screen links | 3 |

The schema uses InnoDB, primary keys, foreign keys, indexes, decimal types, and UTF-8. These are useful conventions to retain, but the model is not the Sprint 3 partner-data model. In particular:

- fund summary metrics are stored directly on `funds` instead of at fund/date grain;
- allocation can be null by fund and has no snapshot date;
- positions lack source-run, source-file, snapshot, natural-key, and privacy metadata;
- fund KPIs use one row per KPI id globally, which cannot represent fund/date/period results;
- there are no raw, bronze, silver, curated, or serving tables for the supplied datasets;
- there are no source-file manifests, row-level quality issues, quarantine records, or persisted transformations.

## Current Python pipeline

### What works

- Deterministic JSON serialization.
- SHA-256 calculation for input files and generated outputs.
- File-size and relative-path manifest entries.
- Synthetic checks for 38/51-column exports, empty sections, Brazilian decimal parsing, selected domain errors, denylist terms, CNPJ-like patterns, and ISIN-like patterns.
- Repeated execution produces byte-identical synthetic outputs.
- Generated output contains manifest, quality report, run log, serving payload, checksums, and privacy report.

### What is simulated or incomplete

- The default input is `Sprint 2/tests/fixtures`, not `data_YvY`.
- `RUN_ID`, logical timestamp, and transform version are fixed constants.
- The real-data mode creates metadata and quality output but deliberately creates no serving dataset and performs no database load.
- No canonical CSV parser exists for the supplied structured datasets.
- There are no material Bronze, Silver, Gold, or Serving records.
- No MySQL transaction, UPSERT, rollback, or database idempotence exists.
- Current “idempotence” proves only identical output files, not duplicate-safe database ingestion.
- The quality engine is fixture-specific and assumes only 38/51-column legacy exports.
- No referential-integrity validation, source-specific required-column validation, duplicate quarantine, NAV/holdings reconciliation, or real privacy-field policy is implemented.
- The synthetic seed generator serializes `serving_data.json` into SQL; it is not a partner-data loader.

## Structured partner-data inventory

The top-level CSVs in `data_YvY` are the canonical Sprint 3 source candidates. The original files were read without modification.

| File | Rows | Fund coverage | Audit result |
|---|---:|---:|---|
| `funds.csv` | 14 | 14 | Complete registry, unique `fund_id` |
| `fund_nav_snapshot.csv` | 88 | 14 | Unique fund/date grain, valid dates and numerics |
| `portfolio_holdings.csv` | 1,013 | 10 | 76 snapshots; key requires `group_identifier`; private fields present |
| `returns_navps.csv` | 2,733 | 14 | 28 unique fund/series pairs; all begin at 100 |
| `transactions_summary.csv` | 14 | 14 | Unique fund/window grain |
| `cash_flow_daily.csv` | 32 | 6 | Valid fund/date grain |
| `corporate_payments.csv` | 16 | 1 | Valid event rows; limited coverage is legitimate |
| `drawdown.csv` | 1,350 | 14 | Valid unique fund/date grain |
| `liquidity_by_horizon.csv` | 84 | 14 | 24 null `nav_percent` values must remain unavailable |
| `stress_risk.csv` | 14 | 14 | All JSON payloads parse; nested schema varies and contains strings for numerics |
| `dv01.csv` | 14 | 14 | All JSON payloads parse; many legitimate null risk fields |
| `bond_instruments.csv` | 67 | 6 | Unique fund/instrument grain; 22 nonempty private ISIN values |
| `var_mask_configs.csv` | 1 | N/A | Configuration only, not a calculated VaR result |
| `external_debenture_data_raw.csv` | 0 | 0 | Zero-byte source due to permissions; not ingestible |

Additional detailed PortfolioView exports and a peer workbook exist locally. The structured CSVs above should be preferred because they are documented and already normalized to consistent fund aliases. The peer workbook must not become a certified runtime source until its ownership, classification, and business acceptance are confirmed.

### Verified source-quality findings

- Every nonempty date and numeric field tested parses successfully.
- All foreign `fund_id` values refer to the 14-row fund registry.
- The documented `(fund_id, snapshot_date, item_id)` holding key has six conflicting collisions.
- Adding `group_identifier` produces a unique deterministic holdings key.
- `nav_percentage` is empty for all 1,013 holdings and cannot be used.
- `exposure` is populated but is not reliable as an additive allocation weight for every group.
- Summed `nav_value` reconciles to the matching NAV for all 76 shared snapshots, with no gap above 1%.
- Twelve NAV snapshots have no holdings snapshot; no holdings snapshot lacks a matching NAV.
- All 14 funds have at least one exact date shared by NAV snapshots and their fund return series, so documented NAV reconstruction is possible.
- Empty instrument id/type/quantity values occur on 534 holdings and are expected for cash and provision records.
- ISIN, issuer, and asset labels must not be exposed by the public API or delivery package without an approved restricted mode.

## Documented business rules available for Sprint 3

The Feature Guide and Data Dictionary provide enough evidence to implement the following without inventing formulas:

### NAV

Use real snapshot NAV directly. If daily absolute NAV is required between snapshots, use an exact anchor shared by the snapshot and fund return series:

```text
NAV(date) = NAV(anchor_date) * index(date) / index(anchor_date)
```

Do not interpolate arbitrary values.

### Portfolio and allocation

Filter holdings by `fund_id` and `snapshot_date`, group by `group_identifier`, sum `nav_value`, and calculate weights against the matching fund NAV. Holdings drill-down must use the same fund and snapshot.

### Period return

`accrued_return_pct` is a base-100 index, not a percentage value:

```text
period_return = index_end / index_start - 1
```

The selected period must select real boundary observations by date.

### CDI comparison

Calculate fund and benchmark returns over the identical observation window:

```text
percent_of_CDI = fund_period_return / benchmark_period_return * 100
```

Return unavailable when the benchmark denominator is missing or zero.

### Volatility, Sharpe, and Sortino

Daily return is `index_t / index_t-1 - 1`. Annualized volatility is the sample standard deviation of daily fund returns times `sqrt(252)`. The guide permits CDI as the risk-free proxy for Sharpe and Sortino, but the exact denominator convention and minimum-observation rule must be documented and treated as a project modelling choice.

### Risk data

Drawdown and liquidity are supplied directly. Stress and DV01 require validated parsing of nested JSON. `var_mask_configs.csv` supplies definitions only. Empty or null risk results must remain unavailable.

### Internal comparison

Use the same observation window and calculation convention for each real fund. Do not generate missing metrics or compare funds over mismatched periods.

## Tests and verified baseline

The current baseline passes when executed with the local MAMP database and browser permissions:

```text
npm run lint    PASS
npm test        PASS
```

`npm test` currently covers:

- deterministic fixture generation;
- 19 Python tests for contracts, selected quality rules, privacy patterns, and simple formula examples;
- PHP/MySQL connectivity and endpoint validation;
- prepared-query injection resistance and CORS behavior;
- exact parity between MySQL/API output and the synthetic JSON fixture;
- navigation, responsive layout, keyboard behavior, scenarios, allocation interaction, and simulated Analyst workflow.

Current tests do not prove:

- partner CSV schema validation;
- clean-before-curated behavior;
- duplicate handling in real holdings;
- database ingestion idempotence;
- real PK/FK coverage across all datasets;
- real NAV reconstruction;
- period-aware return, CDI, volatility, or internal-comparison calculations;
- persisted manifests, quality issues, quarantine, or lineage;
- fund- and snapshot-specific allocations for real data;
- API empty-data and database-failure behavior under the Sprint 3 contract.

## Components to preserve

- Existing HTML shell and all nine navigation destinations.
- CSS tokens, typography, colors, spacing, responsive layout, and animation language.
- Reusable cards, tables, badges, state panels, and chart primitives.
- Current accessible labels, skip link, keyboard navigation, modal behavior, and responsive tests.
- MAMP, MySQL, PHP, PDO, native JavaScript, Python pipeline, and Node orchestration.
- Prepared SQL statements, strict query validation, local CORS controls, ignored local configuration, and no-secret conventions.
- Synthetic fixtures strictly for unit, edge-case, and offline test coverage.
- Peer-comparison UI as a clearly labelled unavailable/sample adapter until certification.

## Required Sprint 3 changes

### Data and pipeline

1. Add source-specific CSV contracts and parsers.
2. Record source metadata, byte size, modification timestamp, SHA-256, run id, and transform version.
3. Materialize identifiable Raw metadata, Bronze staging, Silver clean, Gold calculated, and Serving layers.
4. Validate schema, types, completeness, uniqueness, referential integrity, domains, portfolio reconciliation, and privacy before curated insertion.
5. Persist warnings, blocking issues, and quarantined records without logging source values.
6. Use deterministic natural keys and MySQL UPSERTs inside transactions.
7. Add an idempotence test that runs the same source twice and proves stable row counts and keys.

### Database

Create relational entities for the documented source grains, ingestion runs, source files, manifests, quality checks/issues, quarantine, calculated metrics, and serving data. Preserve private identifiers only in explicitly restricted tables and expose aliases or safe display labels to the application.

### Backend

Separate HTTP controllers, business services, and repositories. Put financial calculations and window alignment in the service layer. Add fund-, date-, and period-aware queries and honest unavailable states.

### Frontend integration

Keep the current presentation but request real endpoints when filters change. Remove synthetic runtime assertions, global allocation, `FUND_01` fallback positions, generated comparison volatility, fixed KPI cards, and simulated source/run labels from connected Sprint 3 screens.

### Evidence and documentation

Add real run history, manifests, hashes, quality issues, and lineage views; document the implemented backend; generate the sequence diagram and ERD from the final code/schema; update setup/reset/test instructions; and build a clean local ZIP without raw partner files, secrets, caches, or generated dependencies.

## Implementation plan and expected file areas

The minimum-change implementation will retain the existing stack and visual application:

| Phase | Expected areas |
|---|---|
| Database model | `Sprint 2/database/` migrations/schema and reset tooling |
| Pipeline | `Sprint 2/src/pipeline/` source contracts, stages, loaders, quality, manifests |
| Business logic | new PHP service modules under `Sprint 2/api/` |
| API | existing controllers plus focused Sprint 3 endpoints/repositories |
| Dashboard integration | `Sprint 2/src/app/js/data.js`, `state.js`, `pages.js`, `app.js` only where data flow requires it |
| Tests | `Sprint 2/tests/` data, business, API, and existing browser suites |
| Documentation | `docs/sprint3/`, `docs/architecture/`, root README, release notes |
| Delivery | reproducible packaging script and local ZIP output |

## Acceptance status before implementation

| Sprint 3 criterion | Current status |
|---|---|
| Dashboard still works and Sprint 2 design is preserved | Proven |
| Main screens no longer consume synthetic runtime data | Not achieved |
| Structured YvY datasets feed the pipeline | Not achieved |
| Reproducible and database-idempotent pipeline | Not achieved |
| Sources remain immutable | Proven during audit; automation missing |
| Validation and cleaning occur before curated storage | Not achieved |
| Real relational database with source-grain PK/FK | Not achieved |
| Main queries pass through backend/API | Partially achieved with synthetic data |
| Visible Sprint 3 KPIs are calculated, not hardcoded | Not achieved |
| Fund/snapshot allocation and holdings are specific | Not achieved |
| Period selection changes the actual data window | Not achieved |
| Internal comparison uses real comparable data | Not achieved |
| Quality issues and lineage are persisted | Not achieved |
| Sequence diagram and ERD match implemented code | Not achieved |
| Backend architecture is documented | Not achieved |
| Sprint 3 tests and setup-from-scratch pass | Not achieved |
| Safe Sprint 3 ZIP can be produced | Not achieved |

## Assumptions requiring explicit treatment

- Structured top-level CSVs are the canonical source for Sprint 3; detailed PortfolioView exports remain supplementary and immutable.
- The fund aliases in structured CSVs are permitted application display labels, but private security identifiers are not.
- Holdings allocation will use `sum(nav_value) / matching NAV`; `nav_percentage` is unusable and raw `exposure` is retained only as a source field.
- The unique holdings grain includes `group_identifier` because the documented three-column key is contradicted by six real collisions.
- Peer certification, authentication, RBAC, production orchestration, and advanced risk-model validation remain deferred unless needed to prevent a misleading current display.
- Modelling choices not fixed by partner documentation, including Sharpe denominator convention and minimum observations, must be configurable and labelled pending validation.
