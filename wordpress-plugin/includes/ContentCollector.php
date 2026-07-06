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
            'metadata' => $this->buildMetadata($post, $id, $postType),
        ];
    }

    /**
     * @return array<string,mixed>
     */
    private function buildMetadata(object $post, string $postId, string $postType): array
    {
        $authorId = property_exists($post, 'post_author') ? max(0, (int) $post->post_author) : null;
        $featuredImageId = $this->readFeaturedImageId($post);

        return [
            'authorId' => $authorId,
            'authorName' => $this->readAuthorName($authorId),
            'publishedAt' => $this->readPublishedAt($post),
            'featuredImagePresent' => null !== $featuredImageId && $featuredImageId > 0,
            'featuredImageId' => $featuredImageId,
            'featuredImageUrl' => $this->readFeaturedImageUrl($featuredImageId),
            'taxonomies' => $this->collectTaxonomies($postId, $postType),
            'wordCount' => $this->countWords($post),
        ];
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
}
