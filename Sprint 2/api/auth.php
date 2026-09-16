<?php
declare(strict_types=1);
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/services/AuthService.php';

run_endpoint(function (): void {
    require_query_keys([]);
    AuthService::startSession();
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET') {
        $user = empty($_SESSION['user_id']) ? null : auth_service()->user();
        respond_json(['user' => $user, 'csrf_token' => AuthService::csrf()]);
        return;
    }
    $body = request_body();
    if (array_diff(array_keys($body), ['action', 'username', 'password'])) { throw new ApiException(400, 'Unknown field'); }
    $action = $body['action'] ?? null;
    if ($action === 'login') {
        if (!is_string($body['username'] ?? null) || !is_string($body['password'] ?? null)) { throw new ApiException(400, 'Invalid credentials'); }
        $user = auth_service()->login($body['username'], $body['password']);
        respond_json(['user' => $user, 'csrf_token' => AuthService::csrf()]);
    } elseif ($action === 'logout') {
        auth_service()->logout();
        respond_json(['status' => 'logged-out']);
    } else { throw new ApiException(400, 'Invalid action'); }
}, ['GET', 'POST'], true);
