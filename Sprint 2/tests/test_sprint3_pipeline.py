from __future__ import annotations

import json
import os
import shutil
import sys
import unittest
import uuid
from pathlib import Path


SPRINT_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = SPRINT_ROOT / "src"
if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

from pipeline.config import DatabaseConfig
from pipeline.ingest import ingest_sources, sha256_file
from pipeline.mysql_loader import apply_schema, load_bundle, run_mysql
from pipeline.run_sprint3 import safe_report
from pipeline.transform import transform_to_curated


FIXTURES = SPRINT_ROOT / "tests" / "fixtures" / "sprint3_source"
SCHEMA = SPRINT_ROOT / "database" / "sprint3_schema.sql"
WORK_ROOT = SPRINT_ROOT / "src" / "pipeline" / ".work" / "sprint3-tests"


class TestSprint3Pipeline(unittest.TestCase):
    def copied_fixture(self) -> Path:
        copied = WORK_ROOT / uuid.uuid4().hex
        copied.parent.mkdir(parents=True, exist_ok=True)
        shutil.copytree(FIXTURES, copied)
        self.addCleanup(shutil.rmtree, copied, True)
        return copied

    def test_real_contract_fixture_ingests_without_quarantine(self) -> None:
        before = {path.name: sha256_file(path) for path in FIXTURES.iterdir() if path.is_file()}
        source = ingest_sources(FIXTURES)
        after = {path.name: sha256_file(path) for path in FIXTURES.iterdir() if path.is_file()}

        self.assertFalse(source.run_blocked)
        self.assertEqual(source.quarantined_count, 0)
        self.assertEqual(before, after, "ingestion modified an immutable source file")

    def test_transform_builds_safe_codes_and_reconciled_allocations(self) -> None:
        source = ingest_sources(FIXTURES)
        curated = transform_to_curated(source)

        self.assertEqual(curated.tables["funds"][0]["fund_code"], "FUND_01")
        self.assertEqual(curated.tables["funds"][0]["display_name"], "Fund 01")
        self.assertEqual(sum(row["weight"] for row in curated.tables["gold_allocations"]), 1)
        self.assertEqual(len(curated.tables["portfolio_holdings"]), 2)
        self.assertNotIn("SOURCE_FUND_A", json.dumps(safe_report(source, curated)))

    def test_duplicate_natural_keys_are_quarantined_before_curated(self) -> None:
        copied = self.copied_fixture()
        holdings = copied / "portfolio_holdings.csv"
        lines = holdings.read_text(encoding="utf-8").splitlines()
        holdings.write_text("\n".join([*lines, lines[1]]) + "\n", encoding="utf-8", newline="\n")

        source = ingest_sources(copied)
        duplicate_issues = [item for item in source.issues if item.rule_id == "DQ06"]
        self.assertEqual(len(duplicate_issues), 2)
        self.assertEqual(len(source.tables["portfolio_holdings.csv"]), 0)
        self.assertTrue(any(item.rule_id == "DQ13" for item in source.issues))

    def test_header_mismatch_rejects_the_run(self) -> None:
        copied = self.copied_fixture()
        funds = copied / "funds.csv"
        funds.write_text("wrong,header\nvalue,value\n", encoding="utf-8", newline="\n")
        source = ingest_sources(copied)
        self.assertTrue(source.run_blocked)
        self.assertTrue(any(item.rule_id == "DQ03" and item.action == "reject_run" for item in source.issues))

    def test_schema_contains_relations_and_governance_tables(self) -> None:
        schema = SCHEMA.read_text(encoding="utf-8")
        for table in (
            "ingestion_runs",
            "source_files",
            "quality_issues",
            "quarantine_records",
            "fund_nav_snapshots",
            "portfolio_holdings",
            "return_series",
            "dv01_items",
            "gold_allocations",
            "lineage_records",
        ):
            self.assertIn(f"CREATE TABLE IF NOT EXISTS {table}", schema)
        self.assertGreaterEqual(schema.count("FOREIGN KEY"), 25)
        self.assertGreaterEqual(schema.count("PRIMARY KEY"), 20)


@unittest.skipUnless(os.environ.get("FUNDS_MANAGER_RUN_DB_TESTS") == "1", "set FUNDS_MANAGER_RUN_DB_TESTS=1 for the MAMP integration test")
class TestSprint3DatabaseIdempotence(unittest.TestCase):
    database_name = "yvy_funds_manager_test"

    def test_two_imports_keep_one_run_and_identical_counts(self) -> None:
        config = DatabaseConfig.from_environment(self.database_name)
        run_mysql(config, f"DROP DATABASE IF EXISTS `{self.database_name}`;", select_database=False)
        try:
            apply_schema(config, SCHEMA)
            source = ingest_sources(FIXTURES)
            curated = transform_to_curated(source)
            first = load_bundle(config, source, curated)
            second = load_bundle(config, source, curated)
            self.assertEqual(first, second)
            self.assertEqual(second["ingestion_runs"], 1)
            self.assertEqual(second["funds"], 1)
            self.assertEqual(second["portfolio_holdings"], 2)
        finally:
            run_mysql(config, f"DROP DATABASE IF EXISTS `{self.database_name}`;", select_database=False)


if __name__ == "__main__":
    unittest.main()
