<?php
declare(strict_types=1);

// MAMP enables zlib output compression in some PHP profiles. A router that
// returns false must not flush an empty compressed body before the static file.
ini_set('zlib.output_compression', '0');

// The local PHP server has the Sprint directory as its document root. Keep
// source data, migrations, tests, and backend implementation files off HTTP.
$path = rawurldecode((string) (parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/'));
$apiEndpoints = [
    'allocation.php', 'anomalies.php', 'auth.php', 'dashboard.php', 'fund.php',
    'funds.php', 'health.php', 'internal_comparison.php', 'kpis.php', 'peers.php',
    'performance.php', 'reconciliation.php', 'review.php', 'risk.php', 'runs.php', 'tickets.php',
];

if ($path === '/') {
    header('Location: /src/app/', true, 302);
    exit;
}

$appAsset = preg_match('#^/src/app/(?:index\.html|(?:js|styles)/[A-Za-z0-9._-]+)$#', $path) === 1;
$apiFile = preg_match('#^/api/([A-Za-z0-9_]+\.php)$#', $path, $matches) === 1
    && in_array($matches[1], $apiEndpoints, true);

if ($path === '/src/app/' || $appAsset || $apiFile) {
    return false;
}

http_response_code(404);
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
if (str_starts_with($path, '/api/')) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => ['message' => 'Not found']], JSON_UNESCAPED_SLASHES);
} else {
    header('Content-Type: text/plain; charset=utf-8');
    echo "Not found\n";
}
