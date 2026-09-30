"""Compare restored QA content without printing financial rows or credentials."""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'src'))
from pipeline.config import DatabaseConfig
from pipeline.mysql_loader import run_mysql


def snapshot(database):
    if not database.endswith('_qa'):
        raise ValueError('Verification is restricted to dedicated QA databases')
    config = DatabaseConfig.from_environment(database)
    tables = run_mysql(config, 'SHOW TABLES;', select_database=True).splitlines()
    result = {}
    for table in tables:
        if not table.replace('_', '').isalnum():
            raise ValueError('Unexpected table name')
        rows = sorted(run_mysql(config, f'SELECT * FROM `{table}`;', select_database=True).splitlines())
        result[table] = {'rows': len(rows), 'sha256': hashlib.sha256('\n'.join(rows).encode()).hexdigest()}
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', required=True)
    parser.add_argument('--restored', required=True)
    args = parser.parse_args()
    original, restored = snapshot(args.source), snapshot(args.restored)
    if not original or original != restored:
        raise ValueError('Restored table set, cardinalities or content differ')
    print(json.dumps({'status':'matched', 'tables':len(original),
                      'rows':sum(item['rows'] for item in original.values())}))


if __name__ == '__main__':
    try:
        main()
    except Exception:
        print(json.dumps({'status':'failed','error_code':'RESTORE_VERIFICATION_FAILED'}), file=sys.stderr)
        raise SystemExit(1)
