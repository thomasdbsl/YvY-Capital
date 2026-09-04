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

    $config = [
        'db_host' => env_value('FUNDS_MANAGER_DB_HOST', '127.0.0.1'),
        'db_port' => (int) env_value('FUNDS_MANAGER_DB_PORT', '3306'),
        'db_name' => env_value('FUNDS_MANAGER_DB_NAME', 'yvy_funds_manager'),
        'db_user' => env_value('FUNDS_MANAGER_DB_USER', 'root'),
        'db_password' => env_value('FUNDS_MANAGER_DB_PASSWORD', ''),
        'allowed_origins' => env_value('FUNDS_MANAGER_ALLOWED_ORIGINS', 'http://127.0.0.1:4173,http://localhost:4173'),
        'debug' => filter_var(env_value('FUNDS_MANAGER_DEBUG', '0'), FILTER_VALIDATE_BOOLEAN),
    ];

    $localConfig = __DIR__ . DIRECTORY_SEPARATOR . 'config.php';
    if (is_file($localConfig)) {
        $overrides = require $localConfig;
        if (!is_array($overrides)) {
            throw new RuntimeException('api/config.php must return an array');
        }
        $config = array_replace($config, $overrides);
    }

    return $config;
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
    if (!in_array('*', $allowed, true) && !in_array($origin, $allowed, true)) {
        throw new ApiException(403, 'Origin is not allowed');
    }

    header('Access-Control-Allow-Origin: ' . ($allowed === ['*'] ? '*' : $origin));
    header('Vary: Origin');
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    header('Access-Control-Allow-Headers: Accept, Content-Type');
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

function run_endpoint(callable $handler): void
{
    try {
        apply_cors();
        $method = isset($_SERVER['REQUEST_METHOD']) ? strtoupper((string) $_SERVER['REQUEST_METHOD']) : 'GET';
        if ($method === 'OPTIONS') {
            http_response_code(204);
            return;
        }
        require_get_method();
        $handler();
    } catch (ApiException $exception) {
        $error = ['error' => ['message' => $exception->getMessage()]];
        if ($exception->details()) {
            $error['error']['details'] = $exception->details();
        }
        respond_json($error, $exception->statusCode());
    } catch (PDOException $exception) {
        $error = ['error' => ['message' => 'Database is unavailable']];
        if (api_config()['debug']) {
            $error['error']['debug'] = $exception->getMessage();
        }
        respond_json($error, 503);
    } catch (Throwable $exception) {
        $error = ['error' => ['message' => 'Unexpected API error']];
        if (api_config()['debug']) {
            $error['error']['debug'] = $exception->getMessage();
        }
        respond_json($error, 500);
    }
}
