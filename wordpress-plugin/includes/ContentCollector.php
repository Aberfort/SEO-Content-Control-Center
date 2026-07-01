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
     * @return array<int,array{externalId:string,type:string,url:string,title:string|null,status:string,modifiedAt:string}>
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
     * @param object{id:int|string,ID?:int|string,post_type?:string,post_title?:string,post_status?:string,post_modified_gmt?:string,post_date_gmt?:string} $post
     * @return array{externalId:string,type:string,url:string,title:string|null,status:string,modifiedAt:string}
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
}
