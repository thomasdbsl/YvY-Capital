<?php
declare(strict_types=1);

require_once __DIR__ . '/repository.php';

run_endpoint(function (): void {
    require_query_keys(['fund_id', 'period']);
    $fundId = validate_fund_id(query_string('fund_id', true), true);
    $period = query_string('period') ?? '12m';
    respond_json(funds_service()->performance($fundId, $period));
});
