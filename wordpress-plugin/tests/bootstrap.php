<?php
/**
 * Minimal PHP smoke tests for pure plugin helpers.
 *
 * @package SCCC
 */

declare(strict_types=1);

require_once __DIR__ . '/../includes/RequestSigner.php';

$signer = new SCCC\Plugin\RequestSigner();
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

echo "WordPress plugin smoke tests passed.\n";

