<?php
/**
 * Builds bounded links and capability hints for connected audit findings.
 *
 * @package SCCC
 */

declare(strict_types=1);

namespace SCCC\Plugin;

if (! defined('ABSPATH')) {
    exit;
}

final class PlatformConversion
{
    /** @var array<string,string> */
    private const SAFE_FIELDS = [
        'seo-title-missing' => 'SEO title',
        'meta-description-missing' => 'meta description',
        'canonical-different' => 'canonical URL',
        'published-noindex' => 'noindex directive',
    ];

    /** @var array<int,string> */
    private const GSC_ENRICHABLE = [
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
     * @param array{site_id:string,endpoint:string} $connection
     * @param array<string,mixed> $finding
     * @return array{content_url:string,audit_url:string,gsc_enrichable:bool,safe_operation:array{available:bool,field:string|null}}
     */
    public function describe(array $connection, array $finding): array
    {
        $endpoint = rtrim((string) ($connection['endpoint'] ?? ''), '/');
        $siteId = (string) ($connection['site_id'] ?? '');
        $externalId = (string) ($finding['external_id'] ?? '');
        $url = (string) ($finding['url'] ?? '');
        $code = (string) ($finding['code'] ?? '');
        $seoPlugin = (string) ($finding['seo_plugin'] ?? 'fallback');
        $safeField = self::SAFE_FIELDS[$code] ?? null;

        return [
            'content_url' => $this->url($endpoint, '/content', [
                'site' => $siteId,
                'q' => $externalId,
            ]),
            'audit_url' => $this->url($endpoint, '/audits', [
                'site' => $siteId,
                'auditIssueQ' => $url,
            ]),
            'gsc_enrichable' => in_array($code, self::GSC_ENRICHABLE, true),
            'safe_operation' => [
                'available' => null !== $safeField && in_array($seoPlugin, ['yoast', 'rank_math'], true),
                'field' => $safeField,
            ],
        ];
    }

    /**
     * @param array<string,string> $query
     */
    private function url(string $endpoint, string $path, array $query): string
    {
        return $endpoint . $path . '?' . http_build_query($query, '', '&', PHP_QUERY_RFC3986);
    }
}
