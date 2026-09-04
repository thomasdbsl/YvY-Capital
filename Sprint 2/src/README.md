# Source code

- `app/` contains the dashboard served under `/src/app/` and its adapter to `/api/dashboard.php`.
- `pipeline/` contains the Python package and its ignored local outputs.

The MySQL database and PHP API are located in `../database/` and `../api/`, respectively. Pipeline JSON outputs are no longer used by the browser at runtime.

Versioned code must contain only synthetic or aliased data.
