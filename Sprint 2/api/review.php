<?php
declare(strict_types=1);
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/repositories/ReviewRepository.php';
require_once __DIR__ . '/services/ReviewService.php';

run_endpoint(function (): void {
    $service = new ReviewService(new ReviewRepository(database()));
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        require_query_keys(['issue_id']);
        respond_json($service->detail(query_string('issue_id', true)));
    } else {
        require_query_keys([]);
        respond_json($service->review(auth_service()->user('ANALYST'), request_body()));
    }
}, ['GET','POST']);
