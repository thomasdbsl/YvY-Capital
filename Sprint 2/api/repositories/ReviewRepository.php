<?php
declare(strict_types=1);

final class ReviewRepository
{
    private $db;
    public function __construct(PDO $db) { $this->db = $db; }

    public function detail(string $id, bool $lock = false): ?array
    {
        $query = $this->db->prepare('SELECT q.issue_id, q.run_id, q.logical_name, q.source_row, q.record_ref_hash,
            q.rule_id, q.severity, q.action, q.status AS source_status,
            COALESCE(r.status,q.status) AS status, COALESCE(r.analyst_note,\'\') AS analyst_note,
            r.reviewed_at, u.username AS reviewed_by, COALESCE(r.revision,0) AS revision
            FROM quality_issues q LEFT JOIN issue_reviews r ON r.issue_id=q.issue_id
            LEFT JOIN app_users u ON u.user_id=r.reviewed_by WHERE q.issue_id=?' . ($lock ? ' FOR UPDATE' : ''));
        $query->execute([$id]);
        return $query->fetch() ?: null;
    }

    public function history(string $id): array
    {
        $query = $this->db->prepare('SELECT e.event_id,e.actor_role,e.occurred_at,e.action,e.previous_state,e.new_state,u.username
            FROM audit_events e JOIN app_users u ON u.user_id=e.user_id
            WHERE e.target_type=\'quality_issue\' AND e.target_id=? ORDER BY e.event_id DESC LIMIT 100');
        $query->execute([$id]);
        return array_map(static function (array $row): array {
            $row['previous_state'] = json_decode($row['previous_state'] ?? 'null', true);
            $row['new_state'] = json_decode($row['new_state'] ?? 'null', true);
            return $row;
        }, $query->fetchAll());
    }

    public function review(array $actor, string $id, string $status, string $note, int $revision, string $context): array
    {
        $this->db->beginTransaction();
        try {
            $previous = $this->detail($id, true);
            if ($previous === null) { throw new ApiException(404, 'Issue not found'); }
            if ((int) $previous['revision'] !== $revision) { throw new ApiException(409, 'Issue changed. Reload before reviewing.'); }
            // Review decisions do not release quarantined records or modify ingestion evidence.
            $allowed = ['open' => ['open','resolved','quarantined'], 'resolved' => ['resolved','open'], 'quarantined' => ['quarantined','open']];
            if (!in_array($status, $allowed[$previous['status']] ?? [], true)) { throw new ApiException(409, 'Invalid status transition'); }
            $query = $this->db->prepare('INSERT INTO issue_reviews (issue_id,status,analyst_note,reviewed_by,reviewed_at,revision)
                VALUES (?,?,?,?,UTC_TIMESTAMP(),?) ON DUPLICATE KEY UPDATE status=VALUES(status),analyst_note=VALUES(analyst_note),
                reviewed_by=VALUES(reviewed_by),reviewed_at=VALUES(reviewed_at),revision=VALUES(revision)');
            $query->execute([$id,$status,$note,$actor['user_id'],$revision+1]);
            $audit = new AuthRepository($this->db);
            // Notes may contain sensitive text; the audit stores only their presence, not their content.
            $action = $context === 'reconciliation'
                ? 'RECONCILIATION_REVIEWED'
                : ($status === $previous['status'] ? 'QUALITY_ISSUE_REVIEWED' : 'QUALITY_ISSUE_STATUS_CHANGED');
            $audit->audit($actor, $action,
                'quality_issue', $id, ['status'=>$previous['status'],'revision'=>$revision],
                ['status'=>$status,'revision'=>$revision+1,'note_present'=>$note !== '','context'=>$context]);
            $current = $this->detail($id);
            $this->db->commit();
            return $current;
        } catch (Throwable $error) {
            $this->db->rollBack();
            throw $error;
        }
    }
}
