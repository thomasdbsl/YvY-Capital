<?php
declare(strict_types=1);

final class FundsService
{
    private $funds;

    public function __construct(FundRepository $funds)
    {
        $this->funds = $funds;
    }

    public function ensureFund(string $fundCode): void
    {
        if (!$this->funds->exists($fundCode)) {
            throw new ApiException(404, 'Fund was not found');
        }
    }

    public function funds(?string $fundCode = null): array
    {
        return array_map(static function (array $row): array {
            $hasNav = $row['nav_brl'] !== null;
            $hasHoldings = $hasNav && (bool) (int) $row['holdings_available'];
            return [
                'id' => $row['fund_code'],
                'label' => $row['display_name'],
                'currency' => $row['currency_id'],
                'coverage' => $hasHoldings ? 'snapshot-and-history' : 'history-only',
                'aum_brl' => $hasNav ? (float) $row['nav_brl'] : null,
                'nav_per_share' => null,
                'daily_return' => $row['daily_return'] === null ? null : (float) $row['daily_return'],
                'quality_status' => $hasNav ? $row['quality_status'] : 'unavailable',
                'freshness_status' => !$hasNav ? 'unavailable' : ((int) $row['freshness_days'] === 0 ? 'current' : 'late'),
                'business_date' => $row['snapshot_date'],
                'lineage_ref' => $row['last_run_id'] === null ? null : substr($row['last_run_id'], 0, 23),
            ];
        }, $this->funds->funds($fundCode));
    }

    public function portfolio(string $fundCode, ?string $snapshotDate = null): array
    {
        $this->ensureFund($fundCode);
        $snapshots = $this->funds->availableSnapshots($fundCode);
        $selected = $snapshotDate ?? ($snapshots[0] ?? null);
        if ($selected === null || !in_array($selected, $snapshots, true)) {
            return [
                'fund_id' => $fundCode,
                'snapshot_date' => $selected,
                'available_snapshots' => $snapshots,
                'available' => false,
                'nav_brl' => null,
                'allocation' => [],
                'positions' => [],
                'net_return' => ['value'=>null,'start_date'=>null,'end_date'=>null,'status'=>'unavailable'],
                'metrics' => ['top5_concentration' => null, 'reconciliation_ratio' => null],
            ];
        }
        $navRow = $this->funds->navAt($fundCode, $selected);
        $nav = $navRow === null ? null : (float) $navRow['nav_brl'];
        $allocation = array_map(static function (array $row): array {
            return [
                'asset_class' => $row['group_identifier'],
                'value_brl' => (float) $row['nav_value_brl'],
                'weight' => (float) $row['weight'],
                'holdings_count' => (int) $row['holdings_count'],
                'quality_status' => $row['quality_status'],
                'lineage_ref' => substr($row['last_run_id'], 0, 23),
            ];
        }, $this->funds->allocation($fundCode, $selected));
        $holdingRows = $this->funds->holdings($fundCode, $selected);
        $positions = array_map(static function (array $row) use ($fundCode, $nav): array {
            $value = (float) $row['nav_value_brl'];
            return [
                'id' => $row['holding_code'],
                'fund_id' => $fundCode,
                'instrument' => $row['instrument_code'],
                'issuer' => $row['issuer_code'] ?? 'Unavailable',
                'custodian' => 'Unavailable',
                'asset_class' => $row['group_identifier'],
                'value_brl' => $value,
                'weight' => $nav !== null && $nav > 0.0 ? $value / $nav : null,
                'price_age_days' => null,
                'lineage_ref' => $row['holding_code'],
            ];
        }, $holdingRows);
        $topFive = array_slice(array_values(array_filter($positions, static function (array $row): bool {
            return $row['value_brl'] > 0.0;
        })), 0, 5);
        $totalValue = array_sum(array_column($positions, 'value_brl'));
        $returnRows = array_reverse($this->funds->latestFundReturnsAt($fundCode,$selected));
        $netReturn = ['value'=>null,'start_date'=>null,'end_date'=>null,'status'=>'unavailable'];
        if (count($returnRows) === 2 && (float) $returnRows[0]['index_value'] !== 0.0) {
            $netReturn = [
                'value'=>(float) $returnRows[1]['index_value'] / (float) $returnRows[0]['index_value'] - 1.0,
                'start_date'=>$returnRows[0]['business_date'],
                'end_date'=>$returnRows[1]['business_date'],
                'status'=>'calculated',
            ];
        }
        return [
            'fund_id' => $fundCode,
            'snapshot_date' => $selected,
            'available_snapshots' => $snapshots,
            'available' => true,
            'nav_brl' => $nav,
            'allocation' => $allocation,
            'positions' => $positions,
            'net_return' => $netReturn,
            'metrics' => [
                'top5_concentration' => $nav !== null && $nav > 0.0 ? array_sum(array_column($topFive, 'value_brl')) / $nav : null,
                'reconciliation_ratio' => $nav !== null && $nav > 0.0 ? $totalValue / $nav : null,
            ],
        ];
    }

    public function performance(string $fundCode, string $period, ?array $fixedWindow = null): array
    {
        $this->ensureFund($fundCode);
        FinancialMath::validatePeriod($period);
        $maps = $this->seriesMaps($this->funds->returnSeries($fundCode));
        $commonDates = array_values(array_intersect(array_keys($maps['fund']), array_keys($maps['benchmark'])));
        sort($commonDates, SORT_STRING);
        $window = $fixedWindow ?? FinancialMath::resolveWindow($commonDates, $period);
        if ($window === null) {
            return $this->unavailablePerformance($fundCode, $period);
        }
        $windowDates = isset($window['dates']) ? array_fill_keys($window['dates'], true) : null;
        $dates = array_values(array_filter($commonDates, static function (string $date) use ($window, $windowDates): bool {
            return $date >= $window['start']
                && $date <= $window['end']
                && ($windowDates === null || isset($windowDates[$date]));
        }));
        if (count($dates) < 2) {
            return $this->unavailablePerformance($fundCode, $period);
        }
        $fundValues = array_map(static function (string $date) use ($maps): float { return $maps['fund'][$date]; }, $dates);
        $benchmarkValues = array_map(static function (string $date) use ($maps): float { return $maps['benchmark'][$date]; }, $dates);
        $metrics = FinancialMath::metrics($fundValues, $benchmarkValues, $this->minimumRiskObservations());
        $drawdowns = $this->funds->drawdowns($fundCode, $dates[0], $dates[count($dates) - 1]);
        $metrics['maximum_drawdown'] = $drawdowns ? min(array_map(static function (array $row): float { return (float) $row['drawdown']; }, $drawdowns)) : null;
        $history = [];
        foreach ($dates as $date) {
            $history[] = [
                'date' => $date,
                'fund_id' => $fundCode,
                'nav_index' => $maps['fund'][$date],
                'benchmark_index' => $maps['benchmark'][$date],
                'lineage_ref' => 'RET-' . substr(hash('sha256', $fundCode . '|' . $date), 0, 16),
            ];
        }
        return [
            'fund_id' => $fundCode,
            'period' => $period,
            'status' => 'current',
            'window' => $this->windowPayload($window, $dates),
            'history' => $history,
            'metrics' => $metrics,
        ];
    }

    public function internalComparison(string $period, ?string $fundA = null, ?string $fundB = null): array
    {
        FinancialMath::validatePeriod($period);
        $funds = $this->funds();
        if (count($funds) < 2) {
            throw new ApiException(503, 'At least two funds are required for comparison');
        }
        $fundA = $fundA ?? $funds[0]['id'];
        $fundB = $fundB ?? $funds[1]['id'];
        if ($fundA === $fundB) {
            throw new ApiException(400, 'Fund A and Fund B must be different');
        }
        $this->ensureFund($fundA);
        $this->ensureFund($fundB);
        $targeted = $this->targetedComparison($fundA, $fundB, $period, $funds);
        $commonAcrossFunds = null;
        foreach ($funds as $fund) {
            $maps = $this->seriesMaps($this->funds->returnSeries($fund['id']));
            $dates = array_values(array_intersect(array_keys($maps['fund']), array_keys($maps['benchmark'])));
            $commonAcrossFunds = $commonAcrossFunds === null ? $dates : array_values(array_intersect($commonAcrossFunds, $dates));
        }
        $commonAcrossFunds = $commonAcrossFunds ?? [];
        sort($commonAcrossFunds, SORT_STRING);
        $window = FinancialMath::resolveWindow($commonAcrossFunds, $period);
        if ($window === null) {
            return [
                'period' => $period,
                'window' => null,
                'funds' => array_map(static function (array $fund): array {
                    return [
                        'fund_id' => $fund['id'],
                        'aum_brl' => $fund['aum_brl'],
                        'period_return' => null,
                        'pct_cdi' => null,
                        'volatility' => null,
                        'sharpe' => null,
                        'sortino' => null,
                        'quality_status' => 'unavailable',
                    ];
                }, $funds),
                'targeted' => $targeted,
            ];
        }
        $rows = [];
        foreach ($funds as $fund) {
            $performance = $this->performance($fund['id'], $period, $window);
            $rows[] = [
                'fund_id' => $fund['id'],
                'aum_brl' => $fund['aum_brl'],
                'period_return' => $performance['metrics']['period_return'],
                'pct_cdi' => $performance['metrics']['pct_cdi'],
                'volatility' => $performance['metrics']['volatility'],
                'sharpe' => $performance['metrics']['sharpe'],
                'sortino' => $performance['metrics']['sortino'],
                'quality_status' => $performance['status'] === 'current' ? $fund['quality_status'] : 'unavailable',
            ];
        }
        usort($rows, static function (array $left, array $right): int { return ($right['period_return'] ?? -INF) <=> ($left['period_return'] ?? -INF); });
        return [
            'period' => $period,
            'window' => $this->windowPayload($window, $window['dates']),
            'funds' => $rows,
            'targeted' => $targeted,
        ];
    }

    private function targetedComparison(string $fundA, string $fundB, string $period, array $funds): array
    {
        $mapsA = $this->seriesMaps($this->funds->returnSeries($fundA));
        $mapsB = $this->seriesMaps($this->funds->returnSeries($fundB));
        $commonDates = array_values(array_intersect(
            array_keys($mapsA['fund']),
            array_keys($mapsA['benchmark']),
            array_keys($mapsB['fund']),
            array_keys($mapsB['benchmark'])
        ));
        sort($commonDates, SORT_STRING);
        $window = FinancialMath::resolveWindow($commonDates, $period);
        if ($window === null) {
            return [
                'requested_funds' => ['fund_a' => $fundA, 'fund_b' => $fundB],
                'status' => 'unavailable',
                'window' => null,
                'funds' => [
                    $this->unavailableComparisonRow($fundA, $funds),
                    $this->unavailableComparisonRow($fundB, $funds),
                ],
                'history' => [],
            ];
        }

        $performanceA = $this->performance($fundA, $period, $window);
        $performanceB = $this->performance($fundB, $period, $window);
        if ($performanceA['status'] !== 'current' || $performanceB['status'] !== 'current') {
            return [
                'requested_funds' => ['fund_a' => $fundA, 'fund_b' => $fundB],
                'status' => 'unavailable',
                'window' => null,
                'funds' => [
                    $this->unavailableComparisonRow($fundA, $funds),
                    $this->unavailableComparisonRow($fundB, $funds),
                ],
                'history' => [],
            ];
        }

        $historyA = array_column($performanceA['history'], null, 'date');
        $historyB = array_column($performanceB['history'], null, 'date');
        $dates = array_values(array_intersect(array_keys($historyA), array_keys($historyB)));
        sort($dates, SORT_STRING);
        $baseA = (float) $historyA[$dates[0]]['nav_index'];
        $baseB = (float) $historyB[$dates[0]]['nav_index'];
        $history = array_map(static function (string $date) use ($historyA, $historyB, $baseA, $baseB): array {
            return [
                'date' => $date,
                'fund_a_index' => (float) $historyA[$date]['nav_index'] / $baseA * 100.0,
                'fund_b_index' => (float) $historyB[$date]['nav_index'] / $baseB * 100.0,
            ];
        }, $dates);

        return [
            'requested_funds' => ['fund_a' => $fundA, 'fund_b' => $fundB],
            'status' => 'current',
            'window' => $this->windowPayload($window, $dates),
            'funds' => [
                $this->comparisonRow($fundA, $performanceA, $funds),
                $this->comparisonRow($fundB, $performanceB, $funds),
            ],
            'history' => $history,
        ];
    }

    private function comparisonRow(string $fundCode, array $performance, array $funds): array
    {
        $fund = $this->findFund($fundCode, $funds);
        return [
            'fund_id' => $fundCode,
            'aum_brl' => $fund['aum_brl'],
            'period_return' => $performance['metrics']['period_return'],
            'pct_cdi' => $performance['metrics']['pct_cdi'],
            'volatility' => $performance['metrics']['volatility'],
            'sharpe' => $performance['metrics']['sharpe'],
            'sortino' => $performance['metrics']['sortino'],
            'maximum_drawdown' => $performance['metrics']['maximum_drawdown'],
            'status' => $performance['status'],
        ];
    }

    private function unavailableComparisonRow(string $fundCode, array $funds): array
    {
        $fund = $this->findFund($fundCode, $funds);
        return [
            'fund_id' => $fundCode,
            'aum_brl' => $fund['aum_brl'],
            'period_return' => null,
            'pct_cdi' => null,
            'volatility' => null,
            'sharpe' => null,
            'sortino' => null,
            'maximum_drawdown' => null,
            'status' => 'unavailable',
        ];
    }

    private function findFund(string $fundCode, array $funds): array
    {
        foreach ($funds as $fund) {
            if ($fund['id'] === $fundCode) {
                return $fund;
            }
        }
        throw new ApiException(404, 'Fund was not found');
    }

    private function windowPayload(array $window, array $dates): array
    {
        return [
            'start' => $dates[0],
            'end' => $dates[count($dates) - 1],
            'requested_start' => $window['requested_start'] ?? $window['start'],
            'requested_end' => $window['requested_end'] ?? $window['end'],
            'coverage_status' => $window['coverage_status'] ?? 'complete',
            'observations' => count($dates),
        ];
    }

    private function seriesMaps(array $rows): array
    {
        $maps = ['fund' => [], 'benchmark' => []];
        foreach ($rows as $row) {
            if (array_key_exists($row['series_type'], $maps)) {
                $maps[$row['series_type']][$row['business_date']] = (float) $row['index_value'];
            }
        }
        return $maps;
    }

    private function minimumRiskObservations(): int
    {
        return (int) api_config()['minimum_risk_observations'];
    }

    private function unavailablePerformance(string $fundCode, string $period): array
    {
        return [
            'fund_id' => $fundCode,
            'period' => $period,
            'status' => 'unavailable',
            'window' => null,
            'history' => [],
            'metrics' => ['period_return' => null, 'benchmark_return' => null, 'pct_cdi' => null, 'volatility' => null, 'sharpe' => null, 'sortino' => null, 'maximum_drawdown' => null, 'daily_observations' => 0,
                'minimum_risk_observations' => $this->minimumRiskObservations(), 'risk_metrics_status' => 'unavailable-insufficient-history'],
        ];
    }
}
