<?php
declare(strict_types=1);
require_once __DIR__ . '/repository.php';
require_once __DIR__ . '/repositories/ReconciliationRepository.php';
require_once __DIR__ . '/services/ReconciliationService.php';
run_endpoint(function (): void {
    require_query_keys(['fund_id','date','severity','result','status','run_id','offset']);
    $filters=[];
    $fund=validate_fund_id(query_string('fund_id'));
    if ($fund!==null) { funds_service()->ensureFund($fund); $filters['fund_code']=$fund; }
    $date=validate_iso_date(query_string('date'));
    if ($date!==null) $filters['snapshot_date']=$date;
    foreach (['severity'=>['info','warning','blocking'],'result'=>['pass','fail','unavailable'],'status'=>['open','resolved','quarantined','not-required']] as $key=>$allowed) {
        $value=query_string($key);
        if ($value!==null) {
            if (!in_array($value,$allowed,true)) throw new ApiException(400,'Invalid '.$key);
            $filters[$key==='result' ? 'rule_status':$key]=$value;
        }
    }
    $run=query_string('run_id');
    if ($run!==null && !preg_match('/\AS3-[A-F0-9]{20}\z/',$run)) throw new ApiException(400,'Invalid run ID');
    $filters['run_id']=$run ?? governance_service()->latestRun()['run_id'];
    $offset=query_string('offset') ?? '0';
    if (!preg_match('/\A[0-9]{1,6}\z/',$offset)) throw new ApiException(400,'Invalid offset');
    respond_json((new ReconciliationService(new ReconciliationRepository(database())))->listing($filters,(int)$offset));
});
