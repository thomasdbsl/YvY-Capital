# Sprint 3 Source-to-Screen Mapping

## Purpose

This mapping identifies the implemented path from authorized local CSV sources to each dashboard screen. Source values remain local; the browser receives safe aliases and only the fields selected by the API.

## Runtime chain

`CSV -> contract parsing -> DQ/quarantine -> MySQL Silver/Gold -> PDO repository -> PHP service -> JSON API -> dashboard component`

| Screen | Source domains | MySQL projection/tables | Endpoint and service | Visible result |
|---|---|---|---|---|
| Overview | funds, NAV, holdings, returns, DQ | `funds`, `gold_fund_latest`, `return_series`, `quality_issues` | `dashboard.php`, `FundsService`, `GovernanceService` | latest validated AUM coverage, issues, selected fund performance |
| Funds | funds, NAV | `funds`, `gold_fund_latest` | `funds.php`, `FundsService::funds` | safe fund aliases, latest available NAV/AUM, status |
| Allocation | NAV, holdings | `fund_nav_snapshots`, `portfolio_holdings`, `gold_allocations` | `allocation.php`, `FundsService::portfolio` | selected snapshot allocation, masked holdings, reconciliation |
| Performance | fund/CDI base-100 series, drawdown | `return_series`, `drawdowns` | `performance.php`, `FundsService::performance`, `FinancialMath` | period return, `% of CDI`, risk metrics, aligned chart |
| Targeted Internal Comparison | two fund/CDI series, NAV, drawdown | `return_series`, `gold_fund_latest`, `drawdowns` | `internal_comparison.php`, `FundsService::targetedComparison` | Fund A/Fund B metrics and two rebased series on exact common dates |
| Portfolio-wide Comparison | all fund/CDI series, NAV | `return_series`, `gold_fund_latest` | `internal_comparison.php`, `FundsService::internalComparison` | existing 14-fund ranking on one shared window |
| Peer Comparison | no certified source | none | dashboard unavailable state | no invented peer values |
| Data Quality | all imported domains | `quality_issues`, `quarantine_records` | `anomalies.php`, `GovernanceService` | rule, severity, action, opaque record reference |
| Import and Validation | all source manifests and stages | `ingestion_runs`, `source_files`, `pipeline_stage_counts` | `dashboard.php`, `GovernanceService` | read-only pipeline evidence |
| Runs and Lineage | all accepted records | `ingestion_runs`, `source_files`, `lineage_records` | `runs.php`, `GovernanceService` | run status, hashes, counts, source-to-target proof |

## Performance calculation trace

1. `returns_navps.csv` supplies base-100 fund and benchmark index observations.
2. `ingest.py` validates dates and positive index values; invalid rows are quarantined.
3. `transform.py` maps safe fund aliases and creates `return_series` rows.
4. `FundRepository::returnSeries` returns ordered fund and benchmark observations.
5. `FundsService` intersects dates and resolves the requested calendar period.
6. `FinancialMath` calculates both returns on the same first and last observation and derives `% of CDI`.
7. `performance.php` returns actual/requested windows, coverage, metrics, and history.
8. `pages.js` displays separate Period Return and `% of CDI` values; `charts.js` renders numeric index axes.

## Privacy boundary

Source fund names, CNPJ, private ISIN, restricted asset/issuer names, original row values from rejected records, source directories, and credentials are never selected into an API response. API privacy tests scan every response for these patterns.
