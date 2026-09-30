<?php
declare(strict_types=1);
require_once __DIR__ . '/../../api/bootstrap.php';

$valid = [
    'environment'=>'production', 'db_port'=>3306, 'db_name'=>'release_db',
    'db_user'=>'runtime_service', 'db_password'=>bin2hex(random_bytes(24)),
    'allowed_origins'=>'https://funds.example.org', 'debug'=>false,
    'secure_cookie'=>true, 'session_timeout'=>1800, 'minimum_risk_observations'=>20,
];
validate_release_configuration($valid);
$cases = [
    ['environment'=>'unknown'], ['db_port'=>0], ['db_name'=>'invalid;database'],
    ['session_timeout'=>0], ['minimum_risk_observations'=>1], ['secure_cookie'=>null],
    ['secure_cookie'=>false], ['debug'=>true], ['db_user'=>'root'], ['db_password'=>''],
    ['db_password'=>'CHANGE_ME_LOCAL_ONLY'], ['allowed_origins'=>'http://funds.example.org'],
    ['allowed_origins'=>'https://*.example.org'], ['allowed_origins'=>'https://funds.example.org/path'],
    ['allowed_origins'=>'https://user@funds.example.org'], ['allowed_origins'=>''],
];
foreach ($cases as $patch) {
    $rejected = false;
    try { validate_release_configuration(array_replace($valid, $patch)); }
    catch (RuntimeException $error) { $rejected = true; }
    if (!$rejected) { throw new RuntimeException('Unsafe release configuration accepted'); }
}
validate_release_configuration(array_replace($valid, [
    'environment'=>'local','db_user'=>'root','secure_cookie'=>false,
    'allowed_origins'=>'http://127.0.0.1:4173',
]));
if (application_version() === 'unavailable') { throw new RuntimeException('Release version missing'); }
echo 'Release configuration: valid local/production settings and ' . count($cases) . " refusal cases passed.\n";
