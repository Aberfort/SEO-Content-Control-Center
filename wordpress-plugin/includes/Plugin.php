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
        private readonly SyncScheduler $syncScheduler
    ) {
    }

    public function register(): void
    {
        add_action('admin_menu', [$this->adminPage, 'registerMenu']);
        add_action('admin_post_sccc_save_connection', [$this, 'saveConnection']);
        add_action('admin_post_sccc_disconnect', [$this, 'disconnect']);
        add_action('admin_post_sccc_manual_sync', [$this->syncScheduler, 'handleManualSync']);
    }

    public function saveConnection(): void
    {
        if (! current_user_can('manage_options')) {
            wp_die(esc_html__('You do not have permission to connect this site.', 'seo-content-control-center'));
        }

        check_admin_referer('sccc_save_connection');

        $site_id = isset($_POST['sccc_site_id']) ? sanitize_text_field(wp_unslash($_POST['sccc_site_id'])) : '';
        $token = isset($_POST['sccc_token']) ? sanitize_text_field(wp_unslash($_POST['sccc_token'])) : '';
        $endpoint = isset($_POST['sccc_endpoint']) ? esc_url_raw(wp_unslash($_POST['sccc_endpoint'])) : '';

        if ('' === $site_id || '' === $token || '' === $endpoint) {
            wp_safe_redirect(add_query_arg('sccc_error', 'missing_fields', admin_url('options-general.php?page=sccc')));
            exit;
        }

        $this->connectionStore->save($site_id, $token, $endpoint);

        wp_safe_redirect(add_query_arg('sccc_status', 'connected', admin_url('options-general.php?page=sccc')));
        exit;
    }

    public function disconnect(): void
    {
        if (! current_user_can('manage_options')) {
            wp_die(esc_html__('You do not have permission to disconnect this site.', 'seo-content-control-center'));
        }

        check_admin_referer('sccc_disconnect');
        $this->connectionStore->disconnect();

        wp_safe_redirect(add_query_arg('sccc_status', 'disconnected', admin_url('options-general.php?page=sccc')));
        exit;
    }
}

