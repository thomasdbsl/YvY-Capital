<?php
declare(strict_types=1);

final class AuthRepository
{
    private $db;

    public function __construct(PDO $db) { $this->db = $db; }

    public function byUsername(string $username): ?array
    {
        $query = $this->db->prepare('SELECT *, locked_until > UTC_TIMESTAMP() AS locked FROM app_users WHERE username = ?');
        $query->execute([$username]);
        return $query->fetch() ?: null;
    }

    public function byId(int $id): ?array
    {
        $query = $this->db->prepare('SELECT user_id, username, role, active, password_hash FROM app_users WHERE user_id = ?');
        $query->execute([$id]);
        return $query->fetch() ?: null;
    }

    public function failed(int $id): void
    {
        $query = $this->db->prepare('UPDATE app_users SET failed_attempts = failed_attempts + 1, locked_until = IF(failed_attempts >= 5, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 5 MINUTE), locked_until) WHERE user_id = ?');
        $query->execute([$id]);
    }

    public function loginSucceeded(array $user): void
    {
        $this->db->beginTransaction();
        try {
            $query = $this->db->prepare('UPDATE app_users SET failed_attempts = 0, locked_until = NULL WHERE user_id = ?');
            $query->execute([$user['user_id']]);
            $this->audit($user, 'LOGIN_SUCCESS', 'session', 'current');
            $this->db->commit();
        } catch (Throwable $error) {
            $this->db->rollBack();
            throw $error;
        }
    }

    public function audit(array $user, string $action, string $type, string $id, ?array $before = null, ?array $after = null): void
    {
        $query = $this->db->prepare('INSERT INTO audit_events (user_id,actor_role,action,target_type,target_id,previous_state,new_state) VALUES (?,?,?,?,?,?,?)');
        $query->execute([$user['user_id'], $user['role'], $action, $type, $id,
            $before === null ? null : json_encode($before, JSON_THROW_ON_ERROR),
            $after === null ? null : json_encode($after, JSON_THROW_ON_ERROR)]);
    }

    public function provision(string $username, string $hash, string $role): void
    {
        $query = $this->db->prepare('INSERT INTO app_users (username,password_hash,role) VALUES (?,?,?) ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = VALUES(role), active = TRUE, failed_attempts = 0, locked_until = NULL');
        $query->execute([$username, $hash, $role]);
    }

    public function disable(string $username): void
    {
        $query = $this->db->prepare('UPDATE app_users SET active = FALSE WHERE username = ?');
        $query->execute([$username]);
        if ($this->byUsername($username) === null) { throw new RuntimeException('Unknown user'); }
    }
}
