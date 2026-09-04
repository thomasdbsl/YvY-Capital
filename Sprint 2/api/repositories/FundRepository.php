<?php
declare(strict_types=1);

final class FundRepository
{
    private $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    private function all(string $sql, array $parameters = []): array
    {
        $statement = $this->pdo->prepare($sql);
        $statement->execute($parameters);
        return $statement->fetchAll();
    }

    private function one(string $sql, array $parameters = []): ?array
    {
        $statement = $this->pdo->prepare($sql);
        $statement->execute($parameters);
        $row = $statement->fetch();
        return $row === false ? null : $row;
    }

    public function exists(string $fundCode): bool
    {
        return $this->one('SELECT fund_code FROM funds WHERE fund_code = :fund_code', ['fund_code' => $fundCode]) !== null;
    }

    public function funds(?string $fundCode = null): array
    {
        $sql = 'SELECT f.fund_code, f.display_name, f.currency_id, f.is_active,
                       g.snapshot_date, g.nav_brl, g.daily_return, g.holdings_available,
                       g.freshness_days, g.quality_status, g.last_run_id
                FROM funds f
                LEFT JOIN gold_fund_latest g ON g.source_fund_id = f.source_fund_id';
        $parameters = [];
        if ($fundCode !== null) {
            $sql .= ' WHERE f.fund_code = :fund_code';
            $parameters['fund_code'] = $fundCode;
        }
        $sql .= ' ORDER BY f.fund_code';
        return $this->all($sql, $parameters);
    }

    public function returnSeries(string $fundCode): array
    {
        return $this->all(
            'SELECT r.business_date, r.series_type, r.index_value
             FROM return_series r
             INNER JOIN funds f ON f.source_fund_id = r.source_fund_id
             WHERE f.fund_code = :fund_code
             ORDER BY r.business_date, r.series_type',
            ['fund_code' => $fundCode]
        );
    }

    public function drawdowns(string $fundCode, string $start, string $end): array
    {
        return $this->all(
            'SELECT d.business_date, d.drawdown
             FROM drawdowns d
             INNER JOIN funds f ON f.source_fund_id = d.source_fund_id
             WHERE f.fund_code = :fund_code AND d.business_date BETWEEN :start_date AND :end_date
             ORDER BY d.business_date',
            ['fund_code' => $fundCode, 'start_date' => $start, 'end_date' => $end]
        );
    }

    public function availableSnapshots(string $fundCode): array
    {
        return array_column($this->all(
            'SELECT DISTINCT h.snapshot_date
             FROM portfolio_holdings h
             INNER JOIN funds f ON f.source_fund_id = h.source_fund_id
             WHERE f.fund_code = :fund_code
             ORDER BY h.snapshot_date DESC',
            ['fund_code' => $fundCode]
        ), 'snapshot_date');
    }

    public function navAt(string $fundCode, string $snapshotDate): ?array
    {
        return $this->one(
            'SELECT n.snapshot_date, n.nav_brl, n.last_run_id
             FROM fund_nav_snapshots n
             INNER JOIN funds f ON f.source_fund_id = n.source_fund_id
             WHERE f.fund_code = :fund_code AND n.snapshot_date = :snapshot_date',
            ['fund_code' => $fundCode, 'snapshot_date' => $snapshotDate]
        );
    }

    public function allocation(string $fundCode, string $snapshotDate): array
    {
        return $this->all(
            'SELECT a.group_identifier, a.nav_value_brl, a.weight, a.holdings_count, a.quality_status, a.last_run_id
             FROM gold_allocations a
             INNER JOIN funds f ON f.source_fund_id = a.source_fund_id
             WHERE f.fund_code = :fund_code AND a.snapshot_date = :snapshot_date
             ORDER BY a.nav_value_brl DESC, a.group_identifier',
            ['fund_code' => $fundCode, 'snapshot_date' => $snapshotDate]
        );
    }

    public function holdings(string $fundCode, string $snapshotDate): array
    {
        return $this->all(
            'SELECT h.holding_code, h.instrument_code, h.issuer_code, h.group_identifier,
                    h.nav_value_brl, h.last_run_id, n.nav_brl
             FROM portfolio_holdings h
             INNER JOIN funds f ON f.source_fund_id = h.source_fund_id
             INNER JOIN fund_nav_snapshots n ON n.source_fund_id = h.source_fund_id AND n.snapshot_date = h.snapshot_date
             WHERE f.fund_code = :fund_code AND h.snapshot_date = :snapshot_date
             ORDER BY h.nav_value_brl DESC, h.holding_code',
            ['fund_code' => $fundCode, 'snapshot_date' => $snapshotDate]
        );
    }
}
