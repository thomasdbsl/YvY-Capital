# Sprint 3 Final QA Audit

## Scope and date

Final functional-correction QA was completed on September 5, 2026 against the existing local restricted database `yvy_funds_manager_sprint3`. The database was not reset and the architecture, pipeline, and schema were not rebuilt.

## Functional evidence

| Requirement | Evidence | Result |
|---|---|---|
| `% of CDI` formula | PHP deterministic test: fund `100 -> 110`, CDI `100 -> 108`, result `125` | Passed |
| Zero CDI return | PHP deterministic test returns `null` | Passed |
| Exact fund/CDI dates | service retains the resolved exact date list; API recalculation from response history | Passed |
| `FUND_05` 12M | `10.58782108 / 7.29105072 * 100 = 145.21667020` on 2026-01-30 to 2026-08-11 | Passed, partial coverage explicit |
| Additional CDI cases | `FUND_01`, `FUND_02`, and short-history `FUND_11` diagnostics | Passed |
| CDI label | separate `Period return` and `% of CDI` cards/table rows | Passed |
| Performance axes | date X axis and numeric `Performance Index` Y axis on one shared domain | Passed |
| Responsive axes | 1024, 768, and 390 px browser checks; maximum three date ticks below 520 px | Passed |
| Two-fund selectors | API/MySQL-backed Fund A and Fund B controls | Passed |
| A differs from B | opposite option disabled; equal backend request returns `400` | Passed |
| Unknown fund | backend returns `404` | Passed |
| Exact targeted window | four-series date intersection and common-window response | Passed |
| Targeted metrics | return, `% of CDI`, NAV/AUM, volatility, Sharpe, Sortino, drawdown | Passed |
| No common data | fewer than two common observations returns unavailable without calculation | Passed by deterministic window test and service branch |
| Global ranking retained | API and browser both assert 14 rows | Passed |

## Regression

The Playwright journey opened Overview, Funds, Allocation, Performance, Internal Comparison, Peer Comparison, Data Quality, Import/Validation, and Runs/Lineage. It also changed funds, snapshots, periods, allocation filters, targeted comparison funds, display states, and user journey. No console error or horizontal page overflow was observed.

## Automated results

| Command | Exact result |
|---|---|
| `npm run lint` | Python compile passed, JavaScript syntax passed, 18 PHP files passed |
| `npm run build` | legacy fixture generation passed; Sprint 3 dry-run validation completed with one expected fixture warning |
| `npm run test:python` with `FUNDS_MANAGER_RUN_DB_TESTS=1` | 31 tests passed, including isolated MySQL repeat-import idempotence |
| `npm run test:business` | financial business logic passed |
| `npm run test:api` | MySQL integration, four CDI diagnostics, comparison validation, privacy, errors, CORS, and lineage passed |
| `npm run test:web` | nine views, real requests, CDI UI parity, axes, targeted comparison, keyboard, and responsive checks passed |

## Synthetic/mock term classification

The final search covered `mock`, `fake`, `sample`, `synthetic`, `fixture`, `Math.random`, `hardcoded`, `fallback`, and `localStorage`.

- `Sprint 2/tests/fixtures/` and Sprint 2 generator files are isolated regression assets, not the dashboard runtime.
- `Sprint 2/legacy/` and historical Sprint 2 database files document or reproduce the earlier prototype and are excluded from the final ZIP where not required.
- `sampleStandardDeviation` is the statistical estimator used for volatility, not sample business data.
- `peer_sample` is an empty compatibility response key; uncertified peer data remains unavailable.
- `.badge.sample` is an unused compatibility style.
- `pages.js` uses the variable name `fallback` only for the text `Unavailable`; it does not load fallback financial data.
- documentation uses these terms to describe exclusions, historical state, or test fixtures.
- no `Math.random`, runtime hardcoded fund correction, runtime synthetic data source, or browser `localStorage` financial state is present.

## Privacy and delivery gates

The delivery builder includes an allowlist, 10 MB per-file limit, forbidden-path scan, CNPJ/private-ISIN/key/path pattern scan, SHA-256 manifest, archive extraction, manifest hash verification, extracted-file recount, repeated forbidden-content scan, and final archive SHA-256 sidecar. It excludes `data_YvY`, archives, real `.env`, `config.php`, documents, media, caches, generated outputs, and dependency directories.

## Remaining limitations

- local restricted prototype without authentication, RBAC, production orchestration, or managed deployment controls;
- KPI methodology remains pending formal partner certification;
- partial histories are displayed without extrapolation or annualization;
- peer data remains unavailable pending an approved source and methodology;
- invalid source rows remain quarantined rather than manually corrected.
