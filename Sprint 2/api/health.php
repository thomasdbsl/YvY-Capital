<?php
declare(strict_types=1);

require_once __DIR__ . '/repository.php';

run_endpoint(function (): void {
    require_query_keys([]);
    $run = governance_service()->latestRun();
    $successful = governance_service()->latestSuccessfulRun();
    $sources = $successful ? governance_service()->sourceFiles($successful['run_id']) : [];
    $operations = governance_service()->operationalHealth();
    $fundCount = count(funds_service()->funds());
    respond_json([
        'status' => in_array($operations['latest_attempt']['status'] ?? '', ['failed','blocked'], true) ? 'degraded' : 'ok',
        'database' => 'connected',
        'version' => application_version(),
        'environment' => api_config()['environment'],
        'classification' => 'local-restricted',
        'run_id' => $run['run_id'],
        'latest_run_status' => $run['status'],
        'latest_successful_run_id' => $successful['run_id'] ?? null,
        'source_freshness' => $sources ? max(array_column($sources, 'modified_at')) : null,
        'quarantined_records' => (int) $run['quarantined_records'],
        'warning_records' => (int) $run['warning_records'],
        'funds' => $fundCount,
        'operations' => $operations,
        'pipeline_stages' => governance_service()->stages($run['run_id']),
        'quality_counts' => governance_service()->issueCounts(),
    ]);
});
