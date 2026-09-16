<?php
declare(strict_types=1);

interface PeerSourceAdapter
{
    public function certificationReference(): ?string;
    public function entities(): array;
    public function returnSeries(): array;
}

final class PendingPeerSource implements PeerSourceAdapter
{
    public function certificationReference(): ?string { return null; }
    public function entities(): array { return []; }
    public function returnSeries(): array { return []; }
}

final class PeerDataset
{
    public static function normalize(array $entities, array $series): array
    {
        $peers=[]; $observations=[];
        foreach ($entities as $entity) {
            if (!is_array($entity) || !is_string($entity['peer_id'] ?? null)
                || !preg_match('/\APEER_[A-Z0-9]{2,24}\z/',$entity['peer_id'])
                || !is_string($entity['category'] ?? null) || !preg_match('/\A[a-z][a-z0-9_-]{1,47}\z/',$entity['category'])
                || isset($peers[$entity['peer_id']])) throw new ApiException(422,'Invalid or ambiguous peer identity');
            $peers[$entity['peer_id']]=['peer_id'=>$entity['peer_id'],'category'=>$entity['category']];
        }
        foreach ($series as $row) {
            if (!is_array($row) || !is_string($row['peer_id'] ?? null) || !isset($peers[$row['peer_id']])
                || !is_string($row['date'] ?? null) || (!is_int($row['index'] ?? null) && !is_float($row['index'] ?? null))
                || !is_finite((float)$row['index']) || $row['index']<=0) throw new ApiException(422,'Invalid peer observation');
            try { validate_iso_date($row['date']); } catch (ApiException $error) { throw new ApiException(422,'Invalid peer date'); }
            $key=$row['peer_id'].'|'.$row['date'];
            if (isset($observations[$key])) throw new ApiException(422,'Duplicate peer observation');
            $observations[$key]=['peer_id'=>$row['peer_id'],'date'=>$row['date'],'index'=>(float)$row['index']];
        }
        ksort($peers); ksort($observations);
        return ['entities'=>array_values($peers),'series'=>array_values($observations)];
    }
}
