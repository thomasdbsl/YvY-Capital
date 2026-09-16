<?php
declare(strict_types=1);
require_once __DIR__ . '/StressParser.php';

final class RiskService
{
    private $risk;
    private $funds;
    private $performance;
    public function __construct(RiskRepository $risk, FundRepository $funds, FundsService $performance)
    {
        $this->risk=$risk; $this->funds=$funds; $this->performance=$performance;
    }

    public function overview(string $fund, string $period, ?string $scenario = null): array
    {
        $performance = $this->performance->performance($fund,$period);
        $window = $performance['window'];
        $date = $window['end'] ?? null;
        $drawdowns = $window ? $this->funds->drawdowns($fund,$window['start'],$window['end']) : [];
        $drawdowns = array_map(static function (array $row): array {
            return ['date'=>$row['business_date'],'drawdown'=>(float)$row['drawdown']];
        },$drawdowns);
        $liquidity = array_map(static function (array $row): array {
            return ['date'=>$row['as_of_date'],'business_days'=>(int)$row['projection_days'],
                'fraction'=>$row['nav_percent'] === null ? null : (float)$row['nav_percent'],'run_id'=>$row['last_run_id']];
        }, $this->risk->liquidity($fund,$date));
        $liquidityValues = array_values(array_filter($liquidity, static function (array $row): bool {
            return $row['fraction'] !== null;
        }));
        $liquidityStatus = !$liquidity || !$liquidityValues
            ? 'unavailable'
            : (count($liquidityValues) < count($liquidity) ? 'partial' : 'available');
        $result = $this->risk->dv01Result($fund,$date);
        $items = $result && $result['success'] ? $this->risk->dv01Items($fund,$result['business_date']) : [];
        $groups=[]; $total=null;
        foreach ($items as &$item) {
            foreach (['dv01_notional_value','financial_value'] as $key) {
                $item[$key] = $item[$key] === null ? null : (float)$item[$key];
            }
            $item['risk_factor_vertex'] = $item['risk_factor_vertex'] === null ? null : (int)$item['risk_factor_vertex'];
            if ($item['dv01_notional_value'] !== null) {
                $code=$item['risk_factor_code'];
                $groups[$code]=($groups[$code] ?? 0.0)+$item['dv01_notional_value'];
                $total=($total ?? 0.0)+$item['dv01_notional_value'];
            }
        }
        unset($item);
        $dv01Values = array_values(array_filter($items, static function (array $item): bool {
            return $item['dv01_notional_value'] !== null;
        }));
        $dv01Status = !$items || !$dv01Values
            ? 'unavailable'
            : (count($dv01Values) < count($items) ? 'partial' : 'available');
        uasort($groups, static function ($a,$b): int { return abs($b) <=> abs($a); });
        $stress=StressParser::parse($this->risk->stress($fund,$date));
        if ($scenario !== null) {
            $stress['scenarios']=array_values(array_filter($stress['scenarios'],static function ($item) use ($scenario): bool { return $item['id'] === $scenario; }));
            if (!$stress['scenarios']) throw new ApiException(404,'Stress scenario unavailable for this fund/date');
        }
        return ['fund_id'=>$fund,'period'=>$period,'window'=>$window,'metrics'=>$performance['metrics'],
            'drawdown'=>['status'=>$drawdowns ? 'available':'unavailable','history'=>$drawdowns,
                'current'=>$drawdowns ? $drawdowns[count($drawdowns)-1]['drawdown']:null,
                'maximum'=>$drawdowns ? min(array_column($drawdowns,'drawdown')):null],
            'liquidity'=>['status'=>$liquidityStatus,'horizons'=>$liquidity],
            'stress'=>$stress,
            'dv01'=>['status'=>$dv01Status,'date'=>$result['business_date'] ?? null,
                'run_id'=>$result['last_run_id'] ?? null,'total'=>$total,'unit'=>'Source dv01NotionalValue; unit unspecified and pending partner validation',
                'factors'=>array_map(static function ($code,$value): array { return ['factor'=>$code,'value'=>$value]; },array_keys($groups),array_values($groups)),
                'items'=>$items]];
    }
}
