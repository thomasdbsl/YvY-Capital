<?php
declare(strict_types=1);

require_once __DIR__ . '/repository.php';

run_endpoint(function (): void {
    require_query_keys(['severity', 'status','rule_id','run_id','search','fund_id','offset']);
    $severity = query_string('severity');
    $status = query_string('status');
    $allowedSeverities = ['info', 'warning', 'blocking'];
    $allowedStatuses = ['open', 'resolved', 'quarantined'];
    if ($severity !== null && !in_array($severity, $allowedSeverities, true)) {
        throw new ApiException(400, 'Invalid severity');
    }
    if ($status !== null && !in_array($status, $allowedStatuses, true)) {
        throw new ApiException(400, 'Invalid status');
    }
    $filters=[];
    foreach (['rule_id'=>'/\ADQ[0-9]{2}\z/','run_id'=>'/\AS3-[A-F0-9]{20}\z/'] as $key=>$pattern) {
        $value=query_string($key);
        if ($value!==null) {
            if (!preg_match($pattern,$value)) throw new ApiException(400,'Invalid '.$key);
            $filters[$key]=$value;
        }
    }
    $fund=validate_fund_id(query_string('fund_id'));
    if ($fund!==null) { funds_service()->ensureFund($fund); $filters['fund_id']=$fund; }
    $search=query_string('search');
    if ($search!==null) {
        if (strlen($search)>100) throw new ApiException(400,'Search is too long');
        $filters['search']=$search;
    }
    $offset=query_string('offset') ?? '0';
    if (!preg_match('/\A[0-9]{1,6}\z/',$offset)) throw new ApiException(400,'Invalid offset');
    $rows=governance_service()->anomalies($severity,$status,$filters,(int)$offset);
    respond_json(['anomalies'=>array_slice($rows,0,100),'offset'=>(int)$offset,'next_offset'=>count($rows)>100 ? (int)$offset+100:null]);
});
