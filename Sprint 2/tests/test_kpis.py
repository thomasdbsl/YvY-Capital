from __future__ import annotations

import json
import unittest
from pathlib import Path

SPRINT2_ROOT = Path(__file__).resolve().parents[1]
FIXTURES = SPRINT2_ROOT / "tests" / "fixtures"


class TestKpis(unittest.TestCase):
    def test_catalog_is_complete(self) -> None:
        catalog = json.loads((SPRINT2_ROOT / "contracts" / "kpi_catalog.json").read_text(encoding="utf-8"))
        required = {
            "id", "name", "decision_question", "definition", "formula", "source", "grain", "unit", "window",
            "prerequisites", "controls", "tolerances", "failure_cases", "display_state", "lineage",
            "scenario_fixture", "implementation_status", "sprint_scope",
        }
        expected_ids = {f"K{index:02d}" for index in range(1, 17)} | {f"H{index:02d}" for index in range(1, 9)}
        self.assertEqual({item["id"] for item in catalog}, expected_ids)
        self.assertTrue(all(required <= set(item) for item in catalog))
        self.assertTrue(all((FIXTURES / item["scenario_fixture"]).exists() for item in catalog))

    def test_daily_return_formula(self) -> None:
        first, second = 100.0, 101.25
        self.assertAlmostEqual(second / first - 1, 0.0125)

    def test_invalid_history_covers_domain_failures(self) -> None:
        fixture = json.loads((FIXTURES / "history_invalid.json").read_text(encoding="utf-8"))
        self.assertTrue(any(item["nav"] is None or item["nav"] <= 0 for item in fixture["series"]))
        self.assertTrue(any(not -1 <= item["drawdown"] <= 0 for item in fixture["series"]))


if __name__ == "__main__":
    unittest.main()
