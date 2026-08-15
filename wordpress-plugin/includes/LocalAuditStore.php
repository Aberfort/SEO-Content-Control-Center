<?php
/**
 * Stores the latest local content health audit.
 *
 * @package SCCC
 */

declare(strict_types=1);

namespace SCCC\Plugin;

if (! defined('ABSPATH')) {
    exit;
}

final class LocalAuditStore
{
    private const OPTION = 'sccc_local_audit';
    private const MAX_SYNC_FINDINGS = 32;
    private const SYNC_FINDING_CODES = [
        'published-noindex',
        'seo-title-missing',
        'meta-description-missing',
        'canonical-different',
        'thin-content',
        'internal-links-missing',
        'orphan-content',
        'weakly-linked-content',
        'content-stale',
    ];

    /**
     * @return array<string,mixed>|null
     */
    public function get(): ?array
    {
        $value = get_option(self::OPTION);

        return is_array($value) ? $value : null;
    }

    public function start(): void
    {
        $current = $this->get();

        update_option(
            self::OPTION,
            [
                'status' => 'queued',
                'started_at' => time(),
                'completed_at' => is_array($current) ? ($current['completed_at'] ?? null) : null,
                'error' => null,
                'summary' => is_array($current) && is_array($current['summary'] ?? null) ? $current['summary'] : $this->emptySummary(),
                'items' => is_array($current) && is_array($current['items'] ?? null) ? $current['items'] : [],
                'changes' => is_array($current) && is_array($current['changes'] ?? null) ? $current['changes'] : $this->emptyChanges(),
            ],
            false
        );
    }

    /**
     * @param array<int,array<string,mixed>> $items
     * @param array<string,int> $summary
     */
    public function complete(array $items, array $summary): void
    {
        $current = $this->get();
        $comparison = $this->compareFindings(
            is_array($current) && is_array($current['items'] ?? null) ? $current['items'] : [],
            $items
        );
        $items = $comparison['items'];
        $summary['new_findings'] = $comparison['changes']['new_count'];
        $summary['resolved_findings'] = $comparison['changes']['resolved_count'];
        $summary['unchanged_findings'] = $comparison['changes']['unchanged_count'];

        update_option(
            self::OPTION,
            [
                'status' => 'complete',
                'started_at' => is_array($current) && isset($current['started_at']) ? (int) $current['started_at'] : time(),
                'completed_at' => time(),
                'error' => null,
                'summary' => $summary,
                'items' => $items,
                'changes' => $comparison['changes'],
            ],
            false
        );
    }

    public function fail(string $message): void
    {
        $current = $this->get();

        update_option(
            self::OPTION,
            [
                'status' => 'error',
                'started_at' => is_array($current) && isset($current['started_at']) ? (int) $current['started_at'] : time(),
                'completed_at' => time(),
                'error' => $this->sanitizeError($message),
                'summary' => $this->emptySummary(),
                'items' => [],
                'changes' => $this->emptyChanges(),
            ],
            false
        );
    }

    public function setIgnored(string $fingerprint, bool $ignored): void
    {
        $audit = $this->get();

        if (! is_array($audit) || ! isset($audit['items']) || ! is_array($audit['items'])) {
            return;
        }

        foreach ($audit['items'] as &$item) {
            if (! is_array($item) || ! isset($item['findings']) || ! is_array($item['findings'])) {
                continue;
            }

            foreach ($item['findings'] as &$finding) {
                if (is_array($finding) && $fingerprint === ($finding['fingerprint'] ?? null)) {
                    $finding['ignored'] = $ignored;

                    if ($ignored) {
                        if ('ignored' !== ($finding['change'] ?? null)) {
                            $finding['previous_change'] = in_array($finding['change'] ?? null, ['new', 'unchanged'], true)
                                ? $finding['change']
                                : 'unchanged';
                        }

                        $finding['change'] = 'ignored';
                    } else {
                        $finding['change'] = in_array($finding['previous_change'] ?? null, ['new', 'unchanged'], true)
                            ? $finding['previous_change']
                            : 'unchanged';
                        unset($finding['previous_change']);
                    }
                }
            }
            unset($finding);
        }
        unset($item);

        $summary = (new LocalAuditEngine())->summarize($audit['items']);
        $changes = is_array($audit['changes'] ?? null) ? $audit['changes'] : $this->emptyChanges();
        $summary['new_findings'] = $this->countChange($audit['items'], 'new');
        $summary['resolved_findings'] = (int) ($changes['resolved_count'] ?? 0);
        $summary['unchanged_findings'] = $this->countChange($audit['items'], 'unchanged');
        $audit['summary'] = $summary;
        $changes['new_count'] = $summary['new_findings'];
        $changes['unchanged_count'] = $summary['unchanged_findings'];
        $audit['changes'] = $changes;

        update_option(self::OPTION, $audit, false);
    }

    /**
     * Returns only active findings from a completed audit, keyed by content external ID.
     * A null result means there is no complete snapshot and existing SaaS evidence must
     * not be replaced. Empty finding arrays intentionally clear resolved evidence.
     *
     * @return array<string,array<int,array{code:string,label:string,severity:string,evidence:string,fingerprint:string}>>|null
     */
    public function findingsForSync(): ?array
    {
        $audit = $this->get();

        if (! is_array($audit) || 'complete' !== ($audit['status'] ?? null) || ! is_array($audit['items'] ?? null)) {
            return null;
        }

        $byExternalId = [];

        foreach ($audit['items'] as $item) {
            if (! is_array($item)) {
                continue;
            }

            $externalId = substr(trim((string) ($item['external_id'] ?? '')), 0, 191);

            if ('' === $externalId) {
                continue;
            }

            $byExternalId[$externalId] = [];
            $findings = is_array($item['findings'] ?? null) ? $item['findings'] : [];

            foreach ($findings as $finding) {
                if (! is_array($finding) || true === ($finding['ignored'] ?? false)) {
                    continue;
                }

                $code = (string) ($finding['code'] ?? '');
                $severity = (string) ($finding['severity'] ?? '');
                $fingerprint = (string) ($finding['fingerprint'] ?? LocalAuditSettings::fingerprint($externalId, $code));

                if (
                    ! in_array($code, self::SYNC_FINDING_CODES, true)
                    || ! in_array($severity, ['critical', 'warning', 'opportunity', 'maintenance'], true)
                    || 1 !== preg_match('/^[a-f0-9]{64}$/', $fingerprint)
                ) {
                    continue;
                }

                $label = substr(trim((string) ($finding['label'] ?? '')), 0, 160);
                $evidence = substr(trim((string) ($finding['evidence'] ?? '')), 0, 1024);

                if ('' === $label || '' === $evidence) {
                    continue;
                }

                $byExternalId[$externalId][] = compact('code', 'label', 'severity', 'evidence', 'fingerprint');

                if (self::MAX_SYNC_FINDINGS === count($byExternalId[$externalId])) {
                    break;
                }
            }
        }

        return $byExternalId;
    }

    /**
     * @return array{total_urls:int,affected_urls:int,issue_count:int,ignored_findings:int,critical:int,attention:int,opportunity:int,maintenance:int,complete:int,new_findings:int,resolved_findings:int,unchanged_findings:int}
     */
    private function emptySummary(): array
    {
        return [
            'total_urls' => 0,
            'affected_urls' => 0,
            'issue_count' => 0,
            'ignored_findings' => 0,
            'critical' => 0,
            'attention' => 0,
            'opportunity' => 0,
            'maintenance' => 0,
            'complete' => 0,
            'new_findings' => 0,
            'resolved_findings' => 0,
            'unchanged_findings' => 0,
        ];
    }

    /**
     * @param array<int,mixed> $previousItems
     * @param array<int,array<string,mixed>> $items
     * @return array{items:array<int,array<string,mixed>>,changes:array{new_count:int,resolved_count:int,unchanged_count:int,resolved:array<int,array<string,string>>}}
     */
    private function compareFindings(array $previousItems, array $items): array
    {
        $previous = $this->findingMap($previousItems);
        $current = [];
        $newCount = 0;
        $unchangedCount = 0;

        foreach ($items as &$item) {
            $externalId = (string) ($item['external_id'] ?? '');
            $findings = isset($item['findings']) && is_array($item['findings']) ? $item['findings'] : [];

            foreach ($findings as &$finding) {
                $code = (string) ($finding['code'] ?? '');
                $fingerprint = LocalAuditSettings::fingerprint($externalId, $code);
                $finding['fingerprint'] = $fingerprint;

                if (true === ($finding['ignored'] ?? false)) {
                    $finding['change'] = 'ignored';
                    continue;
                }

                $current[$fingerprint] = true;
                $finding['change'] = isset($previous[$fingerprint]) ? 'unchanged' : 'new';

                if ('new' === $finding['change']) {
                    $newCount++;
                } else {
                    $unchangedCount++;
                }
            }
            unset($finding);

            $item['findings'] = $findings;
        }
        unset($item);

        $resolved = [];

        foreach ($previous as $fingerprint => $finding) {
            if (! isset($current[$fingerprint])) {
                $resolved[] = [
                    'fingerprint' => $fingerprint,
                    'title' => (string) ($finding['title'] ?? ''),
                    'label' => (string) ($finding['label'] ?? ''),
                    'url' => (string) ($finding['url'] ?? ''),
                ];
            }
        }

        return [
            'items' => $items,
            'changes' => [
                'new_count' => $newCount,
                'resolved_count' => count($resolved),
                'unchanged_count' => $unchangedCount,
                'resolved' => array_slice($resolved, 0, 100),
            ],
        ];
    }

    /**
     * @param array<int,mixed> $items
     * @return array<string,array<string,mixed>>
     */
    private function findingMap(array $items): array
    {
        $map = [];

        foreach ($items as $item) {
            if (! is_array($item) || ! isset($item['findings']) || ! is_array($item['findings'])) {
                continue;
            }

            $externalId = (string) ($item['external_id'] ?? '');

            foreach ($item['findings'] as $finding) {
                if (! is_array($finding) || true === ($finding['ignored'] ?? false)) {
                    continue;
                }

                $fingerprint = LocalAuditSettings::fingerprint($externalId, (string) ($finding['code'] ?? ''));
                $map[$fingerprint] = array_merge($finding, [
                    'title' => (string) ($item['title'] ?? ''),
                    'url' => (string) ($item['url'] ?? ''),
                ]);
            }
        }

        return $map;
    }

    /**
     * @return array{new_count:int,resolved_count:int,unchanged_count:int,resolved:array<int,array<string,string>>}
     */
    private function emptyChanges(): array
    {
        return [
            'new_count' => 0,
            'resolved_count' => 0,
            'unchanged_count' => 0,
            'resolved' => [],
        ];
    }

    /**
     * @param array<int,mixed> $items
     */
    private function countChange(array $items, string $change): int
    {
        $count = 0;

        foreach ($items as $item) {
            if (! is_array($item) || ! isset($item['findings']) || ! is_array($item['findings'])) {
                continue;
            }

            foreach ($item['findings'] as $finding) {
                if (is_array($finding) && $change === ($finding['change'] ?? null) && true !== ($finding['ignored'] ?? false)) {
                    $count++;
                }
            }
        }

        return $count;
    }

    private function sanitizeError(string $message): string
    {
        $clean = preg_replace('/https?:\/\/[^\s]+/i', '[redacted-url]', $message) ?? $message;
        $clean = preg_replace('/[^A-Za-z0-9_.:,;\-\s\[\]]/', '', $clean) ?? $clean;
        $clean = trim($clean);

        return substr('' === $clean ? 'local_audit_failed' : $clean, 0, 160);
    }
}
