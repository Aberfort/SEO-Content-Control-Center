<?php
/**
 * Stores local audit scheduling and intentional-finding rules.
 *
 * @package SCCC
 */

declare(strict_types=1);

namespace SCCC\Plugin;

if (! defined('ABSPATH')) {
    exit;
}

final class LocalAuditSettings
{
    private const OPTION = 'sccc_local_audit_settings';
    private const MAX_IGNORED = 500;
    private const INTERVALS = ['off', 'daily', 'weekly'];

    /**
     * @return array{interval:string,ignored:array<string,int>}
     */
    public function get(): array
    {
        $value = get_option(self::OPTION);
        $interval = is_array($value) && isset($value['interval']) && in_array($value['interval'], self::INTERVALS, true)
            ? (string) $value['interval']
            : 'off';
        $ignored = is_array($value) && isset($value['ignored']) && is_array($value['ignored'])
            ? $this->normalizeIgnored($value['ignored'])
            : [];

        return compact('interval', 'ignored');
    }

    public function setInterval(string $interval): string
    {
        $settings = $this->get();
        $settings['interval'] = in_array($interval, self::INTERVALS, true) ? $interval : 'off';
        $this->save($settings);

        return $settings['interval'];
    }

    public function setIgnored(string $fingerprint, bool $ignored): void
    {
        if (1 !== preg_match('/^[a-f0-9]{64}$/', $fingerprint)) {
            return;
        }

        $settings = $this->get();

        if ($ignored) {
            $settings['ignored'][$fingerprint] = time();
            arsort($settings['ignored']);
            $settings['ignored'] = array_slice($settings['ignored'], 0, self::MAX_IGNORED, true);
        } else {
            unset($settings['ignored'][$fingerprint]);
        }

        $this->save($settings);
    }

    public function isIgnored(string $externalId, string $code): bool
    {
        return isset($this->get()['ignored'][self::fingerprint($externalId, $code)]);
    }

    public static function fingerprint(string $externalId, string $code): string
    {
        return hash('sha256', trim($externalId) . '|' . trim($code));
    }

    /**
     * @param array{interval:string,ignored:array<string,int>} $settings
     */
    private function save(array $settings): void
    {
        update_option(self::OPTION, $settings, false);
    }

    /**
     * @param array<mixed,mixed> $ignored
     * @return array<string,int>
     */
    private function normalizeIgnored(array $ignored): array
    {
        $normalized = [];

        foreach ($ignored as $fingerprint => $timestamp) {
            if (is_string($fingerprint) && 1 === preg_match('/^[a-f0-9]{64}$/', $fingerprint)) {
                $normalized[$fingerprint] = is_numeric($timestamp) ? max(0, (int) $timestamp) : 0;
            }
        }

        arsort($normalized);

        return array_slice($normalized, 0, self::MAX_IGNORED, true);
    }
}
