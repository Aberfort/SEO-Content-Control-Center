<?php
/**
 * Plugin bootstrap.
 *
 * @package SCCC
 */

declare(strict_types=1);

namespace SCCC\Plugin;

final class Plugin
{
    public function __construct(
        private readonly ConnectionStore $connectionStore,
        private readonly AdminPage $adminPage,
        private readonly SyncScheduler $syncScheduler,
        private readonly ApiClient $apiClient
    ) {
    }

    public function register(): void
    {
        add_action('admin_menu', [$this->adminPage, 'registerMenu']);
        add_action('admin_post_sccc_exchange_connection', [$this, 'exchangeConnection']);
        add_action('admin_post_sccc_disconnect', [$this, 'disconnect']);
        add_action('admin_post_sccc_manual_sync', [$this->syncScheduler, 'handleManualSync']);
        add_action('sccc_run_manual_sync', [$this->syncScheduler, 'runSync']);
        add_action('sccc_run_incremental_sync', [$this->syncScheduler, 'runSync']);
        add_action('init', [$this->syncScheduler, 'ensureRecurringSync']);
    }

    public function exchangeConnection(): void
    {
        if (! current_user_can('manage_options')) {
            wp_die(esc_html__('You do not have permission to connect this site.', 'seo-content-control-center'));
        }

        check_admin_referer('sccc_exchange_connection');

        $endpoint = isset($_POST['sccc_endpoint']) ? esc_url_raw(wp_unslash($_POST['sccc_endpoint'])) : '';
        $challenge = isset($_POST['sccc_challenge']) ? sanitize_text_field(wp_unslash($_POST['sccc_challenge'])) : '';

        if ('' === $challenge || '' === $endpoint) {
            wp_safe_redirect(add_query_arg('sccc_error', 'missing_fields', admin_url('options-general.php?page=sccc')));
            exit;
        }

        try {
            $connection = $this->apiClient->exchangeConnection($endpoint, $challenge);
        } catch (\RuntimeException) {
            wp_safe_redirect(add_query_arg('sccc_error', 'connection_exchange_failed', admin_url('options-general.php?page=sccc')));
            exit;
        }

        $this->connectionStore->save(
            $connection['organization_id'],
            $connection['site_id'],
            $connection['token'],
            $connection['endpoint']
        );
        $this->syncScheduler->ensureRecurringSync();

        wp_safe_redirect(add_query_arg('sccc_status', 'connected', admin_url('options-general.php?page=sccc')));
        exit;
    }

    public function disconnect(): void
    {
        if (! current_user_can('manage_options')) {
            wp_die(esc_html__('You do not have permission to disconnect this site.', 'seo-content-control-center'));
        }

        check_admin_referer('sccc_disconnect');

        $connection = $this->connectionStore->get();

        if (null !== $connection) {
            try {
                $this->apiClient->sendDisconnect($connection);
            } catch (\RuntimeException) {
                wp_safe_redirect(add_query_arg('sccc_error', 'disconnect_failed', admin_url('options-general.php?page=sccc')));
                exit;
            }
        }

        $this->connectionStore->disconnect();
        $this->syncScheduler->cancelScheduledSyncs();

        wp_safe_redirect(add_query_arg('sccc_status', 'disconnected', admin_url('options-general.php?page=sccc')));
        exit;
    }
}
