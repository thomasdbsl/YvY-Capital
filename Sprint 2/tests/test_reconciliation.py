from copy import deepcopy
from decimal import Decimal
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'src'))
from pipeline.ingest import ingest_sources, validate_domains


class ReconciliationEvidenceTests(unittest.TestCase):
    def test_evidence_matches_the_existing_quarantine_rule(self):
        source = ingest_sources(Path(__file__).parent / 'fixtures' / 'sprint3_source')
        for multiplier, expected in [(Decimal('1'), 'pass'), (Decimal('2'), 'fail')]:
            with self.subTest(result=expected):
                tables = deepcopy(source.tables)
                for row in tables['portfolio_holdings.csv']:
                    row['nav_value'] *= multiplier
                evidence = []
                issues = validate_domains(tables, evidence)
                record = next(row for row in evidence if row['holdings_total'] is not None)
                self.assertEqual(record['rule_status'], expected)
                self.assertEqual(record['difference_value'], record['holdings_total'] - record['expected_nav'])
                if expected == 'fail':
                    self.assertTrue(any(issue.rule_id == 'DQ13' for issue in issues))
                    self.assertEqual(tables['portfolio_holdings.csv'], [])
                    self.assertIsNotNone(record['source_issue_id'])

    def test_missing_holdings_remain_unavailable_not_zero(self):
        source = ingest_sources(Path(__file__).parent / 'fixtures' / 'sprint3_source')
        source.tables['portfolio_holdings.csv'] = []
        evidence = []
        validate_domains(source.tables, evidence)
        self.assertTrue(evidence)
        for row in evidence:
            self.assertEqual(row['rule_status'], 'unavailable')
            self.assertIsNone(row['holdings_total'])
            self.assertIsNone(row['difference_fraction'])
