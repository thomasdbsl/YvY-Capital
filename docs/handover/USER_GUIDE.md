# Funds Manager user guide

## Sign in and roles

Open the URL supplied by your operator and use your individually provisioned account. Executive accounts focus on business analysis and their own requests; Analyst accounts also have governance tools and the complete ticket queue. Backend permissions apply even to direct API requests. Sign out when finished. Expired sessions require signing in again.

## Executive workflow

Start in Overview, select a fund in Funds, then open Allocation to inspect a validated portfolio snapshot. The matching NAV and holdings refer to that snapshot. Select an allocation group to drill down to its holdings. Missing validated holdings remain unavailable. Net Return uses its displayed pair of observation dates; it is not automatically a twelve-month return.

Performance uses the selected period and available common fund/CDI observations. Read the actual coverage dates before interpreting Return or % of CDI. Its chart preserves source index levels rather than rebasing the selected period. The targeted Fund A / Fund B chart rebases each series to 100 at the common start; these remain index values, not percentage returns. Internal Comparison also provides an all-fund ranking. The ranking can have a shorter common window than the pair, so its risk ratios can be unavailable even when the pair has ratios.

Create a Ticket when an Analyst investigation is needed. Enter a concise question, priority and useful fund/screen context. Avoid unnecessary confidential identifiers in free text. Follow the response and status in your own requests; resolved requests remain in the history.

## Risk Analytics

- Overview: Return and % of CDI describe performance; volatility describes variability; Sharpe and Sortino relate excess return over CDI to variability. Read the actual history and availability notices.
- Drawdown: distance below the source historical peak. Zero means at the peak. Maximum drawdown is the minimum supplied observation in the displayed window.
- Liquidity: source estimate of the proportion of NAV liquidatable within the listed business-day horizon. It is prospective and not a guaranteed sale or a model newly calculated by this application. No interpolation is added.
- Stress: source-supplied hypothetical scenario totals and asset-group impacts. Scenario aliases protect source names. Currency, scale and business interpretation require partner confirmation where marked.
- DV01: supplied interest-rate sensitivity contributions, grouped by factor and shown by item. Bar lengths use magnitude; signed source values remain visible. Do not infer certified currency, sign or vertex units while the source-unit notice remains.

Unavailable is not zero. Limited observations, null source fields, missing scenarios or zero calculation denominators can prevent a result. Current Sortino uses dispersion of negative daily excess returns; consult the maintenance guide before comparing it with other vendors' conventions.

## Analyst workflow

The Analyst can use the business screens and receives the complete ticket queue. Investigate the referenced fund, reply and move the request through OPEN, IN_REVIEW and RESOLVED. Conflicting edits require reloading the current record. Actions retain actor/time evidence.

Data Quality lists rules, severity, status and source evidence. Search and filters narrow the issues. Review an issue and record a bounded explanation. Reviewing a record does not rewrite source values or automatically release quarantined data.

Reconciliation compares matching snapshot NAV with the validated holdings total before snapshot quarantine. Difference is holdings total minus expected NAV; the relative difference uses the absolute expected NAV. The current tolerance is 1%.

- Control result filters pass, fail or unavailable checks.
- Severity filters info, warning or blocking evidence.
- Review status filters open, resolved, quarantined or not-required workflow states.
- Snapshot date filters the exact portfolio date; the global fund selection scopes the fund.
- Run selects the ingestion evidence. The default selects the latest successful data run when no run is supplied; a newer failed or blocked attempt does not replace the published data reference.
- Review opens an associated exception. A review decision does not turn a failed mathematical control into a pass.

Import & Validation is an evidence screen; operators initiate imports through the controlled CLI. Runs & Lineage shows run status, manifest references, accepted/quarantined counts and the chain from source file to database table to dashboard domain. Source hashes identify the bytes used without publishing confidential rows.

## External peers and support

Peer Comparison remains pending a certified external source, approved classification, usage rights and comparable methodology. No invented peer results are displayed. Internal fund comparison remains available.

When reporting a problem, provide the screen, aliased fund, selected period/snapshot, actual coverage dates and run reference. Do not send passwords, session cookies or raw confidential files through ordinary support messages.
