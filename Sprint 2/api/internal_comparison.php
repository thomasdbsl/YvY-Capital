<?php
declare(strict_types=1);

require_once __DIR__ . '/repository.php';

run_endpoint(function (): void {
    require_query_keys(['period']);
    $period = query_string('period') ?? '12m';
    respond_json(funds_service()->internalComparison($period));
});
