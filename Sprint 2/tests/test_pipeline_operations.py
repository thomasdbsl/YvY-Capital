from __future__ import annotations

import io
import json
import os
import subprocess
import sys
import tempfile
import unittest
from contextlib import redirect_stderr
from contextlib import redirect_stdout
from unittest.mock import patch
from pathlib import Path

SRC = Path(__file__).resolve().parents[1] / "src"
sys.path.insert(0, str(SRC))
from pipeline.operations import atomic_json, event, run_lock
from pipeline import run_sprint3


class PipelineOperationsTests(unittest.TestCase):
    def test_reset_refuses_non_qa_database_before_ingestion(self):
        output = io.StringIO()
        with patch.object(sys, 'argv', ['pipeline', '--database', 'primary', '--reset-database']), \
                patch.object(run_sprint3, 'execute') as execute, redirect_stderr(output):
            self.assertEqual(run_sprint3.main(), 2)
        execute.assert_not_called()
        self.assertEqual(json.loads(output.getvalue())['error_code'], 'RESET_REQUIRES_QA_DATABASE')

    def test_summary_uses_actual_environment_database(self):
        with tempfile.TemporaryDirectory() as temporary:
            args = ['pipeline', '--input', str(SRC.parent / 'tests/fixtures/sprint3_source'),
                    '--output', temporary, '--skip-schema']
            output = io.StringIO()
            with patch.dict(os.environ, {'FUNDS_MANAGER_DB_NAME': 'configured_qa',
                                        'FUNDS_MANAGER_LOCK_DIR': temporary}), \
                    patch.object(sys, 'argv', args), \
                    patch.object(run_sprint3, 'load_bundle', return_value={}), \
                    patch('pipeline.monitoring.run_mysql', return_value=''), \
                    redirect_stdout(output), redirect_stderr(io.StringIO()):
                self.assertEqual(run_sprint3.main(), 0)
            self.assertEqual(json.loads(output.getvalue())['database'], 'configured_qa')

    def test_atomic_report_replaces_previous_json(self):
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / "report.json"
            atomic_json(path, {"status": "started"})
            atomic_json(path, {"status": "completed"})
            self.assertEqual(json.loads(path.read_text()), {"status": "completed"})
            self.assertEqual(list(Path(temporary).iterdir()), [path])

    def test_dry_run_emits_opaque_source_aliases_and_counts(self):
        with tempfile.TemporaryDirectory() as temporary:
            output = io.StringIO()
            args = ['pipeline', '--input', str(SRC.parent / 'tests/fixtures/sprint3_source'),
                    '--output', temporary, '--dry-run']
            with patch.dict(os.environ, {'FUNDS_MANAGER_LOCK_DIR': temporary}), \
                    patch.object(sys, 'argv', args), redirect_stderr(output), redirect_stdout(io.StringIO()):
                self.assertEqual(run_sprint3.main(), 0)
            events = [json.loads(line) for line in output.getvalue().splitlines()]
            sources = [item for item in events if item['stage'] == 'source']
            self.assertEqual(len(sources), 14)
            self.assertEqual(len({item['source_alias'] for item in sources}), 14)
            for item in sources:
                self.assertRegex(item['source_alias'], r'^SRC_[a-f0-9]{12}$')
                self.assertIsInstance(item['source_rows'], int)
                self.assertGreaterEqual(item['source_rows'], 0)
            self.assertNotIn(str(SRC), output.getvalue())

    def test_log_rejects_unapproved_fields(self):
        with self.assertRaises(ValueError):
            event("load", "failed", password="never-log-this")
        output = io.StringIO()
        with redirect_stderr(output):
            event("load", "failed", error_code="DATABASE_ERROR")
        self.assertEqual(json.loads(output.getvalue())["error_code"], "DATABASE_ERROR")

    def test_other_process_is_rejected_and_crash_releases_lock(self):
        environment = {**os.environ, "PYTHONPATH": str(SRC)}
        with tempfile.TemporaryDirectory() as temporary:
            lock = Path(temporary) / "pipeline.lock"
            child_code = "from pathlib import Path; from pipeline.operations import run_lock; import sys; " \
                         "\nwith run_lock(Path(sys.argv[1])): print('locked', flush=True); sys.stdin.read()"
            child = subprocess.Popen([sys.executable, "-c", child_code, str(lock)],
                                     env=environment, stdin=subprocess.PIPE,
                                     stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            try:
                self.assertEqual(child.stdout.readline().strip(), "locked")
                from pipeline.operations import PipelineBusy
                with self.assertRaises(PipelineBusy):
                    with run_lock(lock):
                        self.fail("Concurrent import was allowed")
                child.kill()
                child.wait(timeout=10)
                with run_lock(lock):
                    self.assertTrue(lock.exists())
            finally:
                if child.poll() is None:
                    child.kill()
                child.communicate(timeout=10)


if __name__ == "__main__":
    unittest.main()
