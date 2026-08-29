<?php
/**
 * Minimal PHP smoke tests for pure plugin helpers.
 *
 * @package SCCC
 */

declare(strict_types=1);

if (! defined('ABSPATH')) {
    define('ABSPATH', __DIR__ . '/wordpress/');
}

if (! defined('DAY_IN_SECONDS')) {
    define('DAY_IN_SECONDS', 86400);
    define('WEEK_IN_SECONDS', 604800);
}

if (! function_exists('wp_parse_url')) {
    function wp_parse_url(string $url, int $component = -1): mixed
    {
        return parse_url($url, $component);
    }
}

if (! function_exists('wp_strip_all_tags')) {
    function wp_strip_all_tags(string $text, bool $remove_breaks = false): string
    {
        $text = strip_tags($text);

        if ($remove_breaks) {
            $text = preg_replace('/[\r\n\t ]+/', ' ', $text) ?? $text;
        }

        return trim($text);
    }
}

if (! function_exists('get_option')) {
    $GLOBALS['sccc_test_options'] = [];
    $GLOBALS['sccc_test_option_autoload'] = [];

    function get_option(string $name): mixed
    {
        return $GLOBALS['sccc_test_options'][$name] ?? false;
    }

    function update_option(string $name, mixed $value, mixed $autoload = null): bool
    {
        $GLOBALS['sccc_test_options'][$name] = $value;
        $GLOBALS['sccc_test_option_autoload'][$name] = $autoload;

        return true;
    }

    function delete_option(string $name): bool
    {
        unset($GLOBALS['sccc_test_options'][$name], $GLOBALS['sccc_test_option_autoload'][$name]);

        return true;
    }
}

if (! function_exists('__')) {
    function __(string $text, string $domain = 'default'): string
    {
        return $text;
    }
}

if (! function_exists('wp_json_encode')) {
    function wp_json_encode(mixed $value, int $flags = 0, int $depth = 512): string|false
    {
        return json_encode($value, $flags, $depth);
    }
}

if (! function_exists('wp_next_scheduled')) {
    $GLOBALS['sccc_test_scheduled_events'] = [];

    function wp_next_scheduled(string $hook): int|false
    {
        $matches = array_filter(
            $GLOBALS['sccc_test_scheduled_events'],
            static fn (array $event): bool => $event['hook'] === $hook
        );

        if ([] === $matches) {
            return false;
        }

        usort($matches, static fn (array $left, array $right): int => $left['timestamp'] <=> $right['timestamp']);

        return (int) $matches[0]['timestamp'];
    }

    function wp_schedule_single_event(int $timestamp, string $hook, array $args = []): bool
    {
        $GLOBALS['sccc_test_scheduled_events'][] = [
            'hook' => $hook,
            'timestamp' => $timestamp,
            'recurrence' => null,
            'args' => $args,
        ];

        return true;
    }

    function wp_schedule_event(int $timestamp, string $recurrence, string $hook): bool
    {
        $GLOBALS['sccc_test_scheduled_events'][] = [
            'hook' => $hook,
            'timestamp' => $timestamp,
            'recurrence' => $recurrence,
        ];

        return true;
    }

    function wp_unschedule_event(int $timestamp, string $hook): bool
    {
        $GLOBALS['sccc_test_scheduled_events'] = array_values(
            array_filter(
                $GLOBALS['sccc_test_scheduled_events'],
                static fn (array $event): bool => ! ($event['hook'] === $hook && $event['timestamp'] === $timestamp)
            )
        );

        return true;
    }
}

if (! defined('WP_PLUGIN_DIR')) {
    define('WP_PLUGIN_DIR', '/tmp/sccc-test-plugins');
}

if (! function_exists('get_plugin_data')) {
    $GLOBALS['sccc_test_plugin_data'] = [];

    /**
     * @return array{Name?:string,Version?:string}
     */
    function get_plugin_data(string $file, bool $markup = true, bool $translate = true): array
    {
        return $GLOBALS['sccc_test_plugin_data'][$file] ?? [];
    }

    /**
     * @return array<string,array{Name?:string,Version?:string}>
     */
    function get_plugins(): array
    {
        $prefix = WP_PLUGIN_DIR . '/';
        $plugins = [];

        foreach ($GLOBALS['sccc_test_plugin_data'] as $file => $data) {
            $basename = str_starts_with($file, $prefix) ? substr($file, strlen($prefix)) : $file;
            $plugins[$basename] = $data;
        }

        return $plugins;
    }
}

if (! class_exists('WP_Theme')) {
    class WP_Theme
    {
        /**
         * @param array<string,string> $data
         */
        public function __construct(private readonly array $data)
        {
        }

        public function get(string $key): ?string
        {
            return $this->data[$key] ?? null;
        }
    }
}

if (! function_exists('wp_get_theme')) {
    $GLOBALS['sccc_test_themes'] = [];

    function wp_get_theme(string $stylesheet = ''): WP_Theme
    {
        return $GLOBALS['sccc_test_themes'][$stylesheet] ?? new WP_Theme([]);
    }

    /**
     * @return array<string,WP_Theme>
     */
    function wp_get_themes(): array
    {
        return $GLOBALS['sccc_test_themes'];
    }
}

if (! function_exists('get_bloginfo')) {
    $GLOBALS['sccc_test_bloginfo'] = ['version' => '6.6'];

    function get_bloginfo(string $show = ''): string
    {
        return $GLOBALS['sccc_test_bloginfo'][$show] ?? '';
    }
}

if (! class_exists('WP_Query')) {
    class WP_Query
    {
        /** @var array<int,object> */
        public array $posts = [];

        /**
         * @param array<string,mixed> $args
         */
        public function __construct(array $args = [])
        {
            $all = $GLOBALS['sccc_test_posts'] ?? [];
            $offset = (int) ($args['offset'] ?? 0);
            $limit = (int) ($args['posts_per_page'] ?? count($all));
            $this->posts = array_slice($all, $offset, $limit);
        }
    }
}

if (! function_exists('get_permalink')) {
    function get_permalink(object $post): string
    {
        return (string) ($post->permalink ?? '');
    }
}

if (! function_exists('wp_remote_post')) {
    $GLOBALS['sccc_test_remote_posts'] = [];

    /**
     * @param array<string,mixed> $args
     * @return array{response:array{code:int}}
     */
    function wp_remote_post(string $url, array $args = []): array
    {
        $GLOBALS['sccc_test_remote_posts'][] = [
            'url' => $url,
            'body' => (string) ($args['body'] ?? ''),
        ];

        return ['response' => ['code' => 200]];
    }

    function is_wp_error(mixed $thing): bool
    {
        return false;
    }

    /**
     * @param array{response:array{code:int}} $response
     */
    function wp_remote_retrieve_response_code(array $response): int
    {
        return (int) $response['response']['code'];
    }
}

if (! function_exists('wp_remote_get')) {
    $GLOBALS['sccc_test_remote_gets'] = [];
    $GLOBALS['sccc_test_remote_get_response'] = ['response' => ['code' => 200], 'body' => '{}'];

    /**
     * @param array<string,mixed> $args
     * @return array{response:array{code:int},body?:string}
     */
    function wp_remote_get(string $url, array $args = []): array
    {
        $GLOBALS['sccc_test_remote_gets'][] = [
            'url' => $url,
            'headers' => (array) ($args['headers'] ?? []),
        ];

        return $GLOBALS['sccc_test_remote_get_response'];
    }

    /**
     * @param array{response:array{code:int},body?:string} $response
     */
    function wp_remote_retrieve_body(array $response): string
    {
        return (string) ($response['body'] ?? '');
    }
}

if (! class_exists('WP_Error')) {
    class WP_Error
    {
        public function __construct(
            private readonly string $code,
            private readonly string $message,
            private readonly array $data = []
        ) {
        }

        public function get_error_code(): string
        {
            return $this->code;
        }

        public function get_error_message(): string
        {
            return $this->message;
        }

        public function get_error_data(): array
        {
            return $this->data;
        }
    }
}

if (! class_exists('WP_REST_Response')) {
    class WP_REST_Response
    {
        public function __construct(private readonly mixed $data = null, private readonly int $status = 200)
        {
        }

        public function get_data(): mixed
        {
            return $this->data;
        }

        public function get_status(): int
        {
            return $this->status;
        }
    }
}

if (! class_exists('WP_REST_Request')) {
    class WP_REST_Request
    {
        private string $body = '';

        /** @var array<string,string> */
        private array $headers = [];

        public function set_body(string $body): void
        {
            $this->body = $body;
        }

        public function get_body(): string
        {
            return $this->body;
        }

        /**
         * @param array<string,string> $headers
         */
        public function set_headers(array $headers): void
        {
            foreach ($headers as $name => $value) {
                $this->headers[strtolower($name)] = $value;
            }
        }

        public function get_header(string $name): string
        {
            return $this->headers[strtolower($name)] ?? '';
        }
    }
}

if (! function_exists('get_post_meta')) {
    $GLOBALS['sccc_test_post_meta'] = [];

    function get_post_meta(int $post_id, string $key, bool $single = false): mixed
    {
        $value = $GLOBALS['sccc_test_post_meta'][$post_id][$key] ?? ($single ? '' : []);

        return $single ? $value : [$value];
    }

    function update_post_meta(int $post_id, string $key, mixed $value): bool
    {
        $GLOBALS['sccc_test_post_meta'][$post_id][$key] = $value;

        return true;
    }

    function delete_post_meta(int $post_id, string $key): bool
    {
        unset($GLOBALS['sccc_test_post_meta'][$post_id][$key]);

        return true;
    }
}

if (! function_exists('get_post')) {
    $GLOBALS['sccc_test_posts_by_id'] = [];

    function get_post(int $post_id): ?object
    {
        return $GLOBALS['sccc_test_posts_by_id'][$post_id] ?? null;
    }
}

require_once __DIR__ . '/../includes/RequestSigner.php';
require_once __DIR__ . '/../includes/ApiClient.php';
require_once __DIR__ . '/../includes/ConnectionStore.php';
require_once __DIR__ . '/../includes/SafeOperationEndpoint.php';
require_once __DIR__ . '/../includes/ContentCollector.php';
require_once __DIR__ . '/../includes/SyncLogStore.php';
require_once __DIR__ . '/../includes/SyncScheduler.php';
require_once __DIR__ . '/../includes/LocalAuditEngine.php';
require_once __DIR__ . '/../includes/LocalLinkGraph.php';
require_once __DIR__ . '/../includes/LocalAuditSettings.php';
require_once __DIR__ . '/../includes/LocalAuditStore.php';
require_once __DIR__ . '/../includes/LocalAuditRunner.php';
require_once __DIR__ . '/../includes/PlatformConversion.php';
require_once __DIR__ . '/../includes/AdminPage.php';
require_once __DIR__ . '/../includes/SystemEventReporter.php';

$signer = new SCCC\Plugin\RequestSigner();
$api_client = new SCCC\Plugin\ApiClient($signer);
$collector = new SCCC\Plugin\ContentCollector();
$sync_log_store = new SCCC\Plugin\SyncLogStore();
$local_audit_engine = new SCCC\Plugin\LocalAuditEngine();
$local_link_graph = new SCCC\Plugin\LocalLinkGraph();
$local_audit_settings = new SCCC\Plugin\LocalAuditSettings();
$local_audit_store = new SCCC\Plugin\LocalAuditStore();
$timestamp = time();
$body = '{"siteId":"22222222-2222-4222-8222-222222222222"}';
$signature = $signer->sign('POST', '/api/plugin/sync', $timestamp, $body, 'secret');

if (! $signer->verify('POST', '/api/plugin/sync', $timestamp, $body, 'secret', $signature)) {
    fwrite(STDERR, "RequestSigner verification failed.\n");
    exit(1);
}

if ($signer->verify('POST', '/api/plugin/sync', $timestamp - 600, $body, 'secret', $signature)) {
    fwrite(STDERR, "RequestSigner accepted an expired timestamp.\n");
    exit(1);
}

$connection = [
    'organization_id' => '11111111-1111-4111-8111-111111111111',
    'site_id' => '22222222-2222-4222-8222-222222222222',
    'token' => 'secret',
    'endpoint' => 'https://app.example.com/',
    'connected_at' => $timestamp,
];

if ('https://app.example.com/api/plugin/sync' !== $api_client->buildApiUrl($connection['endpoint'], '/api/plugin/sync')) {
    fwrite(STDERR, "ApiClient URL builder failed.\n");
    exit(1);
}

$sync_body = $api_client->buildSyncBody($connection);

if ('{"organizationId":"11111111-1111-4111-8111-111111111111","siteId":"22222222-2222-4222-8222-222222222222","cursor":null,"items":[]}' !== $sync_body) {
    fwrite(STDERR, "ApiClient sync body builder failed.\n");
    exit(1);
}

$disconnect_body = $api_client->buildDisconnectBody($connection);

if ('{"organizationId":"11111111-1111-4111-8111-111111111111","siteId":"22222222-2222-4222-8222-222222222222"}' !== $disconnect_body) {
    fwrite(STDERR, "ApiClient disconnect body builder failed.\n");
    exit(1);
}

$GLOBALS['sccc_test_post_meta'][123] = [
    '_yoast_wpseo_title' => 'Yoast SEO title',
    '_yoast_wpseo_metadesc' => 'Yoast description',
    '_yoast_wpseo_canonical' => 'https://wp.example.com/canonical/',
    '_yoast_wpseo_meta-robots-noindex' => '1',
    '_yoast_wpseo_meta-robots-nofollow' => '1',
];

$item = $collector->mapPost(
    (object) [
        'ID' => 123,
        'post_type' => 'post',
        'post_title' => 'Hello SEO',
        'post_status' => 'publish',
        'post_modified_gmt' => '2026-07-01 08:00:00',
        'post_date_gmt' => '2026-06-30 07:00:00',
        'post_author' => 7,
        'post_content' => '<p>Hello search teams, improve this page.</p><a href="/about"></a><a href="https://partner.example.com/resource"></a><a href="#toc"></a><a href="mailto:editor@example.com"></a>',
    ],
    'https://wp.example.com/hello-seo/'
);

if (
    [
        'externalId' => 'post:123',
        'type' => 'post',
        'url' => 'https://wp.example.com/hello-seo/',
        'title' => 'Hello SEO',
        'status' => 'publish',
        'modifiedAt' => '2026-07-01T08:00:00+00:00',
        'metadata' => [
            'authorId' => 7,
            'authorName' => null,
            'publishedAt' => '2026-06-30T07:00:00+00:00',
            'featuredImagePresent' => false,
            'featuredImageId' => null,
            'featuredImageUrl' => null,
            'taxonomies' => [],
            'wordCount' => 6,
            'internalLinkCount' => 1,
            'externalLinkCount' => 1,
            'seoPlugin' => 'yoast',
            'seoTitle' => 'Yoast SEO title',
            'metaDescription' => 'Yoast description',
            'canonicalUrl' => 'https://wp.example.com/canonical/',
            'robotsNoindex' => true,
            'robotsNofollow' => true,
        ],
    ] !== $item
) {
    fwrite(STDERR, "ContentCollector post mapper failed.\n");
    exit(1);
}

$linked_items = $local_link_graph->analyze(
    [
        [
            'external_id' => 'post:1',
            'url' => 'https://wp.example.com/source/',
            'outbound_urls' => ['/target/'],
            'findings' => [],
        ],
        [
            'external_id' => 'page:2',
            'url' => 'http://www.wp.example.com/target',
            'outbound_urls' => [],
            'findings' => [],
        ],
    ]
);

if (
    0 !== ($linked_items[0]['inbound_link_count'] ?? null)
    || 'orphan-content' !== ($linked_items[0]['findings'][0]['code'] ?? null)
    || 1 !== ($linked_items[1]['inbound_link_count'] ?? null)
    || 'weakly-linked-content' !== ($linked_items[1]['findings'][0]['code'] ?? null)
    || isset($linked_items[0]['outbound_urls'])
) {
    fwrite(STDERR, "LocalLinkGraph analysis failed.\n");
    exit(1);
}

$ignored_fingerprint = SCCC\Plugin\LocalAuditSettings::fingerprint('post:1', 'orphan-content');
$local_audit_settings->setIgnored($ignored_fingerprint, true);

if (! $local_audit_settings->isIgnored('post:1', 'orphan-content')) {
    fwrite(STDERR, "LocalAuditSettings ignore rule failed.\n");
    exit(1);
}

$local_audit_settings->setIgnored($ignored_fingerprint, false);
$local_audit_settings->setInterval('daily');

if ('daily' !== $local_audit_settings->get()['interval']) {
    fwrite(STDERR, "LocalAuditSettings interval failed.\n");
    exit(1);
}

$platform_conversion = new SCCC\Plugin\PlatformConversion();
$platform_details = $platform_conversion->describe(
    [
        'site_id' => '22222222-2222-4222-8222-222222222222',
        'endpoint' => 'https://app.example.com/',
    ],
    [
        'external_id' => 'post:123',
        'url' => 'https://wp.example.com/a page/',
        'code' => 'meta-description-missing',
        'seo_plugin' => 'yoast',
    ]
);

if (
    'https://app.example.com/content?site=22222222-2222-4222-8222-222222222222&q=post%3A123' !== $platform_details['content_url']
    || 'https://app.example.com/audits?site=22222222-2222-4222-8222-222222222222&auditIssueQ=https%3A%2F%2Fwp.example.com%2Fa%20page%2F' !== $platform_details['audit_url']
    || true !== $platform_details['gsc_enrichable']
    || true !== $platform_details['safe_operation']['available']
    || 'meta description' !== $platform_details['safe_operation']['field']
) {
    fwrite(STDERR, "PlatformConversion connected metadata description failed.\n");
    exit(1);
}

$fallback_details = $platform_conversion->describe(
    [
        'site_id' => '22222222-2222-4222-8222-222222222222',
        'endpoint' => 'https://app.example.com',
    ],
    [
        'external_id' => 'post:123',
        'url' => 'https://wp.example.com/page/',
        'code' => 'meta-description-missing',
        'seo_plugin' => 'fallback',
    ]
);

if (true === $fallback_details['safe_operation']['available']) {
    fwrite(STDERR, "PlatformConversion exposed an unsupported fallback metadata operation.\n");
    exit(1);
}

$audit_item = [
    'externalId' => 'page:99',
    'type' => 'page',
    'url' => 'https://wp.example.com/audit-page/',
    'title' => 'Audit page',
    'status' => 'publish',
    'modifiedAt' => '2025-01-01T00:00:00+00:00',
    'metadata' => [
        'wordCount' => 120,
        'internalLinkCount' => 0,
        'seoTitle' => null,
        'metaDescription' => null,
        'canonicalUrl' => 'https://wp.example.com/another-page/',
        'robotsNoindex' => true,
    ],
];
$audit_findings = $local_audit_engine->inspect($audit_item, strtotime('2026-08-14T00:00:00+00:00'));
$audit_codes = array_column($audit_findings, 'code');

if (
    [
        'published-noindex',
        'seo-title-missing',
        'meta-description-missing',
        'canonical-different',
        'thin-content',
        'internal-links-missing',
        'content-stale',
    ] !== $audit_codes
) {
    fwrite(STDERR, "LocalAuditEngine finding generation failed.\n");
    exit(1);
}

$draft_item = $audit_item;
$draft_item['status'] = 'draft';

if ([] !== $local_audit_engine->inspect($draft_item, strtotime('2026-08-14T00:00:00+00:00'))) {
    fwrite(STDERR, "LocalAuditEngine did not skip unpublished content.\n");
    exit(1);
}

$summary = $local_audit_engine->summarize(
    [
        ['findings' => $audit_findings],
        ['findings' => []],
    ]
);

if (
    2 !== $summary['total_urls']
    || 1 !== $summary['affected_urls']
    || 7 !== $summary['issue_count']
    || 1 !== $summary['critical']
    || 3 !== $summary['attention']
    || 2 !== $summary['opportunity']
    || 1 !== $summary['maintenance']
    || 1 !== $summary['complete']
) {
    fwrite(STDERR, "LocalAuditEngine summary failed.\n");
    exit(1);
}

$local_audit_store->start();

if ('queued' !== ($local_audit_store->get()['status'] ?? null)) {
    fwrite(STDERR, "LocalAuditStore queued state failed.\n");
    exit(1);
}

$local_audit_store->complete([['findings' => $audit_findings]], $summary);
$stored_audit = $local_audit_store->get();

if ('complete' !== ($stored_audit['status'] ?? null) || 7 !== ($stored_audit['summary']['issue_count'] ?? null)) {
    fwrite(STDERR, "LocalAuditStore completed state failed.\n");
    exit(1);
}

$local_audit_store->fail('Audit failed at https://wp.example.com/private');
$failed_audit = $local_audit_store->get();

if ('error' !== ($failed_audit['status'] ?? null) || str_contains((string) ($failed_audit['error'] ?? ''), 'https://wp.example.com/private')) {
    fwrite(STDERR, "LocalAuditStore failure state or redaction failed.\n");
    exit(1);
}

delete_option('sccc_local_audit');
$previous_item = [
    'external_id' => 'post:10',
    'title' => 'Previous title',
    'url' => 'https://wp.example.com/previous/',
    'findings' => [[
        'code' => 'thin-content',
        'label' => 'Thin content',
        'severity' => 'opportunity',
        'evidence' => 'Previous evidence.',
        'ignored' => false,
    ]],
];
$current_item = [
    'external_id' => 'post:11',
    'title' => 'Current title',
    'url' => 'https://wp.example.com/current/',
    'findings' => [[
        'code' => 'orphan-content',
        'label' => 'No inbound internal links',
        'severity' => 'warning',
        'evidence' => 'Current evidence.',
        'ignored' => false,
    ]],
];
$local_audit_store->start();
$local_audit_store->complete([$previous_item], $local_audit_engine->summarize([$previous_item]));
$local_audit_store->start();
$local_audit_store->complete([$current_item], $local_audit_engine->summarize([$current_item]));
$changed_audit = $local_audit_store->get();

if (
    1 !== ($changed_audit['changes']['new_count'] ?? null)
    || 1 !== ($changed_audit['changes']['resolved_count'] ?? null)
    || 'new' !== ($changed_audit['items'][0]['findings'][0]['change'] ?? null)
) {
    fwrite(STDERR, "LocalAuditStore change comparison failed.\n");
    exit(1);
}

$current_fingerprint = (string) ($changed_audit['items'][0]['findings'][0]['fingerprint'] ?? '');
$local_audit_store->setIgnored($current_fingerprint, true);
$ignored_audit = $local_audit_store->get();

if (0 !== ($ignored_audit['changes']['new_count'] ?? null) || 1 !== ($ignored_audit['summary']['ignored_findings'] ?? null)) {
    fwrite(STDERR, "LocalAuditStore ignored finding summary failed.\n");
    exit(1);
}

$ignored_sync_findings = $local_audit_store->findingsForSync();

if (! is_array($ignored_sync_findings) || [] !== ($ignored_sync_findings['post:11'] ?? null)) {
    fwrite(STDERR, "LocalAuditStore exported an ignored finding.\n");
    exit(1);
}

$local_audit_store->setIgnored($current_fingerprint, false);
$restored_audit = $local_audit_store->get();

if (1 !== ($restored_audit['changes']['new_count'] ?? null)) {
    fwrite(STDERR, "LocalAuditStore restored finding state failed.\n");
    exit(1);
}

$restored_sync_findings = $local_audit_store->findingsForSync();

if (
    'orphan-content' !== ($restored_sync_findings['post:11'][0]['code'] ?? null)
    || 64 !== strlen((string) ($restored_sync_findings['post:11'][0]['fingerprint'] ?? ''))
) {
    fwrite(STDERR, "LocalAuditStore bounded finding export failed.\n");
    exit(1);
}

$sync_body_with_items = $api_client->buildSyncBody($connection, [$item]);

if (! str_contains($sync_body_with_items, '"externalId":"post:123"')) {
    fwrite(STDERR, "ApiClient sync body items failed.\n");
    exit(1);
}

if (! str_contains($sync_body_with_items, '"wordCount":6')) {
    fwrite(STDERR, "ApiClient sync body metadata failed.\n");
    exit(1);
}

if (! str_contains($sync_body_with_items, '"internalLinkCount":1') || ! str_contains($sync_body_with_items, '"externalLinkCount":1')) {
    fwrite(STDERR, "ApiClient sync body link metadata failed.\n");
    exit(1);
}

if (! str_contains($sync_body_with_items, '"seoPlugin":"yoast"')) {
    fwrite(STDERR, "ApiClient sync body SEO metadata failed.\n");
    exit(1);
}

$headers = $api_client->buildSignedHeaders($connection, 'POST', '/api/plugin/sync', $sync_body, $timestamp);

if (empty($headers['X-SCCC-Signature']) || empty($headers['X-SCCC-Token']) || 'secret' !== $headers['X-SCCC-Token']) {
    fwrite(STDERR, "ApiClient signed headers failed.\n");
    exit(1);
}

$disconnect_headers = $api_client->buildSignedHeaders($connection, 'POST', '/api/plugin/connections/disconnect', $disconnect_body, $timestamp);

if (! $signer->verify('POST', '/api/plugin/connections/disconnect', $timestamp, $disconnect_body, 'secret', $disconnect_headers['X-SCCC-Signature'])) {
    fwrite(STDERR, "ApiClient disconnect signed headers failed.\n");
    exit(1);
}

$get_headers = $api_client->buildSignedHeaders($connection, 'GET', '/api/plugin/monitoring-summary', '', $timestamp);

if (! $signer->verify('GET', '/api/plugin/monitoring-summary', $timestamp, '', 'secret', $get_headers['X-SCCC-Signature'])) {
    fwrite(STDERR, "ApiClient GET signed headers failed.\n");
    exit(1);
}

if ($get_headers['X-SCCC-Signature'] === $headers['X-SCCC-Signature']) {
    fwrite(STDERR, "ApiClient GET and POST signatures must differ when the method changes.\n");
    exit(1);
}

$GLOBALS['sccc_test_remote_gets'] = [];
$GLOBALS['sccc_test_remote_get_response'] = [
    'response' => ['code' => 200],
    'body' => wp_json_encode([
        'data' => [
            'monitoredUrlCount' => 3,
            'openRegressionCount' => 1,
            'criticalOpenRegressionCount' => 1,
            'recentRegressions' => [
                [
                    'id' => '33333333-3333-4333-8333-333333333333',
                    'title' => 'Page started returning HTTP 404',
                    'summary' => 'The monitored URL stopped responding with a successful status code.',
                    'severity' => 'CRITICAL',
                    'status' => 'OPEN',
                    'detectedAt' => '2026-08-26T10:00:00.000Z',
                ],
            ],
        ],
    ]),
];

$monitoring_summary = $api_client->fetchMonitoringSummary($connection);

if (
    3 !== $monitoring_summary['monitoredUrlCount']
    || 1 !== $monitoring_summary['openRegressionCount']
    || 1 !== $monitoring_summary['criticalOpenRegressionCount']
    || 1 !== count($monitoring_summary['recentRegressions'])
    || 'CRITICAL' !== $monitoring_summary['recentRegressions'][0]['severity']
) {
    fwrite(STDERR, "ApiClient fetchMonitoringSummary did not parse the platform response correctly.\n");
    exit(1);
}

if (1 !== count($GLOBALS['sccc_test_remote_gets'])) {
    fwrite(STDERR, "ApiClient fetchMonitoringSummary did not issue exactly one GET request.\n");
    exit(1);
}

$monitoring_request = $GLOBALS['sccc_test_remote_gets'][0];

if ('https://app.example.com/api/plugin/monitoring-summary' !== $monitoring_request['url']) {
    fwrite(STDERR, "ApiClient fetchMonitoringSummary requested the wrong URL.\n");
    exit(1);
}

if (empty($monitoring_request['headers']['X-SCCC-Signature']) || empty($monitoring_request['headers']['X-SCCC-Token'])) {
    fwrite(STDERR, "ApiClient fetchMonitoringSummary did not sign its request.\n");
    exit(1);
}

$GLOBALS['sccc_test_remote_get_response'] = ['response' => ['code' => 500], 'body' => ''];
$monitoring_summary_failed = false;

try {
    $api_client->fetchMonitoringSummary($connection);
} catch (RuntimeException $exception) {
    $monitoring_summary_failed = 'monitoring_summary_failed' === $exception->getMessage();
}

if (! $monitoring_summary_failed) {
    fwrite(STDERR, "ApiClient fetchMonitoringSummary did not reject a non-200 platform response.\n");
    exit(1);
}

$GLOBALS['sccc_test_remote_gets'] = [];
$GLOBALS['sccc_test_remote_get_response'] = ['response' => ['code' => 200], 'body' => '{}'];

$admin_page = new SCCC\Plugin\AdminPage();

foreach (['Plugin.php', 'SyncScheduler.php'] as $redirect_source) {
    $redirect_code = file_get_contents(__DIR__ . '/../includes/' . $redirect_source);

    if (false === $redirect_code || str_contains($redirect_code, 'options-general.php?page=sccc')) {
        fwrite(STDERR, "Plugin admin redirect still targets the retired Settings URL.\n");
        exit(1);
    }
}

if (
    [
        'type' => 'success',
        'message' => 'Site connected. Automatic sync has been scheduled.',
    ] !== $admin_page->getFeedbackNotice('connected', '')
) {
    fwrite(STDERR, "AdminPage connected notice failed.\n");
    exit(1);
}

if (
    [
        'type' => 'error',
        'message' => 'Could not connect this site. Check the SaaS endpoint and challenge.',
    ] !== $admin_page->getFeedbackNotice('connected', 'connection_exchange_failed')
) {
    fwrite(STDERR, "AdminPage error notice precedence failed.\n");
    exit(1);
}

if (null !== $admin_page->getFeedbackNotice('unknown_status', 'unknown_error')) {
    fwrite(STDERR, "AdminPage unknown notice handling failed.\n");
    exit(1);
}

$connection_store = new SCCC\Plugin\ConnectionStore();
$scheduler = new SCCC\Plugin\SyncScheduler($connection_store, $api_client, $collector, $sync_log_store);

if ('not connected' !== $scheduler->ensureRecurringSync()) {
    fwrite(STDERR, "SyncScheduler did not skip recurring sync while disconnected.\n");
    exit(1);
}

$connection_store->save(
    $connection['organization_id'],
    $connection['site_id'],
    $connection['token'],
    $connection['endpoint']
);

if ('WP-Cron' !== $scheduler->queueSync() || false === wp_next_scheduled('sccc_run_manual_sync')) {
    fwrite(STDERR, "SyncScheduler did not queue manual sync on its own hook.\n");
    exit(1);
}

if ('WP-Cron' !== $scheduler->ensureRecurringSync()) {
    fwrite(STDERR, "SyncScheduler did not use WP-Cron fallback.\n");
    exit(1);
}

if (false === wp_next_scheduled('sccc_run_incremental_sync')) {
    fwrite(STDERR, "SyncScheduler did not schedule recurring sync on its own hook.\n");
    exit(1);
}

$recurring_status = $scheduler->getRecurringSyncStatus();

if (! $recurring_status['enabled'] || 'WP-Cron' !== $recurring_status['scheduler'] || null === $recurring_status['next_run_at']) {
    fwrite(STDERR, "SyncScheduler recurring status failed.\n");
    exit(1);
}

$scheduled_count = count($GLOBALS['sccc_test_scheduled_events']);
$scheduler->ensureRecurringSync();

if ($scheduled_count !== count($GLOBALS['sccc_test_scheduled_events'])) {
    fwrite(STDERR, "SyncScheduler duplicated recurring events.\n");
    exit(1);
}

$scheduler->cancelScheduledSyncs();

if (false !== wp_next_scheduled('sccc_run_incremental_sync') || false !== wp_next_scheduled('sccc_run_manual_sync')) {
    fwrite(STDERR, "SyncScheduler did not cancel scheduled sync jobs.\n");
    exit(1);
}

$connection_store->disconnect();

$sync_log_store->recordQueued('Action Scheduler');
$sync_log_store->recordSuccess(3);
$sync_log_store->recordFailure('token=secret failed at https://wp.example.com/private', 2);

$sync_logs = $sync_log_store->all();

if (3 !== count($sync_logs) || 'error' !== $sync_logs[0]['status'] || 2 !== $sync_logs[0]['item_count']) {
    fwrite(STDERR, "SyncLogStore entry recording failed.\n");
    exit(1);
}

if (str_contains($sync_logs[0]['message'], 'secret') || str_contains($sync_logs[0]['message'], 'https://wp.example.com/private')) {
    fwrite(STDERR, "SyncLogStore did not redact sensitive failure details.\n");
    exit(1);
}

for ($i = 0; $i < 12; $i++) {
    $sync_log_store->recordSuccess($i);
}

if (10 !== count($sync_log_store->all())) {
    fwrite(STDERR, "SyncLogStore did not bound recent entries.\n");
    exit(1);
}

$cursor_body = $api_client->buildSyncBody($connection, [], '200');

if (! str_contains($cursor_body, '"cursor":"200"')) {
    fwrite(STDERR, "ApiClient sync body cursor failed.\n");
    exit(1);
}

$GLOBALS['sccc_test_posts'] = array_map(
    static fn (int $id): object => (object) [
        'ID' => $id,
        'post_type' => 'post',
        'post_title' => 'Post ' . $id,
        'post_status' => 'publish',
        'post_modified_gmt' => '2026-07-01 08:00:00',
        'post_date_gmt' => '2026-06-30 07:00:00',
        'post_author' => 1,
        'post_content' => '<p>Body copy for post.</p>',
        'permalink' => 'https://wp.example.com/post-' . $id . '/',
    ],
    [1, 2, 3, 4, 5]
);
$GLOBALS['sccc_test_posts_by_id'] = [];

foreach ($GLOBALS['sccc_test_posts'] as $test_post) {
    $GLOBALS['sccc_test_posts_by_id'][(int) $test_post->ID] = $test_post;
}

$first_batch = $collector->collectBatch(0, 2);

if (2 !== count($first_batch['items']) || true !== $first_batch['hasMore']) {
    fwrite(STDERR, "ContentCollector first batch pagination failed.\n");
    exit(1);
}

$last_batch = $collector->collectBatch(4, 2);

if (1 !== count($last_batch['items']) || false !== $last_batch['hasMore']) {
    fwrite(STDERR, "ContentCollector last batch pagination failed.\n");
    exit(1);
}

$GLOBALS['sccc_test_posts'][2]->permalink = '';
$skip_batch = $collector->collectBatch(0, 5);

if (4 !== count($skip_batch['items']) || true !== $skip_batch['hasMore']) {
    fwrite(STDERR, "ContentCollector permalink skip batch failed.\n");
    exit(1);
}

$GLOBALS['sccc_test_posts'][2]->permalink = 'https://wp.example.com/post-3/';

$local_audit_runner = new SCCC\Plugin\LocalAuditRunner(
    $collector,
    $local_audit_engine,
    $local_audit_store,
    2,
    $local_link_graph,
    $local_audit_settings
);

if ('WP-Cron' !== $local_audit_runner->queue() || false === wp_next_scheduled(SCCC\Plugin\LocalAuditRunner::HOOK)) {
    fwrite(STDERR, "LocalAuditRunner did not queue its background job.\n");
    exit(1);
}

$local_audit_runner->cancelScheduled();

if (false !== wp_next_scheduled(SCCC\Plugin\LocalAuditRunner::HOOK)) {
    fwrite(STDERR, "LocalAuditRunner did not cancel its background job.\n");
    exit(1);
}

$local_audit_settings->setInterval('daily');

if ('WP-Cron' !== $local_audit_runner->ensureRecurring() || false === wp_next_scheduled(SCCC\Plugin\LocalAuditRunner::RECURRING_HOOK)) {
    fwrite(STDERR, "LocalAuditRunner did not schedule a recurring local audit.\n");
    exit(1);
}

$audit_schedule_status = $local_audit_runner->getRecurringStatus();

if (! $audit_schedule_status['enabled'] || 'daily' !== $audit_schedule_status['interval'] || 'WP-Cron' !== $audit_schedule_status['scheduler']) {
    fwrite(STDERR, "LocalAuditRunner recurring status failed.\n");
    exit(1);
}

$local_audit_runner->cancelScheduled();
$local_audit_settings->setInterval('off');

$local_audit_runner->run();
$runner_audit = $local_audit_store->get();

if (
    'complete' !== ($runner_audit['status'] ?? null)
    || 5 !== ($runner_audit['summary']['total_urls'] ?? null)
    || 'fallback' !== ($runner_audit['items'][0]['seo_plugin'] ?? null)
) {
    fwrite(STDERR, "LocalAuditRunner did not persist a complete paginated audit.\n");
    exit(1);
}

$connection_store->save(
    $connection['organization_id'],
    $connection['site_id'],
    $connection['token'],
    $connection['endpoint']
);
$GLOBALS['sccc_test_remote_posts'] = [];
$paginated_scheduler = new SCCC\Plugin\SyncScheduler(
    $connection_store,
    $api_client,
    $collector,
    $sync_log_store,
    2,
    $local_audit_store
);
$paginated_scheduler->runSync();

if (3 !== count($GLOBALS['sccc_test_remote_posts'])) {
    fwrite(STDERR, "SyncScheduler did not send three paginated batches.\n");
    exit(1);
}

$cursors = array_map(
    static function (array $request): ?string {
        $decoded = json_decode($request['body'], true);

        return is_array($decoded) ? ($decoded['cursor'] ?? null) : null;
    },
    $GLOBALS['sccc_test_remote_posts']
);

if (['0', '2', '4'] !== $cursors) {
    fwrite(STDERR, "SyncScheduler paginated cursors failed.\n");
    exit(1);
}

$synced_items = array_merge(
    ...array_map(
        static function (array $request): array {
            $decoded = json_decode($request['body'], true);

            return is_array($decoded) && is_array($decoded['items'] ?? null) ? $decoded['items'] : [];
        },
        $GLOBALS['sccc_test_remote_posts']
    )
);
$first_synced_findings = $synced_items[0]['metadata']['localFindings'] ?? null;

if (
    ! is_array($first_synced_findings)
    || 'orphan-content' !== ($first_synced_findings[array_key_last($first_synced_findings)]['code'] ?? null)
) {
    fwrite(STDERR, "SyncScheduler did not attach completed local findings.\n");
    exit(1);
}

$latest_log = $sync_log_store->all()[0];

if ('success' !== $latest_log['status'] || 5 !== $latest_log['item_count']) {
    fwrite(STDERR, "SyncScheduler paginated sync log failed.\n");
    exit(1);
}

$safe_operation_endpoint = new SCCC\Plugin\SafeOperationEndpoint($connection_store, $signer);
$GLOBALS['sccc_test_posts_by_id'][123] = (object) [
    'ID' => 123,
    'post_type' => 'post',
];
$GLOBALS['sccc_test_post_meta'][123] = [
    '_yoast_wpseo_title' => 'Old title',
    '_yoast_wpseo_metadesc' => 'Old description',
    '_yoast_wpseo_canonical' => 'https://wp.example.com/old-canonical/',
    '_yoast_wpseo_meta-robots-noindex' => '1',
    '_yoast_wpseo_meta-robots-nofollow' => '0',
];
$apply_body = (string) json_encode(
    [
        'organizationId' => $connection['organization_id'],
        'siteId' => $connection['site_id'],
        'operationId' => 'operation-123',
        'items' => [
            [
                'itemId' => 'item-123',
                'externalId' => 'post:123',
                'afterValue' => [
                    'seoPlugin' => 'yoast',
                    'seoTitle' => 'Updated SEO title',
                    'metaDescription' => null,
                    'canonicalUrl' => 'https://wp.example.com/updated-canonical/',
                    'robotsNoindex' => false,
                    'robotsNofollow' => true,
                ],
            ],
        ],
    ],
    JSON_UNESCAPED_SLASHES
);
$apply_request = new \WP_REST_Request();
$apply_request->set_body($apply_body);
$apply_request->set_headers(
    [
        'X-SCCC-Site-Id' => $connection['site_id'],
        'X-SCCC-Timestamp' => (string) $timestamp,
        'X-SCCC-Signature' => $signer->sign('POST', $safe_operation_endpoint->signedPath(), $timestamp, $apply_body, $connection['token']),
        'X-SCCC-Token' => $connection['token'],
    ]
);
$apply_response = $safe_operation_endpoint->handleApply($apply_request);

if (! $apply_response instanceof \WP_REST_Response || 200 !== $apply_response->get_status()) {
    fwrite(STDERR, "SafeOperationEndpoint signed apply response failed.\n");
    exit(1);
}

$apply_data = $apply_response->get_data();

if (
    ! is_array($apply_data)
    || 1 !== ($apply_data['data']['appliedCount'] ?? null)
    || 'COMPLETED' !== ($apply_data['data']['results'][0]['status'] ?? null)
) {
    fwrite(STDERR, "SafeOperationEndpoint signed apply result failed.\n");
    exit(1);
}

if (
    'Updated SEO title' !== ($GLOBALS['sccc_test_post_meta'][123]['_yoast_wpseo_title'] ?? null)
    || isset($GLOBALS['sccc_test_post_meta'][123]['_yoast_wpseo_metadesc'])
    || 'https://wp.example.com/updated-canonical/' !== ($GLOBALS['sccc_test_post_meta'][123]['_yoast_wpseo_canonical'] ?? null)
    || '0' !== ($GLOBALS['sccc_test_post_meta'][123]['_yoast_wpseo_meta-robots-noindex'] ?? null)
    || '1' !== ($GLOBALS['sccc_test_post_meta'][123]['_yoast_wpseo_meta-robots-nofollow'] ?? null)
) {
    fwrite(STDERR, "SafeOperationEndpoint did not write bounded Yoast fields.\n");
    exit(1);
}

$blocked_body = (string) json_encode(
    [
        'organizationId' => $connection['organization_id'],
        'siteId' => $connection['site_id'],
        'operationId' => 'operation-unsupported',
        'items' => [
            [
                'itemId' => 'item-unsupported',
                'externalId' => 'post:123',
                'afterValue' => [
                    'seoPlugin' => 'yoast',
                    'postContent' => 'This must never be accepted.',
                ],
            ],
        ],
    ],
    JSON_UNESCAPED_SLASHES
);
$blocked_request = new \WP_REST_Request();
$blocked_request->set_body($blocked_body);
$blocked_request->set_headers(
    [
        'X-SCCC-Site-Id' => $connection['site_id'],
        'X-SCCC-Timestamp' => (string) $timestamp,
        'X-SCCC-Signature' => $signer->sign('POST', $safe_operation_endpoint->signedPath(), $timestamp, $blocked_body, $connection['token']),
        'X-SCCC-Token' => $connection['token'],
    ]
);
$blocked_response = $safe_operation_endpoint->handleApply($blocked_request);
$blocked_data = $blocked_response instanceof \WP_REST_Response ? $blocked_response->get_data() : null;

if (
    ! is_array($blocked_data)
    || 1 !== ($blocked_data['data']['failedCount'] ?? null)
    || ! str_starts_with((string) ($blocked_data['data']['results'][0]['error'] ?? ''), 'unsupported_field:')
) {
    fwrite(STDERR, "SafeOperationEndpoint did not reject unsupported fields.\n");
    exit(1);
}

$invalid_signature_request = new \WP_REST_Request();
$invalid_signature_request->set_body($apply_body);
$invalid_signature_request->set_headers(
    [
        'X-SCCC-Site-Id' => $connection['site_id'],
        'X-SCCC-Timestamp' => (string) $timestamp,
        'X-SCCC-Signature' => 'bad-signature',
        'X-SCCC-Token' => $connection['token'],
    ]
);
$invalid_signature_response = $safe_operation_endpoint->handleApply($invalid_signature_request);

if (! $invalid_signature_response instanceof \WP_Error || 'PLUGIN_APPLY_SIGNATURE_INVALID' !== $invalid_signature_response->get_error_code()) {
    fwrite(STDERR, "SafeOperationEndpoint accepted an invalid signature.\n");
    exit(1);
}

$connection_store->disconnect();
unset($GLOBALS['sccc_test_posts']);

// --- SystemEventReporter -----------------------------------------------

$system_event_reporter = new SCCC\Plugin\SystemEventReporter($connection_store, $api_client);

$GLOBALS['sccc_test_scheduled_events'] = [];
$system_event_reporter->ensureBaseline();

if ([] !== $GLOBALS['sccc_test_scheduled_events']) {
    fwrite(STDERR, "SystemEventReporter queued an event while disconnected.\n");
    exit(1);
}

$connection_store->save(
    $connection['organization_id'],
    $connection['site_id'],
    $connection['token'],
    $connection['endpoint']
);

$GLOBALS['sccc_test_plugin_data'] = [
    WP_PLUGIN_DIR . '/yoast-seo/wp-seo.php' => ['Name' => 'Yoast SEO', 'Version' => '25.1'],
];

delete_option('sccc_plugin_versions');
delete_option('sccc_theme_versions');
delete_option('sccc_core_version');
$system_event_reporter->ensureBaseline();

$baseline_plugin_versions = get_option('sccc_plugin_versions');

if (! is_array($baseline_plugin_versions) || '25.1' !== ($baseline_plugin_versions['yoast-seo/wp-seo.php'] ?? null)) {
    fwrite(STDERR, "SystemEventReporter did not seed the plugin version baseline.\n");
    exit(1);
}

if ('6.6' !== get_option('sccc_core_version')) {
    fwrite(STDERR, "SystemEventReporter did not seed the core version baseline.\n");
    exit(1);
}

function sccc_last_scheduled_event(): array
{
    $events = $GLOBALS['sccc_test_scheduled_events'];

    if ([] === $events) {
        fwrite(STDERR, "Expected a scheduled system event but none was found.\n");
        exit(1);
    }

    $last = $events[count($events) - 1];

    if (SCCC\Plugin\SystemEventReporter::DELIVER_ACTION !== $last['hook']) {
        fwrite(STDERR, "Last scheduled event was not a system event delivery.\n");
        exit(1);
    }

    return $last['args'][0] ?? [];
}

$GLOBALS['sccc_test_scheduled_events'] = [];
$system_event_reporter->onPluginActivated('yoast-seo/wp-seo.php', false);
$activated_event = sccc_last_scheduled_event();

if (
    'plugin_activated' !== ($activated_event['type'] ?? null)
    || '25.1' !== ($activated_event['newValue'] ?? null)
    || null !== $activated_event['oldValue']
) {
    fwrite(STDERR, "SystemEventReporter did not build a plugin_activated event.\n");
    exit(1);
}

$GLOBALS['sccc_test_scheduled_events'] = [];
$system_event_reporter->onPluginDeactivated('yoast-seo/wp-seo.php', false);
$deactivated_event = sccc_last_scheduled_event();

if ('plugin_deactivated' !== ($deactivated_event['type'] ?? null) || '25.1' !== ($deactivated_event['oldValue'] ?? null)) {
    fwrite(STDERR, "SystemEventReporter did not build a plugin_deactivated event.\n");
    exit(1);
}

$GLOBALS['sccc_test_plugin_data'][WP_PLUGIN_DIR . '/yoast-seo/wp-seo.php']['Version'] = '25.2';
$GLOBALS['sccc_test_scheduled_events'] = [];
$system_event_reporter->onUpgraderProcessComplete(
    new stdClass(),
    ['action' => 'update', 'type' => 'plugin', 'plugins' => ['yoast-seo/wp-seo.php']]
);
$updated_event = sccc_last_scheduled_event();

if (
    'plugin_updated' !== ($updated_event['type'] ?? null)
    || '25.1' !== ($updated_event['oldValue'] ?? null)
    || '25.2' !== ($updated_event['newValue'] ?? null)
    || 'Yoast SEO updated from 25.1 to 25.2' !== ($updated_event['title'] ?? null)
) {
    fwrite(STDERR, "SystemEventReporter did not build a correct plugin_updated event.\n");
    exit(1);
}

$GLOBALS['sccc_test_scheduled_events'] = [];
$system_event_reporter->onUpgraderProcessComplete(
    new stdClass(),
    ['action' => 'update', 'type' => 'plugin', 'plugins' => ['yoast-seo/wp-seo.php']]
);

if ([] !== $GLOBALS['sccc_test_scheduled_events']) {
    fwrite(STDERR, "SystemEventReporter re-reported an unchanged plugin version.\n");
    exit(1);
}

$GLOBALS['sccc_test_plugin_data'][WP_PLUGIN_DIR . '/akismet/akismet.php'] = ['Name' => 'Akismet', 'Version' => '5.3'];
$GLOBALS['sccc_test_scheduled_events'] = [];
$system_event_reporter->onUpgraderProcessComplete(
    new stdClass(),
    ['action' => 'install', 'type' => 'plugin', 'plugin' => 'akismet/akismet.php']
);
$installed_event = sccc_last_scheduled_event();

if ('plugin_installed' !== ($installed_event['type'] ?? null) || null !== $installed_event['oldValue']) {
    fwrite(STDERR, "SystemEventReporter did not build a plugin_installed event.\n");
    exit(1);
}

$GLOBALS['sccc_test_scheduled_events'] = [];
$system_event_reporter->onPluginDeleted('akismet/akismet.php', true);
$deleted_event = sccc_last_scheduled_event();

if ('plugin_deleted' !== ($deleted_event['type'] ?? null) || '5.3' !== ($deleted_event['oldValue'] ?? null)) {
    fwrite(STDERR, "SystemEventReporter did not build a plugin_deleted event.\n");
    exit(1);
}

$deleted_plugin_versions = get_option('sccc_plugin_versions');

if (array_key_exists('akismet/akismet.php', $deleted_plugin_versions)) {
    fwrite(STDERR, "SystemEventReporter did not forget a deleted plugin's version.\n");
    exit(1);
}

$GLOBALS['sccc_test_themes'] = [
    'twentytwentyfour' => new WP_Theme(['Name' => 'Twenty Twenty-Four', 'Version' => '1.2']),
    'twentytwentyfive' => new WP_Theme(['Name' => 'Twenty Twenty-Five', 'Version' => '1.0']),
];
$GLOBALS['sccc_test_scheduled_events'] = [];
$system_event_reporter->onThemeSwitched(
    'Twenty Twenty-Five',
    $GLOBALS['sccc_test_themes']['twentytwentyfive'],
    $GLOBALS['sccc_test_themes']['twentytwentyfour']
);
$theme_activated_event = sccc_last_scheduled_event();

if (
    'theme_activated' !== ($theme_activated_event['type'] ?? null)
    || 'Twenty Twenty-Four' !== ($theme_activated_event['oldValue']['name'] ?? null)
    || 'Twenty Twenty-Five' !== ($theme_activated_event['newValue']['name'] ?? null)
) {
    fwrite(STDERR, "SystemEventReporter did not build a theme_activated event.\n");
    exit(1);
}

update_option('sccc_theme_versions', ['twentytwentyfive' => '1.0'], false);
$GLOBALS['sccc_test_themes']['twentytwentyfive'] = new WP_Theme(['Name' => 'Twenty Twenty-Five', 'Version' => '1.1']);
$GLOBALS['sccc_test_scheduled_events'] = [];
$system_event_reporter->onUpgraderProcessComplete(
    new stdClass(),
    ['action' => 'update', 'type' => 'theme', 'themes' => ['twentytwentyfive']]
);
$theme_updated_event = sccc_last_scheduled_event();

if (
    'theme_updated' !== ($theme_updated_event['type'] ?? null)
    || '1.0' !== ($theme_updated_event['oldValue'] ?? null)
    || '1.1' !== ($theme_updated_event['newValue'] ?? null)
) {
    fwrite(STDERR, "SystemEventReporter did not build a theme_updated event.\n");
    exit(1);
}

$GLOBALS['sccc_test_scheduled_events'] = [];
$system_event_reporter->onCoreUpdated('6.7');
$core_updated_event = sccc_last_scheduled_event();

if (
    'wordpress_core_updated' !== ($core_updated_event['type'] ?? null)
    || '6.6' !== ($core_updated_event['oldValue'] ?? null)
    || '6.7' !== ($core_updated_event['newValue'] ?? null)
) {
    fwrite(STDERR, "SystemEventReporter did not build a wordpress_core_updated event.\n");
    exit(1);
}

$GLOBALS['sccc_test_scheduled_events'] = [];
$system_event_reporter->onCoreUpdated('6.7');

if ([] !== $GLOBALS['sccc_test_scheduled_events']) {
    fwrite(STDERR, "SystemEventReporter re-reported an unchanged core version.\n");
    exit(1);
}

$GLOBALS['sccc_test_remote_posts'] = [];
$system_event_reporter->deliver($core_updated_event);
$delivered_requests = $GLOBALS['sccc_test_remote_posts'];

if (
    1 !== count($delivered_requests)
    || ! str_ends_with((string) $delivered_requests[0]['url'], '/api/plugin/system-events')
    || ! str_contains((string) $delivered_requests[0]['body'], 'wordpress_core_updated')
) {
    fwrite(STDERR, "SystemEventReporter did not deliver the queued event over the signed channel.\n");
    exit(1);
}

$connection_store->disconnect();
$GLOBALS['sccc_test_remote_posts'] = [];
$system_event_reporter->deliver($core_updated_event);

if ([] !== $GLOBALS['sccc_test_remote_posts']) {
    fwrite(STDERR, "SystemEventReporter delivered an event while disconnected.\n");
    exit(1);
}

echo "WordPress plugin smoke tests passed.\n";
