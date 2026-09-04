<?php
declare(strict_types=1);

require_once __DIR__ . '/repository.php';

run_endpoint(function (): void {
    require_query_keys([]);
    $run = governance_service()->latestRun();
    $fundCount = count(funds_service()->funds());
    respond_json([
        'status' => 'ok',
        'database' => 'connected',
        'classification' => 'local-restricted',
        'run_id' => $run['run_id'],
        'funds' => $fundCount,
    ]);
});
