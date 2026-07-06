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
}

require_once __DIR__ . '/../includes/RequestSigner.php';
require_once __DIR__ . '/../includes/ApiClient.php';
require_once __DIR__ . '/../includes/ContentCollector.php';
require_once __DIR__ . '/../includes/SyncLogStore.php';

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

$item = $collector->mapPost(
    (object) [
        'ID' => 123,
        'post_type' => 'post',
        'post_title' => 'Hello SEO',
        'post_status' => 'publish',
        'post_modified_gmt' => '2026-07-01 08:00:00',
        'post_date_gmt' => '2026-06-30 07:00:00',
        'post_author' => 7,
        'post_content' => '<p>Hello search teams, improve this page.</p>',
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

$headers = $api_client->buildSignedHeaders($connection, '/api/plugin/sync', $sync_body, $timestamp);

if (empty($headers['X-SCCC-Signature']) || empty($headers['X-SCCC-Token']) || 'secret' !== $headers['X-SCCC-Token']) {
    fwrite(STDERR, "ApiClient signed headers failed.\n");
    exit(1);
}

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

echo "WordPress plugin smoke tests passed.\n";
