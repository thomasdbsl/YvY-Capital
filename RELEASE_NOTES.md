# Funds Manager Release Notes

## Sprint 5 / 1.0.0

Source release for the final product and operational handover. Consult the gap matrix for current verification and package gates; the version number does not constitute formal YvY acceptance or production deployment.

- Preserves the Sprint 4 role-based beta, advanced risk views, persistent tickets and audited reviews.
- Adds credential-change session revocation and CLI account disable/reactivation.
- Adds local ingestion locking, safe structured stage logs, independent attempt monitoring and health evidence.
- Fixes replay with fund-linked tickets; rejects alias reassignment instead of redirecting workflow references.
- Verifies transactional rollback and keeps dashboard lineage tied to the last successful import.
- Adds backup/restore tooling and technical user, operations, maintenance and deployment guides.
- Fixes mobile Data Quality draft loss during asynchronous loading.
- Separates static application build from historical synthetic regression generation.
- Restricts destructive pipeline reset to dedicated names ending in `_qa`.

See `docs/handover/KNOWN_LIMITATIONS.md` and `SPRINT5_GAP_MATRIX.md` for current release gates and external dependencies. The Sprint 3 section below is historical, including its old limitations and reset procedure; use the current README and handover guides for operation.

## Sprint 4 / 0.4.0

- Executive/Analyst authentication, backend RBAC, session/CSRF protection and ticket ownership.
- Summary, Drawdown, Liquidity, Stress and DV01 analytics with source-unit caveats.
- Persistent Analyst reviews, reconciliation evidence, contextual tickets and audit history.
- Responsive and keyboard role journeys and financial/API/security regression coverage.

## Sprint 3 / 0.3.0

### Added

- deterministic ingestion of the authorized structured CSV bundle;
- Raw, Bronze, Silver, Gold, and Serving stage evidence;
- strict contracts, typed parsing, DQ rules, quarantine, manifests, SHA-256, and lineage;
- MySQL 5.7 relational schema with governance and curated projections;
- idempotent setup and complete reset commands;
- PHP/PDO controller, service, and repository layers;
- backend-owned period return, CDI, volatility, Sharpe, Sortino, NAV reconstruction, and allocation formulas;
- fund-, snapshot-, and period-specific API endpoints;
- backend architecture documentation, Sequence Diagram, and ERD;
- data, database, business, API, privacy, and browser tests;
- restricted delivery ZIP builder.
- readable date and `Performance Index` axes using one shared scale for fund and benchmark series;
- targeted Fund A versus Fund B comparison with exact common dates, seven metrics, and rebased performance lines.

### Changed

- the Sprint 2 dashboard now reads MySQL-backed API responses instead of runtime synthetic JSON;
- fund and holding identifiers are exposed as deterministic safe aliases;
- allocation drill-down is specific to the selected fund and snapshot;
- period selection changes the actual date window and calculations;
- internal comparison uses one shared window across loaded funds;
- requested and actual performance windows are now distinguished with explicit complete/partial coverage;
- `% of CDI` is displayed as a separate metric and never labeled as the CDI return itself;
- Data Quality and Runs & Lineage display persisted pipeline evidence;
- peer and unsupported metrics display explicit unavailable states;
- responsive tests now use a dedicated local port and enforce no horizontal overflow.

### Final functional corrections

- confirmed that `FUND_05` 12M is mathematically correct: `10.58782108% / 7.29105072% * 100 = 145.21667020% of CDI`;
- identified the apparent inconsistency as partial history, not a formula defect: actual common dates are `2026-01-30` to `2026-08-11` versus a requested start of `2025-08-11`;
- enforced exact common observation dates for fund/benchmark and cross-fund comparisons;
- added the deterministic `100 -> 110` versus `100 -> 108` test, expecting `125% of CDI`, plus a zero-benchmark `null` test;
- retained the existing 14-fund ranking below the new targeted comparison.

### Security and privacy

- raw YvY files, archives, local database content, credentials, and generated outputs are excluded from the delivery package;
- the API never selects restricted source names, CNPJ, private ISIN, or local file paths;
- rejected records are represented by source row and opaque hashes, not copied values;
- `.env.example` and `config.example.php` contain placeholders only;
- all dynamic SQL uses native PDO prepared statements.

### Data-quality result for the validated local bundle

- deterministic run: `S3-09F87790A5D78492470A`;
- 5,440 Raw/Bronze rows;
- 5,395 Silver rows;
- 45 quarantined rows and 1 warning;
- 6,687 curated relational records;
- 262 Gold/Serving projections;
- 6,425 lineage records.

### Upgrade from Sprint 2

1. Install MAMP, Python 3.12, Node.js 20+, and npm dependencies.
2. Place the authorized source CSVs under ignored `data_YvY/`.
3. Set the local database environment variables from `.env.example`.
4. Run `powershell -ExecutionPolicy Bypass -File ".\Sprint 2\scripts\setup_database.ps1" -Reset`.
5. Run `npm start` and open `http://127.0.0.1:4173/src/app/`.

The historical Sprint 2 schema/seed and synthetic fixtures remain only for regression compatibility. They are not the Sprint 3 runtime source.

### Known limitations

- local restricted prototype only; no production deployment, authentication, or RBAC;
- peer comparison pending governed source certification;
- external debenture source unavailable in the current bundle;
- invalid source rows remain quarantined pending partner review;
- advanced risk/KPI certification and production orchestration are deferred.
