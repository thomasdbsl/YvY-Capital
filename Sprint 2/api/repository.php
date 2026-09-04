<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/repositories/FundRepository.php';
require_once __DIR__ . '/repositories/GovernanceRepository.php';
require_once __DIR__ . '/services/FinancialMath.php';
require_once __DIR__ . '/services/FundsService.php';
require_once __DIR__ . '/services/GovernanceService.php';

function funds_service(): FundsService
{
    static $service;
    if (!$service instanceof FundsService) {
        $service = new FundsService(new FundRepository(database()));
    }
    return $service;
}

function governance_service(): GovernanceService
{
    static $service;
    if (!$service instanceof GovernanceService) {
        $service = new GovernanceService(new GovernanceRepository(database()));
    }
    return $service;
}

function dashboard_data(): array
{
    $fundsService = funds_service();
    $governance = governance_service();
    $run = $governance->latestRun();
    $funds = $fundsService->funds();
    $selectedFund = $funds[0]['id'] ?? null;
    if ($selectedFund === null) {
        throw new ApiException(503, 'No curated funds are available');
    }
    $portfolio = $fundsService->portfolio($selectedFund);
    $performance = $fundsService->performance($selectedFund, '12m');
    $anomalies = $governance->anomalies();
    $totalAum = array_sum(array_map(static function (array $fund): float {
        return $fund['aum_brl'] ?? 0.0;
    }, $funds));
    $kpis = [
        ['id' => 'K01', 'name' => 'Latest available net assets', 'value' => $totalAum, 'unit' => 'BRL', 'quality_status' => 'current', 'implementation_status' => 'implemented', 'lineage_ref' => $run['run_id']],
        ['id' => 'H02', 'name' => 'Period return', 'value' => $performance['metrics']['period_return'], 'unit' => 'ratio', 'quality_status' => $performance['status'], 'implementation_status' => 'implemented', 'lineage_ref' => $run['run_id']],
        ['id' => 'H03', 'name' => 'Annualized volatility', 'value' => $performance['metrics']['volatility'], 'unit' => 'ratio', 'quality_status' => $performance['status'], 'implementation_status' => 'implemented', 'lineage_ref' => $run['run_id']],
        ['id' => 'H04', 'name' => 'Sharpe ratio', 'value' => $performance['metrics']['sharpe'], 'unit' => 'ratio', 'quality_status' => $performance['metrics']['sharpe'] === null ? 'unavailable' : 'current', 'implementation_status' => 'implemented', 'lineage_ref' => $run['run_id']],
        ['id' => 'H05', 'name' => 'Maximum drawdown', 'value' => $performance['metrics']['maximum_drawdown'], 'unit' => 'ratio', 'quality_status' => $performance['metrics']['maximum_drawdown'] === null ? 'unavailable' : 'current', 'implementation_status' => 'implemented', 'lineage_ref' => $run['run_id']],
        ['id' => 'H08', 'name' => 'Percentage of CDI', 'value' => $performance['metrics']['pct_cdi'], 'unit' => 'percent', 'quality_status' => $performance['metrics']['pct_cdi'] === null ? 'unavailable' : 'current', 'implementation_status' => 'implemented', 'lineage_ref' => $run['run_id']],
    ];
    return [
        'meta' => [
            'run_id' => $run['run_id'],
            'generated_at' => str_replace(' ', 'T', $run['completed_at']) . 'Z',
            'business_date' => $funds[0]['business_date'],
            'classification' => 'local-restricted',
            'publication_allowed' => false,
            'runtime_source' => 'governed-mysql',
        ],
        'overview' => [
            'total_aum_brl' => $totalAum,
            'fund_count' => count($funds),
            'funds_with_nav' => count(array_filter($funds, static function (array $fund): bool { return $fund['aum_brl'] !== null; })),
            'open_issues' => count(array_filter($anomalies, static function (array $item): bool { return $item['status'] === 'open'; })),
        ],
        'funds' => $funds,
        'allocation' => $portfolio['allocation'],
        'positions' => $portfolio['positions'],
        'portfolio' => $portfolio,
        'history' => $performance['history'],
        'performance' => $performance,
        'internal_comparison' => $fundsService->internalComparison('12m'),
        'kpis' => $kpis,
        'anomalies' => $anomalies,
        'runs' => $governance->runs(),
        'lineage_proofs' => $governance->evidence($run['run_id']),
        'peer_sample' => [],
        'peer_status' => 'unavailable-pending-certification',
    ];
}
