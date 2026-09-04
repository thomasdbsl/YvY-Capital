<?php
declare(strict_types=1);

require_once __DIR__ . '/repository.php';

run_endpoint(function (): void {
    require_query_keys([]);
    respond_json(['funds' => funds_service()->funds()]);
});
