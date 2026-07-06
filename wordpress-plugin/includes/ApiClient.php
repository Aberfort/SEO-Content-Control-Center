<?php
/**
 * SaaS API client.
 *
 * @package SCCC
 */

declare(strict_types=1);

namespace SCCC\Plugin;

use RuntimeException;

final class ApiClient
{
    public function __construct(private readonly RequestSigner $requestSigner)
    {
    }

    /**
     * @return array{organization_id:string,site_id:string,token:string,endpoint:string}
     */
    public function exchangeConnection(string $endpoint, string $challenge): array
    {
        $url = $this->buildApiUrl($endpoint, '/api/plugin/connections/exchange');
        $body = $this->encodeJson(
            [
                'challenge' => $challenge,
                'endpoint' => $endpoint,
            ]
        );
        $response = wp_remote_post(
            $url,
            [
                'headers' => [
                    'Content-Type' => 'application/json',
                ],
                'body' => $body,
                'timeout' => 15,
            ]
        );

        if (is_wp_error($response)) {
            throw new RuntimeException('connection_exchange_failed');
        }

        if (200 !== wp_remote_retrieve_response_code($response)) {
            throw new RuntimeException('connection_exchange_failed');
        }

        $payload = json_decode(wp_remote_retrieve_body($response), true);

        if (! is_array($payload) || empty($payload['data']) || ! is_array($payload['data'])) {
            throw new RuntimeException('connection_exchange_failed');
        }

        $data = $payload['data'];

        if (empty($data['organizationId']) || empty($data['siteId']) || empty($data['token'])) {
            throw new RuntimeException('connection_exchange_failed');
        }

        return [
            'organization_id' => (string) $data['organizationId'],
            'site_id' => (string) $data['siteId'],
            'token' => (string) $data['token'],
            'endpoint' => isset($data['endpoint']) ? (string) $data['endpoint'] : $endpoint,
        ];
    }

    /**
     * @param array{organization_id:string,site_id:string,token:string,endpoint:string,connected_at:int} $connection
     */
    /**
     * @param array<int,array{externalId:string,type:string,url:string,title:string|null,status:string,modifiedAt:string,metadata?:array<string,mixed>}> $items
     */
    public function sendSync(array $connection, array $items): void
    {
        $path = '/api/plugin/sync';
        $body = $this->buildSyncBody($connection, $items);
        $timestamp = time();
        $headers = $this->buildSignedHeaders($connection, $path, $body, $timestamp);
        $response = wp_remote_post(
            $this->buildApiUrl($connection['endpoint'], $path),
            [
                'headers' => array_merge(
                    [
                        'Content-Type' => 'application/json',
                    ],
                    $headers
                ),
                'body' => $body,
                'timeout' => 15,
            ]
        );

        if (is_wp_error($response)) {
            throw new RuntimeException('sync_failed');
        }

        if (200 !== wp_remote_retrieve_response_code($response)) {
            throw new RuntimeException('sync_failed');
        }
    }

    public function buildApiUrl(string $endpoint, string $path): string
    {
        return rtrim($endpoint, '/') . '/' . ltrim($path, '/');
    }

    /**
     * @param array{organization_id:string,site_id:string,token:string,endpoint:string,connected_at:int} $connection
     */
    /**
     * @param array<int,array{externalId:string,type:string,url:string,title:string|null,status:string,modifiedAt:string,metadata?:array<string,mixed>}> $items
     */
    public function buildSyncBody(array $connection, array $items = []): string
    {
        return $this->encodeJson(
            [
                'organizationId' => $connection['organization_id'],
                'siteId' => $connection['site_id'],
                'cursor' => null,
                'items' => $items,
            ]
        );
    }

    /**
     * @param array{organization_id:string,site_id:string,token:string,endpoint:string,connected_at:int} $connection
     * @return array<string,string>
     */
    public function buildSignedHeaders(
        array $connection,
        string $path,
        string $body,
        int $timestamp
    ): array {
        return [
            'X-SCCC-Site-Id' => $connection['site_id'],
            'X-SCCC-Timestamp' => (string) $timestamp,
            'X-SCCC-Signature' => $this->requestSigner->sign('POST', $path, $timestamp, $body, $connection['token']),
            'X-SCCC-Token' => $connection['token'],
        ];
    }

    /**
     * @param array<string,mixed> $payload
     */
    private function encodeJson(array $payload): string
    {
        $json = json_encode($payload, JSON_UNESCAPED_SLASHES);

        if (! is_string($json)) {
            throw new RuntimeException('json_encode_failed');
        }

        return $json;
    }
}
