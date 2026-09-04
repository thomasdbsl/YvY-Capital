from __future__ import annotations

import os
import re
from dataclasses import dataclass
from pathlib import Path


PIPELINE_DIR = Path(__file__).resolve().parent
SPRINT_ROOT = PIPELINE_DIR.parent.parent
REPOSITORY_ROOT = SPRINT_ROOT.parent


@dataclass(frozen=True)
class DatabaseConfig:
    host: str
    port: int
    user: str
    password: str
    database: str
    mysql_executable: Path

    @classmethod
    def from_environment(cls, database: str | None = None) -> "DatabaseConfig":
        selected_database = database or os.environ.get("FUNDS_MANAGER_DB_NAME", "yvy_funds_manager")
        if not re.fullmatch(r"[A-Za-z0-9_]+", selected_database):
            raise ValueError("FUNDS_MANAGER_DB_NAME may contain only letters, digits, and underscores")
        return cls(
            host=os.environ.get("FUNDS_MANAGER_DB_HOST", "127.0.0.1"),
            port=int(os.environ.get("FUNDS_MANAGER_DB_PORT", "3306")),
            user=os.environ.get("FUNDS_MANAGER_DB_USER", "root"),
            password=os.environ.get("FUNDS_MANAGER_DB_PASSWORD", os.environ.get("MYSQL_PWD", "")),
            database=selected_database,
            mysql_executable=Path(os.environ.get("MAMP_MYSQL_EXECUTABLE", r"C:\MAMP\bin\mysql\bin\mysql.exe")),
        )


DEFAULT_INPUT = REPOSITORY_ROOT / "data_YvY"
DEFAULT_OUTPUT = PIPELINE_DIR / "output_sprint3"
DEFAULT_SCHEMA = SPRINT_ROOT / "database" / "sprint3_schema.sql"
