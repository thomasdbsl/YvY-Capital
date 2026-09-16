from __future__ import annotations

import re
import unittest
from pathlib import Path

SPRINT2_ROOT = Path(__file__).resolve().parents[1]
REPOSITORY_ROOT = SPRINT2_ROOT.parent
ARCHITECTURE_DOCS = REPOSITORY_ROOT / "docs" / "architecture"


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
        text = (REPOSITORY_ROOT / "MAMP_MYSQL_SETUP.md").read_text(encoding="utf-8")
        for required in (
            "sprint3_schema.sql",
            "setup_database.ps1",
            "-Reset",
            "config.example.php",
            "/api/health.php",
            "pdo_mysql",
            "CORS",
            "data_YvY/",
            "local-restricted",
        ):
            self.assertIn(required, text)

    def test_root_readme_covers_setup_and_reset(self) -> None:
        text = (REPOSITORY_ROOT / "README.md").read_text(encoding="utf-8")
        for required in (
            "## 1. Prerequisites",
            "## 2. Prepare the local source data",
            "## 3. Start MAMP and MySQL",
            "## 4. Configure the current terminal",
            "## 6. Create the schema and import the real datasets",
            "## 7. Launch the API and dashboard",
            "## 9. API endpoints",
            "## 10. Business logic",
            "## 11. Run tests",
            "## 12. Complete reset",
            "## Troubleshooting",
            "package_sprint3.ps1",
        ):
            self.assertIn(required, text)
        for required_document in (
            "SOURCE_TO_SCREEN_MAPPING.md",
            "DATABASE_MIGRATION_PLAN.md",
            "DECISION_LOG.md",
            "ASSUMPTIONS_AND_OPEN_QUESTIONS.md",
            "FINAL_QA_AUDIT.md",
        ):
            self.assertTrue((REPOSITORY_ROOT / "docs" / "sprint3" / required_document).is_file())

    def test_erd_table_set_matches_the_sql_schema(self) -> None:
        schema = (SPRINT2_ROOT / "database" / "sprint3_schema.sql").read_text(encoding="utf-8")
        erd = (ARCHITECTURE_DOCS / "sprint3_erd.mmd").read_text(encoding="utf-8")
        schema_tables = set(re.findall(r"^CREATE TABLE IF NOT EXISTS ([a-z0-9_]+)", schema, re.MULTILINE))
        erd_tables = set(re.findall(r"^    ([a-z0-9_]+) \{$", erd, re.MULTILINE))
        self.assertEqual(len(schema_tables), 22)
        self.assertEqual(erd_tables, schema_tables)

    def test_sequence_and_backend_docs_match_implemented_layers(self) -> None:
        sequence = (ARCHITECTURE_DOCS / "sprint3_sequence_diagram.mmd").read_text(encoding="utf-8")
        backend = (ARCHITECTURE_DOCS / "BACKEND_ARCHITECTURE.md").read_text(encoding="utf-8")
        for required in (
            "Immutable CSV Files",
            "ingest_sources / DQ",
            "transform_to_curated",
            "mysql_loader",
            "PHP API Controller",
            "FundsService",
            "FundRepository",
            "FinancialMath",
            "Quarantine",
            "GET performance.php?fund_id=FUND_01&period=12m",
            "No invented fallback value",
            "GET internal_comparison.php?fund_a=FUND_01&fund_b=FUND_05&period=12m",
            "Resolve exact common date set",
        ):
            self.assertIn(required, sequence)
        for required in (
            "controller -> service -> repository -> MySQL",
            "Where data is imported",
            "When data is cleaned",
            "Concrete request: user selects Fund X and 12M",
            "No fund, KPI, quality issue, run, lineage record, or financial value is persisted",
        ):
            self.assertIn(required, backend)

    def test_delivery_script_has_safety_gates(self) -> None:
        text = (SPRINT2_ROOT / "scripts" / "package_sprint3.ps1").read_text(encoding="utf-8")
        for required in (
            "Assert-ChildPath",
            "data_YvY",
            "PRIVATE KEY",
            "10MB",
            "DELIVERY_MANIFEST.sha256",
            "Compress-Archive",
            "Expand-Archive",
            "Archive integrity check failed",
            "SHA-256:",
        ):
            self.assertIn(required, text)


if __name__ == "__main__":
    unittest.main()
