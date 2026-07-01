<?php
/**
 * Minimal PHP smoke tests for pure plugin helpers.
 *
 * @package SCCC
 */

declare(strict_types=1);

require_once __DIR__ . '/../includes/RequestSigner.php';
require_once __DIR__ . '/../includes/ApiClient.php';
require_once __DIR__ . '/../includes/ContentCollector.php';

$signer = new SCCC\Plugin\RequestSigner();
$api_client = new SCCC\Plugin\ApiClient($signer);
$collector = new SCCC\Plugin\ContentCollector();
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

$headers = $api_client->buildSignedHeaders($connection, '/api/plugin/sync', $sync_body, $timestamp);

if (empty($headers['X-SCCC-Signature']) || empty($headers['X-SCCC-Token']) || 'secret' !== $headers['X-SCCC-Token']) {
    fwrite(STDERR, "ApiClient signed headers failed.\n");
    exit(1);
}

echo "WordPress plugin smoke tests passed.\n";
