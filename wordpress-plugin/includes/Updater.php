<?php
/**
 * GitHub Releases auto-updater.
 *
 * Hooks into WordPress's plugin update mechanism to deliver updates
 * published as GitHub Releases, without requiring a wp.org listing.
 *
 * @package SCCC
 */

declare(strict_types=1);

namespace SCCC\Plugin;

if (! defined('ABSPATH')) {
    exit;
}

final class Updater
{
    private const GITHUB_OWNER        = 'serhiivasyliev';
    private const GITHUB_REPO         = 'SEO-Content-Control-Center';
    private const GITHUB_API_BASE     = 'https://api.github.com';
    private const ASSET_PREFIX        = 'seo-content-control-center-';
    private const TRANSIENT_KEY       = 'sccc_update_data';
    private const CACHE_TTL           = 12 * HOUR_IN_SECONDS;

    /** Relative path used by WordPress as the plugin identifier. */
    private string $pluginBasename;

    public function __construct()
    {
        $this->pluginBasename = plugin_basename(SCCC_PLUGIN_FILE);
    }

    /**
     * Register all hooks. Call once from Plugin::register().
     */
    public function register(): void
    {
        add_filter('pre_set_site_transient_update_plugins', [$this, 'injectUpdateData']);
        add_filter('plugins_api', [$this, 'pluginDetails'], 20, 3);
        add_action('upgrader_process_complete', [$this, 'clearCache'], 10, 2);
    }

    /**
     * Injected into the WP update-plugins transient.
     *
     * @param \stdClass|false $transient
     * @return \stdClass|false
     */
    public function injectUpdateData(mixed $transient): mixed
    {
        if (! is_object($transient)) {
            return $transient;
        }

        $release = $this->fetchLatestRelease();

        if (null === $release) {
            return $transient;
        }

        $latestVersion = ltrim($release['tag_name'], 'v');

        if (! version_compare($latestVersion, SCCC_PLUGIN_VERSION, '>')) {
            // Already up to date — report that explicitly so WP knows.
            if (isset($transient->no_update)) {
                $transient->no_update[$this->pluginBasename] = $this->buildPluginData($latestVersion, $release['download_url']);
            }
            return $transient;
        }

        $transient->response[$this->pluginBasename] = $this->buildPluginData($latestVersion, $release['download_url']);

        return $transient;
    }

    /**
     * Returns plugin details for the "View Details" modal.
     *
     * @param false|\stdClass $result
     * @param string          $action
     * @param \stdClass       $args
     * @return false|\stdClass
     */
    public function pluginDetails(mixed $result, string $action, \stdClass $args): mixed
    {
        if ('plugin_information' !== $action) {
            return $result;
        }

        if (! isset($args->slug) || $args->slug !== $this->getPluginSlug()) {
            return $result;
        }

        $release = $this->fetchLatestRelease();

        if (null === $release) {
            return $result;
        }

        $latestVersion = ltrim($release['tag_name'], 'v');

        $info                = new \stdClass();
        $info->name          = 'SEO Content Control Center';
        $info->slug          = $this->getPluginSlug();
        $info->version       = $latestVersion;
        $info->author        = '<a href="https://github.com/' . self::GITHUB_OWNER . '">Serhii Vasyliev</a>';
        $info->homepage      = 'https://github.com/' . self::GITHUB_OWNER . '/' . self::GITHUB_REPO;
        $info->requires      = '6.4';
        $info->tested        = '7.0';
        $info->requires_php  = '8.1';
        $info->download_link = $release['download_url'];
        $info->last_updated  = $release['published_at'] ?? '';
        $info->sections      = [
            'description' => 'Audits WordPress content health locally and optionally connects to evidence-backed SEO workflows.',
            'changelog'   => $this->formatChangelog($release['body'] ?? ''),
        ];

        return $info;
    }

    /**
     * Clears the cached release data after a plugin update completes.
     *
     * @param \WP_Upgrader        $upgrader
     * @param array<string,mixed> $hookExtra
     */
    public function clearCache(\WP_Upgrader $upgrader, array $hookExtra): void
    {
        if (
            isset($hookExtra['action'], $hookExtra['type'], $hookExtra['plugins']) &&
            'update' === $hookExtra['action'] &&
            'plugin' === $hookExtra['type'] &&
            in_array($this->pluginBasename, (array) $hookExtra['plugins'], true)
        ) {
            delete_site_transient(self::TRANSIENT_KEY);
        }
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /**
     * Fetches the latest release from the GitHub API, with a 12-hour transient cache.
     *
     * @return array{tag_name:string,download_url:string,body:string,published_at:string}|null
     */
    private function fetchLatestRelease(): ?array
    {
        $cached = get_site_transient(self::TRANSIENT_KEY);

        if (is_array($cached)) {
            return $cached;
        }

        $url      = self::GITHUB_API_BASE . '/repos/' . self::GITHUB_OWNER . '/' . self::GITHUB_REPO . '/releases/latest';
        $response = wp_remote_get(
            $url,
            [
                'timeout' => 10,
                'headers' => [
                    'Accept'     => 'application/vnd.github+json',
                    'User-Agent' => 'WordPress/' . get_bloginfo('version') . '; ' . get_bloginfo('url'),
                ],
            ]
        );

        if (is_wp_error($response) || 200 !== wp_remote_retrieve_response_code($response)) {
            // Cache a negative result for 1 hour to avoid hammering the API.
            set_site_transient(self::TRANSIENT_KEY, null, HOUR_IN_SECONDS);
            return null;
        }

        $body = json_decode(wp_remote_retrieve_body($response), true);

        if (! is_array($body) || empty($body['tag_name'])) {
            set_site_transient(self::TRANSIENT_KEY, null, HOUR_IN_SECONDS);
            return null;
        }

        $downloadUrl = $this->resolveAssetUrl($body);

        if (null === $downloadUrl) {
            set_site_transient(self::TRANSIENT_KEY, null, HOUR_IN_SECONDS);
            return null;
        }

        $data = [
            'tag_name'     => (string) $body['tag_name'],
            'download_url' => $downloadUrl,
            'body'         => (string) ($body['body'] ?? ''),
            'published_at' => (string) ($body['published_at'] ?? ''),
        ];

        set_site_transient(self::TRANSIENT_KEY, $data, self::CACHE_TTL);

        return $data;
    }

    /**
     * Finds the plugin zip URL among the release assets.
     * Falls back to GitHub's auto-generated source zip only as last resort.
     *
     * @param array<string,mixed> $releaseBody Decoded GitHub API response.
     */
    private function resolveAssetUrl(array $releaseBody): ?string
    {
        if (! empty($releaseBody['assets']) && is_array($releaseBody['assets'])) {
            foreach ($releaseBody['assets'] as $asset) {
                if (
                    is_array($asset) &&
                    isset($asset['name'], $asset['browser_download_url']) &&
                    str_starts_with((string) $asset['name'], self::ASSET_PREFIX) &&
                    str_ends_with((string) $asset['name'], '.zip')
                ) {
                    return (string) $asset['browser_download_url'];
                }
            }
        }

        // Fallback: auto-generated zip from the tag.
        if (! empty($releaseBody['tag_name'])) {
            $tag = (string) $releaseBody['tag_name'];
            return 'https://github.com/' . self::GITHUB_OWNER . '/' . self::GITHUB_REPO . '/archive/refs/tags/' . $tag . '.zip';
        }

        return null;
    }

    /**
     * Builds the stdClass object WP expects inside update_plugins transient.
     */
    private function buildPluginData(string $newVersion, string $downloadUrl): \stdClass
    {
        $data                 = new \stdClass();
        $data->id             = self::GITHUB_OWNER . '/' . self::GITHUB_REPO;
        $data->slug           = $this->getPluginSlug();
        $data->plugin         = $this->pluginBasename;
        $data->new_version    = $newVersion;
        $data->url            = 'https://github.com/' . self::GITHUB_OWNER . '/' . self::GITHUB_REPO;
        $data->package        = $downloadUrl;
        $data->icons          = [];
        $data->banners        = [];
        $data->banners_rtl    = [];
        $data->requires       = '6.4';
        $data->tested         = '7.0';
        $data->requires_php   = '8.1';

        return $data;
    }

    /**
     * Returns the plugin's slug (directory name).
     */
    private function getPluginSlug(): string
    {
        return explode('/', $this->pluginBasename)[0];
    }

    /**
     * Converts a raw Markdown changelog body into simple HTML for the WP modal.
     */
    private function formatChangelog(string $markdown): string
    {
        if ('' === $markdown) {
            return '<p>See the <a href="https://github.com/' . self::GITHUB_OWNER . '/' . self::GITHUB_REPO . '/releases">GitHub releases page</a> for the full changelog.</p>';
        }

        // Convert Markdown headings and lists to basic HTML.
        $html = esc_html($markdown);
        $html = preg_replace('/^### (.+)$/m', '<h4>$1</h4>', $html) ?? $html;
        $html = preg_replace('/^## (.+)$/m', '<h3>$1</h3>', $html) ?? $html;
        $html = preg_replace('/^# (.+)$/m', '<h2>$1</h2>', $html) ?? $html;
        $html = preg_replace('/^\* (.+)$/m', '<li>$1</li>', $html) ?? $html;
        $html = preg_replace('/^- (.+)$/m', '<li>$1</li>', $html) ?? $html;
        $html = str_replace("\n\n", '</p><p>', $html);

        return '<p>' . $html . '</p>';
    }
}
