<?php
declare(strict_types=1);

require_once __DIR__ . '/repository.php';

run_endpoint(function (): void {
    require_query_keys(['id', 'snapshot_date']);
    $fundId = validate_fund_id(query_string('id', true), true);
    $snapshotDate = validate_iso_date(query_string('snapshot_date'));
    $service = funds_service();
    $service->ensureFund($fundId);
    respond_json([
        'fund' => $service->funds($fundId)[0],
        'portfolio' => $service->portfolio($fundId, $snapshotDate),
        'performance' => $service->performance($fundId, '12m'),
    ]);
});
