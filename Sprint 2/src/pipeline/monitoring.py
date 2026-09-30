"""Attempt evidence is independent of the financial loading transaction."""
from __future__ import annotations

import time
import uuid
from contextlib import contextmanager

from pipeline.mysql_loader import run_mysql, sql_value
from pipeline.operations import event


class PipelineAttempt:
    def __init__(self, config, *, enabled=True):
        self.config = config
        self.enabled = enabled
        self.attempt_id = uuid.uuid4().hex
        self.started = time.monotonic()
        self.current_stage = 'ingestion'
        self.run_id = None
        self.finished = False

    def write(self, sql):
        if self.enabled:
            run_mysql(self.config, sql, select_database=True)

    def __enter__(self):
        self.write('INSERT INTO pipeline_attempts (attempt_id,status,stage,started_at) VALUES ('
                   f"{sql_value(self.attempt_id)},'running','ingestion',UTC_TIMESTAMP(6));")
        return self

    def __exit__(self, kind, error, traceback):
        if kind is not None or not self.finished:
            try:
                self.finish('failed', 'PIPELINE_STAGE_FAILED')
            except Exception:
                event('monitoring', 'failed', error_code='ATTEMPT_WRITE_FAILED')
        return False

    @contextmanager
    def stage(self, name):
        self.current_stage = name
        self.write(f'UPDATE pipeline_attempts SET stage={sql_value(name)},run_id={sql_value(self.run_id)} '
                   f'WHERE attempt_id={sql_value(self.attempt_id)};')
        started = time.monotonic()
        event(name, 'started', run_id=self.run_id)
        try:
            yield
        except Exception:
            event(name, 'failed', run_id=self.run_id, error_code='PIPELINE_STAGE_FAILED',
                  duration_ms=round((time.monotonic()-started)*1000))
            raise
        else:
            event(name, 'completed', run_id=self.run_id,
                  duration_ms=round((time.monotonic()-started)*1000))

    def finish(self, status, error_code=None):
        duration = round((time.monotonic()-self.started)*1000)
        self.write(f'UPDATE pipeline_attempts SET status={sql_value(status)},'
                   f'run_id={sql_value(self.run_id)},stage={sql_value(self.current_stage)},'
                   f'completed_at=UTC_TIMESTAMP(6),duration_ms={duration},error_code={sql_value(error_code)} '
                   f'WHERE attempt_id={sql_value(self.attempt_id)};')
        self.finished = True
