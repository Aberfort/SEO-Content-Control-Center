<?php
/**
 * Request signing helper.
 *
 * @package SCCC
 */

declare(strict_types=1);

namespace SCCC\Plugin;

final class RequestSigner
{
    public function sign(string $method, string $path, int $timestamp, string $body, string $secret): string
    {
        $payload = strtoupper($method) . "\n" . $path . "\n" . $timestamp . "\n" . hash('sha256', $body);

        return hash_hmac('sha256', $payload, $secret);
    }

    public function verify(
        string $method,
        string $path,
        int $timestamp,
        string $body,
        string $secret,
        string $signature,
        int $toleranceSeconds = 300
    ): bool {
        if (abs(time() - $timestamp) > $toleranceSeconds) {
            return false;
        }

        $expected = $this->sign($method, $path, $timestamp, $body, $secret);

        return hash_equals($expected, $signature);
    }
}

