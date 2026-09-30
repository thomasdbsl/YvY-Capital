"""Restricted local backups. Restore only into an absent database."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from pipeline.config import DatabaseConfig
from pipeline.mysql_loader import mysql_environment, run_mysql, sql_value


def backup(config, destination):
    destination = destination.resolve()
    if destination.exists() or destination.with_suffix(destination.suffix + ".sha256").exists():
        raise ValueError("Backup destination already exists")
    destination.parent.mkdir(parents=True, exist_ok=True)
    dump = Path(os.environ.get("FUNDS_MANAGER_MYSQLDUMP", str(config.mysql_executable.with_name("mysqldump.exe" if os.name == "nt" else "mysqldump"))))
    arguments = [str(dump), f"--host={config.host}", f"--port={config.port}",
                 f"--user={config.user}", "--single-transaction", "--skip-lock-tables",
                 "--default-character-set=utf8mb4", "--hex-blob", "--no-tablespaces",
                 "--set-gtid-purged=OFF", config.database]
    created = False
    try:
        with destination.open("xb") as output:
            created = True
            result = subprocess.run(arguments, stdout=output, stderr=subprocess.PIPE,
                                    env=mysql_environment(config), check=False)
        if result.returncode:
            raise RuntimeError("Backup failed")
        digest = hashlib.sha256(destination.read_bytes()).hexdigest()
        destination.with_suffix(destination.suffix + ".sha256").write_text(digest + "\n", encoding="ascii")
        return {"status": "completed", "operation": "backup", "sha256": digest,
                "bytes": destination.stat().st_size}
    except Exception:
        if created:
            destination.unlink(missing_ok=True)
        raise


def restore(config, source):
    source = source.resolve()
    expected = source.with_suffix(source.suffix + ".sha256").read_text(encoding="ascii").strip()
    if hashlib.sha256(source.read_bytes()).hexdigest() != expected:
        raise ValueError("Backup integrity check failed")
    exists = run_mysql(config, "SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name="
                       + sql_value(config.database) + ";", select_database=False).strip()
    if exists != "0":
        raise ValueError("Restore requires an absent database")
    # Generated dumps never select another database. Treat other SQL dumps as untrusted.
    import re
    sql = source.read_text(encoding="utf-8")
    if re.search(r"(?im)^\s*(?:USE\s|CREATE\s+DATABASE\s|DROP\s+DATABASE\s|SOURCE\s|\\!)", sql):
        raise ValueError("Dump contains database-switching commands")
    run_mysql(config, f"CREATE DATABASE `{config.database}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;",
              select_database=False)
    run_mysql(config, sql, select_database=True)
    return {"status": "completed", "operation": "restore", "sha256": expected}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("operation", choices=["backup", "restore"])
    parser.add_argument("--database", required=True)
    parser.add_argument("--file", type=Path, required=True)
    args = parser.parse_args()
    try:
        config = DatabaseConfig.from_environment(args.database)
        result = (backup if args.operation == "backup" else restore)(config, args.file)
        print(json.dumps(result))
        return 0
    except Exception:
        print(json.dumps({"status": "failed", "operation": args.operation,
                          "error_code": "BACKUP_RESTORE_FAILED",
                          "hint": "Check configuration, checksum and target database. Restore requires an absent database; failed restores require operator inspection."}), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
