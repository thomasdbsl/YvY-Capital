from __future__ import annotations

import json
import sys
import unittest
from decimal import Decimal
from pathlib import Path

SPRINT2_ROOT = Path(__file__).resolve().parents[1]
if str(SPRINT2_ROOT) not in sys.path:
    sys.path.insert(0, str(SPRINT2_ROOT))

from pipeline.core import build_manifest, sha256_file
from pipeline.quality import inspect_csv, parse_br_decimal
from pipeline.run_pipeline import run, verify


FIXTURES = SPRINT2_ROOT / "tests" / "fixtures"
WORK_ROOT = SPRINT2_ROOT / "pipeline" / ".work"


class TestPipeline(unittest.TestCase):
    def test_brazilian_decimal(self) -> None:
        self.assertEqual(parse_br_decimal("1.234,56"), Decimal("1234.56"))

    def test_expected_csv_widths(self) -> None:
        self.assertEqual(inspect_csv(FIXTURES / "export_38.csv")["columns"], 38)
        self.assertEqual(inspect_csv(FIXTURES / "export_51.csv")["columns"], 51)
        empty = inspect_csv(FIXTURES / "export_empty_section_38.csv")
        self.assertEqual(empty["columns"], 38)
        self.assertEqual(empty["section_state"], "empty")

    def test_manifest_is_stable(self) -> None:
        first = build_manifest(FIXTURES, "synthetic")
        second = build_manifest(FIXTURES, "synthetic")
        self.assertEqual(first, second)
        self.assertGreaterEqual(len(first["files"]), 10)

    def test_idempotence(self) -> None:
        self.assertTrue(verify(FIXTURES))

    def test_expected_outputs_and_checksums(self) -> None:
        WORK_ROOT.mkdir(parents=True, exist_ok=True)
        output = WORK_ROOT / "test_pipeline_output"
        result = run(FIXTURES, output)
        expected = {"manifest.json", "quality_report.json", "run_log.json", "serving_data.json", "output_checksums.json", "privacy_report.json"}
        self.assertEqual({item.name for item in output.iterdir()}, expected)
        checksums = json.loads((output / "output_checksums.json").read_text(encoding="utf-8"))
        self.assertEqual(checksums["run_id"], "SPRINT2-WF-001")
        self.assertTrue(all(len(item["sha256"]) == 64 for item in checksums["files"]))
        self.assertTrue(result["privacy"]["publication_allowed"])


if __name__ == "__main__":
    unittest.main()
