<?php
declare(strict_types=1);

final class ReconciliationRepository
{
    private $db;
    public function __construct(PDO $db) { $this->db=$db; }
    public function rows(array $filters, int $offset): array
    {
        $where=[]; $parameters=[];
        foreach (['fund_code','snapshot_date','severity','rule_status','run_id'] as $key) {
            if (isset($filters[$key])) { $where[]='e.'.$key.' = ?'; $parameters[]=$filters[$key]; }
        }
        if (isset($filters['status'])) { $where[]='COALESCE(r.status,q.status,\'not-required\') = ?'; $parameters[]=$filters['status']; }
        $query=$this->db->prepare('SELECT e.*, COALESCE(r.status,q.status,\'not-required\') AS review_status,
            r.reviewed_at,u.username AS reviewed_by
            FROM reconciliation_evidence e LEFT JOIN quality_issues q ON q.issue_id=e.issue_id
            LEFT JOIN issue_reviews r ON r.issue_id=e.issue_id LEFT JOIN app_users u ON u.user_id=r.reviewed_by'
            .($where ? ' WHERE '.implode(' AND ',$where):'') . ' ORDER BY e.snapshot_date DESC,e.fund_code,e.evidence_id LIMIT 101 OFFSET '.(int)$offset);
        $query->execute($parameters);
        return $query->fetchAll();
    }
}
