# Sprint 3 Database Migration Plan

## Scope

Sprint 3 currently runs in a local restricted MAMP MySQL 5.7 environment. This plan describes a future controlled migration to a managed environment; it does not claim that production deployment, partner approval, authentication, or operational controls already exist.

## Preconditions

- partner approval for source classification, retention, access, and hosting region;
- named data owner and technical operator;
- managed secret storage and least-privilege database accounts;
- encrypted transport and storage;
- backup, restore, monitoring, alerting, and incident procedures;
- approved UAT data and KPI reconciliation evidence.

## Migration stages

1. Freeze and tag the approved schema, transform version, source contracts, and formula definitions.
2. Provision an isolated managed database and an application read-only account; never reuse local root credentials.
3. Apply `sprint3_schema.sql` to an empty database and verify all 22 tables, keys, indexes, and 38 foreign keys.
4. Transfer only an authorized source bundle through an approved secure channel; do not place raw files in Git or the delivery ZIP.
5. Execute the deterministic loader in a private worker environment and compare run ID, manifests, stage counts, quarantines, and lineage.
6. Run data reconciliation against the approved local baseline, including NAV totals, record counts, return indexes, and selected KPI calculations.
7. Point a staging API at the managed database through environment-based secrets and run the complete automated and business acceptance suites.
8. Obtain partner sign-off before enabling users; keep peer and uncertified metrics unavailable.
9. Cut over using a reversible configuration change, monitor health and query errors, and retain the validated prior database snapshot.

## Rollback

Rollback changes only the application database connection to the previous validated snapshot. It does not rewrite ingestion history. A failed load remains recorded as a separate governed run with issue metadata; raw source files remain immutable.

## Evidence required for approval

- schema and ERD parity;
- successful restore rehearsal;
- deterministic repeat-import counts;
- source-to-screen reconciliation;
- security review and secret scan;
- performance and capacity baseline;
- signed business validation for `% of CDI` and other exposed KPIs;
- all nine dashboard views passing acceptance tests.
