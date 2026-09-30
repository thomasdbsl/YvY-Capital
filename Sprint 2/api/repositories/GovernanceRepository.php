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

    public function latestSuccessfulRun(): ?array
    {
        return $this->one(
            'SELECT * FROM ingestion_runs
             WHERE status IN (\'completed\',\'completed_with_warnings\',\'completed_with_quarantine\')
             ORDER BY completed_at DESC, run_id DESC LIMIT 1'
        );
    }

    public function latestAttempt(bool $failedOnly = false): ?array
    {
        return $this->one(
            'SELECT attempt_id,run_id,status,stage,started_at,completed_at,duration_ms,error_code
             FROM pipeline_attempts ' . ($failedOnly ? "WHERE status IN ('failed','blocked') " : '') .
            'ORDER BY started_at DESC,attempt_id DESC LIMIT 1'
        );
    }

    public function latestBusinessDate(): ?string
    {
        $row = $this->one('SELECT MAX(snapshot_date) AS business_date FROM fund_nav_snapshots');
        return $row['business_date'] ?? null;
    }

    public function runs(): array
    {
        return $this->all(
            'SELECT run_id, bundle_sha256, status, completed_at, source_file_count,
                    accepted_records, warning_records, quarantined_records, blocking_records
             FROM ingestion_runs ORDER BY completed_at DESC, run_id DESC'
        );
    }

    public function issueCounts(): array
    {
        return $this->one(
            'SELECT COUNT(*) AS total,
                    SUM(CASE WHEN COALESCE(r.status,q.status)=\'open\' THEN 1 ELSE 0 END) AS open_count,
                    SUM(CASE WHEN COALESCE(r.status,q.status)=\'resolved\' THEN 1 ELSE 0 END) AS resolved_count,
                    SUM(CASE WHEN COALESCE(r.status,q.status)=\'quarantined\' THEN 1 ELSE 0 END) AS quarantined_count,
                    SUM(CASE WHEN q.severity=\'blocking\' THEN 1 ELSE 0 END) AS blocking_count,
                    SUM(CASE WHEN q.severity=\'warning\' THEN 1 ELSE 0 END) AS warning_count,
                    SUM(CASE WHEN q.severity=\'info\' THEN 1 ELSE 0 END) AS info_count
             FROM quality_issues q LEFT JOIN issue_reviews r ON r.issue_id=q.issue_id'
        ) ?? [];
    }

    public function issues(?string $severity = null, ?string $status = null, array $filters = [], int $offset = 0): array
    {
        $conditions = [];
        $parameters = [];
        foreach (['rule_id','run_id'] as $key) {
            if (isset($filters[$key])) { $conditions[]='q.'.$key.' = :'.$key; $parameters[$key]=$filters[$key]; }
        }
        if (isset($filters['search'])) {
            $conditions[]='(LOCATE(:search_message,q.message)>0 OR LOCATE(:search_rule,q.rule_id)>0 OR LOCATE(:search_file,q.logical_name)>0)';
            foreach (['search_message','search_rule','search_file'] as $key) $parameters[$key]=$filters['search'];
        }
        if (isset($filters['fund_id'])) {
            $conditions[]='EXISTS (SELECT 1 FROM reconciliation_evidence e WHERE e.issue_id=q.issue_id AND e.fund_code=:fund_id)';
            $parameters['fund_id']=$filters['fund_id'];
        }
        if ($severity !== null) {
            $conditions[] = 'q.severity = :severity';
            $parameters['severity'] = $severity;
        }
        if ($status !== null) {
            $conditions[] = 'COALESCE(r.status,q.status) = :status';
            $parameters['status'] = $status;
        }
        $sql = 'SELECT q.issue_id, q.run_id, q.logical_name, q.source_row, q.record_ref_hash, q.rule_id, q.severity, q.action, q.message,
            COALESCE(r.status,q.status) AS status FROM quality_issues q LEFT JOIN issue_reviews r ON r.issue_id=q.issue_id';
        if ($conditions) {
            $sql .= ' WHERE ' . implode(' AND ', $conditions);
        }
        $sql .= ' ORDER BY severity = \'blocking\' DESC, logical_name, source_row,q.issue_id LIMIT 250 OFFSET '.(int)$offset;
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

    public function stageCounts(string $runId): array
    {
        return $this->all(
            'SELECT stage_name,accepted_records,warning_records,quarantined_records
             FROM pipeline_stage_counts WHERE run_id=:run_id
             ORDER BY FIELD(stage_name,\'raw\',\'bronze\',\'silver\',\'gold\',\'serving\'),stage_name',
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
