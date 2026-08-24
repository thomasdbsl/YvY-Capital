from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path

SPRINT2_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = SPRINT2_ROOT / "src"
if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

from pipeline.run_pipeline import run


FIXTURES = SPRINT2_ROOT / "tests" / "fixtures"
WORK_ROOT = SPRINT2_ROOT / "src" / "pipeline" / ".work"


class TestContracts(unittest.TestCase):
    def test_contracts_are_valid_json(self) -> None:
        for name in ("silver.schema.json", "gold.schema.json", "serving.schema.json", "kpi_catalog.json"):
            value = json.loads((SPRINT2_ROOT / "data" / "contracts" / name).read_text(encoding="utf-8"))
            self.assertTrue(value)

    def test_serving_payload_cardinality_and_lineage(self) -> None:
        WORK_ROOT.mkdir(parents=True, exist_ok=True)
        output = WORK_ROOT / "test_contract_output"
        run(FIXTURES, output)
        serving = json.loads((output / "serving_data.json").read_text(encoding="utf-8"))
        self.assertEqual(len(serving["funds"]), 14)
        self.assertEqual(len(serving["kpis"]), 24)
        self.assertGreaterEqual(len(serving["lineage_proofs"]), 3)
        required = {"screen_value_id", "kpi_id", "lineage_ref", "source_id", "source_record_id", "run_id", "business_date"}
        self.assertTrue(all(required <= set(item) for item in serving["lineage_proofs"]))


if __name__ == "__main__":
    unittest.main()
