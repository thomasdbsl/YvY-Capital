# MAMP + MySQL setup for Funds Manager

This procedure replaces the dashboard's runtime JSON file with the following local flow:

`MySQL MAMP -> read-only PHP API -> dashboard`

The database contains only the existing synthetic and anonymized Sprint 2 demonstration data. Do not import `data_YvY.zip`, partner exports, real fund names, CNPJ, private ISIN or personal data.

## 1. Start MAMP

1. Open MAMP.
2. In **Preferences**, note the Apache and MySQL ports selected on this computer.
3. Start **Apache** and **MySQL**.
4. Confirm that phpMyAdmin opens from the MAMP start page.

The project does not require ports `8888` or `8889`. Use the values displayed by the local MAMP installation.

## 2. Create and seed the database

The scripts are located in `Sprint 2/database/`:

- `schema.sql` creates `yvy_funds_manager_demo`, its InnoDB tables, keys and indexes;
- `seed.sql` loads the exact synthetic payload used by the Sprint 2 dashboard;
- `reset_database.ps1` reproducibly imports both scripts.

### Option A - phpMyAdmin

1. Open phpMyAdmin from MAMP.
2. Select **Import** and import `Sprint 2/database/schema.sql`.
3. Select the new `yvy_funds_manager_demo` database.
4. Import `Sprint 2/database/seed.sql`.
5. Confirm that the `funds` table contains 14 rows.

### Option B - PowerShell reset

Set the local connection values only in the current terminal. Replace the placeholders with the settings shown in MAMP:

```powershell
$env:FUNDS_MANAGER_DB_HOST = "127.0.0.1"
$env:FUNDS_MANAGER_DB_PORT = "<MYSQL_PORT>"
$env:FUNDS_MANAGER_DB_USER = "<MYSQL_USER>"
$env:MYSQL_PWD = "<LOCAL_MYSQL_PASSWORD>"
& ".\Sprint 2\database\reset_database.ps1"
Remove-Item Env:MYSQL_PWD
```

The password is never written to a tracked file. Regenerate `seed.sql`, when the synthetic fixture intentionally changes, with `npm run database:seed`.

## 3. Configure the PHP API

The API reads environment variables first and then optional overrides from `Sprint 2/api/config.php`.

Copy `Sprint 2/api/config.example.php` to `Sprint 2/api/config.php`, then replace only the local placeholders. `config.php` is ignored by Git and must never be committed.

Available settings:

| Setting | Environment variable | Purpose |
|---|---|---|
| `db_host` | `FUNDS_MANAGER_DB_HOST` | MySQL host |
| `db_port` | `FUNDS_MANAGER_DB_PORT` | MySQL port selected in MAMP |
| `db_name` | `FUNDS_MANAGER_DB_NAME` | `yvy_funds_manager_demo` |
| `db_user` | `FUNDS_MANAGER_DB_USER` | Local MySQL user |
| `db_password` | `FUNDS_MANAGER_DB_PASSWORD` | Local MySQL password |
| `allowed_origins` | `FUNDS_MANAGER_ALLOWED_ORIGINS` | Comma-separated dashboard origins |

The API uses PDO MySQL, native prepared statements and read-only `GET` endpoints. No credential is returned in an API response.

## 4. Expose the project through MAMP Apache

The simplest same-origin configuration is:

1. In MAMP **Preferences > Web Server**, set the document root to the absolute `Sprint 2` folder.
2. Restart Apache.
3. Open `http://localhost:<APACHE_PORT>/api/health.php`.
4. Open `http://localhost:<APACHE_PORT>/src/app/`.

With this layout, the dashboard automatically resolves the API at `/api`; no frontend configuration change is required.

If Apache serves the API from a different origin, set `globalThis.FUNDS_MANAGER_CONFIG.apiBaseUrl` before the application module is loaded, or update the single central value in `Sprint 2/src/app/js/config.js`. Add the dashboard origin to `allowed_origins`. Never use `*` outside an isolated local demonstration.

## 5. Local CLI alternative

MAMP MySQL must still be running. Configure the database connection in the current terminal, then launch the PHP runtime bundled with MAMP through the project command:

```powershell
$env:FUNDS_MANAGER_DB_HOST = "127.0.0.1"
$env:FUNDS_MANAGER_DB_PORT = "<MYSQL_PORT>"
$env:FUNDS_MANAGER_DB_NAME = "yvy_funds_manager_demo"
$env:FUNDS_MANAGER_DB_USER = "<MYSQL_USER>"
$env:FUNDS_MANAGER_DB_PASSWORD = "<LOCAL_MYSQL_PASSWORD>"
npm start
```

Open `http://127.0.0.1:4173/src/app/`. Stop the local PHP server with `Ctrl+C`, then remove the password variable:

```powershell
Remove-Item Env:FUNDS_MANAGER_DB_PASSWORD
```

## 6. Verify the installation

Open the health endpoint. A correct response is structurally equivalent to:

```json
{
  "status": "ok",
  "database": "connected",
  "classification": "synthetic-example",
  "run_id": "SPRINT2-WF-001",
  "funds": 14
}
```

Run all checks from the repository root while MAMP MySQL is running and the database settings are available in the terminal:

```powershell
npm run lint
npm test
```

The API integration test compares `/api/dashboard.php` with the generated legacy synthetic fixture and fails on any changed value, missing item or significant ordering difference.

## 7. API endpoints

| Endpoint | Purpose |
|---|---|
| `GET /api/health.php` | Connection, classification and dataset health |
| `GET /api/dashboard.php` | Complete contract consumed by the dashboard |
| `GET /api/funds.php` | Ordered fund list |
| `GET /api/fund.php?id=FUND_01` | One fund with allocation, positions, history and KPI |
| `GET /api/kpis.php?fund_id=FUND_01` | KPI list with optional fund validation |
| `GET /api/performance.php?fund_id=FUND_01&period=12m` | Period-filtered history (`1m`, `3m`, `6m`, `12m`) |
| `GET /api/allocation.php?fund_id=FUND_01` | Allocation and holdings |
| `GET /api/anomalies.php` | Optional `severity` and `status` filters |
| `GET /api/runs.php` | Run history and lineage proofs |

## 8. Common errors

### `Database is unavailable`

- Confirm MySQL is green in MAMP.
- Confirm the host, port, user and database name.
- Reimport `schema.sql` and `seed.sql` if the database is empty.
- Confirm that the selected MAMP PHP version has `pdo_mysql` enabled.

### Port already in use

- Use the Apache/MySQL ports shown in MAMP.
- For `npm start`, set another HTTP port with `FUNDS_MANAGER_HTTP_PORT`.
- Stop an older local server with `Ctrl+C` before restarting.

### CORS error

- Prefer serving the dashboard and API from the same MAMP document root.
- Otherwise, add the exact dashboard origin, including its port, to `allowed_origins`.
- Do not add an untrusted public origin.

### Dashboard remains on a blank loading state

- Open `/api/health.php`, then `/api/dashboard.php` directly.
- Check the browser console and Network panel for the HTTP status.
- Confirm that the API returns `classification: synthetic-example` and `publication_allowed: true`.
