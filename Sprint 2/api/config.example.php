<?php
declare(strict_types=1);

// Copy this file to config.php for local overrides. Never commit config.php.
return [
    'db_host' => '127.0.0.1',
    'db_port' => 3306,
    'db_name' => 'yvy_funds_manager',
    'db_user' => 'root',
    'db_password' => 'replace-with-your-local-password',
    'allowed_origins' => 'http://127.0.0.1:4173,http://localhost:4173',
    'debug' => false,
];
