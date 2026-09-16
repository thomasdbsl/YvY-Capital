<?php
declare(strict_types=1);

final class ReviewService
{
    private $reviews;
    public function __construct(ReviewRepository $reviews) { $this->reviews = $reviews; }

    private function id($id): string
    {
        if (!is_string($id) || !preg_match('/\A[a-f0-9]{64}\z/i', $id)) { throw new ApiException(400, 'Invalid issue ID'); }
        return $id;
    }

    public function detail($id): array
    {
        $id = $this->id($id);
        $issue = $this->reviews->detail($id);
        if ($issue === null) { throw new ApiException(404, 'Issue not found'); }
        return ['issue' => $issue, 'history' => $this->reviews->history($id)];
    }

    public function review(array $actor, array $body): array
    {
        if ($actor['role'] !== 'ANALYST') { throw new ApiException(403, 'Access forbidden'); }
        if (array_diff(array_keys($body), ['issue_id','status','note','revision','context'])) { throw new ApiException(400, 'Unknown field'); }
        $id = $this->id($body['issue_id'] ?? null);
        $status = $body['status'] ?? null;
        $note = $body['note'] ?? '';
        $context = $body['context'] ?? 'quality';
        if (!in_array($status,['open','resolved','quarantined'],true) || !is_string($note)
            || !in_array($context, ['quality','reconciliation'], true)
            || strlen($note) > 1000 || !is_int($body['revision'] ?? null) || $body['revision'] < 0) {
            throw new ApiException(400, 'Invalid review');
        }
        if (preg_match('/[\x00-\x08\x0b\x0c\x0e-\x1f]|\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b|\b[A-Z]{2}[A-Z0-9]{9}[0-9]\b/', $note)) {
            throw new ApiException(400, 'Do not include private identifiers in notes');
        }
        $this->reviews->review($actor,$id,$status,trim($note),$body['revision'],$context);
        return $this->detail($id);
    }
}
