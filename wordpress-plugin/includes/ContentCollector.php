<?php
/**
 * WordPress content inventory collector.
 *
 * @package SCCC
 */

declare(strict_types=1);

namespace SCCC\Plugin;

final class ContentCollector
{
    private const DEFAULT_LIMIT = 100;

    /**
     * @return array<int,array{externalId:string,type:string,url:string,title:string|null,status:string,modifiedAt:string,metadata:array<string,mixed>}>
     */
    public function collect(int $limit = self::DEFAULT_LIMIT): array
    {
        if (! class_exists('\\WP_Query')) {
            return [];
        }

        $query = new \WP_Query(
            [
                'post_type' => ['post', 'page'],
                'post_status' => ['publish', 'draft', 'pending', 'future', 'private'],
                'posts_per_page' => max(1, min($limit, self::DEFAULT_LIMIT)),
                'no_found_rows' => true,
                'orderby' => 'modified',
                'order' => 'DESC',
            ]
        );
        $items = [];

        foreach ($query->posts as $post) {
            $url = function_exists('get_permalink') ? (string) get_permalink($post) : '';

            if ('' === $url) {
                continue;
            }

            $items[] = $this->mapPost($post, $url);
        }

        if (function_exists('wp_reset_postdata')) {
            wp_reset_postdata();
        }

        return $items;
    }

    /**
     * @param object{id:int|string,ID?:int|string,post_type?:string,post_title?:string,post_status?:string,post_modified_gmt?:string,post_date_gmt?:string,post_author?:int|string,post_content?:string} $post
     * @return array{externalId:string,type:string,url:string,title:string|null,status:string,modifiedAt:string,metadata:array<string,mixed>}
     */
    public function mapPost(object $post, string $url): array
    {
        $id = property_exists($post, 'ID') ? (string) $post->ID : (string) $post->id;
        $postType = property_exists($post, 'post_type') ? (string) $post->post_type : 'post';
        $title = property_exists($post, 'post_title') ? trim((string) $post->post_title) : '';
        $status = property_exists($post, 'post_status') ? (string) $post->post_status : 'unknown';
        $modifiedAt = property_exists($post, 'post_modified_gmt') ? (string) $post->post_modified_gmt : '';

        if ('' === $modifiedAt && property_exists($post, 'post_date_gmt')) {
            $modifiedAt = (string) $post->post_date_gmt;
        }

        return [
            'externalId' => $postType . ':' . $id,
            'type' => $this->mapPostType($postType),
            'url' => $url,
            'title' => '' === $title ? null : $title,
            'status' => $status,
            'modifiedAt' => $this->formatDateTime($modifiedAt),
            'metadata' => $this->buildMetadata($post, $id, $postType, $title, $url),
        ];
    }

    /**
     * @return array<string,mixed>
     */
    private function buildMetadata(object $post, string $postId, string $postType, string $postTitle, string $url): array
    {
        $authorId = property_exists($post, 'post_author') ? max(0, (int) $post->post_author) : null;
        $featuredImageId = $this->readFeaturedImageId($post);

        return array_merge(
            [
                'authorId' => $authorId,
                'authorName' => $this->readAuthorName($authorId),
                'publishedAt' => $this->readPublishedAt($post),
                'featuredImagePresent' => null !== $featuredImageId && $featuredImageId > 0,
                'featuredImageId' => $featuredImageId,
                'featuredImageUrl' => $this->readFeaturedImageUrl($featuredImageId),
                'taxonomies' => $this->collectTaxonomies($postId, $postType),
                'wordCount' => $this->countWords($post),
            ],
            $this->countLinks($post, $url),
            $this->readSeoMetadata($postId, $postTitle)
        );
    }

    private function mapPostType(string $postType): string
    {
        if ('post' === $postType || 'page' === $postType) {
            return $postType;
        }

        return 'custom_post_type';
    }

    private function formatDateTime(string $value): string
    {
        $timestamp = strtotime($value);

        if (false === $timestamp) {
            return gmdate('c');
        }

        return gmdate('c', $timestamp);
    }

    private function readPublishedAt(object $post): ?string
    {
        if (! property_exists($post, 'post_date_gmt')) {
            return null;
        }

        $timestamp = strtotime((string) $post->post_date_gmt);

        if (false === $timestamp) {
            return null;
        }

        return gmdate('c', $timestamp);
    }

    private function readAuthorName(?int $authorId): ?string
    {
        if (null === $authorId || ! function_exists('get_the_author_meta')) {
            return null;
        }

        $name = trim((string) get_the_author_meta('display_name', $authorId));

        return '' === $name ? null : $name;
    }

    private function readFeaturedImageId(object $post): ?int
    {
        if (! function_exists('get_post_thumbnail_id')) {
            return null;
        }

        $thumbnailId = (int) get_post_thumbnail_id($post);

        return $thumbnailId > 0 ? $thumbnailId : null;
    }

    private function readFeaturedImageUrl(?int $featuredImageId): ?string
    {
        if (null === $featuredImageId || ! function_exists('wp_get_attachment_url')) {
            return null;
        }

        $url = wp_get_attachment_url($featuredImageId);

        return is_string($url) && '' !== $url ? $url : null;
    }

    /**
     * @return array<int,array{taxonomy:string,terms:array<int,string>}>
     */
    private function collectTaxonomies(string $postId, string $postType): array
    {
        if (! function_exists('get_object_taxonomies') || ! function_exists('get_the_terms')) {
            return [];
        }

        $taxonomies = get_object_taxonomies($postType, 'names');

        if (! is_array($taxonomies)) {
            return [];
        }

        $metadata = [];

        foreach (array_slice($taxonomies, 0, 32) as $taxonomy) {
            if (! is_string($taxonomy) || '' === $taxonomy) {
                continue;
            }

            $terms = get_the_terms((int) $postId, $taxonomy);

            if (! is_array($terms)) {
                continue;
            }

            $names = [];

            foreach ($terms as $term) {
                if (is_object($term) && property_exists($term, 'name')) {
                    $name = trim((string) $term->name);

                    if ('' !== $name) {
                        $names[] = $name;
                    }
                }
            }

            if ([] !== $names) {
                $metadata[] = [
                    'taxonomy' => $taxonomy,
                    'terms' => array_slice(array_values(array_unique($names)), 0, 100),
                ];
            }
        }

        return $metadata;
    }

    private function countWords(object $post): ?int
    {
        if (! property_exists($post, 'post_content')) {
            return null;
        }

        $content = (string) $post->post_content;
        $text = function_exists('wp_strip_all_tags') ? wp_strip_all_tags($content) : strip_tags($content);
        $text = trim(preg_replace('/\s+/', ' ', $text) ?? '');

        if ('' === $text) {
            return 0;
        }

        return count(preg_split('/\s+/', $text) ?: []);
    }

    /**
     * @return array{internalLinkCount:int|null,externalLinkCount:int|null}
     */
    private function countLinks(object $post, string $currentUrl): array
    {
        if (! property_exists($post, 'post_content')) {
            return [
                'internalLinkCount' => null,
                'externalLinkCount' => null,
            ];
        }

        $internal = 0;
        $external = 0;

        foreach ($this->extractHrefs((string) $post->post_content) as $href) {
            $classification = $this->classifyHref($href, $currentUrl);

            if ('internal' === $classification) {
                $internal++;
            }

            if ('external' === $classification) {
                $external++;
            }
        }

        return [
            'internalLinkCount' => $internal,
            'externalLinkCount' => $external,
        ];
    }

    /**
     * @return array<int,string>
     */
    private function extractHrefs(string $html): array
    {
        if ('' === trim($html)) {
            return [];
        }

        if (class_exists('\\DOMDocument')) {
            $previousErrors = libxml_use_internal_errors(true);
            $document = new \DOMDocument();
            $loaded = $document->loadHTML('<!doctype html><meta charset="utf-8">' . $html);
            libxml_clear_errors();
            libxml_use_internal_errors($previousErrors);

            if ($loaded) {
                $hrefs = [];

                foreach ($document->getElementsByTagName('a') as $link) {
                    $href = trim($link->getAttribute('href'));

                    if ('' !== $href) {
                        $hrefs[] = $href;
                    }
                }

                return $hrefs;
            }
        }

        preg_match_all('/<a\s[^>]*href=["\']([^"\']+)["\']/i', $html, $matches);

        return array_values(array_filter(array_map('trim', $matches[1] ?? [])));
    }

    private function classifyHref(string $href, string $currentUrl): ?string
    {
        $href = trim($href);

        if ('' === $href || str_starts_with($href, '#')) {
            return null;
        }

        $scheme = strtolower((string) parse_url($href, PHP_URL_SCHEME));

        if (in_array($scheme, ['mailto', 'tel', 'javascript'], true)) {
            return null;
        }

        if (str_starts_with($href, '//')) {
            $currentHost = $this->normalizeHost((string) parse_url($currentUrl, PHP_URL_HOST));
            $linkHost = $this->normalizeHost((string) parse_url($href, PHP_URL_HOST));

            if ('' === $currentHost || '' === $linkHost) {
                return null;
            }

            return $currentHost === $linkHost ? 'internal' : 'external';
        }

        if ('' === $scheme && (str_starts_with($href, '/') || ! str_contains($href, '://'))) {
            return 'internal';
        }

        if (! in_array($scheme, ['http', 'https'], true)) {
            return null;
        }

        $currentHost = $this->normalizeHost((string) parse_url($currentUrl, PHP_URL_HOST));
        $linkHost = $this->normalizeHost((string) parse_url($href, PHP_URL_HOST));

        if ('' === $currentHost || '' === $linkHost) {
            return null;
        }

        return $currentHost === $linkHost ? 'internal' : 'external';
    }

    private function normalizeHost(string $host): string
    {
        $host = strtolower(trim($host));

        return str_starts_with($host, 'www.') ? substr($host, 4) : $host;
    }

    /**
     * @return array{seoPlugin:string,seoTitle:string|null,metaDescription:string|null,canonicalUrl:string|null,robotsNoindex:bool|null,robotsNofollow:bool|null}
     */
    private function readSeoMetadata(string $postId, string $fallbackTitle): array
    {
        $fallbackSeoTitle = $this->sanitizeMetadataString($fallbackTitle, 512);
        $yoastMetadata = [
            'seoTitle' => $this->sanitizeMetadataString(
                $this->readPostMeta($postId, '_yoast_wpseo_title'),
                512
            ),
            'metaDescription' => $this->sanitizeMetadataString(
                $this->readPostMeta($postId, '_yoast_wpseo_metadesc'),
                1024
            ),
            'canonicalUrl' => $this->sanitizeUrl(
                $this->readPostMeta($postId, '_yoast_wpseo_canonical')
            ),
            'robotsNoindex' => $this->parseRobotFlag(
                $this->readPostMeta($postId, '_yoast_wpseo_meta-robots-noindex'),
                'noindex'
            ),
            'robotsNofollow' => $this->parseRobotFlag(
                $this->readPostMeta($postId, '_yoast_wpseo_meta-robots-nofollow'),
                'nofollow'
            ),
        ];

        if ($this->hasSeoMetadata($yoastMetadata)) {
            return array_merge(
                ['seoPlugin' => 'yoast'],
                $this->withFallbackSeoTitle($yoastMetadata, $fallbackSeoTitle)
            );
        }

        $rankMathRobots = $this->readPostMeta($postId, 'rank_math_robots');
        $rankMathMetadata = [
            'seoTitle' => $this->sanitizeMetadataString(
                $this->readPostMeta($postId, 'rank_math_title'),
                512
            ),
            'metaDescription' => $this->sanitizeMetadataString(
                $this->readPostMeta($postId, 'rank_math_description'),
                1024
            ),
            'canonicalUrl' => $this->sanitizeUrl(
                $this->readPostMeta($postId, 'rank_math_canonical_url')
            ),
            'robotsNoindex' => $this->parseRobotFlag($rankMathRobots, 'noindex'),
            'robotsNofollow' => $this->parseRobotFlag($rankMathRobots, 'nofollow'),
        ];

        if ($this->hasSeoMetadata($rankMathMetadata)) {
            return array_merge(
                ['seoPlugin' => 'rank_math'],
                $this->withFallbackSeoTitle($rankMathMetadata, $fallbackSeoTitle)
            );
        }

        return [
            'seoPlugin' => 'fallback',
            'seoTitle' => $fallbackSeoTitle,
            'metaDescription' => null,
            'canonicalUrl' => null,
            'robotsNoindex' => null,
            'robotsNofollow' => null,
        ];
    }

    private function readPostMeta(string $postId, string $key): mixed
    {
        if (! function_exists('get_post_meta')) {
            return null;
        }

        return get_post_meta((int) $postId, $key, true);
    }

    private function sanitizeMetadataString(mixed $value, int $maxLength): ?string
    {
        if (! is_scalar($value)) {
            return null;
        }

        $text = (string) $value;
        $text = function_exists('wp_strip_all_tags') ? wp_strip_all_tags($text) : strip_tags($text);
        $text = trim(preg_replace('/\s+/', ' ', $text) ?? '');

        if ('' === $text) {
            return null;
        }

        return $this->truncate($text, $maxLength);
    }

    private function sanitizeUrl(mixed $value): ?string
    {
        if (! is_scalar($value)) {
            return null;
        }

        $url = trim((string) $value);

        if ('' === $url || false === filter_var($url, FILTER_VALIDATE_URL)) {
            return null;
        }

        return $this->truncate($url, 2048);
    }

    private function parseRobotFlag(mixed $value, string $flag): ?bool
    {
        if (is_array($value)) {
            $tokens = [];

            foreach ($value as $item) {
                if (is_scalar($item)) {
                    $tokens[] = strtolower(trim((string) $item));
                }
            }
        } elseif (is_scalar($value)) {
            $rawValue = strtolower(trim((string) $value));

            if ('' === $rawValue) {
                return null;
            }

            $tokens = preg_split('/[\s,]+/', $rawValue) ?: [];
        } else {
            return null;
        }

        $tokens = array_values(array_filter($tokens, static fn (string $token): bool => '' !== $token));

        if ([] === $tokens) {
            return null;
        }

        if (in_array($flag, $tokens, true)) {
            return true;
        }

        if (1 === count($tokens)) {
            if (in_array($tokens[0], ['1', 'true', 'yes', 'on'], true)) {
                return true;
            }

            if (in_array($tokens[0], ['0', '2', 'false', 'no', 'off'], true)) {
                return false;
            }
        }

        if ('noindex' === $flag && in_array('index', $tokens, true)) {
            return false;
        }

        if ('nofollow' === $flag && in_array('follow', $tokens, true)) {
            return false;
        }

        return null;
    }

    /**
     * @param array{seoTitle:string|null,metaDescription:string|null,canonicalUrl:string|null,robotsNoindex:bool|null,robotsNofollow:bool|null} $metadata
     */
    private function hasSeoMetadata(array $metadata): bool
    {
        return null !== $metadata['seoTitle']
            || null !== $metadata['metaDescription']
            || null !== $metadata['canonicalUrl']
            || null !== $metadata['robotsNoindex']
            || null !== $metadata['robotsNofollow'];
    }

    /**
     * @param array{seoTitle:string|null,metaDescription:string|null,canonicalUrl:string|null,robotsNoindex:bool|null,robotsNofollow:bool|null} $metadata
     * @return array{seoTitle:string|null,metaDescription:string|null,canonicalUrl:string|null,robotsNoindex:bool|null,robotsNofollow:bool|null}
     */
    private function withFallbackSeoTitle(array $metadata, ?string $fallbackSeoTitle): array
    {
        if (null === $metadata['seoTitle']) {
            $metadata['seoTitle'] = $fallbackSeoTitle;
        }

        return $metadata;
    }

    private function truncate(string $value, int $maxLength): string
    {
        if (function_exists('mb_substr')) {
            return mb_substr($value, 0, $maxLength);
        }

        return substr($value, 0, $maxLength);
    }
}
