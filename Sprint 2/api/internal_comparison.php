<?php
declare(strict_types=1);

require_once __DIR__ . '/repository.php';

run_endpoint(function (): void {
    require_query_keys(['period', 'fund_a', 'fund_b']);
    $period = query_string('period') ?? '12m';
    $fundA = validate_fund_id(query_string('fund_a'));
    $fundB = validate_fund_id(query_string('fund_b'));
    if (($fundA === null) !== ($fundB === null)) {
        throw new ApiException(400, 'fund_a and fund_b must be provided together');
    }
    respond_json(funds_service()->internalComparison($period, $fundA, $fundB));
});
