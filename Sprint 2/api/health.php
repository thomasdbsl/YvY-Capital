<?php
declare(strict_types=1);

require_once __DIR__ . '/repository.php';

run_endpoint(function (): void {
    require_query_keys([]);
    $run = governance_service()->latestRun();
    $successful = governance_service()->latestSuccessfulRun();
    $sources = governance_service()->sourceFiles($run['run_id']);
    $fundCount = count(funds_service()->funds());
    respond_json([
        'status' => 'ok',
        'database' => 'connected',
        'classification' => 'local-restricted',
        'run_id' => $run['run_id'],
        'latest_run_status' => $run['status'],
        'latest_successful_run_id' => $successful['run_id'] ?? null,
        'source_freshness' => $sources ? max(array_column($sources, 'modified_at')) : null,
        'quarantined_records' => (int) $run['quarantined_records'],
        'warning_records' => (int) $run['warning_records'],
        'funds' => $fundCount,
    ]);
});
