<?php
declare(strict_types=1);

require_once __DIR__ . '/../repositories/AuthRepository.php';

final class AuthService
{
    private $users;

    public function __construct(AuthRepository $users) { $this->users = $users; }

    public static function startSession(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) { return; }
        ini_set('session.use_strict_mode', '1');
        ini_set('session.use_only_cookies', '1');
        session_name('funds_manager_session');
        $config = api_config();
        $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
            || $config['secure_cookie'];
        session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => $secure, 'httponly' => true, 'samesite' => 'Strict']);
        if (!session_start()) { throw new RuntimeException('Session unavailable'); }
    }

    public static function invalidate(): void
    {
        $_SESSION = [];
        $params = session_get_cookie_params();
        setcookie(session_name(), '', ['expires' => time() - 3600, 'path' => '/', 'secure' => $params['secure'], 'httponly' => true, 'samesite' => 'Strict']);
        session_destroy();
    }

    public static function csrf(): string
    {
        self::startSession();
        if (empty($_SESSION['csrf'])) { $_SESSION['csrf'] = bin2hex(random_bytes(32)); }
        return $_SESSION['csrf'];
    }

    public static function checkCsrf(): void
    {
        self::startSession();
        $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
        if (!is_string($token) || empty($_SESSION['csrf']) || !hash_equals($_SESSION['csrf'], $token)) {
            throw new ApiException(403, 'Invalid CSRF token');
        }
    }

    public function user(?string $role = null): array
    {
        self::startSession();
        if (empty($_SESSION['user_id'])) { throw new ApiException(401, 'Authentication required'); }
        $timeout = api_config()['session_timeout'];
        if (time() - (int) ($_SESSION['last_activity'] ?? 0) >= $timeout
            || time() - (int) ($_SESSION['created_at'] ?? 0) >= 28800) {
            self::invalidate();
            throw new ApiException(401, 'Session expired');
        }
        $user = $this->users->byId((int) $_SESSION['user_id']);
        if ($user === null || !$user['active']
            || !hash_equals((string) ($_SESSION['credential_fingerprint'] ?? ''), hash('sha256', $user['password_hash']))
            || ($_SESSION['authenticated_role'] ?? null) !== $user['role']) {
            self::invalidate();
            throw new ApiException(401, 'Authentication required');
        }
        if ($role !== null && $user['role'] !== $role) { throw new ApiException(403, 'Access forbidden'); }
        $_SESSION['last_activity'] = time();
        return ['user_id' => (int) $user['user_id'], 'username' => $user['username'], 'role' => $user['role']];
    }

    public function login(string $username, string $password): array
    {
        self::checkCsrf();
        if (strlen($username) > 100 || strlen($password) > 1024) { throw new ApiException(400, 'Invalid credentials'); }
        $user = $this->users->byUsername(strtolower(trim($username)));
        // A fixed dummy hash keeps unknown-user verification on the same expensive path.
        $hash = $user['password_hash'] ?? '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.';
        $valid = password_verify($password, $hash);
        if (!$valid || $user === null || !$user['active'] || $user['locked']) {
            if ($user !== null && !$user['locked']) { $this->users->failed((int) $user['user_id']); }
            throw new ApiException(401, 'Invalid username or password');
        }
        $this->users->loginSucceeded($user);
        if (!session_regenerate_id(true)) { throw new RuntimeException('Session unavailable'); }
        $_SESSION = ['user_id' => (int) $user['user_id'], 'created_at' => time(), 'last_activity' => time(),
            'credential_fingerprint' => hash('sha256', $user['password_hash']),
            'authenticated_role' => $user['role'], 'csrf' => bin2hex(random_bytes(32))];
        return $this->user();
    }

    public function logout(): void
    {
        $user = $this->user();
        self::checkCsrf();
        try { $this->users->audit($user, 'LOGOUT', 'session', 'current'); }
        finally { self::invalidate(); }
    }
}
