<?php
/**
 * Certification helper: seeds a plugin connection the way a completed
 * challenge exchange would, so the signed apply endpoint can be certified
 * without a live SaaS. Never ships in the release archive.
 *
 * Usage: wp eval-file seed-connection.php <organizationId> <siteId> <token> <endpoint>
 *
 * No strict_types declaration: wp eval-file runs this through eval(), where
 * declare statements are rejected.
 *
 * @package SCCC
 */

$organizationId = isset($args[0]) ? (string) $args[0] : '';
$siteId = isset($args[1]) ? (string) $args[1] : '';
$token = isset($args[2]) ? (string) $args[2] : '';
$endpoint = isset($args[3]) ? (string) $args[3] : '';

if ('' === $organizationId || '' === $siteId || '' === $token || '' === $endpoint) {
    fwrite(STDERR, "seed-connection.php requires organizationId, siteId, token, and endpoint arguments.\n");
    exit(1);
}

if (! class_exists('SCCC\\Plugin\\ConnectionStore')) {
    fwrite(STDERR, "SCCC plugin classes are not loaded; is the plugin active?\n");
    exit(1);
}

(new SCCC\Plugin\ConnectionStore())->save($organizationId, $siteId, $token, $endpoint);

echo "connection-seeded\n";
