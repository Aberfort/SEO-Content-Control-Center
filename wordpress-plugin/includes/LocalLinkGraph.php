<?php
/**
 * Builds a local inbound-link graph for audited WordPress content.
 *
 * @package SCCC
 */

declare(strict_types=1);

namespace SCCC\Plugin;

if (! defined('ABSPATH')) {
    exit;
}

final class LocalLinkGraph
{
    /**
     * @param array<int,array<string,mixed>> $items
     * @return array<int,array<string,mixed>>
     */
    public function analyze(array $items): array
    {
        $urlIndex = [];
        $inboundSources = [];

        foreach ($items as $index => $item) {
            $key = $this->normalizeUrl((string) ($item['url'] ?? ''));

            if ('' !== $key) {
                $urlIndex[$key] = $index;
                $inboundSources[$index] = [];
            }
        }

        foreach ($items as $sourceIndex => $item) {
            $sourceUrl = (string) ($item['url'] ?? '');
            $targets = isset($item['outbound_urls']) && is_array($item['outbound_urls']) ? $item['outbound_urls'] : [];

            foreach ($targets as $target) {
                if (! is_string($target)) {
                    continue;
                }

                $targetKey = $this->normalizeTarget($target, $sourceUrl);
                $targetIndex = '' !== $targetKey && isset($urlIndex[$targetKey]) ? $urlIndex[$targetKey] : null;

                if (null === $targetIndex || $targetIndex === $sourceIndex) {
                    continue;
                }

                $sourceId = (string) ($item['external_id'] ?? $sourceIndex);
                $inboundSources[$targetIndex][$sourceId] = true;
            }
        }

        foreach ($items as $index => &$item) {
            $count = isset($inboundSources[$index]) ? count($inboundSources[$index]) : 0;
            $item['inbound_link_count'] = $count;
            unset($item['outbound_urls']);

            if (! isset($item['findings']) || ! is_array($item['findings'])) {
                $item['findings'] = [];
            }

            if (0 === $count) {
                $item['findings'][] = [
                    'code' => 'orphan-content',
                    'label' => 'No inbound internal links',
                    'severity' => 'warning',
                    'evidence' => 'No other audited post or page links to this URL.',
                ];
            } elseif (1 === $count) {
                $item['findings'][] = [
                    'code' => 'weakly-linked-content',
                    'label' => 'Only one inbound internal link',
                    'severity' => 'opportunity',
                    'evidence' => 'Only one audited post or page links to this URL.',
                ];
            }
        }
        unset($item);

        return $items;
    }

    private function normalizeTarget(string $target, string $sourceUrl): string
    {
        $target = trim($target);

        if ('' === $target || str_starts_with($target, '#')) {
            return '';
        }

        if (str_starts_with($target, '//')) {
            $scheme = (string) (parse_url($sourceUrl, PHP_URL_SCHEME) ?: 'https');
            return $this->normalizeUrl($scheme . ':' . $target);
        }

        $targetScheme = parse_url($target, PHP_URL_SCHEME);

        if (is_string($targetScheme) && '' !== $targetScheme) {
            return $this->normalizeUrl($target);
        }

        $scheme = (string) (parse_url($sourceUrl, PHP_URL_SCHEME) ?: 'https');
        $host = (string) parse_url($sourceUrl, PHP_URL_HOST);
        $port = parse_url($sourceUrl, PHP_URL_PORT);

        if ('' === $host) {
            return '';
        }

        $authority = $scheme . '://' . $host . (is_int($port) ? ':' . $port : '');

        if (str_starts_with($target, '/')) {
            return $this->normalizeUrl($authority . $target);
        }

        $sourcePath = (string) (parse_url($sourceUrl, PHP_URL_PATH) ?: '/');
        $basePath = str_ends_with($sourcePath, '/')
            ? rtrim($sourcePath, '/')
            : rtrim(str_replace('\\', '/', dirname($sourcePath)), '/');

        return $this->normalizeUrl($authority . ($basePath ? $basePath : '') . '/' . $target);
    }

    private function normalizeUrl(string $value): string
    {
        $parts = parse_url(trim($value));

        if (! is_array($parts) || empty($parts['host'])) {
            return '';
        }

        $host = strtolower((string) $parts['host']);
        $host = str_starts_with($host, 'www.') ? substr($host, 4) : $host;
        $port = isset($parts['port']) ? ':' . (int) $parts['port'] : '';
        $path = isset($parts['path']) ? '/' . ltrim((string) $parts['path'], '/') : '/';
        $segments = [];

        foreach (explode('/', $path) as $segment) {
            if ('' === $segment || '.' === $segment) {
                continue;
            }

            if ('..' === $segment) {
                array_pop($segments);
                continue;
            }

            $segments[] = rawurldecode($segment);
        }

        return $host . $port . '/' . implode('/', $segments);
    }
}
