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

    function wp_schedule_single_event(int $timestamp, string $hook): bool
    {
        $GLOBALS['sccc_test_scheduled_events'][] = [
            'hook' => $hook,
            'timestamp' => $timestamp,
            'recurrence' => null,
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
require_once __DIR__ . '/../includes/AdminPage.php';

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

$local_audit_store->setIgnored($current_fingerprint, false);
$restored_audit = $local_audit_store->get();

if (1 !== ($restored_audit['changes']['new_count'] ?? null)) {
    fwrite(STDERR, "LocalAuditStore restored finding state failed.\n");
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

$headers = $api_client->buildSignedHeaders($connection, '/api/plugin/sync', $sync_body, $timestamp);

if (empty($headers['X-SCCC-Signature']) || empty($headers['X-SCCC-Token']) || 'secret' !== $headers['X-SCCC-Token']) {
    fwrite(STDERR, "ApiClient signed headers failed.\n");
    exit(1);
}

$disconnect_headers = $api_client->buildSignedHeaders($connection, '/api/plugin/connections/disconnect', $disconnect_body, $timestamp);

if (! $signer->verify('POST', '/api/plugin/connections/disconnect', $timestamp, $disconnect_body, 'secret', $disconnect_headers['X-SCCC-Signature'])) {
    fwrite(STDERR, "ApiClient disconnect signed headers failed.\n");
    exit(1);
}

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

if ('complete' !== ($runner_audit['status'] ?? null) || 5 !== ($runner_audit['summary']['total_urls'] ?? null)) {
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
    2
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

echo "WordPress plugin smoke tests passed.\n";
