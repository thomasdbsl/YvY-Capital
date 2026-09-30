<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once __DIR__ . '/../../api/bootstrap.php';

$db = database();
$runId = (string) $db->query('SELECT run_id FROM ingestion_runs ORDER BY completed_at DESC,run_id DESC LIMIT 1')->fetchColumn();
$dv01Date = (string) $db->query("SELECT MAX(d.business_date) FROM dv01_items d JOIN funds f ON f.source_fund_id=d.source_fund_id WHERE f.fund_code='FUND_01'")->fetchColumn();

$checks = [
    'quality' => [
        'alias' => 'q', 'key' => 'idx_quality_run_severity',
        'sql' => 'SELECT q.issue_id FROM quality_issues q WHERE q.run_id=? AND q.severity=? ORDER BY q.issue_id LIMIT 100',
        'parameters' => [$runId, 'blocking'],
    ],
    'reconciliation' => [
        'alias' => 'e', 'key' => 'idx_reconciliation_run_fund',
        'sql' => 'SELECT e.evidence_id FROM reconciliation_evidence e WHERE e.run_id=? AND e.fund_code=? ORDER BY e.snapshot_date DESC LIMIT 101',
        'parameters' => [$runId, 'FUND_01'],
    ],
    'returns' => [
        'alias' => 's', 'key' => 'PRIMARY',
        'sql' => "SELECT s.business_date FROM return_series s JOIN funds f ON f.source_fund_id=s.source_fund_id WHERE f.fund_code=? AND s.series_type IN ('fund','benchmark') ORDER BY s.business_date,s.series_type",
        'parameters' => ['FUND_01'],
    ],
    'dv01' => [
        'alias' => 'd', 'key' => 'idx_dv01_items_fund_date',
        'sql' => 'SELECT d.item_code FROM dv01_items d JOIN funds f ON f.source_fund_id=d.source_fund_id WHERE f.fund_code=? AND d.business_date=? ORDER BY ABS(d.dv01_notional_value) DESC,d.item_code',
        'parameters' => ['FUND_01', $dv01Date],
    ],
];

$evidence = [];
foreach ($checks as $name => $check) {
    $statement = $db->prepare('EXPLAIN ' . $check['sql']);
    $statement->execute($check['parameters']);
    $plan = $statement->fetchAll();
    $target = null;
    foreach ($plan as $row) {
        if (($row['table'] ?? null) === $check['alias']) { $target = $row; break; }
    }
    $scanReason = null;
    if ($name === 'dv01' && $target !== null && ($target['type'] ?? null) === 'ALL'
        && in_array($check['key'], explode(',', $target['possible_keys'] ?? ''), true)) {
        // A restored database can favor a scan when this fund owns nearly all rows.
        $counts = $db->prepare("SELECT COUNT(*) AS total,
            SUM(d.source_fund_id=(SELECT source_fund_id FROM funds WHERE fund_code=?)
                AND d.business_date=?) AS matched FROM dv01_items d");
        $counts->execute($check['parameters']);
        $distribution = $counts->fetch();
        if ((int) $distribution['total'] > 0
            && (int) $distribution['matched'] / (int) $distribution['total'] >= 0.8) {
            $scanReason = 'At least 80% of rows match; optimizer may prefer a full scan';
        }
    }
    if ($target === null || (($target['key'] ?? null) !== $check['key'] && $scanReason === null)) {
        throw new RuntimeException($name . ' query did not use the expected index');
    }
    $evidence[$name] = ['table' => $target['table'], 'key' => $target['key'],
        'access_type' => $target['type'], 'estimated_rows' => (int) $target['rows'],
        'scan_reason' => $scanReason];
}

echo json_encode($evidence, JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION) . PHP_EOL;
