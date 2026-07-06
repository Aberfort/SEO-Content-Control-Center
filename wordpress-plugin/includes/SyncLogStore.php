<?php
/**
 * Local sync log storage.
 *
 * @package SCCC
 */

declare(strict_types=1);

namespace SCCC\Plugin;

final class SyncLogStore
{
    private const OPTION = 'sccc_sync_log';
    private const MAX_ENTRIES = 10;

    /**
     * @return array<int,array{id:string,status:string,message:string,item_count:int|null,created_at:int}>
     */
    public function all(): array
    {
        $value = get_option(self::OPTION);

        if (! is_array($value)) {
            return [];
        }

        $entries = [];

        foreach ($value as $entry) {
            if (! is_array($entry)) {
                continue;
            }

            $normalized = $this->normalizeEntry($entry);

            if (null !== $normalized) {
                $entries[] = $normalized;
            }
        }

        return $entries;
    }

    public function recordQueued(string $scheduler): void
    {
        $this->add(
            'queued',
            sprintf('Manual sync queued via %s.', $this->sanitizeReason($scheduler)),
            null
        );
    }

    public function recordSuccess(int $itemCount): void
    {
        $this->add(
            'success',
            sprintf('Sync completed and sent %d content item%s.', $itemCount, 1 === $itemCount ? '' : 's'),
            $itemCount
        );
    }

    public function recordFailure(string $reason, ?int $itemCount = null): void
    {
        $this->add(
            'error',
            sprintf('Sync failed: %s.', $this->sanitizeReason($reason)),
            $itemCount
        );
    }

    private function add(string $status, string $message, ?int $itemCount): void
    {
        $entry = [
            'id' => uniqid('sync_', true),
            'status' => $status,
            'message' => $message,
            'item_count' => $itemCount,
            'created_at' => time(),
        ];
        $entries = array_slice(array_merge([$entry], $this->all()), 0, self::MAX_ENTRIES);

        update_option(self::OPTION, $entries, false);
    }

    /**
     * @param array<string,mixed> $entry
     * @return array{id:string,status:string,message:string,item_count:int|null,created_at:int}|null
     */
    private function normalizeEntry(array $entry): ?array
    {
        $status = isset($entry['status']) ? (string) $entry['status'] : '';

        if (! in_array($status, ['queued', 'success', 'error'], true)) {
            return null;
        }

        $message = isset($entry['message']) ? $this->sanitizeReason((string) $entry['message']) : '';

        return [
            'id' => isset($entry['id']) ? $this->sanitizeReason((string) $entry['id']) : uniqid('sync_', true),
            'status' => $status,
            'message' => '' === $message ? 'Sync status updated.' : $message,
            'item_count' => isset($entry['item_count']) && is_numeric($entry['item_count'])
                ? max(0, (int) $entry['item_count'])
                : null,
            'created_at' => isset($entry['created_at']) && is_numeric($entry['created_at'])
                ? max(0, (int) $entry['created_at'])
                : time(),
        ];
    }

    private function sanitizeReason(string $reason): string
    {
        $clean = preg_replace('/https?:\/\/[^\s]+/i', '[redacted-url]', $reason) ?? $reason;
        $clean = preg_replace(
            '/\b(token|secret|signature|authorization)\b\s*[:=]\s*[^\s,;]+/i',
            '$1=[redacted]',
            $clean
        ) ?? $clean;
        $clean = preg_replace('/[^A-Za-z0-9_.:;,\-\s\[\]=]/', '', $clean) ?? $clean;
        $clean = trim($clean);

        if ('' === $clean) {
            return 'unknown_error';
        }

        return substr($clean, 0, 160);
    }
}
