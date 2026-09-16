<?php
declare(strict_types=1);

require_once __DIR__ . '/../../api/bootstrap.php';
require_once __DIR__ . '/../../api/services/FinancialMath.php';
require_once __DIR__ . '/../../api/services/StressParser.php';
require_once __DIR__ . '/../../api/services/PeerService.php';

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

$shortRisk = FinancialMath::metrics([100.0, 101.0, 100.5, 102.0], [100.0, 100.4, 100.8, 101.0], 20);
if ($shortRisk['volatility'] !== null || $shortRisk['sharpe'] !== null || $shortRisk['sortino'] !== null
    || $shortRisk['risk_metrics_status'] !== 'unavailable-insufficient-history'
    || $shortRisk['minimum_risk_observations'] !== 20) {
    throw new RuntimeException('Short history must leave risk-return metrics unavailable');
}

$deterministicCdi = FinancialMath::metrics([100.0, 110.0], [100.0, 108.0]);
assert_close($deterministicCdi['period_return'], 0.1);
assert_close($deterministicCdi['benchmark_return'], 0.08);
assert_close($deterministicCdi['pct_cdi'], 125.0);

$zeroBenchmark = FinancialMath::metrics([100.0, 110.0], [100.0, 100.0]);
if ($zeroBenchmark['pct_cdi'] !== null) {
    throw new RuntimeException('A zero benchmark return must produce an unavailable % of CDI');
}

if (FinancialMath::resolveWindow(['2026-04-01'], '3m') !== null) {
    throw new RuntimeException('A comparison without two common observations must be unavailable');
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
$peerRows=[['peer_id'=>'PEER_TEST','category'=>'fixed_income','private_name'=>'NEVER EXPOSE']];
$peerSeries=[['peer_id'=>'PEER_TEST','date'=>'2026-01-01','index'=>100],['peer_id'=>'PEER_TEST','date'=>'2026-01-02','index'=>101]];
$normalized=PeerDataset::normalize($peerRows,$peerSeries);
if (count($normalized['series'])!==2 || strpos(json_encode($normalized),'NEVER EXPOSE')!==false) throw new RuntimeException('Peer adapter contract failed');
foreach ([[$peerRows,array_merge($peerSeries,[$peerSeries[0]])],[array_merge($peerRows,$peerRows),$peerSeries],[$peerRows,[['peer_id'=>'PEER_UNKNOWN','date'=>'2026-01-01','index'=>100]]],[$peerRows,[['peer_id'=>'PEER_TEST','date'=>'invalid','index'=>100]]]] as $invalid) {
    try { PeerDataset::normalize(...$invalid); throw new RuntimeException('Invalid peer data accepted'); }
    catch (ApiException $error) { if ($error->statusCode()!==422) throw $error; }
}
$pending=(new PeerService(new PendingPeerSource()))->dataset();
if ($pending['status']!=='unavailable-pending-certification' || $pending['series']!==[]) throw new RuntimeException('Uncertified peer gate failed');
final class CertifiedPeerFixture implements PeerSourceAdapter
{
    public function certificationReference(): ?string { return 'QA-CERTIFIED-FIXTURE'; }
    public function entities(): array { return [['peer_id'=>'PEER_TEST','category'=>'fixed_income']]; }
    public function returnSeries(): array { return [
        ['peer_id'=>'PEER_TEST','date'=>'2026-01-01','index'=>200.0],
        ['peer_id'=>'PEER_TEST','date'=>'2026-01-02','index'=>204.0],
    ]; }
}
$comparison=(new PeerService(new CertifiedPeerFixture()))->comparison([
    ['date'=>'2026-01-01','index'=>50.0],['date'=>'2026-01-02','index'=>51.0],
],'PEER_TEST');
if ($comparison['status']!=='available' || $comparison['window']['observations']!==2) throw new RuntimeException('Peer comparison service failed');
assert_close($comparison['history'][0]['fund_index'],100.0);
assert_close($comparison['history'][1]['fund_index'],102.0);
assert_close($comparison['history'][1]['peer_index'],102.0);
$pendingComparison=(new PeerService(new PendingPeerSource()))->comparison([], 'PEER_TEST');
if ($pendingComparison['status']!=='unavailable-pending-certification' || $pendingComparison['history']!==[]) throw new RuntimeException('Uncertified peer comparison gate failed');
echo "Peer adapter: normalization, comparison boundary, privacy, duplicate/date/reference validation and certification gate passed.\n";

$stressFixture = ['success'=>true,'business_date'=>'2026-08-11','last_run_id'=>'TEST',
    'result_json_restricted'=>json_encode([['name'=>'PRIVATE FUND',
        'sm_names'=>[['id'=>'test-mask','name'=>'PRIVATE SCENARIO']],
        'total'=>[['mask_id'=>'test-mask','nav_diff'=>'-125.0','nav_percent'=>'-0.125']],
        'instruments_risk'=>[['group_name'=>'PRIVATE GROUP','total'=>[['mask_id'=>'test-mask','nav_diff'=>'-125.0','nav_percent'=>'-0.125']]]]]])];
$parsed=StressParser::parse($stressFixture);
if ($parsed['status'] !== 'available' || count($parsed['scenarios']) !== 1) throw new RuntimeException('Valid stress scenario not parsed');
assert_close($parsed['scenarios'][0]['nav_diff'],-125.0);
assert_close($parsed['scenarios'][0]['groups'][0]['nav_percent'],-0.125);
if (strpos(json_encode($parsed),'PRIVATE') !== false || strpos(json_encode($parsed),'test-mask') !== false) throw new RuntimeException('Stress privacy regression');
foreach ([null, array_replace($stressFixture,['success'=>false]), array_replace($stressFixture,['result_json_restricted'=>'[]']),
    array_replace($stressFixture,['result_json_restricted'=>'{invalid']), array_replace($stressFixture,['result_json_restricted'=>'[{"unexpected":10}]'])] as $missing) {
    if (StressParser::parse($missing)['status'] !== 'unavailable') throw new RuntimeException('Missing stress must remain unavailable');
}
$invalidNumeric = $stressFixture;
$invalidNumeric['result_json_restricted'] = json_encode([['sm_names'=>[['id'=>'test-mask']],
    'total'=>[['mask_id'=>'test-mask','nav_diff'=>'1,25','nav_percent'=>'not-a-number']]]]);
if (StressParser::parse($invalidNumeric)['status'] !== 'unavailable') throw new RuntimeException('Invalid stress numeric strings must be rejected');
echo "Stress parser: source values, group alignment, privacy and five unavailable cases passed.\n";
