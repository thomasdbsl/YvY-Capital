<?php
declare(strict_types=1);

final class StressParser
{
    private static function number($value): ?float
    {
        if (is_float($value) || is_int($value)) {
            return is_finite((float) $value) ? (float) $value : null;
        }
        // The validated source serializes nav_diff/nav_percent as canonical
        // decimal strings. Reject locale formats, exponents, and free text.
        if (!is_string($value) || strlen($value) > 64
            || !preg_match('/\A-?(?:0|[1-9]\d*)(?:\.\d+)?\z/', $value)) {
            return null;
        }
        $number = (float) $value;
        return is_finite($number) ? $number : null;
    }

    private static function alias($id): ?string
    {
        if ((!is_string($id) && !is_int($id)) || (string)$id === '') return null;
        return 'SCN-' . substr(hash('sha256',(string)$id),0,12);
    }

    public static function parse(?array $row): array
    {
        $output=['status'=>'unavailable','date'=>$row['business_date'] ?? null,'run_id'=>$row['last_run_id'] ?? null,
            'scenarios'=>[], 'unit'=>'Source nav_diff and nav_percent; scale and currency pending validation'];
        if (!$row || !$row['success']) return $output;
        $decoded=json_decode($row['result_json_restricted'] ?? '',true,64);
        if (!is_array($decoded) || json_last_error() !== JSON_ERROR_NONE) return $output;
        $seen=[];
        foreach ($decoded as $entry) {
            if (!is_array($entry) || !is_array($entry['total'] ?? null) || !is_array($entry['sm_names'] ?? null)) continue;
            $names=[];
            foreach ($entry['sm_names'] as $name) {
                if (is_array($name)) {
                    $alias=self::alias($name['id'] ?? null);
                    if ($alias !== null) $names[$alias]=true;
                }
            }
            foreach ($entry['total'] as $total) {
                if (!is_array($total)) continue;
                $alias=self::alias($total['mask_id'] ?? null);
                if ($alias === null || !isset($names[$alias]) || isset($seen[$alias])) continue;
                $impact=self::number($total['nav_diff'] ?? null);
                $percent=self::number($total['nav_percent'] ?? null);
                if ($impact === null && $percent === null) continue;
                $groups=[];
                foreach (is_array($entry['instruments_risk'] ?? null) ? $entry['instruments_risk'] : [] as $group) {
                    if (!is_array($group) || !is_string($group['group_name'] ?? null) || !is_array($group['total'] ?? null)) continue;
                    foreach ($group['total'] as $value) {
                        if (!is_array($value) || self::alias($value['mask_id'] ?? null) !== $alias) continue;
                        $groups[]=['group'=>'GRP-'.substr(hash('sha256',$group['group_name']),0,12),
                            'nav_diff'=>self::number($value['nav_diff'] ?? null),'nav_percent'=>self::number($value['nav_percent'] ?? null)];
                    }
                }
                $seen[$alias]=true;
                $output['scenarios'][]=['id'=>$alias,'nav_diff'=>$impact,'nav_percent'=>$percent,'groups'=>$groups];
            }
        }
        if ($output['scenarios']) $output['status']='available';
        return $output;
    }
}
