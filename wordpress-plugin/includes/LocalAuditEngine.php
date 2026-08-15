<?php
/**
 * Deterministic local content health checks.
 *
 * @package SCCC
 */

declare(strict_types=1);

namespace SCCC\Plugin;

if (! defined('ABSPATH')) {
    exit;
}

final class LocalAuditEngine
{
    private const THIN_CONTENT_WORDS = 300;
    private const STALE_CONTENT_DAYS = 180;
    private const SECONDS_PER_DAY = 86400;

    /**
     * @param array{externalId:string,type:string,url:string,title:string|null,status:string,modifiedAt:string,metadata:array<string,mixed>} $item
     * @return array<int,array{code:string,label:string,severity:string,evidence:string}>
     */
    public function inspect(array $item, ?int $referenceTimestamp = null): array
    {
        if ('publish' !== strtolower($item['status'])) {
            return [];
        }

        $metadata = $item['metadata'];
        $findings = [];

        if (true === ($metadata['robotsNoindex'] ?? false)) {
            $findings[] = $this->finding(
                'published-noindex',
                'Published content is noindex',
                'critical',
                'WordPress reports this URL as published while its SEO metadata contains a noindex directive.'
            );
        }

        if (! $this->hasText($metadata['seoTitle'] ?? null)) {
            $findings[] = $this->finding(
                'seo-title-missing',
                'Missing SEO title',
                'warning',
                'No SEO title was detected in supported SEO metadata or the WordPress fallback.'
            );
        }

        if (! $this->hasText($metadata['metaDescription'] ?? null)) {
            $findings[] = $this->finding(
                'meta-description-missing',
                'Missing meta description',
                'warning',
                'No meta description was detected in supported SEO metadata or the WordPress fallback.'
            );
        }

        $canonical = $this->text($metadata['canonicalUrl'] ?? null);

        if ('' !== $canonical && ! $this->urlsMatch($canonical, $item['url'])) {
            $findings[] = $this->finding(
                'canonical-different',
                'Canonical points to another URL',
                'warning',
                sprintf('Canonical target: %s', $canonical)
            );
        }

        $wordCount = $this->nullableInt($metadata['wordCount'] ?? null);

        if (null !== $wordCount && $wordCount < self::THIN_CONTENT_WORDS) {
            $findings[] = $this->finding(
                'thin-content',
                'Thin content',
                'opportunity',
                sprintf('%d words detected; the transparent review threshold is %d.', $wordCount, self::THIN_CONTENT_WORDS)
            );
        }

        $internalLinks = $this->nullableInt($metadata['internalLinkCount'] ?? null);

        if (0 === $internalLinks) {
            $findings[] = $this->finding(
                'internal-links-missing',
                'No internal links in content',
                'opportunity',
                'No internal links were detected in the post body.'
            );
        }

        $reference = $referenceTimestamp ?? time();
        $modified = strtotime($item['modifiedAt']);

        if (false !== $modified) {
            $ageDays = max(0, (int) floor(($reference - $modified) / self::SECONDS_PER_DAY));

            if ($ageDays > self::STALE_CONTENT_DAYS) {
                $findings[] = $this->finding(
                    'content-stale',
                    'Content may need a freshness review',
                    'maintenance',
                    sprintf('Last modified %d days ago; the review threshold is %d days.', $ageDays, self::STALE_CONTENT_DAYS)
                );
            }
        }

        return $findings;
    }

    /**
     * @param array<int,array{findings:array<int,array{severity:string}>}> $items
     * @return array{total_urls:int,affected_urls:int,issue_count:int,ignored_findings:int,critical:int,attention:int,opportunity:int,maintenance:int,complete:int}
     */
    public function summarize(array $items): array
    {
        $summary = [
            'total_urls' => count($items),
            'affected_urls' => 0,
            'issue_count' => 0,
            'ignored_findings' => 0,
            'critical' => 0,
            'attention' => 0,
            'opportunity' => 0,
            'maintenance' => 0,
            'complete' => 0,
        ];

        foreach ($items as $item) {
            $activeFindings = array_values(
                array_filter(
                    $item['findings'],
                    static fn (array $finding): bool => true !== ($finding['ignored'] ?? false)
                )
            );
            $summary['ignored_findings'] += count($item['findings']) - count($activeFindings);

            if ([] === $activeFindings) {
                $summary['complete']++;
                continue;
            }

            $summary['affected_urls']++;

            foreach ($activeFindings as $finding) {
                $summary['issue_count']++;

                match ($finding['severity']) {
                    'critical' => $summary['critical']++,
                    'warning' => $summary['attention']++,
                    'opportunity' => $summary['opportunity']++,
                    'maintenance' => $summary['maintenance']++,
                    default => null,
                };
            }
        }

        return $summary;
    }

    /**
     * @return array{code:string,label:string,severity:string,evidence:string}
     */
    private function finding(string $code, string $label, string $severity, string $evidence): array
    {
        return compact('code', 'label', 'severity', 'evidence');
    }

    private function urlsMatch(string $left, string $right): bool
    {
        return $this->normalizeUrl($left) === $this->normalizeUrl($right);
    }

    private function normalizeUrl(string $value): string
    {
        $parts = parse_url(trim($value));

        if (! is_array($parts) || empty($parts['host'])) {
            return rtrim(trim($value), '/');
        }

        $scheme = isset($parts['scheme']) ? strtolower((string) $parts['scheme']) : 'https';
        $host = strtolower((string) $parts['host']);
        $port = isset($parts['port']) ? ':' . (int) $parts['port'] : '';
        $path = isset($parts['path']) ? '/' . ltrim((string) $parts['path'], '/') : '';
        $query = isset($parts['query']) ? '?' . (string) $parts['query'] : '';

        return rtrim($scheme . '://' . $host . $port . $path, '/') . $query;
    }

    private function hasText(mixed $value): bool
    {
        return '' !== $this->text($value);
    }

    private function text(mixed $value): string
    {
        return is_string($value) ? trim($value) : '';
    }

    private function nullableInt(mixed $value): ?int
    {
        return is_numeric($value) ? max(0, (int) $value) : null;
    }
}
