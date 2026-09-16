<?php
declare(strict_types=1);
require_once __DIR__ . '/PeerSourceAdapter.php';

final class PeerService
{
    private $source;
    public function __construct(PeerSourceAdapter $source) { $this->source=$source; }
    public function dataset(): array
    {
        if ($this->source->certificationReference() === null) return [
            'status'=>'unavailable-pending-certification','entities'=>[],'series'=>[],
            'message'=>'Peer benchmarking is pending source certification.',
        ];
        $normalized=PeerDataset::normalize($this->source->entities(),$this->source->returnSeries());
        return ['status'=>$normalized['entities'] && $normalized['series'] ? 'available':'unavailable',
            'entities'=>$normalized['entities'],'series'=>$normalized['series']];
    }

    public function comparison(array $fundSeries, string $peerId): array
    {
        $dataset=$this->dataset();
        if ($dataset['status'] !== 'available') return $dataset + ['peer_id'=>$peerId,'history'=>[]];
        if (!preg_match('/\APEER_[A-Z0-9]{2,24}\z/',$peerId)
            || !in_array($peerId,array_column($dataset['entities'],'peer_id'),true)) {
            throw new ApiException(404,'Peer not found');
        }
        $fund=[];
        foreach ($fundSeries as $row) {
            if (!is_array($row) || !is_string($row['date'] ?? null)
                || (!is_int($row['index'] ?? null) && !is_float($row['index'] ?? null))
                || !is_finite((float)$row['index']) || $row['index']<=0) throw new ApiException(422,'Invalid fund observation');
            try { validate_iso_date($row['date']); } catch (ApiException $error) { throw new ApiException(422,'Invalid fund date'); }
            if (isset($fund[$row['date']])) throw new ApiException(422,'Duplicate fund observation');
            $fund[$row['date']]=(float)$row['index'];
        }
        $peer=[];
        foreach ($dataset['series'] as $row) if ($row['peer_id']===$peerId) $peer[$row['date']]=$row['index'];
        $dates=array_values(array_intersect(array_keys($fund),array_keys($peer)));
        sort($dates);
        if (count($dates)<2) return ['status'=>'unavailable-insufficient-common-history','peer_id'=>$peerId,'history'=>[]];
        $fundBase=$fund[$dates[0]]; $peerBase=$peer[$dates[0]];
        return ['status'=>'available','peer_id'=>$peerId,'window'=>['start'=>$dates[0],'end'=>$dates[count($dates)-1],'observations'=>count($dates)],
            'history'=>array_map(fn($date)=>['date'=>$date,'fund_index'=>$fund[$date]/$fundBase*100,'peer_index'=>$peer[$date]/$peerBase*100],$dates)];
    }
}
