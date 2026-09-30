from __future__ import annotations

import json
import os
import shutil
import sys
import unittest
import uuid
import copy
import io
import hashlib
from contextlib import redirect_stderr
from pathlib import Path


SPRINT_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = SPRINT_ROOT / "src"
if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

from pipeline.config import DatabaseConfig
from pipeline.ingest import ingest_sources, sha256_file
from pipeline.mysql_loader import DELETE_ORDER, TABLE_COLUMNS, apply_schema, database_counts, load_bundle, run_mysql, sql_value
from pipeline.run_sprint3 import safe_report
from pipeline.transform import transform_to_curated
from pipeline.monitoring import PipelineAttempt


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

    def test_required_instrument_and_bond_reference_are_validated(self) -> None:
        missing_id = self.copied_fixture()
        holdings = missing_id / "portfolio_holdings.csv"
        lines = holdings.read_text(encoding="utf-8").splitlines()
        columns = lines[1].split(",")
        columns[6] = ""
        holdings.write_text("\n".join([lines[0], ",".join(columns), lines[2]]) + "\n", encoding="utf-8", newline="\n")
        source = ingest_sources(missing_id)
        self.assertTrue(any(item.rule_id == "DQ15" for item in source.issues))

        missing_reference = self.copied_fixture()
        holdings = missing_reference / "portfolio_holdings.csv"
        lines = holdings.read_text(encoding="utf-8").splitlines()
        columns = lines[1].split(",")
        columns[3] = "bonds"
        columns[6] = "UNKNOWN_BOND"
        holdings.write_text("\n".join([lines[0], ",".join(columns), lines[2]]) + "\n", encoding="utf-8", newline="\n")
        source = ingest_sources(missing_reference)
        self.assertTrue(any(item.rule_id == "DQ16" for item in source.issues))

    def test_warning_only_run_has_explicit_status(self) -> None:
        source = ingest_sources(FIXTURES)
        curated = transform_to_curated(source)
        report = safe_report(source, curated)
        self.assertEqual(source.warning_count, 1)
        self.assertEqual(report["status"], "completed_with_warnings")
        self.assertEqual(report["stage_counts"]["raw"], 17)
        self.assertEqual(report["stage_counts"]["bronze"], 17)
        self.assertEqual(report["stage_counts"]["silver"], 17)
        self.assertEqual(report["stage_counts"]["gold"], 3)
        self.assertEqual(report["stage_counts"]["serving"], 3)

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
        self.assertEqual(set(DELETE_ORDER), set(TABLE_COLUMNS), "Every curated table must participate in the canonical load")


@unittest.skipUnless(os.environ.get("FUNDS_MANAGER_RUN_DB_TESTS") == "1", "set FUNDS_MANAGER_RUN_DB_TESTS=1 for the MAMP integration test")
class TestSprint3DatabaseIdempotence(unittest.TestCase):
    database_name = "yvy_funds_manager_pipeline_sprint5_qa"

    def test_two_imports_keep_one_run_and_identical_counts(self) -> None:
        config = DatabaseConfig.from_environment(self.database_name)
        run_mysql(config, f"DROP DATABASE IF EXISTS `{self.database_name}`;", select_database=False)
        try:
            apply_schema(config, SCHEMA)
            source = ingest_sources(FIXTURES)
            curated = transform_to_curated(source)
            first = load_bundle(config, source, curated)
            business_before_migrations = {name: first[name] for name in TABLE_COLUMNS}
            apply_schema(config, SCHEMA)
            business_after_migrations = database_counts(config)
            self.assertEqual(business_before_migrations, {name: business_after_migrations[name] for name in TABLE_COLUMNS})

            migrated = int(run_mysql(config,
                "SELECT COUNT(*) FROM information_schema.tables "
                f"WHERE table_schema={sql_value(self.database_name)} AND table_name IN "
                "('app_users','audit_events','issue_reviews','reconciliation_evidence');",
                select_database=True).strip())
            self.assertEqual(migrated, 4)

            issue_id = run_mysql(config, "SELECT issue_id FROM quality_issues ORDER BY issue_id LIMIT 1;", select_database=True).strip()
            self.assertTrue(issue_id)
            password_hash = "$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi."
            run_mysql(config,
                "INSERT INTO app_users(username,password_hash,role) VALUES "
                f"({sql_value('db_test_analyst')},{sql_value(password_hash)},'ANALYST');"
                "SET @test_user=LAST_INSERT_ID();"
                "INSERT INTO issue_reviews(issue_id,status,analyst_note,reviewed_by,reviewed_at,revision) VALUES "
                f"({sql_value(issue_id)},'resolved','safe test note',@test_user,UTC_TIMESTAMP(),1);"
                "INSERT INTO audit_events(user_id,actor_role,action,target_type,target_id,previous_state,new_state) VALUES "
                f"(@test_user,'ANALYST','QUALITY_ISSUE_STATUS_CHANGED','quality_issue',{sql_value(issue_id)},"
                "JSON_OBJECT('status','open'),JSON_OBJECT('status','resolved'));"
                "INSERT INTO tickets(created_by,title,description,category,priority,related_fund_code) "
                "VALUES (@test_user,'Replay test','Preserve fund relationship','OTHER','NORMAL','FUND_01');"
                "INSERT INTO ticket_events(ticket_id,actor_user_id,actor_role,event_type,new_status) "
                "VALUES (LAST_INSERT_ID(),@test_user,'ANALYST','CREATED','OPEN');",
                select_database=True)

            with self.assertRaises(RuntimeError, msg="Duplicate usernames must be rejected"):
                run_mysql(config,
                    "INSERT INTO app_users(username,password_hash,role) VALUES "
                    f"({sql_value('db_test_analyst')},{sql_value(password_hash)},'ANALYST');",
                    select_database=True)
            with self.assertRaises(RuntimeError, msg="Review foreign keys must reject unknown issues"):
                run_mysql(config,
                    "INSERT INTO issue_reviews(issue_id,status,analyst_note,reviewed_by,reviewed_at,revision) "
                    f"SELECT {sql_value('f' * 64)},'open','',user_id,UTC_TIMESTAMP(),1 FROM app_users WHERE username='db_test_analyst';",
                    select_database=True)

            apply_schema(config, SCHEMA)
            second = load_bundle(config, source, curated)
            self.assertEqual(first, second)
            self.assertEqual(second["ingestion_runs"], 1)
            self.assertEqual(second["funds"], 1)
            self.assertEqual(second["portfolio_holdings"], 2)
            self.assertEqual(second["var_mask_configs"], 1)
            self.assertEqual(run_mysql(config,
                "SELECT COUNT(*) FROM tickets t JOIN ticket_events e ON e.ticket_id=t.ticket_id "
                "JOIN funds f ON f.fund_code=t.related_fund_code WHERE t.title='Replay test';",
                select_database=True).strip(), '1', 'Replay must preserve tickets and their fund relationship')
            persisted = run_mysql(config,
                f"SELECT r.status,r.revision,COUNT(a.event_id) FROM issue_reviews r "
                f"LEFT JOIN audit_events a ON a.target_id=r.issue_id WHERE r.issue_id={sql_value(issue_id)} "
                "GROUP BY r.status,r.revision;",
                select_database=True).strip().split("\t")
            self.assertEqual(persisted, ["resolved", "1", "1"], "A repeated ingestion must preserve review and audit evidence")
            protected_tables = list(TABLE_COLUMNS) + ['ingestion_runs', 'source_files', 'quality_issues',
                'lineage_records', 'app_users', 'tickets', 'ticket_events', 'issue_reviews', 'audit_events']
            def content_hashes():
                return {name: hashlib.sha256('\n'.join(sorted(run_mysql(config,
                    'SELECT * FROM `' + name + '`;', select_database=True).splitlines())).encode()).hexdigest()
                    for name in protected_tables}
            before_failure = content_hashes()
            broken = copy.deepcopy(curated)
            broken.tables['var_mask_configs'][0]['mask_code'] = None
            with redirect_stderr(io.StringIO()), self.assertRaises(RuntimeError):
                with PipelineAttempt(config) as attempt:
                    attempt.run_id = source.run_id
                    with attempt.stage('database_load'):
                        load_bundle(config, source, broken)
            self.assertEqual(content_hashes(), before_failure,
                             'A late SQL error must roll back all financial and workflow changes')
            failure = run_mysql(config,
                'SELECT status,stage,error_code FROM pipeline_attempts WHERE attempt_id=' + sql_value(attempt.attempt_id) + ';',
                select_database=True).strip().split('\t')
            self.assertEqual(failure, ['failed', 'database_load', 'PIPELINE_STAGE_FAILED'])
            renamed = copy.deepcopy(curated)
            renamed.tables['funds'][0]['fund_code'] = 'FUND_99'
            with self.assertRaisesRegex(RuntimeError, 'alias mapping changed'):
                load_bundle(config, source, renamed)
            self.assertEqual(content_hashes(), before_failure)
        finally:
            run_mysql(config, f"DROP DATABASE IF EXISTS `{self.database_name}`;", select_database=False)


if __name__ == "__main__":
    unittest.main()
