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
        return [
            'fund_id' => $fundCode,
            'snapshot_date' => $selected,
            'available_snapshots' => $snapshots,
            'available' => true,
            'nav_brl' => $nav,
            'allocation' => $allocation,
            'positions' => $positions,
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
        $dates = array_values(array_filter($commonDates, static function (string $date) use ($window): bool {
            return $date >= $window['start'] && $date <= $window['end'];
        }));
        if (count($dates) < 2) {
            return $this->unavailablePerformance($fundCode, $period);
        }
        $fundValues = array_map(static function (string $date) use ($maps): float { return $maps['fund'][$date]; }, $dates);
        $benchmarkValues = array_map(static function (string $date) use ($maps): float { return $maps['benchmark'][$date]; }, $dates);
        $metrics = FinancialMath::metrics($fundValues, $benchmarkValues);
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
            'window' => ['start' => $dates[0], 'end' => $dates[count($dates) - 1]],
            'history' => $history,
            'metrics' => $metrics,
        ];
    }

    public function internalComparison(string $period): array
    {
        FinancialMath::validatePeriod($period);
        $funds = $this->funds();
        $commonAcrossFunds = null;
        foreach ($funds as $fund) {
            $maps = $this->seriesMaps($this->funds->returnSeries($fund['id']));
            $dates = array_values(array_intersect(array_keys($maps['fund']), array_keys($maps['benchmark'])));
            $commonAcrossFunds = $commonAcrossFunds === null ? $dates : array_values(array_intersect($commonAcrossFunds, $dates));
        }
        $commonAcrossFunds = $commonAcrossFunds ?? [];
        sort($commonAcrossFunds, SORT_STRING);
        $window = FinancialMath::resolveWindow($commonAcrossFunds, $period);
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
                'quality_status' => $performance['status'] === 'current' ? $fund['quality_status'] : 'unavailable',
            ];
        }
        usort($rows, static function (array $left, array $right): int { return ($right['period_return'] ?? -INF) <=> ($left['period_return'] ?? -INF); });
        return ['period' => $period, 'window' => $window === null ? null : ['start' => $window['start'], 'end' => $window['end']], 'funds' => $rows];
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

    private function unavailablePerformance(string $fundCode, string $period): array
    {
        return [
            'fund_id' => $fundCode,
            'period' => $period,
            'status' => 'unavailable',
            'window' => null,
            'history' => [],
            'metrics' => ['period_return' => null, 'benchmark_return' => null, 'pct_cdi' => null, 'volatility' => null, 'sharpe' => null, 'sortino' => null, 'maximum_drawdown' => null, 'daily_observations' => 0],
        ];
    }
}
