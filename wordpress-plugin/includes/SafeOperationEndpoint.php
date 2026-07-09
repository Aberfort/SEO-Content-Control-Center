<?php
/**
 * Signed REST endpoint for applying safe SEO operation batches.
 *
 * @package SCCC
 */

declare(strict_types=1);

namespace SCCC\Plugin;

final class SafeOperationEndpoint
{
    public const DEFAULT_REST_PATH = '/wp-json/sccc/v1/operations/apply';

    private const REST_NAMESPACE = 'sccc/v1';
    private const REST_ROUTE = '/operations/apply';
    private const MAX_ITEMS = 100;
    private const TEXT_FIELDS = [
        'seoTitle' => 512,
        'metaDescription' => 1024,
    ];
    private const BOOL_FIELDS = [
        'robotsNoindex',
        'robotsNofollow',
    ];
    private const YOAST_META_KEYS = [
        'seoTitle' => '_yoast_wpseo_title',
        'metaDescription' => '_yoast_wpseo_metadesc',
        'canonicalUrl' => '_yoast_wpseo_canonical',
        'robotsNoindex' => '_yoast_wpseo_meta-robots-noindex',
        'robotsNofollow' => '_yoast_wpseo_meta-robots-nofollow',
    ];
    private const RANK_MATH_META_KEYS = [
        'seoTitle' => 'rank_math_title',
        'metaDescription' => 'rank_math_description',
        'canonicalUrl' => 'rank_math_canonical_url',
    ];

    public function __construct(
        private readonly ConnectionStore $connectionStore,
        private readonly RequestSigner $requestSigner
    ) {
    }

    public function registerRoutes(): void
    {
        if (! function_exists('register_rest_route')) {
            return;
        }

        register_rest_route(
            self::REST_NAMESPACE,
            self::REST_ROUTE,
            [
                'methods' => 'POST',
                'callback' => [$this, 'handleApply'],
                'permission_callback' => '__return_true',
            ]
        );
    }

    public function signedPath(): string
    {
        if (function_exists('rest_get_url_prefix')) {
            $prefix = trim((string) rest_get_url_prefix(), '/');

            if ('' !== $prefix) {
                return '/' . $prefix . '/' . self::REST_NAMESPACE . self::REST_ROUTE;
            }
        }

        return self::DEFAULT_REST_PATH;
    }

    /**
     * @return \WP_REST_Response|\WP_Error
     */
    public function handleApply(\WP_REST_Request $request): mixed
    {
        $body = $request->get_body();
        $connection = $this->connectionStore->get();

        if (null === $connection) {
            return $this->error(401, 'PLUGIN_CONNECTION_NOT_FOUND', 'This WordPress site is not connected.');
        }

        $signatureError = $this->verifyRequest($request, $body, $connection);

        if (null !== $signatureError) {
            return $signatureError;
        }

        $payload = json_decode($body, true);

        if (! is_array($payload) || JSON_ERROR_NONE !== json_last_error()) {
            return $this->error(400, 'INVALID_JSON', 'Request body must be valid JSON.');
        }

        $scopeError = $this->validateScope($payload, $connection);

        if (null !== $scopeError) {
            return $scopeError;
        }

        $operationId = $this->readBoundedString($payload['operationId'] ?? null, 128);

        if (null === $operationId) {
            return $this->error(422, 'VALIDATION_ERROR', 'operationId is required.');
        }

        $items = $payload['items'] ?? null;

        if (! is_array($items) || [] === $items || count($items) > self::MAX_ITEMS) {
            return $this->error(422, 'VALIDATION_ERROR', 'items must contain 1 to 100 operation items.');
        }

        $results = [];

        foreach ($items as $item) {
            $results[] = $this->applyItem($item);
        }

        $failedCount = count(
            array_filter(
                $results,
                static fn (array $result): bool => 'FAILED' === $result['status']
            )
        );

        return new \WP_REST_Response(
            [
                'data' => [
                    'operationId' => $operationId,
                    'siteId' => $connection['site_id'],
                    'appliedCount' => count($results) - $failedCount,
                    'failedCount' => $failedCount,
                    'results' => $results,
                ],
            ],
            200
        );
    }

    /**
     * @param array{organization_id:string,site_id:string,token:string,endpoint:string,connected_at:int} $connection
     * @return \WP_Error|null
     */
    private function verifyRequest(\WP_REST_Request $request, string $body, array $connection): mixed
    {
        $siteId = $this->requestHeader($request, 'x-sccc-site-id');
        $timestampHeader = $this->requestHeader($request, 'x-sccc-timestamp');
        $signature = $this->requestHeader($request, 'x-sccc-signature');
        $token = $this->requestHeader($request, 'x-sccc-token');

        if ('' === $siteId || '' === $timestampHeader || '' === $signature || '' === $token) {
            return $this->error(401, 'PLUGIN_APPLY_SIGNATURE_MISSING', 'Signed apply request headers are required.');
        }

        if (! hash_equals($connection['site_id'], $siteId)) {
            return $this->error(403, 'PLUGIN_APPLY_SCOPE_MISMATCH', 'Signed apply request site scope does not match this connection.');
        }

        if (! hash_equals($connection['token'], $token)) {
            return $this->error(401, 'PLUGIN_TOKEN_INVALID', 'Plugin token is invalid.');
        }

        if (! ctype_digit($timestampHeader)) {
            return $this->error(401, 'PLUGIN_APPLY_SIGNATURE_INVALID', 'Signed apply timestamp is invalid.');
        }

        $timestamp = (int) $timestampHeader;

        if (abs(time() - $timestamp) > 300) {
            return $this->error(401, 'PLUGIN_APPLY_SIGNATURE_EXPIRED', 'Signed apply request has expired.');
        }

        if (! $this->requestSigner->verify('POST', $this->signedPath(), $timestamp, $body, $connection['token'], $signature)) {
            return $this->error(401, 'PLUGIN_APPLY_SIGNATURE_INVALID', 'Signed apply request signature is invalid.');
        }

        return null;
    }

    /**
     * @param array<string,mixed> $payload
     * @param array{organization_id:string,site_id:string,token:string,endpoint:string,connected_at:int} $connection
     * @return \WP_Error|null
     */
    private function validateScope(array $payload, array $connection): mixed
    {
        $organizationId = $this->readBoundedString($payload['organizationId'] ?? null, 128);
        $siteId = $this->readBoundedString($payload['siteId'] ?? null, 128);

        if (null === $organizationId || null === $siteId) {
            return $this->error(422, 'VALIDATION_ERROR', 'organizationId and siteId are required.');
        }

        if (! hash_equals($connection['organization_id'], $organizationId) || ! hash_equals($connection['site_id'], $siteId)) {
            return $this->error(403, 'PLUGIN_APPLY_SCOPE_MISMATCH', 'Signed apply request organization or site scope does not match this connection.');
        }

        return null;
    }

    /**
     * @return array<string,mixed>
     */
    private function applyItem(mixed $item): array
    {
        if (! is_array($item)) {
            return $this->failedResult(null, null, 'invalid_item');
        }

        $itemId = $this->readBoundedString($item['itemId'] ?? null, 128);
        $externalId = $this->readBoundedString($item['externalId'] ?? null, 128);

        if (null === $itemId) {
            return $this->failedResult(null, $externalId, 'item_id_required');
        }

        if (null === $externalId) {
            return $this->failedResult($itemId, null, 'external_id_required');
        }

        $postReference = $this->parsePostExternalId($externalId);

        if (null === $postReference) {
            return $this->failedResult($itemId, $externalId, 'invalid_external_id');
        }

        if (! function_exists('get_post')) {
            return $this->failedResult($itemId, $externalId, 'wordpress_post_api_unavailable');
        }

        $post = get_post($postReference['postId']);

        if (! is_object($post)) {
            return $this->failedResult($itemId, $externalId, 'post_not_found');
        }

        $postType = property_exists($post, 'post_type') ? (string) $post->post_type : '';

        if ($postType !== $postReference['postType']) {
            return $this->failedResult($itemId, $externalId, 'external_id_post_type_mismatch');
        }

        if (! isset($item['afterValue']) || ! is_array($item['afterValue'])) {
            return $this->failedResult($itemId, $externalId, 'after_value_required');
        }

        $normalized = $this->normalizeAfterValue($item['afterValue']);

        if (isset($normalized['error'])) {
            return $this->failedResult($itemId, $externalId, (string) $normalized['error']);
        }

        $seoPlugin = $this->resolveSeoPlugin($postReference['postId'], $normalized['seoPlugin']);

        if (null === $seoPlugin) {
            return $this->failedResult($itemId, $externalId, 'seo_plugin_not_selected');
        }

        $beforeValue = $this->readSeoValues($postReference['postId'], $seoPlugin);
        $writeError = $this->writeSeoValues($postReference['postId'], $seoPlugin, $normalized['values']);

        if (null !== $writeError) {
            return $this->failedResult($itemId, $externalId, $writeError, $beforeValue);
        }

        return [
            'itemId' => $itemId,
            'externalId' => $externalId,
            'status' => 'COMPLETED',
            'beforeValue' => $beforeValue,
            'afterValue' => $this->readSeoValues($postReference['postId'], $seoPlugin),
            'error' => null,
        ];
    }

    /**
     * @return array{postType:string,postId:int}|null
     */
    private function parsePostExternalId(string $externalId): ?array
    {
        if (1 !== preg_match('/^([A-Za-z0-9_-]+):([1-9][0-9]*)$/', $externalId, $matches)) {
            return null;
        }

        return [
            'postType' => $matches[1],
            'postId' => (int) $matches[2],
        ];
    }

    /**
     * @param array<string,mixed> $afterValue
     * @return array{seoPlugin:?string,values:array<string,mixed>}|array{error:string}
     */
    private function normalizeAfterValue(array $afterValue): array
    {
        $supportedFields = array_merge(['seoPlugin', 'canonicalUrl'], array_keys(self::TEXT_FIELDS), self::BOOL_FIELDS);
        $unknownFields = array_values(array_diff(array_keys($afterValue), $supportedFields));

        if ([] !== $unknownFields) {
            return ['error' => 'unsupported_field:' . implode(',', $unknownFields)];
        }

        $seoPlugin = null;

        if (array_key_exists('seoPlugin', $afterValue)) {
            if (! is_string($afterValue['seoPlugin']) || ! in_array($afterValue['seoPlugin'], ['yoast', 'rank_math'], true)) {
                return ['error' => 'unsupported_seo_plugin'];
            }

            $seoPlugin = $afterValue['seoPlugin'];
        }

        $values = [];

        foreach (self::TEXT_FIELDS as $field => $maxLength) {
            if (! array_key_exists($field, $afterValue)) {
                continue;
            }

            $normalized = $this->normalizeNullableText($afterValue[$field], $field, $maxLength);

            if (isset($normalized['error'])) {
                return ['error' => $normalized['error']];
            }

            $values[$field] = $normalized['value'];
        }

        if (array_key_exists('canonicalUrl', $afterValue)) {
            $normalizedUrl = $this->normalizeNullableUrl($afterValue['canonicalUrl']);

            if (isset($normalizedUrl['error'])) {
                return ['error' => $normalizedUrl['error']];
            }

            $values['canonicalUrl'] = $normalizedUrl['value'];
        }

        foreach (self::BOOL_FIELDS as $field) {
            if (! array_key_exists($field, $afterValue)) {
                continue;
            }

            if (null !== $afterValue[$field] && ! is_bool($afterValue[$field])) {
                return ['error' => 'invalid_' . $field];
            }

            $values[$field] = $afterValue[$field];
        }

        if ([] === $values) {
            return ['error' => 'no_supported_fields'];
        }

        return [
            'seoPlugin' => $seoPlugin,
            'values' => $values,
        ];
    }

    private function resolveSeoPlugin(int $postId, ?string $requestedPlugin): ?string
    {
        if (null !== $requestedPlugin) {
            return $requestedPlugin;
        }

        foreach (self::YOAST_META_KEYS as $key) {
            if ($this->hasStoredMetaValue($postId, $key)) {
                return 'yoast';
            }
        }

        foreach (self::RANK_MATH_META_KEYS as $key) {
            if ($this->hasStoredMetaValue($postId, $key)) {
                return 'rank_math';
            }
        }

        if ($this->hasStoredMetaValue($postId, 'rank_math_robots')) {
            return 'rank_math';
        }

        return null;
    }

    /**
     * @return array{seoPlugin:string,seoTitle:string|null,metaDescription:string|null,canonicalUrl:string|null,robotsNoindex:bool|null,robotsNofollow:bool|null}
     */
    private function readSeoValues(int $postId, string $seoPlugin): array
    {
        if ('rank_math' === $seoPlugin) {
            $robots = $this->readPostMeta($postId, 'rank_math_robots');

            return [
                'seoPlugin' => 'rank_math',
                'seoTitle' => $this->sanitizeStoredText($this->readPostMeta($postId, 'rank_math_title'), 512),
                'metaDescription' => $this->sanitizeStoredText($this->readPostMeta($postId, 'rank_math_description'), 1024),
                'canonicalUrl' => $this->sanitizeStoredUrl($this->readPostMeta($postId, 'rank_math_canonical_url')),
                'robotsNoindex' => $this->parseRobotFlag($robots, 'noindex'),
                'robotsNofollow' => $this->parseRobotFlag($robots, 'nofollow'),
            ];
        }

        return [
            'seoPlugin' => 'yoast',
            'seoTitle' => $this->sanitizeStoredText($this->readPostMeta($postId, '_yoast_wpseo_title'), 512),
            'metaDescription' => $this->sanitizeStoredText($this->readPostMeta($postId, '_yoast_wpseo_metadesc'), 1024),
            'canonicalUrl' => $this->sanitizeStoredUrl($this->readPostMeta($postId, '_yoast_wpseo_canonical')),
            'robotsNoindex' => $this->parseRobotFlag($this->readPostMeta($postId, '_yoast_wpseo_meta-robots-noindex'), 'noindex'),
            'robotsNofollow' => $this->parseRobotFlag($this->readPostMeta($postId, '_yoast_wpseo_meta-robots-nofollow'), 'nofollow'),
        ];
    }

    /**
     * @param array<string,mixed> $values
     */
    private function writeSeoValues(int $postId, string $seoPlugin, array $values): ?string
    {
        if (! function_exists('update_post_meta') || ! function_exists('delete_post_meta')) {
            return 'wordpress_meta_api_unavailable';
        }

        if ('rank_math' === $seoPlugin) {
            foreach (self::RANK_MATH_META_KEYS as $field => $key) {
                if (array_key_exists($field, $values)) {
                    $this->writePostMeta($postId, $key, $values[$field]);
                }
            }

            if (array_key_exists('robotsNoindex', $values) || array_key_exists('robotsNofollow', $values)) {
                $this->writeRankMathRobots($postId, $values);
            }

            return null;
        }

        foreach (self::YOAST_META_KEYS as $field => $key) {
            if (! array_key_exists($field, $values)) {
                continue;
            }

            $value = $values[$field];

            if ('robotsNoindex' === $field || 'robotsNofollow' === $field) {
                $value = null === $value ? null : ($value ? '1' : '0');
            }

            $this->writePostMeta($postId, $key, $value);
        }

        return null;
    }

    /**
     * @param array<string,mixed> $values
     */
    private function writeRankMathRobots(int $postId, array $values): void
    {
        $tokens = $this->normalizeRobotTokens($this->readPostMeta($postId, 'rank_math_robots'));

        if (array_key_exists('robotsNoindex', $values)) {
            $tokens = $this->setRobotDirective($tokens, 'noindex', 'index', $values['robotsNoindex']);
        }

        if (array_key_exists('robotsNofollow', $values)) {
            $tokens = $this->setRobotDirective($tokens, 'nofollow', 'follow', $values['robotsNofollow']);
        }

        if ([] === $tokens) {
            delete_post_meta($postId, 'rank_math_robots');
            return;
        }

        update_post_meta($postId, 'rank_math_robots', array_values($tokens));
    }

    /**
     * @param array<int,string> $tokens
     * @return array<int,string>
     */
    private function setRobotDirective(array $tokens, string $enabledToken, string $disabledToken, mixed $value): array
    {
        $tokens = array_values(
            array_filter(
                $tokens,
                static fn (string $token): bool => $token !== $enabledToken && $token !== $disabledToken
            )
        );

        if (true === $value) {
            $tokens[] = $enabledToken;
        } elseif (false === $value) {
            $tokens[] = $disabledToken;
        }

        return array_values(array_unique($tokens));
    }

    private function writePostMeta(int $postId, string $key, mixed $value): void
    {
        if (null === $value) {
            delete_post_meta($postId, $key);
            return;
        }

        update_post_meta($postId, $key, $value);
    }

    private function hasStoredMetaValue(int $postId, string $key): bool
    {
        $value = $this->readPostMeta($postId, $key);

        if (is_array($value)) {
            return [] !== array_filter($value, static fn (mixed $item): bool => is_scalar($item) && '' !== trim((string) $item));
        }

        return is_scalar($value) && '' !== trim((string) $value);
    }

    private function readPostMeta(int $postId, string $key): mixed
    {
        if (! function_exists('get_post_meta')) {
            return null;
        }

        return get_post_meta($postId, $key, true);
    }

    /**
     * @return array<int,string>
     */
    private function normalizeRobotTokens(mixed $value): array
    {
        if (is_array($value)) {
            $rawTokens = $value;
        } elseif (is_scalar($value)) {
            $rawTokens = preg_split('/[\s,]+/', (string) $value) ?: [];
        } else {
            $rawTokens = [];
        }

        $tokens = [];

        foreach ($rawTokens as $token) {
            if (! is_scalar($token)) {
                continue;
            }

            $token = strtolower(trim((string) $token));

            if ('' !== $token && 1 === preg_match('/^[a-z0-9_-]+$/', $token)) {
                $tokens[] = $token;
            }
        }

        return array_values(array_unique($tokens));
    }

    private function parseRobotFlag(mixed $value, string $flag): ?bool
    {
        $tokens = $this->normalizeRobotTokens($value);

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
     * @return array{value:string|null}|array{error:string}
     */
    private function normalizeNullableText(mixed $value, string $field, int $maxLength): array
    {
        if (null === $value) {
            return ['value' => null];
        }

        if (! is_scalar($value)) {
            return ['error' => 'invalid_' . $field];
        }

        $text = $this->sanitizeStoredText($value, $maxLength + 1);

        if (null === $text) {
            return ['value' => null];
        }

        if ($this->stringLength($text) > $maxLength) {
            return ['error' => $field . '_too_long'];
        }

        return ['value' => $text];
    }

    /**
     * @return array{value:string|null}|array{error:string}
     */
    private function normalizeNullableUrl(mixed $value): array
    {
        if (null === $value) {
            return ['value' => null];
        }

        if (! is_scalar($value)) {
            return ['error' => 'invalid_canonicalUrl'];
        }

        $url = trim((string) $value);

        if ('' === $url) {
            return ['value' => null];
        }

        if ($this->stringLength($url) > 2048 || false === filter_var($url, FILTER_VALIDATE_URL)) {
            return ['error' => 'invalid_canonicalUrl'];
        }

        $scheme = strtolower((string) parse_url($url, PHP_URL_SCHEME));

        if (! in_array($scheme, ['http', 'https'], true)) {
            return ['error' => 'invalid_canonicalUrl'];
        }

        if (function_exists('esc_url_raw')) {
            $url = esc_url_raw($url);
        }

        return ['value' => $url];
    }

    private function sanitizeStoredText(mixed $value, int $maxLength): ?string
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

        if (function_exists('mb_substr')) {
            return mb_substr($text, 0, $maxLength);
        }

        return substr($text, 0, $maxLength);
    }

    private function sanitizeStoredUrl(mixed $value): ?string
    {
        if (! is_scalar($value)) {
            return null;
        }

        $url = trim((string) $value);

        if ('' === $url || false === filter_var($url, FILTER_VALIDATE_URL)) {
            return null;
        }

        if (function_exists('mb_substr')) {
            return mb_substr($url, 0, 2048);
        }

        return substr($url, 0, 2048);
    }

    private function readBoundedString(mixed $value, int $maxLength): ?string
    {
        if (! is_scalar($value)) {
            return null;
        }

        $text = trim((string) $value);

        if ('' === $text || $this->stringLength($text) > $maxLength) {
            return null;
        }

        return $text;
    }

    private function requestHeader(\WP_REST_Request $request, string $header): string
    {
        return trim((string) $request->get_header($header));
    }

    private function stringLength(string $value): int
    {
        if (function_exists('mb_strlen')) {
            return mb_strlen($value);
        }

        return strlen($value);
    }

    /**
     * @param array<string,mixed>|null $beforeValue
     * @return array<string,mixed>
     */
    private function failedResult(?string $itemId, ?string $externalId, string $error, ?array $beforeValue = null): array
    {
        $result = [
            'itemId' => $itemId,
            'externalId' => $externalId,
            'status' => 'FAILED',
            'beforeValue' => $beforeValue,
            'afterValue' => null,
            'error' => $error,
        ];

        return $result;
    }

    private function error(int $status, string $code, string $message): \WP_Error
    {
        return new \WP_Error($code, $message, ['status' => $status]);
    }
}
