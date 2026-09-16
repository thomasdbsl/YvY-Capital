# MAMP + MySQL setup for Funds Manager Sprint 3

This guide configures the local restricted runtime:

`authorized CSV files -> Python pipeline -> MAMP MySQL -> PHP API -> dashboard`

The source files stay under the ignored `data_YvY/` directory. Do not import the CSVs manually into final tables and do not commit partner data, database files, credentials, CNPJ, or private ISIN.

## 1. Start MAMP

1. Open MAMP.
2. Start **MySQL**.
3. Note the MySQL port, local user, and password.
4. Select a PHP version with `pdo_mysql` enabled.
5. Optionally start Apache if you want MAMP to serve the dashboard directly.

The code does not assume MAMP's default ports. Use the values displayed by your installation.

## 2. Prepare the source directory

Place the authorized structured files directly under `data_YvY/` at the repository root. The required names are listed in the root [`README.md`](README.md#2-prepare-the-local-source-data).

The pipeline reads the files without modifying them, computes SHA-256 fingerprints, parses exact contracts, validates and quarantines rows, then loads only cleaned data into MySQL.

## 3. Configure the MySQL client

From the repository root, set local values in the current PowerShell session:

```powershell
$env:FUNDS_MANAGER_DB_HOST = "127.0.0.1"
$env:FUNDS_MANAGER_DB_PORT = "3306"
$env:FUNDS_MANAGER_DB_NAME = "yvy_funds_manager"
$env:FUNDS_MANAGER_DB_USER = "root"
$env:FUNDS_MANAGER_DB_PASSWORD = "<LOCAL_MYSQL_PASSWORD>"
$env:MAMP_MYSQL_EXECUTABLE = "C:\MAMP\bin\mysql\bin\mysql.exe"
```

Do not write the real password into `.env.example`, `config.example.php`, a command-line argument, or any tracked file.

## 4. Build the database

Install Node dependencies once:

```powershell
npm install
```

Create the schema and import the source data:

```powershell
npm run database:setup
```

This calls `Sprint 2/scripts/setup_database.ps1`, applies `Sprint 2/database/sprint3_schema.sql`, and executes the deterministic Python pipeline. A second identical execution keeps the same natural keys, run ID, row counts, and checksums.

For a complete local reset:

```powershell
powershell -ExecutionPolicy Bypass -File ".\Sprint 2\scripts\setup_database.ps1" -Reset
```

`-Reset` drops only the database named by `FUNDS_MANAGER_DB_NAME` and rebuilds it. The database name is restricted to letters, digits, and underscores. Never use this option against a shared or production database.

## 5. Configure the PHP API

The CLI server inherits the environment variables above. No additional file is required.

For MAMP Apache launched from the graphical application, copy:

```text
Sprint 2/api/config.example.php
```

to:

```text
Sprint 2/api/config.php
```

Then edit only the local database values. `config.php` is ignored by Git and must remain local.

| Setting | Environment variable | Default |
|---|---|---|
| `db_host` | `FUNDS_MANAGER_DB_HOST` | `127.0.0.1` |
| `db_port` | `FUNDS_MANAGER_DB_PORT` | `3306` |
| `db_name` | `FUNDS_MANAGER_DB_NAME` | `yvy_funds_manager` |
| `db_user` | `FUNDS_MANAGER_DB_USER` | `root` |
| `db_password` | `FUNDS_MANAGER_DB_PASSWORD` | empty |
| `allowed_origins` | `FUNDS_MANAGER_ALLOWED_ORIGINS` | local port `4173` origins |

The API uses PDO MySQL with native prepared statements and exposes only read-only `GET` endpoints.

## 6. Recommended CLI launch

Keep MAMP MySQL running, then execute:

```powershell
npm start
```

Open:

- `http://127.0.0.1:4173/src/app/`
- `http://127.0.0.1:4173/api/health.php`

The script automatically selects the newest installed MAMP PHP runtime and serves the dashboard and API from the same origin. Stop it with `Ctrl+C`.

## 7. MAMP Apache alternative

1. Set MAMP's Apache document root to the absolute `Sprint 2` directory.
2. Ensure the local `api/config.php` contains the correct MySQL connection.
3. Restart Apache.
4. Open `http://localhost:<APACHE_PORT>/api/health.php`.
5. Open `http://localhost:<APACHE_PORT>/src/app/`.

The frontend resolves the API relative to the application and needs no URL edit in a same-origin setup.

## 8. Verify the runtime

A successful health response has this structure:

```json
{
  "status": "ok",
  "database": "connected",
  "classification": "local-restricted",
  "funds": 14,
  "run_id": "S3-..."
}
```

The exact fund count depends on the authorized source bundle. The API also reports `publication_allowed: false` in the dashboard metadata.

Run the full verification from the configured PowerShell session:

```powershell
$env:FUNDS_MANAGER_RUN_DB_TESTS = "1"
npm run lint
npm test
```

## 9. Useful endpoints

| Endpoint | Purpose |
|---|---|
| `/api/health.php` | connection and latest run |
| `/api/dashboard.php` | initial dashboard payload |
| `/api/funds.php` | aliased fund list |
| `/api/allocation.php?fund_id=FUND_01` | fund-specific portfolio |
| `/api/performance.php?fund_id=FUND_01&period=12m` | calculated period data |
| `/api/internal_comparison.php?period=6m` | shared-window comparison |
| `/api/anomalies.php` | persisted DQ issues |
| `/api/runs.php` | manifests, stage counts, and lineage |

## 10. Common errors

### `MySQL client not found`

Set `MAMP_MYSQL_EXECUTABLE` to the installed `mysql.exe` path.

### `Database is unavailable`

Confirm that MySQL is running, the port matches MAMP, the credentials are correct, and `pdo_mysql` is enabled.

### Pipeline reports a missing file

Check the exact filenames under `data_YvY/`. A missing required contract blocks the run intentionally.

### Pipeline completes with quarantine

This is not a silent failure. Inspect the Data Quality page or `Sprint 2/src/pipeline/output_sprint3/sprint3_run_report.json`. Valid rows are loaded; invalid rows are represented only by opaque references and reasons.

### Port already in use

```powershell
$env:FUNDS_MANAGER_HTTP_PORT = "4174"
npm start
```

### CORS error

Prefer same-origin hosting. Otherwise, add the exact dashboard origin to `FUNDS_MANAGER_ALLOWED_ORIGINS`; do not use a wildcard outside isolated local testing.

### Blank loading state

Open `/api/health.php` and `/api/dashboard.php` directly, then inspect the browser Network panel. The frontend intentionally shows an error rather than loading synthetic JSON.

## 11. Remove credentials from the terminal

```powershell
Remove-Item Env:FUNDS_MANAGER_DB_PASSWORD -ErrorAction SilentlyContinue
Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue
```
