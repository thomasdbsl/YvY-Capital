<?php
declare(strict_types=1);

final class ApiException extends RuntimeException
{
    private $statusCode;
    private $details;

    public function __construct(int $statusCode, string $message, array $details = [])
    {
        parent::__construct($message);
        $this->statusCode = $statusCode;
        $this->details = $details;
    }

    public function statusCode(): int
    {
        return $this->statusCode;
    }

    public function details(): array
    {
        return $this->details;
    }
}

function env_value(string $name, $default)
{
    $value = getenv($name);
    return $value === false || $value === '' ? $default : $value;
}

function api_config(): array
{
    static $config;
    if (is_array($config)) {
        return $config;
    }

    $minimumRiskObservations = filter_var(
        env_value('FUNDS_MANAGER_MIN_RISK_OBSERVATIONS', '20'),
        FILTER_VALIDATE_INT,
        ['options' => ['min_range' => 2, 'max_range' => 252]]
    );
    if ($minimumRiskObservations === false) {
        throw new RuntimeException('FUNDS_MANAGER_MIN_RISK_OBSERVATIONS must be an integer from 2 to 252');
    }

    $candidate = [
        'environment' => env_value('FUNDS_MANAGER_ENV', 'local'),
        'db_host' => env_value('FUNDS_MANAGER_DB_HOST', '127.0.0.1'),
        'db_port' => (int) env_value('FUNDS_MANAGER_DB_PORT', '3306'),
        'db_name' => env_value('FUNDS_MANAGER_DB_NAME', 'yvy_funds_manager'),
        'db_user' => env_value('FUNDS_MANAGER_DB_USER', 'root'),
        'db_password' => env_value('FUNDS_MANAGER_DB_PASSWORD', ''),
        'allowed_origins' => env_value('FUNDS_MANAGER_ALLOWED_ORIGINS', 'http://127.0.0.1:4173,http://localhost:4173'),
        'debug' => filter_var(env_value('FUNDS_MANAGER_DEBUG', '0'), FILTER_VALIDATE_BOOLEAN),
        'minimum_risk_observations' => $minimumRiskObservations,
        'secure_cookie' => filter_var(env_value('FUNDS_MANAGER_SECURE_COOKIE', '0'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE),
        'session_timeout' => (int) env_value('FUNDS_MANAGER_SESSION_TIMEOUT', '1800'),
    ];

    $localConfig = __DIR__ . DIRECTORY_SEPARATOR . 'config.php';
    if (is_file($localConfig)) {
        $overrides = require $localConfig;
        if (!is_array($overrides)) {
            throw new RuntimeException('api/config.php must return an array');
        }
        $candidate = array_replace($candidate, $overrides);
    }
    validate_release_configuration($candidate);
    $config = $candidate;
    return $config;
}

function validate_release_configuration(array $config): void
{
    if (!in_array($config['environment'], ['local','test','production'], true)
        || $config['db_port'] < 1 || $config['db_port'] > 65535
        || !preg_match('/\A[A-Za-z0-9_]+\z/', $config['db_name'])
        || $config['session_timeout'] < 1 || $config['session_timeout'] > 28800
        || $config['minimum_risk_observations'] < 2 || $config['minimum_risk_observations'] > 252
        || !is_bool($config['secure_cookie'])) {
        throw new RuntimeException('Invalid application configuration');
    }
    if ($config['environment'] !== 'production') { return; }
    if ($config['debug'] || !$config['secure_cookie']
        || strtolower((string) $config['db_user']) === 'root'
        || $config['db_password'] === '' || stripos((string) $config['db_password'], 'CHANGE_ME') !== false) {
        throw new RuntimeException('Unsafe production configuration');
    }
    $origins = array_filter(array_map('trim', explode(',', (string) $config['allowed_origins'])));
    if (!$origins) { throw new RuntimeException('Production HTTPS origin required'); }
    foreach ($origins as $origin) {
        $parts = parse_url($origin);
        if ($parts === false || ($parts['scheme'] ?? '') !== 'https' || empty($parts['host'])
            || isset($parts['user']) || isset($parts['pass']) || isset($parts['path'])
            || isset($parts['query']) || isset($parts['fragment']) || strpos($origin, '*') !== false) {
            throw new RuntimeException('Production requires exact HTTPS origins');
        }
    }
}

function application_version(): string
{
    $path = dirname(__DIR__, 2) . '/package.json';
    $metadata = is_file($path) ? json_decode((string) file_get_contents($path), true) : null;
    $version = $metadata['version'] ?? '';
    return is_string($version) && preg_match('/\A[0-9]+\.[0-9]+\.[0-9]+(?:-[A-Za-z0-9.-]+)?\z/', $version)
        ? $version : 'unavailable';
}

function database(): PDO
{
    static $pdo;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $config = api_config();
    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
        $config['db_host'],
        $config['db_port'],
        $config['db_name']
    );
    $pdo = new PDO($dsn, $config['db_user'], $config['db_password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::ATTR_STRINGIFY_FETCHES => false,
    ]);
    $pdo->exec("SET time_zone = '+00:00'");
    return $pdo;
}

function respond_json(array $payload, int $statusCode = 200): void
{
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRESERVE_ZERO_FRACTION);
}

function apply_cors(): void
{
    $origin = isset($_SERVER['HTTP_ORIGIN']) ? (string) $_SERVER['HTTP_ORIGIN'] : '';
    if ($origin === '') {
        return;
    }

    $allowed = array_filter(array_map('trim', explode(',', (string) api_config()['allowed_origins'])));
    if (!in_array($origin, $allowed, true)) {
        throw new ApiException(403, 'Origin is not allowed');
    }

    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');
    header('Vary: Origin');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Accept, Content-Type, X-CSRF-Token');
}

function require_get_method(): void
{
    $method = isset($_SERVER['REQUEST_METHOD']) ? strtoupper((string) $_SERVER['REQUEST_METHOD']) : 'GET';
    if ($method !== 'GET') {
        header('Allow: GET, OPTIONS');
        throw new ApiException(405, 'Only GET is allowed');
    }
}

function require_query_keys(array $allowed): void
{
    $unknown = array_values(array_diff(array_keys($_GET), $allowed));
    if ($unknown) {
        throw new ApiException(400, 'Unknown query parameter', ['parameters' => $unknown]);
    }
}

function query_string(string $name, bool $required = false): ?string
{
    if (!array_key_exists($name, $_GET) || $_GET[$name] === '') {
        if ($required) {
            throw new ApiException(400, 'Missing query parameter: ' . $name);
        }
        return null;
    }
    if (!is_string($_GET[$name])) {
        throw new ApiException(400, 'Invalid query parameter: ' . $name);
    }
    return trim($_GET[$name]);
}

function validate_fund_id(?string $fundId, bool $required = false): ?string
{
    if ($fundId === null || $fundId === '') {
        if ($required) {
            throw new ApiException(400, 'Missing query parameter: fund_id');
        }
        return null;
    }
    if (!preg_match('/\AFUND_[0-9]{2}\z/', $fundId)) {
        throw new ApiException(400, 'Invalid fund_id format');
    }
    return $fundId;
}

function validate_iso_date(?string $value): ?string
{
    if ($value === null || $value === '') {
        return null;
    }
    $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value);
    $errors = DateTimeImmutable::getLastErrors();
    if ($date === false || ($errors !== false && ($errors['warning_count'] > 0 || $errors['error_count'] > 0)) || $date->format('Y-m-d') !== $value) {
        throw new ApiException(400, 'Invalid date; expected YYYY-MM-DD');
    }
    return $value;
}

function auth_service(): AuthService
{
    require_once __DIR__ . '/services/AuthService.php';
    return new AuthService(new AuthRepository(database()));
}

function request_body(): array
{
    if (stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== 0) {
        throw new ApiException(415, 'Expected application/json');
    }
    $body = file_get_contents('php://input', false, null, 0, 8193);
    if ($body === false || strlen($body) > 8192) { throw new ApiException(413, 'Request too large'); }
    $decoded = json_decode($body, true);
    if (!is_array($decoded) || json_last_error() !== JSON_ERROR_NONE) { throw new ApiException(400, 'Invalid JSON'); }
    return $decoded;
}

function run_endpoint(callable $handler, array $methods = ['GET'], bool $public = false): void
{
    try {
        apply_cors();
        $method = isset($_SERVER['REQUEST_METHOD']) ? strtoupper((string) $_SERVER['REQUEST_METHOD']) : 'GET';
        if ($method === 'OPTIONS') {
            http_response_code(204);
            return;
        }
        header('X-Content-Type-Options: nosniff');
        header('Referrer-Policy: no-referrer');
        if (!in_array($method, $methods, true)) {
            header('Allow: ' . implode(', ', $methods));
            throw new ApiException(405, 'Method not allowed');
        }
        if (!$public) {
            require_once __DIR__ . '/services/AuthService.php';
            AuthService::startSession();
            if (empty($_SESSION['user_id'])) { throw new ApiException(401, 'Authentication required'); }
            $analyst = ['anomalies.php', 'runs.php', 'health.php', 'audit.php', 'review.php', 'reconciliation.php'];
            auth_service()->user(in_array(basename($_SERVER['SCRIPT_NAME'] ?? ''), $analyst, true) ? 'ANALYST' : null);
            if ($method !== 'GET') { AuthService::checkCsrf(); }
        }
        $handler();
    } catch (ApiException $exception) {
        $error = ['error' => ['message' => $exception->getMessage()]];
        if ($exception->details()) {
            $error['error']['details'] = $exception->details();
        }
        respond_json($error, $exception->statusCode());
    } catch (PDOException $exception) {
        log_operational_error('DATABASE_UNAVAILABLE', 503);
        $error = ['error' => ['message' => 'Database is unavailable']];
        respond_json($error, 503);
    } catch (Throwable $exception) {
        log_operational_error('UNEXPECTED_API_ERROR', 500);
        $error = ['error' => ['message' => 'Unexpected API error']];
        respond_json($error, 500);
    }
}

function log_operational_error(string $code, int $status): void
{
    // Keep exception messages, request bodies and identifiers out of server logs.
    error_log(json_encode([
        'timestamp' => gmdate('Y-m-d\TH:i:s\Z'),
        'component' => 'api',
        'error_code' => $code,
        'http_status' => $status,
    ], JSON_UNESCAPED_SLASHES));
}
