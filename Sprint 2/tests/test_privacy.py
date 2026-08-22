from __future__ import annotations

import sys
import unittest
from pathlib import Path

SPRINT2_ROOT = Path(__file__).resolve().parents[1]
if str(SPRINT2_ROOT) not in sys.path:
    sys.path.insert(0, str(SPRINT2_ROOT))

from pipeline.privacy import scan_shareable_tree, scan_text
from pipeline.run_pipeline import run


FIXTURES = SPRINT2_ROOT / "tests" / "fixtures"
WORK_ROOT = SPRINT2_ROOT / "pipeline" / ".work"


class TestPrivacy(unittest.TestCase):
    def test_synthetic_markers_are_detected(self) -> None:
        self.assertTrue(scan_text("FORBIDDEN_ENTITY_TEST", ["FORBIDDEN_ENTITY_TEST"]))
        self.assertTrue(scan_text("PRIVATE_ID_TEST_001"))

    def test_generated_outputs_exclude_input_markers(self) -> None:
        WORK_ROOT.mkdir(parents=True, exist_ok=True)
        output = WORK_ROOT / "test_privacy_output"
        run(FIXTURES, output)
        combined = "\n".join(path.read_text(encoding="utf-8") for path in output.iterdir())
        self.assertNotIn("FORBIDDEN_ENTITY_TEST", combined)
        self.assertNotIn("PRIVATE_ID_TEST_001", combined)
        report = scan_shareable_tree(output, ["FORBIDDEN_ENTITY_TEST"])
        self.assertTrue(report["publication_allowed"])

    def test_aliases_are_used_in_serving_output(self) -> None:
        WORK_ROOT.mkdir(parents=True, exist_ok=True)
        output = WORK_ROOT / "test_alias_output"
        run(FIXTURES, output)
        serving = (output / "serving_data.json").read_text(encoding="utf-8")
        self.assertIn("FUND_01", serving)
        self.assertIn("EMET_01", serving)
        self.assertIn("CUSTO_01", serving)


if __name__ == "__main__":
    unittest.main()
