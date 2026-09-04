# Sprint 2 - prototype, contracts, and evidence run

**Status:** interactive prototype<br>
**Product decision:** `Pending partner validation`<br>
**Versioned classification:** synthetic fixtures and shareable content only

## Delivered content

The prototype covers Executive Overview, Funds, Fund Detail, Allocation, Performance & Risk, Internal Comparison, Peer Comparison, Data Quality, Import & Validation, and Run History & Lineage. The Executive journey explores funds and their indicators; the Analyst journey simulates local structure checks, anomalies, quarantine, validation, and lineage.

Values remain synthetic or aliased. Production connectors, certified financial calculations, real RBAC, managed storage, orchestration, UAT, and partner validation are not declared complete.

## Structure

| Path | Content |
|---|---|
| `src/app/` | modular web application connected to the API |
| `src/pipeline/` | deterministic generation, DQ, privacy, and local Serving |
| `database/` | MySQL 5.7 schema, synthetic seed, and reproducible reset |
| `api/` | local read-only PHP/PDO MySQL API |
| `data/contracts/` | canonical schemas and KPI catalog |
| `config/` | examples without secrets or real data |
| `docs/` | architecture, policies, ADRs, backlog, and decisions |
| `tests/fixtures/` | exclusively synthetic test data |
| `tests/web/` | Playwright smoke test |
| `assets/` | regenerated local screenshots, ignored by Git |
| `reports/` | reports, audits, and presentations organized by type |
| `legacy/wireframes/` | compatibility redirect to the current application |

## Generate demonstration data

```powershell
py -3.12 "Sprint 2/src/pipeline/run_pipeline.py"
```

Outputs are written to `Sprint 2/src/pipeline/output/` and remain ignored by Git:

- `manifest.json`;
- `quality_report.json`;
- `run_log.json`;
- `serving_data.json`;
- `output_checksums.json`;
- `privacy_report.json`.

## Local database and MAMP API

Follow [`../MAMP_MYSQL_SETUP.md`](../MAMP_MYSQL_SETUP.md) to start MAMP, import `database/schema.sql` and `database/seed.sql`, then configure local credentials without versioning them.

The runtime flow is `MAMP MySQL -> PHP API -> dashboard`. `serving_data.json` remains an ignored technical output and a test reference; the browser no longer loads it and no silent JSON fallback is used.

## Run the dashboard

```powershell
npm start
```

Open `http://127.0.0.1:4173/src/app/`. The `legacy/wireframes/wireframes_sprint2.html` file redirects to this URL. The prototype calls only the local PHP API and makes no external requests.

## Test and verify

From the repository root:

```powershell
npm run build
npm run lint
npm test
py -3.12 "Sprint 2/src/pipeline/run_pipeline.py" --verify
py -3.12 "Sprint 2/src/pipeline/run_pipeline.py" --check-shareable "Sprint 2/src/pipeline/output"
```

Tests cover MySQL connectivity, every endpoint, parameter errors, injection attempts, exact parity with the synthetic fixture, all nine sections, ten scenarios, allocation drill-down, the Analyst workflow, keyboard navigation, desktop, and mobile.

## Local data and confidentiality

Real files are provided outside Git according to [`docs/local_data_setup.md`](docs/local_data_setup.md). The [`docs/source_matrix.md`](docs/source_matrix.md) matrix reconciles domains without exposing inputs. Private identifiers are excluded from every shareable output according to [`docs/anonymization_policy.md`](docs/anonymization_policy.md).

The GitHub remote is public. No internal report, source document, archive, private CNPJ or ISIN, or YvY data may be added or pushed. See [`docs/security_incident_response.md`](docs/security_incident_response.md).
