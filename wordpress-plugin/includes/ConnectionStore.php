<?php
/**
 * Secure connection option storage.
 *
 * @package SCCC
 */

declare(strict_types=1);

namespace SCCC\Plugin;

final class ConnectionStore
{
    private const OPTION = 'sccc_connection';

    /**
     * @return array{organization_id:string, site_id:string, token:string, endpoint:string, connected_at:int}|null
     */
    public function get(): ?array
    {
        $value = get_option(self::OPTION);

        if (! is_array($value)) {
            return null;
        }

        if (empty($value['organization_id']) || empty($value['site_id']) || empty($value['token']) || empty($value['endpoint'])) {
            return null;
        }

        return [
            'organization_id' => (string) $value['organization_id'],
            'site_id' => (string) $value['site_id'],
            'token' => (string) $value['token'],
            'endpoint' => (string) $value['endpoint'],
            'connected_at' => isset($value['connected_at']) ? (int) $value['connected_at'] : 0,
        ];
    }

    public function save(string $organizationId, string $siteId, string $token, string $endpoint): void
    {
        $payload = [
            'organization_id' => $organizationId,
            'site_id' => $siteId,
            'token' => $token,
            'endpoint' => $endpoint,
            'connected_at' => time(),
        ];

        update_option(self::OPTION, $payload, false);
    }

    public function disconnect(): void
    {
        delete_option(self::OPTION);
    }

    public function isConnected(): bool
    {
        return null !== $this->get();
    }
}
