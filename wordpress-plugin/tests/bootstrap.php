<?php
/**
 * Minimal PHP smoke tests for pure plugin helpers.
 *
 * @package SCCC
 */

declare(strict_types=1);

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

if (! function_exists('get_post_meta')) {
    $GLOBALS['sccc_test_post_meta'] = [];

    function get_post_meta(int $post_id, string $key, bool $single = false): mixed
    {
        $value = $GLOBALS['sccc_test_post_meta'][$post_id][$key] ?? ($single ? '' : []);

        return $single ? $value : [$value];
    }
}

require_once __DIR__ . '/../includes/RequestSigner.php';
require_once __DIR__ . '/../includes/ApiClient.php';
require_once __DIR__ . '/../includes/ConnectionStore.php';
require_once __DIR__ . '/../includes/ContentCollector.php';
require_once __DIR__ . '/../includes/SyncLogStore.php';
require_once __DIR__ . '/../includes/SyncScheduler.php';
require_once __DIR__ . '/../includes/AdminPage.php';

$signer = new SCCC\Plugin\RequestSigner();
$api_client = new SCCC\Plugin\ApiClient($signer);
$collector = new SCCC\Plugin\ContentCollector();
$sync_log_store = new SCCC\Plugin\SyncLogStore();
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

$connection_store->disconnect();
unset($GLOBALS['sccc_test_posts']);

echo "WordPress plugin smoke tests passed.\n";
