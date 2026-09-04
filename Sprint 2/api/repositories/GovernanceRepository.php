<?php
declare(strict_types=1);

final class GovernanceRepository
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
        $rows = $this->all($sql, $parameters);
        return $rows ? $rows[0] : null;
    }

    public function latestRun(): ?array
    {
        return $this->one('SELECT * FROM ingestion_runs ORDER BY completed_at DESC, run_id DESC LIMIT 1');
    }

    public function runs(): array
    {
        return $this->all(
            'SELECT run_id, bundle_sha256, status, completed_at, source_file_count,
                    accepted_records, warning_records, quarantined_records, blocking_records
             FROM ingestion_runs ORDER BY completed_at DESC, run_id DESC'
        );
    }

    public function issues(?string $severity = null, ?string $status = null): array
    {
        $conditions = [];
        $parameters = [];
        if ($severity !== null) {
            $conditions[] = 'severity = :severity';
            $parameters['severity'] = $severity;
        }
        if ($status !== null) {
            $conditions[] = 'status = :status';
            $parameters['status'] = $status;
        }
        $sql = 'SELECT issue_id, logical_name, source_row, record_ref_hash, rule_id, severity, action, message, status FROM quality_issues';
        if ($conditions) {
            $sql .= ' WHERE ' . implode(' AND ', $conditions);
        }
        $sql .= ' ORDER BY severity = \'blocking\' DESC, logical_name, source_row LIMIT 250';
        return $this->all($sql, $parameters);
    }

    public function sourceFiles(string $runId): array
    {
        return $this->all(
            'SELECT logical_name, byte_size, modified_at, row_count, sha256, contract_version, status
             FROM source_files WHERE run_id = :run_id ORDER BY logical_name',
            ['run_id' => $runId]
        );
    }

    public function lineageSummary(string $runId): array
    {
        return $this->all(
            'SELECT target_table, logical_name, source_sha256, COUNT(*) AS record_count, MIN(target_key_hash) AS evidence_hash
             FROM lineage_records WHERE run_id = :run_id
             GROUP BY target_table, logical_name, source_sha256
             ORDER BY target_table, logical_name',
            ['run_id' => $runId]
        );
    }
}
