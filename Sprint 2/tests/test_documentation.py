from __future__ import annotations

import unittest
from pathlib import Path

SPRINT2_ROOT = Path(__file__).resolve().parents[1]


class TestDocumentation(unittest.TestCase):
    def test_source_matrix_reconciles_coverage(self) -> None:
        text = (SPRINT2_ROOT / "docs" / "source_matrix.md").read_text(encoding="utf-8")
        self.assertIn("7 fonds", text)
        self.assertIn("14 fonds", text)
        self.assertIn("Snapshot", text)
        self.assertIn("Historique", text)

    def test_decisions_remain_pending(self) -> None:
        text = (SPRINT2_ROOT / "docs" / "decision_log_W4.md").read_text(encoding="utf-8")
        for number in range(1, 9):
            self.assertIn(f"D{number}", text)
        self.assertGreaterEqual(text.count("Pending partner validation"), 8)

    def test_backlog_has_execution_fields(self) -> None:
        text = (SPRINT2_ROOT / "docs" / "backlog_sprint3.md").read_text(encoding="utf-8")
        for field in ("Owner", "Reviewer", "Est.", "Fixture", "Commande d'acceptation", "Dependances", "Risques", "DoD"):
            self.assertIn(field, text)

    def test_mamp_mysql_setup_covers_the_reproducible_local_flow(self) -> None:
        text = (SPRINT2_ROOT.parent / "MAMP_MYSQL_SETUP.md").read_text(encoding="utf-8")
        for required in (
            "schema.sql",
            "seed.sql",
            "config.example.php",
            "/api/health.php",
            "pdo_mysql",
            "CORS",
            "reset_database.ps1",
            "synthetic and anonymized",
        ):
            self.assertIn(required, text)


if __name__ == "__main__":
    unittest.main()
