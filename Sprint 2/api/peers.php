<?php
declare(strict_types=1);
require_once __DIR__ . '/repository.php';
require_once __DIR__ . '/services/PeerService.php';
run_endpoint(function (): void {
    require_query_keys([]);
    respond_json((new PeerService(new PendingPeerSource()))->dataset());
});
