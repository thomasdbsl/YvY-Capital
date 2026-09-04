<?php
declare(strict_types=1);

require_once __DIR__ . '/../../api/bootstrap.php';
require_once __DIR__ . '/../../api/services/FinancialMath.php';

function assert_close(?float $actual, float $expected, float $tolerance = 1.0e-10): void
{
    if ($actual === null || abs($actual - $expected) > $tolerance) {
        throw new RuntimeException('Expected ' . $expected . ', received ' . var_export($actual, true));
    }
}

assert_close(FinancialMath::periodReturn(100.0, 110.0), 0.1);
assert_close(FinancialMath::reconstructNav(1000.0, 100.0, 105.0), 1050.0);

$window = FinancialMath::resolveWindow(['2026-01-01', '2026-02-01', '2026-03-01', '2026-04-01'], '3m');
if ($window === null || $window['start'] !== '2026-01-01' || $window['end'] !== '2026-04-01') {
    throw new RuntimeException('Period window was not resolved from calendar dates');
}

$metrics = FinancialMath::metrics([100.0, 101.0, 100.5, 102.0], [100.0, 100.4, 100.8, 101.0]);
assert_close($metrics['period_return'], 0.02);
assert_close($metrics['benchmark_return'], 0.01);
assert_close($metrics['pct_cdi'], 200.0);
if ($metrics['volatility'] === null || $metrics['sharpe'] === null || $metrics['daily_observations'] !== 3) {
    throw new RuntimeException('Risk metrics were not calculated from daily returns');
}

if (FinancialMath::periodReturn(0.0, 100.0) !== null || FinancialMath::reconstructNav(-1.0, 100.0, 101.0) !== null) {
    throw new RuntimeException('Invalid financial inputs must return unavailable');
}

try {
    FinancialMath::validatePeriod('all');
    throw new RuntimeException('Invalid period was accepted');
} catch (ApiException $exception) {
    if ($exception->statusCode() !== 400) {
        throw $exception;
    }
}

echo "Financial business logic tests passed.\n";
