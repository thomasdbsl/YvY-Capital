<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once __DIR__ . '/../api/bootstrap.php';
require_once __DIR__ . '/../api/repositories/AuthRepository.php';
try {
    $username = strtolower((string) getenv('FUNDS_MANAGER_PROVISION_USERNAME'));
    $password = (string) getenv('FUNDS_MANAGER_PROVISION_PASSWORD');
    $role = (string) getenv('FUNDS_MANAGER_PROVISION_ROLE');
    $action = getenv('FUNDS_MANAGER_PROVISION_ACTION') ?: 'provision';
    if ($action === 'disable') {
        if (!preg_match('/\A[a-z0-9][a-z0-9._@-]{2,99}\z/', $username)) { throw new RuntimeException('Invalid username'); }
        (new AuthRepository(database()))->disable($username);
        echo "Local account disabled.\n";
        exit(0);
    }
    if ($action !== 'provision') { throw new RuntimeException('Invalid action'); }
    if (!preg_match('/\A[a-z0-9][a-z0-9._@-]{2,99}\z/', $username)
        || strlen($password) < 12 || strlen($password) > 72
        || !in_array($role, ['EXECUTIVE', 'ANALYST'], true)) {
        throw new RuntimeException('Invalid provisioning input');
    }
    (new AuthRepository(database()))->provision($username, password_hash($password, PASSWORD_DEFAULT), $role);
    echo "Local account provisioned.\n";
} catch (Throwable $error) {
    fwrite(STDERR, "Provisioning failed. Supply username, a 12-72 byte password, and EXECUTIVE or ANALYST role through environment variables; verify the migration and MySQL configuration.\n");
    exit(1);
}
