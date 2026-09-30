<?php
declare(strict_types=1);
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/repositories/TicketRepository.php';
require_once __DIR__ . '/services/TicketService.php';

run_endpoint(function (): void {
    $actor = auth_service()->user();
    $service = new TicketService(new TicketRepository(database()));
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        require_query_keys(['ticket_id','status','category','priority','fund_id']);
        $ticketId = query_string('ticket_id');
        if ($ticketId !== null) { respond_json($service->detail($actor,$ticketId)); }
        else {
            $filters = array_filter([
                'status'=>query_string('status'),'category'=>query_string('category'),'priority'=>query_string('priority'),'fund_id'=>query_string('fund_id'),
            ],static function ($value): bool { return $value !== null; });
            respond_json($service->listing($actor,$filters));
        }
        return;
    }
    require_query_keys([]);
    $body = request_body();
    $action = $body['action'] ?? null;
    if ($action === 'create') { respond_json($service->create($actor,$body),201); }
    elseif ($action === 'update') { respond_json($service->update($actor,$body)); }
    else { throw new ApiException(400,'Invalid ticket action'); }
},['GET','POST']);
