<?php
declare(strict_types=1);

final class RiskRepository
{
    private $db;
    public function __construct(PDO $db) { $this->db = $db; }

    private function rows(string $sql, array $parameters): array
    {
        $statement = $this->db->prepare($sql);
        $statement->execute($parameters);
        return $statement->fetchAll();
    }

    public function liquidity(string $fund, ?string $date): array
    {
        return $this->rows('SELECT r.as_of_date,r.projection_days,r.nav_percent,r.last_run_id
            FROM liquidity_horizons r JOIN funds f ON f.source_fund_id=r.source_fund_id
            WHERE f.fund_code=? AND r.as_of_date=(SELECT MAX(s.as_of_date) FROM liquidity_horizons s
                WHERE s.source_fund_id=r.source_fund_id AND s.as_of_date <= COALESCE(?,\'9999-12-31\'))
            ORDER BY r.projection_days', [$fund,$date]);
    }

    public function dv01Result(string $fund, ?string $date): ?array
    {
        $rows = $this->rows('SELECT r.business_date,r.success,r.item_count,r.last_run_id
            FROM dv01_results r JOIN funds f ON f.source_fund_id=r.source_fund_id
            WHERE f.fund_code=? AND r.business_date <= COALESCE(?,\'9999-12-31\') ORDER BY r.business_date DESC LIMIT 1', [$fund,$date]);
        return $rows[0] ?? null;
    }

    public function dv01Items(string $fund, string $date): array
    {
        return $this->rows('SELECT r.item_code,r.instrument_code,r.risk_factor_code,r.risk_factor_vertex,
                r.dv01_notional_value,r.financial_value
            FROM dv01_items r JOIN funds f ON f.source_fund_id=r.source_fund_id
            WHERE f.fund_code=? AND r.business_date=? ORDER BY ABS(r.dv01_notional_value) DESC,r.item_code', [$fund,$date]);
    }

    public function stress(string $fund, ?string $date): ?array
    {
        $rows = $this->rows('SELECT r.business_date,r.success,r.result_json_restricted,r.last_run_id
            FROM stress_results r JOIN funds f ON f.source_fund_id=r.source_fund_id
            WHERE f.fund_code=? AND r.business_date <= COALESCE(?,\'9999-12-31\') ORDER BY r.business_date DESC LIMIT 1', [$fund,$date]);
        return $rows[0] ?? null;
    }
}
