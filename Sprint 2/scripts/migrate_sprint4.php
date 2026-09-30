<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once __DIR__ . '/../api/bootstrap.php';
try {
    $db = database();
    $db->exec(file_get_contents(__DIR__ . '/../database/migrations/004_auth.sql'));
    $db->exec(file_get_contents(__DIR__ . '/../database/migrations/005_reviews.sql'));
    $db->exec(file_get_contents(__DIR__ . '/../database/migrations/006_reconciliation.sql'));
    $db->exec(file_get_contents(__DIR__ . '/../database/migrations/007_collation_hardening.sql'));
    $db->exec(file_get_contents(__DIR__ . '/../database/migrations/008_tickets.sql'));
    $db->exec(file_get_contents(__DIR__ . '/../database/migrations/009_pipeline_attempts.sql'));
    echo "Application migrations applied. Business tables preserved.\n";
} catch (Throwable $error) {
    fwrite(STDERR, "Migration failed. Verify local MySQL configuration.\n");
    exit(1);
}
