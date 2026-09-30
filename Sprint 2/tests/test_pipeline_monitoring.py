from __future__ import annotations

import io
import sys
import unittest
from contextlib import redirect_stderr
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'src'))
from pipeline.monitoring import PipelineAttempt


class MonitoringTests(unittest.TestCase):
    def test_failure_survives_loading_transaction_and_omits_exception(self):
        output = io.StringIO()
        with patch('pipeline.monitoring.run_mysql') as sql, redirect_stderr(output):
            with self.assertRaisesRegex(RuntimeError, 'PRIVATE'):
                with PipelineAttempt(None) as attempt:
                    attempt.run_id = 'S3-TEST'
                    with attempt.stage('database_load'):
                        raise RuntimeError('PRIVATE SOURCE AND PASSWORD')
        statements = '\n'.join(call.args[1] for call in sql.call_args_list)
        self.assertNotIn('PRIVATE', statements + output.getvalue())
        self.assertIn("6661696c6564", statements)  # SQL hex encoding of failed.
        self.assertIn('PIPELINE_STAGE_FAILED', output.getvalue())
        self.assertNotIn('START TRANSACTION', statements)
        self.assertTrue(attempt.finished)

    def test_success_tracks_unique_attempts_for_same_run(self):
        with patch('pipeline.monitoring.run_mysql') as sql, redirect_stderr(io.StringIO()):
            attempts = []
            for _ in range(2):
                with PipelineAttempt(None) as attempt:
                    attempt.run_id = 'S3-SAME'
                    with attempt.stage('report'):
                        pass
                    attempt.finish('completed_with_warnings')
                    attempts.append(attempt.attempt_id)
        self.assertNotEqual(*attempts)
        self.assertEqual(sql.call_count, 6)

    def test_dry_run_never_writes_database(self):
        with patch('pipeline.monitoring.run_mysql') as sql, redirect_stderr(io.StringIO()):
            with PipelineAttempt(None, enabled=False) as attempt:
                with attempt.stage('ingestion'):
                    pass
                attempt.finish('completed')
        sql.assert_not_called()

    def test_monitoring_failure_does_not_mask_original_exception(self):
        output = io.StringIO()
        with patch('pipeline.monitoring.run_mysql', side_effect=[None, RuntimeError('DB PRIVATE')]), redirect_stderr(output):
            with self.assertRaisesRegex(ValueError, 'original'):
                with PipelineAttempt(None):
                    raise ValueError('original')
        self.assertIn('ATTEMPT_WRITE_FAILED', output.getvalue())
        self.assertNotIn('DB PRIVATE', output.getvalue())


if __name__ == '__main__':
    unittest.main()
