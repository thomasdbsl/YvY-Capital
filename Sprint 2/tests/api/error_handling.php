<?php
declare(strict_types=1);
require_once __DIR__ . '/../../api/bootstrap.php';

ini_set('display_errors', '0');
ini_set('log_errors', '1');
$log = tempnam(sys_get_temp_dir(), 'funds-log-');
if ($log === false) { throw new RuntimeException('Unable to create test log'); }
ini_set('error_log', $log);
$sensitive = 'PRIVATE_SQL_PASSWORD_SOURCE_VALUE';
try {
    foreach ([new PDOException($sensitive), new RuntimeException($sensitive)] as $exception) {
        ob_start();
        run_endpoint(static function () use ($exception): void { throw $exception; }, ['GET'], true);
        $response = (string) ob_get_clean();
        $expected = $exception instanceof PDOException ? 503 : 500;
        if (http_response_code() !== $expected || strpos($response, $sensitive) !== false) {
            throw new RuntimeException('Unsafe API failure response');
        }
        $body = json_decode($response, true, 512, JSON_THROW_ON_ERROR);
        if (!isset($body['error']['message'])) { throw new RuntimeException('Missing generic error'); }
    }
    $contents = (string) file_get_contents($log);
    if (strpos($contents, $sensitive) !== false
        || strpos($contents, 'DATABASE_UNAVAILABLE') === false
        || strpos($contents, 'UNEXPECTED_API_ERROR') === false) {
        throw new RuntimeException('Unsafe or missing operational logging');
    }
    echo "API errors: generic 500/503 responses and safe operational logs passed.\n";
} finally {
    unlink($log);
}
