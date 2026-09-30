from __future__ import annotations

import json
import re
import subprocess
import tempfile
import sys
import unittest
from pathlib import Path


SPRINT2_ROOT = Path(__file__).resolve().parents[1]
DATABASE_ROOT = SPRINT2_ROOT / "database"
sys.path.insert(0, str(SPRINT2_ROOT / 'src'))
from pipeline.run_pipeline import run


class TestDatabaseAssets(unittest.TestCase):
    def test_schema_uses_mysql_constraints_and_expected_tables(self) -> None:
        schema = (DATABASE_ROOT / "schema.sql").read_text(encoding="utf-8")
        for table in (
            "dataset_runs",
            "funds",
            "allocations",
            "positions",
            "performance_history",
            "fund_kpis",
            "peer_samples",
            "anomalies",
            "lineage_proofs",
        ):
            self.assertRegex(schema, rf"CREATE TABLE {table}\s*\(")
        self.assertGreaterEqual(schema.count("ENGINE=InnoDB"), 9)
        self.assertIn("DEFAULT CHARSET=utf8mb4", schema)
        self.assertGreaterEqual(schema.count("FOREIGN KEY"), 8)
        self.assertIn("DECIMAL(20,2)", schema)
        self.assertIn("DATETIME NOT NULL", schema)

    def test_seed_is_deterministic_and_synthetic(self) -> None:
        current_seed = DATABASE_ROOT / "seed.sql"
        with tempfile.TemporaryDirectory() as directory:
            fixture_output = Path(directory) / 'fixture'
            run(SPRINT2_ROOT / 'tests' / 'fixtures', fixture_output)
            source = fixture_output / 'serving_data.json'
            self.assertEqual(json.loads(source.read_text(encoding="utf-8"))["meta"]["classification"], "synthetic-example")
            generated = Path(directory) / "seed.sql"
            subprocess.run(
                [sys.executable, str(DATABASE_ROOT / "build_seed.py"), "--source", str(source), "--output", str(generated)],
                check=True,
                capture_output=True,
                text=True,
            )
            self.assertEqual(generated.read_bytes(), current_seed.read_bytes())

        seed = current_seed.read_text(encoding="utf-8")
        self.assertIn("FUND_01", seed)
        self.assertNotRegex(seed, r"\b\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}\b")
        self.assertNotRegex(seed, r"\b[A-Z]{2}[A-Z0-9]{9}[0-9]\b")
        self.assertIsNone(re.search(r"[A-Za-z]:\\Users\\", seed, re.IGNORECASE))


if __name__ == "__main__":
    unittest.main()
