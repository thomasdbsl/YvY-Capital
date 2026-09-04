<?php
declare(strict_types=1);

require_once __DIR__ . '/repository.php';

run_endpoint(function (): void {
    require_query_keys(['severity', 'status']);
    $severity = query_string('severity');
    $status = query_string('status');
    $allowedSeverities = ['info', 'warning', 'blocking'];
    $allowedStatuses = ['open', 'resolved', 'quarantined'];
    if ($severity !== null && !in_array($severity, $allowedSeverities, true)) {
        throw new ApiException(400, 'Invalid severity');
    }
    if ($status !== null && !in_array($status, $allowedStatuses, true)) {
        throw new ApiException(400, 'Invalid status');
    }
    respond_json(['anomalies' => governance_service()->anomalies($severity, $status)]);
});
