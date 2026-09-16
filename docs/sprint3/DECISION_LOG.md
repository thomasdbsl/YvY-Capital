# Sprint 3 Decision Log

| ID | Decision | Rationale | Status |
|---|---|---|---|
| S3-D01 | Preserve the Sprint 2 frontend and replace only its runtime data path. | Protects validated UX while moving business logic and data governance to the backend. | Implemented |
| S3-D02 | Keep original CSV bytes immutable and clean rows before curated storage. | Supports reproducibility, auditability, and safe rejection without source mutation. | Implemented |
| S3-D03 | Use deterministic safe aliases in every browser response. | Keeps restricted source identifiers inside the local database boundary. | Implemented |
| S3-D04 | Centralize formulas in `FinancialMath.php` and orchestration in `FundsService.php`. | Prevents display-only corrections and duplicated financial logic. | Implemented |
| S3-D05 | Calculate `% of CDI` as a percentage-of-benchmark ratio. | `fund_return / benchmark_return * 100` matches the documented convention; zero benchmark is unavailable. | Implemented, pending partner certification |
| S3-D06 | Distinguish requested period from actual common data coverage. | `FUND_05` proved that a valid 12M request may only have a shorter common history. | Implemented |
| S3-D07 | Carry exact common observation dates through comparisons. | Equal start/end alone does not prove identical intermediate observations. | Implemented |
| S3-D08 | Extend the existing Internal Comparison endpoint and preserve its global ranking. | Avoids duplicate business logic and maintains backwards-compatible functionality. | Implemented |
| S3-D09 | Rebase targeted performance lines to 100 and use one shared Y domain. | Makes funds comparable without plotting misleading absolute NAV values. | Implemented |
| S3-D10 | Leave peer comparison unavailable until a governed source is certified. | Prevents fabricated or non-comparable business results. | Implemented |
| S3-D11 | Keep the ERD unchanged for final functional corrections. | No database table or relationship changed. | Confirmed |
| S3-D12 | Exclude raw data, credentials, generated output, legacy private artifacts, and large documents from delivery. | The code package must remain source-free and safe to distribute. | Implemented |
