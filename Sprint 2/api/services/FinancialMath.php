<?php
declare(strict_types=1);

final class FinancialMath
{
    private const PERIOD_MONTHS = ['1m' => 1, '3m' => 3, '6m' => 6, '12m' => 12];

    public static function validatePeriod(string $period): string
    {
        if (!array_key_exists($period, self::PERIOD_MONTHS)) {
            throw new ApiException(400, 'Invalid period');
        }
        return $period;
    }

    public static function resolveWindow(array $dates, string $period): ?array
    {
        self::validatePeriod($period);
        $dates = array_values(array_unique($dates));
        sort($dates, SORT_STRING);
        if (count($dates) < 2) {
            return null;
        }
        $end = $dates[count($dates) - 1];
        $cutoff = (new DateTimeImmutable($end))->modify('-' . self::PERIOD_MONTHS[$period] . ' months')->format('Y-m-d');
        $eligible = array_values(array_filter($dates, static function (string $date) use ($cutoff): bool {
            return $date >= $cutoff;
        }));
        if (count($eligible) < 2) {
            return null;
        }
        return ['start' => $eligible[0], 'end' => $end, 'dates' => $eligible];
    }

    public static function periodReturn(float $startIndex, float $endIndex): ?float
    {
        return $startIndex > 0.0 ? ($endIndex / $startIndex) - 1.0 : null;
    }

    public static function reconstructNav(float $anchorNav, float $anchorIndex, float $targetIndex): ?float
    {
        if ($anchorNav <= 0.0 || $anchorIndex <= 0.0 || $targetIndex <= 0.0) {
            return null;
        }
        return $anchorNav * $targetIndex / $anchorIndex;
    }

    public static function dailyReturns(array $values): array
    {
        $returns = [];
        for ($index = 1; $index < count($values); $index += 1) {
            $previous = (float) $values[$index - 1];
            $current = (float) $values[$index];
            if ($previous <= 0.0 || $current <= 0.0) {
                continue;
            }
            $returns[] = ($current / $previous) - 1.0;
        }
        return $returns;
    }

    public static function mean(array $values): ?float
    {
        return $values ? array_sum($values) / count($values) : null;
    }

    public static function sampleStandardDeviation(array $values): ?float
    {
        if (count($values) < 2) {
            return null;
        }
        $mean = self::mean($values);
        $sum = 0.0;
        foreach ($values as $value) {
            $sum += ((float) $value - $mean) ** 2;
        }
        return sqrt($sum / (count($values) - 1));
    }

    public static function metrics(array $fundIndexes, array $benchmarkIndexes): array
    {
        if (count($fundIndexes) < 2 || count($fundIndexes) !== count($benchmarkIndexes)) {
            return self::unavailableMetrics();
        }
        $fundReturn = self::periodReturn((float) $fundIndexes[0], (float) $fundIndexes[count($fundIndexes) - 1]);
        $benchmarkReturn = self::periodReturn((float) $benchmarkIndexes[0], (float) $benchmarkIndexes[count($benchmarkIndexes) - 1]);
        $fundDaily = self::dailyReturns($fundIndexes);
        $benchmarkDaily = self::dailyReturns($benchmarkIndexes);
        $volatilityDaily = self::sampleStandardDeviation($fundDaily);
        $volatility = $volatilityDaily === null ? null : $volatilityDaily * sqrt(252);
        $excess = [];
        for ($index = 0; $index < min(count($fundDaily), count($benchmarkDaily)); $index += 1) {
            $excess[] = $fundDaily[$index] - $benchmarkDaily[$index];
        }
        $meanExcess = self::mean($excess);
        $sharpe = $meanExcess === null || $volatilityDaily === null || abs($volatilityDaily) < 1.0e-15
            ? null
            : $meanExcess / $volatilityDaily * sqrt(252);
        $downside = array_values(array_filter($excess, static function (float $value): bool {
            return $value < 0.0;
        }));
        $downsideDeviation = self::sampleStandardDeviation($downside);
        $sortino = $meanExcess === null || $downsideDeviation === null || abs($downsideDeviation) < 1.0e-15
            ? null
            : $meanExcess / $downsideDeviation * sqrt(252);
        $pctCdi = $fundReturn === null || $benchmarkReturn === null || abs($benchmarkReturn) < 1.0e-15
            ? null
            : $fundReturn / $benchmarkReturn * 100.0;
        return [
            'period_return' => $fundReturn,
            'benchmark_return' => $benchmarkReturn,
            'pct_cdi' => $pctCdi,
            'volatility' => $volatility,
            'sharpe' => $sharpe,
            'sortino' => $sortino,
            'daily_observations' => count($fundDaily),
        ];
    }

    private static function unavailableMetrics(): array
    {
        return [
            'period_return' => null,
            'benchmark_return' => null,
            'pct_cdi' => null,
            'volatility' => null,
            'sharpe' => null,
            'sortino' => null,
            'daily_observations' => 0,
        ];
    }
}
