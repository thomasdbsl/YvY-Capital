<?php
declare(strict_types=1);

final class TicketRepository
{
    private $db;

    public function __construct(PDO $db) { $this->db = $db; }

    public function list(array $actor, array $filters): array
    {
        $conditions = [];
        $parameters = [];
        if ($actor['role'] === 'EXECUTIVE') {
            $conditions[] = 't.created_by = :created_by';
            $parameters['created_by'] = $actor['user_id'];
        }
        foreach (['status', 'category', 'priority'] as $key) {
            if (isset($filters[$key])) {
                $conditions[] = 't.' . $key . ' = :' . $key;
                $parameters[$key] = $filters[$key];
            }
        }
        if (isset($filters['fund_id'])) {
            $conditions[] = 't.related_fund_code = :fund_id';
            $parameters['fund_id'] = $filters['fund_id'];
        }
        $sql = 'SELECT t.ticket_id,t.title,t.description,t.category,t.priority,t.related_fund_code,t.related_context,
                       t.status,t.analyst_response,t.revision,t.created_at,t.updated_at,
                       creator.username AS creator_username,analyst.username AS analyst_username
                FROM tickets t
                INNER JOIN app_users creator ON creator.user_id=t.created_by
                LEFT JOIN app_users analyst ON analyst.user_id=t.assigned_analyst';
        if ($conditions) { $sql .= ' WHERE ' . implode(' AND ', $conditions); }
        $sql .= " ORDER BY FIELD(t.status,'OPEN','IN_REVIEW','RESOLVED'),FIELD(t.priority,'HIGH','NORMAL','LOW'),t.updated_at DESC,t.ticket_id DESC LIMIT 200";
        $query = $this->db->prepare($sql);
        $query->execute($parameters);
        return $query->fetchAll();
    }

    public function detail(array $actor, int $ticketId): ?array
    {
        $parameters = ['ticket_id' => $ticketId];
        $ownership = '';
        if ($actor['role'] === 'EXECUTIVE') {
            $ownership = ' AND t.created_by=:created_by';
            $parameters['created_by'] = $actor['user_id'];
        }
        $query = $this->db->prepare('SELECT t.*,creator.username AS creator_username,analyst.username AS analyst_username
            FROM tickets t INNER JOIN app_users creator ON creator.user_id=t.created_by
            LEFT JOIN app_users analyst ON analyst.user_id=t.assigned_analyst
            WHERE t.ticket_id=:ticket_id' . $ownership);
        $query->execute($parameters);
        $ticket = $query->fetch();
        if ($ticket === false) { return null; }
        $history = $this->db->prepare('SELECT e.event_type,e.previous_status,e.new_status,e.response_text,e.occurred_at,u.username,e.actor_role
            FROM ticket_events e INNER JOIN app_users u ON u.user_id=e.actor_user_id
            WHERE e.ticket_id=? ORDER BY e.ticket_event_id');
        $history->execute([$ticketId]);
        $ticket['history'] = $history->fetchAll();
        $audit = $this->db->prepare('SELECT e.action,e.actor_role,e.occurred_at,e.previous_state,e.new_state,u.username
            FROM audit_events e INNER JOIN app_users u ON u.user_id=e.user_id
            WHERE e.target_type=\'ticket\' AND e.target_id=? ORDER BY e.event_id');
        $audit->execute([self::publicId($ticketId)]);
        $ticket['audit'] = array_map(static function (array $row): array {
            $row['previous_state'] = json_decode($row['previous_state'] ?? 'null', true);
            $row['new_state'] = json_decode($row['new_state'] ?? 'null', true);
            return $row;
        }, $audit->fetchAll());
        return $ticket;
    }

    public function create(array $actor, array $data): array
    {
        $this->db->beginTransaction();
        try {
            $query = $this->db->prepare('INSERT INTO tickets
                (created_by,title,description,category,priority,related_fund_code,related_context)
                VALUES (?,?,?,?,?,?,?)');
            $query->execute([$actor['user_id'],$data['title'],$data['description'],$data['category'],$data['priority'],$data['related_fund_code'],$data['related_context']]);
            $ticketId = (int) $this->db->lastInsertId();
            $event = $this->db->prepare("INSERT INTO ticket_events
                (ticket_id,actor_user_id,actor_role,event_type,new_status) VALUES (?,?,?,'CREATED','OPEN')");
            $event->execute([$ticketId,$actor['user_id'],$actor['role']]);
            $this->audit($actor,'TICKET_CREATED',$ticketId,null,['status'=>'OPEN','category'=>$data['category'],'priority'=>$data['priority']]);
            $this->db->commit();
            return $this->detail($actor,$ticketId);
        } catch (Throwable $error) {
            if ($this->db->inTransaction()) { $this->db->rollBack(); }
            throw $error;
        }
    }

    public function update(array $actor, int $ticketId, string $status, string $response, int $revision): array
    {
        $this->db->beginTransaction();
        try {
            $lock = $this->db->prepare('SELECT status,analyst_response,revision FROM tickets WHERE ticket_id=? FOR UPDATE');
            $lock->execute([$ticketId]);
            $previous = $lock->fetch();
            if ($previous === false) { throw new ApiException(404,'Ticket was not found'); }
            if ((int) $previous['revision'] !== $revision) { throw new ApiException(409,'Ticket changed. Reload before updating.'); }
            if ($previous['status'] === 'RESOLVED' && $status !== 'RESOLVED') { throw new ApiException(409,'Resolved tickets cannot be reopened in this beta workflow'); }
            $changedStatus = $status !== $previous['status'];
            $addedResponse = $response !== '' && $response !== $previous['analyst_response'];
            if (!$changedStatus && !$addedResponse) { throw new ApiException(400,'No ticket change was provided'); }
            $update = $this->db->prepare('UPDATE tickets SET status=?,analyst_response=?,assigned_analyst=?,revision=revision+1 WHERE ticket_id=?');
            $update->execute([$status,$response,$actor['user_id'],$ticketId]);
            if ($changedStatus) {
                $type = $status === 'RESOLVED' ? 'RESOLVED' : 'STATUS_CHANGED';
                $event = $this->db->prepare('INSERT INTO ticket_events
                    (ticket_id,actor_user_id,actor_role,event_type,previous_status,new_status) VALUES (?,?,?,?,?,?)');
                $event->execute([$ticketId,$actor['user_id'],$actor['role'],$type,$previous['status'],$status]);
                $this->audit($actor,$status === 'RESOLVED' ? 'TICKET_RESOLVED' : 'TICKET_STATUS_CHANGED',$ticketId,
                    ['status'=>$previous['status'],'revision'=>$revision],['status'=>$status,'revision'=>$revision+1]);
            }
            if ($addedResponse) {
                $event = $this->db->prepare("INSERT INTO ticket_events
                    (ticket_id,actor_user_id,actor_role,event_type,previous_status,new_status,response_text) VALUES (?,?,?,'RESPONSE_ADDED',?,?,?)");
                $event->execute([$ticketId,$actor['user_id'],$actor['role'],$previous['status'],$status,$response]);
                $this->audit($actor,'TICKET_RESPONSE_ADDED',$ticketId,null,['status'=>$status,'response_present'=>true,'revision'=>$revision+1]);
            }
            $this->db->commit();
            return $this->detail($actor,$ticketId);
        } catch (Throwable $error) {
            if ($this->db->inTransaction()) { $this->db->rollBack(); }
            throw $error;
        }
    }

    private function audit(array $actor, string $action, int $ticketId, ?array $before, ?array $after): void
    {
        $query = $this->db->prepare('INSERT INTO audit_events
            (user_id,actor_role,action,target_type,target_id,previous_state,new_state) VALUES (?,?,?,?,?,?,?)');
        $query->execute([$actor['user_id'],$actor['role'],$action,'ticket',self::publicId($ticketId),
            $before === null ? null : json_encode($before),$after === null ? null : json_encode($after)]);
    }

    public static function publicId(int $ticketId): string { return 'TKT-' . str_pad((string) $ticketId,6,'0',STR_PAD_LEFT); }
}
