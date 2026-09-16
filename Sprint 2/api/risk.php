<?php
declare(strict_types=1);
require_once __DIR__ . '/repository.php';
require_once __DIR__ . '/repositories/RiskRepository.php';
require_once __DIR__ . '/services/RiskService.php';
run_endpoint(function (): void {
    require_query_keys(['fund_id','period','scenario']);
    $fund = validate_fund_id(query_string('fund_id', true),true);
    $period = FinancialMath::validatePeriod(query_string('period') ?? '12m');
    $service = new RiskService(new RiskRepository(database()),new FundRepository(database()),funds_service());
    $scenario=query_string('scenario');
    if ($scenario !== null && !preg_match('/\ASCN-[a-f0-9]{12}\z/',$scenario)) throw new ApiException(400,'Invalid scenario');
    respond_json($service->overview($fund,$period,$scenario));
});
