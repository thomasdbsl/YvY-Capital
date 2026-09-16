<?php
declare(strict_types=1);

require_once __DIR__ . '/repository.php';

run_endpoint(function (): void {
    require_query_keys([]);
    $governance = governance_service();
    $run = $governance->latestRun();
    respond_json([
        'runs' => $governance->runs(),
        'source_files' => $governance->sourceFiles($run['run_id']),
        'lineage_proofs' => $governance->evidence($run['run_id']),
        'pipeline_stages' => $governance->stages($run['run_id']),
        'latest_successful_run' => $governance->latestSuccessfulRun(),
    ]);
});
