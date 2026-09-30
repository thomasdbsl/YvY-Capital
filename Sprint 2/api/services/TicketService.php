<?php
declare(strict_types=1);

final class TicketService
{
    private const CATEGORIES = ['DATA_QUALITY','PERFORMANCE','ALLOCATION','RISK','RECONCILIATION','OTHER'];
    private const PRIORITIES = ['LOW','NORMAL','HIGH'];
    private const STATUSES = ['OPEN','IN_REVIEW','RESOLVED'];
    private const CONTEXTS = ['overview','funds','fund-detail','performance','comparison','peers','risk','reconciliation','quality','import','runs','tickets'];
    private $tickets;

    public function __construct(TicketRepository $tickets) { $this->tickets = $tickets; }

    public function listing(array $actor, array $filters): array
    {
        foreach (['status'=>self::STATUSES,'category'=>self::CATEGORIES,'priority'=>self::PRIORITIES] as $key=>$allowed) {
            if (isset($filters[$key]) && !in_array($filters[$key],$allowed,true)) { throw new ApiException(400,'Invalid ticket filter: ' . $key); }
        }
        if (isset($filters['fund_id'])) { $filters['fund_id'] = validate_fund_id($filters['fund_id'],true); }
        $records = array_map([$this,'present'], $this->tickets->list($actor,$filters));
        $counts = ['OPEN'=>0,'IN_REVIEW'=>0,'RESOLVED'=>0];
        foreach ($records as $record) { $counts[$record['status']]++; }
        return ['records'=>$records,'summary'=>$counts,'scope'=>$actor['role'] === 'ANALYST' ? 'all-executive-tickets' : 'own-tickets'];
    }

    public function detail(array $actor, string $publicId): array
    {
        $ticket = $this->tickets->detail($actor,self::parseId($publicId));
        if ($ticket === null) { throw new ApiException(404,'Ticket was not found'); }
        return ['ticket'=>$this->present($ticket,true)];
    }

    public function create(array $actor, array $body): array
    {
        if ($actor['role'] !== 'EXECUTIVE') { throw new ApiException(403,'Only Executive users can create tickets'); }
        if (array_diff(array_keys($body),['action','title','description','category','priority','related_fund','related_context'])) { throw new ApiException(400,'Unknown field'); }
        $title = self::text($body,'title',5,160);
        $description = self::text($body,'description',10,2000);
        $category = $body['category'] ?? null;
        $priority = $body['priority'] ?? 'NORMAL';
        if (!is_string($category) || !in_array($category,self::CATEGORIES,true)
            || !is_string($priority) || !in_array($priority,self::PRIORITIES,true)) { throw new ApiException(400,'Invalid ticket category or priority'); }
        $fund = $body['related_fund'] ?? null;
        if ($fund !== null && $fund !== '') { $fund = validate_fund_id(is_string($fund) ? $fund : null,true); } else { $fund = null; }
        $context = $body['related_context'] ?? null;
        if ($context !== null && $context !== '' && (!is_string($context) || !in_array($context,self::CONTEXTS,true))) { throw new ApiException(400,'Invalid ticket context'); }
        $ticket = $this->tickets->create($actor,['title'=>$title,'description'=>$description,'category'=>$category,'priority'=>$priority,
            'related_fund_code'=>$fund,'related_context'=>$context ?: null]);
        return ['ticket'=>$this->present($ticket,true)];
    }

    public function update(array $actor, array $body): array
    {
        if ($actor['role'] !== 'ANALYST') { throw new ApiException(403,'Only Analysts can update tickets'); }
        if (array_diff(array_keys($body),['action','ticket_id','status','response','revision'])) { throw new ApiException(400,'Unknown field'); }
        $status = $body['status'] ?? null;
        $response = $body['response'] ?? '';
        $revision = $body['revision'] ?? null;
        if (!is_string($status) || !in_array($status,self::STATUSES,true) || !is_string($response)
            || strlen($response) > 2000 || !is_int($revision) || $revision < 0) { throw new ApiException(400,'Invalid ticket update'); }
        $ticket = $this->tickets->update($actor,self::parseId($body['ticket_id'] ?? null),$status,trim($response),$revision);
        return ['ticket'=>$this->present($ticket,true)];
    }

    private function present(array $row, bool $withHistory = false): array
    {
        $record = [
            'ticket_id'=>TicketRepository::publicId((int) $row['ticket_id']),
            'title'=>$row['title'],'description'=>$row['description'],'category'=>$row['category'],'priority'=>$row['priority'],
            'related_fund'=>$row['related_fund_code'],'related_context'=>$row['related_context'],'status'=>$row['status'],
            'analyst_response'=>$row['analyst_response'],'revision'=>(int) $row['revision'],'created_at'=>$row['created_at'],'updated_at'=>$row['updated_at'],
            'creator'=>$row['creator_username'],'analyst'=>$row['analyst_username'],
        ];
        if ($withHistory) {
            $record['history'] = array_map(static function (array $event): array {
                return ['event_type'=>$event['event_type'],'previous_status'=>$event['previous_status'],'new_status'=>$event['new_status'],
                    'response'=>$event['response_text'],'occurred_at'=>$event['occurred_at'],'username'=>$event['username'],'role'=>$event['actor_role']];
            },$row['history'] ?? []);
            $record['audit'] = array_map(static function (array $event): array {
                return ['action'=>$event['action'],'occurred_at'=>$event['occurred_at'],'username'=>$event['username'],'role'=>$event['actor_role'],
                    'previous_state'=>$event['previous_state'],'new_state'=>$event['new_state']];
            },$row['audit'] ?? []);
        }
        return $record;
    }

    private static function parseId($value): int
    {
        if (!is_string($value) || !preg_match('/\ATKT-([0-9]{6,12})\z/',$value,$matches) || (int) $matches[1] < 1) { throw new ApiException(400,'Invalid ticket ID'); }
        return (int) $matches[1];
    }

    private static function text(array $body, string $key, int $minimum, int $maximum): string
    {
        $value = $body[$key] ?? null;
        if (!is_string($value)) { throw new ApiException(400,'Invalid ticket ' . $key); }
        $value = trim($value);
        if (strlen($value) < $minimum || strlen($value) > $maximum) { throw new ApiException(400,'Invalid ticket ' . $key); }
        return $value;
    }
}
