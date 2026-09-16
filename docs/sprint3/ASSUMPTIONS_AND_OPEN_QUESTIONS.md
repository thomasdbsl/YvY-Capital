# Sprint 3 Assumptions and Open Questions

## Confirmed implementation assumptions

- `returns_navps.csv` index values are base-100 observations, not percentage returns.
- Fund and benchmark calculations require at least two observations on exact common dates.
- A requested period may be partial; the API and UI must expose that fact rather than extrapolate.
- `% of CDI` is unavailable when the benchmark return is zero or mathematically negligible.
- Latest NAV/AUM is shown separately from indexed performance and is never plotted as a comparable return series.
- Source identifiers remain local and API-visible fund codes are deterministic aliases.
- The current environment is a local restricted prototype, not a production deployment.

## Open questions for partner validation

| Topic | Question | Current safe behavior |
|---|---|---|
| KPI certification | Is the documented `% of CDI` convention approved for every fund class and reporting context? | Formula is transparent and tested but not labeled partner-approved. |
| Partial periods | Should business users accept partial-window results or require a minimum coverage threshold? | Partial coverage is explicit; no annualization or extrapolation is applied. |
| Risk-free proxy | Should CDI remain the approved proxy for Sharpe and Sortino across all funds? | Current calculations are documented and remain pending certification. |
| NAV naming | Should the latest validated value be labeled NAV or AUM for each source context? | The targeted table says `NAV (latest AUM)` to avoid hiding the current source interpretation. |
| Peer data | Which source, classification, taxonomy, and methodology define a valid peer universe? | Peer values remain unavailable. |
| Invalid rows | Who owns resolution of the 45 quarantined rows and the external-source warning? | Rows stay excluded and traceable; source files are not edited. |
| Access control | Which roles may access restricted operational and portfolio details? | Local environment only; authentication and RBAC are deferred. |
| Retention and hosting | What retention, encryption, backup, region, and deletion rules apply to a managed deployment? | No production migration occurs before approval. |
