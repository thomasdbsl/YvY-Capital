<?php
declare(strict_types=1);

require_once __DIR__ . '/repository.php';

run_endpoint(function (): void {
    require_query_keys(['fund_id', 'snapshot_date']);
    $fundId = validate_fund_id(query_string('fund_id', true), true);
    $snapshotDate = validate_iso_date(query_string('snapshot_date'));
    respond_json(funds_service()->portfolio($fundId, $snapshotDate));
});
