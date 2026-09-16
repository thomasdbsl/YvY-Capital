<?php
declare(strict_types=1);

final class ReconciliationService
{
    private $repository;
    public function __construct(ReconciliationRepository $repository) { $this->repository=$repository; }
    public function listing(array $filters,int $offset): array
    {
        $rows=$this->repository->rows($filters,$offset);
        $more=count($rows)>100;
        $rows=array_slice($rows,0,100);
        foreach ($rows as &$row) {
            foreach (['expected_nav','holdings_total','difference_value','difference_fraction'] as $key) {
                $row[$key]=$row[$key]===null ? null:(float)$row[$key];
            }
        }
        unset($row);
        return ['records'=>$rows,'offset'=>$offset,'next_offset'=>$more ? $offset+100:null,
            'basis'=>'Persisted ingestion control after individual-row validation, before snapshot quarantine. Tolerance: 1%. Review does not change this result.'];
    }
}
