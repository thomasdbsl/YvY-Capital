# Financial conventions and source-to-screen checks

## Source review

Reviewed against the project Feature Guide (pages 4-7), Data Dictionary (pages 6-9 and 11), and Sprint 1 Delivery Roadmap (Sprint 5, page 8). These source PDFs are separate restricted project documents, not included in the source release. They do not constitute new partner acceptance or risk-unit certification.

The Feature Guide explicitly separates computed performance statistics from supplied risk outputs. The Data Dictionary confirms that `accrued_return_pct` is a rebased index, not a percentage return. The implementation keeps this distinction.

## Canonical calculations

| Measure | Convention | Implementation |
| --- | --- | --- |
| Period return | Last index / first index - 1 over exact common dates | `FinancialMath::periodReturn` |
| Percentage of CDI | Fund period return / benchmark period return x 100; unavailable for a zero benchmark return | `FinancialMath::metrics` |
| Daily return | Consecutive available aligned index observations: current / previous - 1 | `FinancialMath::dailyReturns` |
| Volatility | Sample standard deviation (n - 1) of fund daily returns x sqrt(252) | `FinancialMath::metrics` |
| Sharpe | Mean daily fund-minus-CDI excess / sample SD of fund daily returns x sqrt(252) | `FinancialMath::metrics` |
| Sortino | Mean daily excess / sample SD of negative excess observations only x sqrt(252), not RMS downside deviation | `FinancialMath::metrics` |
| Maximum drawdown | Minimum supplied drawdown within the selected window; historical peak may precede the window | Fund/Risk services and supplied drawdowns |
| Reconstructed NAV | Anchor NAV x target index / anchor index, where explicitly requested; not a substitute for snapshot NAV | `FinancialMath::reconstructNav` |
| Allocation | Sum of holdings by group divided by same-fund/same-snapshot validated NAV | `FundsService` |
| Allocation Net Return | Last two fund-index observations on or before the snapshot; both dates returned | `FundsService` |
| Reconciliation | Holdings total - expected NAV; relative difference divides by absolute expected NAV | Governed ingestion and reconciliation evidence |

Volatility and Sharpe use the configured minimum risk history (20 daily returns by default). Sortino requires at least two negative excess observations with nonzero dispersion. Zero dispersion or missing evidence is unavailable, not zero. Ratios are unitless; `% of CDI` is already expressed on the x100 scale. The browser formats backend results and does not implement a second financial engine.

Periods use available source dates and expose requested and actual coverage. Common-window comparison intersects fund and benchmark dates before applying the same conventions. The 252-day annualization is the documented project convention; it is not independently certified by YvY. Missing business dates are not imputed.

## Supplied risk evidence

- Drawdown uses supplied fractions, after bounds validation, rather than recomputing a peak from a truncated chart.
- Liquidity is an as-of estimate of the fraction liquidatable within business-day horizons. It is not a future NAV forecast or guaranteed execution price; missing horizons are not interpolated.
- Stress parses successful source JSON and aligns scenario masks and asset-group totals. It does not manufacture VaR from configuration rows or rescale unconfirmed source values.
- DV01 normalizes source exposure items and sums supplied contributions by factor. Null remains unavailable/not applicable. Exact units, scale and sign interpretation require partner confirmation.
- Peer data remains behind the certification boundary; internal comparisons do not depend on peer availability.

## Traceability checks

Performance displays the original validated fund/CDI index levels, without rebasing at the selected window's start. Its caption explicitly states this; period returns still use the ratio of the last and first aligned observations. The targeted Fund A / Fund B comparison separately rebases both displayed series to 100 at their common start, in the backend. These distinct chart conventions do not change the KPI formulas.

| Screen/domain | Curated evidence | Service boundary |
| --- | --- | --- |
| Overview/fund NAV | `fund_nav_snapshots`, `gold_fund_latest` | Fund repository -> Funds service |
| Allocation/holdings | `portfolio_holdings`, `gold_allocations`, matching NAV | Funds service |
| Performance/comparison | `return_series` and source drawdowns | Funds service -> FinancialMath |
| Liquidity | `liquidity_horizons` with its own as-of date | Risk service |
| Stress | `stress_results` and parsed source masks | Risk service -> StressParser |
| DV01 | `dv01_results`, `dv01_items` | Risk service |
| Quality/reconciliation | `quality_issues`, `quarantine_records`, `reconciliation_evidence`, reviews | Governance/reconciliation/review services |
| Runs/lineage | `ingestion_runs`, `source_files`, `pipeline_stage_counts`, `lineage_records` | Governance service |

Trace the fund/date and `last_run_id` to the deterministic ingestion run, then to manifest SHA-256 and lineage fingerprints. The business dashboard uses the last successful data run; a newer blocked attempt is operational evidence and must not be labeled as the producer of retained financial values. `pipeline_attempts` records execution lifecycle separately from data identity.

## Verification boundary

Financial unit tests include explicit ratio, zero-denominator, dispersion and unavailable cases. API tests compare source-backed fund/date windows and backend results. Browser tests exercise selections and displayed states. Fresh import/replay and rollback tests verify database integrity separately. Final release evidence must record the actual suite results; these checks are not investment advice, source-data certification or formal business acceptance.
