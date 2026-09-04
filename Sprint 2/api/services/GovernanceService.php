<?php
declare(strict_types=1);

final class GovernanceService
{
    private $governance;

    public function __construct(GovernanceRepository $governance)
    {
        $this->governance = $governance;
    }

    public function latestRun(): array
    {
        $run = $this->governance->latestRun();
        if ($run === null) {
            throw new ApiException(503, 'Sprint 3 data has not been ingested');
        }
        return $run;
    }

    public function anomalies(?string $severity = null, ?string $status = null): array
    {
        return array_map(static function (array $row): array {
            return [
                'anomaly_id' => $row['issue_id'],
                'rule_id' => $row['rule_id'],
                'severity' => $row['severity'],
                'status' => $row['status'],
                'title' => $row['message'],
                'record_ref' => substr($row['record_ref_hash'], 0, 20),
                'action' => $row['action'],
                'source' => $row['logical_name'],
                'source_row' => $row['source_row'] === null ? null : (int) $row['source_row'],
            ];
        }, $this->governance->issues($severity, $status));
    }

    public function runs(): array
    {
        return array_map(static function (array $row): array {
            return [
                'run_id' => $row['run_id'],
                'status' => $row['status'],
                'generated_at' => str_replace(' ', 'T', $row['completed_at']) . 'Z',
                'accepted_records' => (int) $row['accepted_records'],
                'quarantined_records' => (int) $row['quarantined_records'],
                'warning_records' => (int) $row['warning_records'],
                'blocking_records' => (int) $row['blocking_records'],
                'source_file_count' => (int) $row['source_file_count'],
                'manifest_ref' => substr($row['bundle_sha256'], 0, 20),
            ];
        }, $this->governance->runs());
    }

    public function evidence(string $runId): array
    {
        return array_map(static function (array $row) use ($runId): array {
            return [
                'screen_value_id' => $row['target_table'],
                'kpi_id' => 'CURATED',
                'lineage_ref' => substr($row['evidence_hash'], 0, 20),
                'source_id' => $row['logical_name'],
                'source_record_id' => substr($row['source_sha256'], 0, 20),
                'record_count' => (int) $row['record_count'],
                'run_id' => $runId,
                'business_date' => null,
            ];
        }, $this->governance->lineageSummary($runId));
    }

    public function sourceFiles(string $runId): array
    {
        return array_map(static function (array $row): array {
            return [
                'logical_name' => $row['logical_name'],
                'byte_size' => (int) $row['byte_size'],
                'modified_at' => str_replace(' ', 'T', $row['modified_at']) . 'Z',
                'row_count' => (int) $row['row_count'],
                'sha256' => $row['sha256'],
                'contract_version' => $row['contract_version'],
                'status' => $row['status'],
            ];
        }, $this->governance->sourceFiles($runId));
    }
}
