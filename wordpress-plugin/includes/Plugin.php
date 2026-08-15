<?php
/**
 * Plugin bootstrap.
 *
 * @package SCCC
 */

declare(strict_types=1);

namespace SCCC\Plugin;

if (! defined('ABSPATH')) {
    exit;
}

final class Plugin
{
    public function __construct(
        private readonly ConnectionStore $connectionStore,
        private readonly AdminPage $adminPage,
        private readonly SyncScheduler $syncScheduler,
        private readonly LocalAuditRunner $localAuditRunner,
        private readonly ApiClient $apiClient,
        private readonly SafeOperationEndpoint $safeOperationEndpoint
    ) {
    }

    public function register(): void
    {
        add_action('admin_menu', [$this->adminPage, 'registerMenu']);
        add_action('admin_enqueue_scripts', [$this->adminPage, 'enqueueAssets']);
        add_action('admin_post_sccc_exchange_connection', [$this, 'exchangeConnection']);
        add_action('admin_post_sccc_disconnect', [$this, 'disconnect']);
        add_action('admin_post_sccc_manual_sync', [$this->syncScheduler, 'handleManualSync']);
        add_action('admin_post_sccc_run_local_audit', [$this->localAuditRunner, 'handleRequest']);
        add_action('admin_post_sccc_save_local_audit_schedule', [$this->localAuditRunner, 'handleScheduleRequest']);
        add_action('admin_post_sccc_export_local_audit', [$this->adminPage, 'exportAuditCsv']);
        add_action('admin_post_sccc_update_finding_rule', [$this->adminPage, 'handleFindingRule']);
        add_action('sccc_run_manual_sync', [$this->syncScheduler, 'runSync']);
        add_action('sccc_run_incremental_sync', [$this->syncScheduler, 'runSync']);
        add_action(LocalAuditRunner::HOOK, [$this->localAuditRunner, 'run']);
        add_action(LocalAuditRunner::RECURRING_HOOK, [$this->localAuditRunner, 'runScheduled']);
        add_action('init', [$this->syncScheduler, 'ensureRecurringSync']);
        add_action('init', [$this->localAuditRunner, 'ensureRecurring']);
        add_action('rest_api_init', [$this->safeOperationEndpoint, 'registerRoutes']);
        add_action('wp_dashboard_setup', [$this->adminPage, 'registerDashboardWidget']);
        add_filter('site_status_tests', [$this->adminPage, 'registerSiteHealthTests']);
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
            wp_safe_redirect(add_query_arg('sccc_error', 'missing_fields', admin_url('admin.php?page=sccc&tab=platform')));
            exit;
        }

        try {
            $connection = $this->apiClient->exchangeConnection($endpoint, $challenge);
        } catch (\RuntimeException) {
            wp_safe_redirect(add_query_arg('sccc_error', 'connection_exchange_failed', admin_url('admin.php?page=sccc&tab=platform')));
            exit;
        }

        $this->connectionStore->save(
            $connection['organization_id'],
            $connection['site_id'],
            $connection['token'],
            $connection['endpoint']
        );
        $this->syncScheduler->ensureRecurringSync();

        wp_safe_redirect(add_query_arg('sccc_status', 'connected', admin_url('admin.php?page=sccc&tab=platform')));
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
                wp_safe_redirect(add_query_arg('sccc_error', 'disconnect_failed', admin_url('admin.php?page=sccc&tab=platform')));
                exit;
            }
        }

        $this->connectionStore->disconnect();
        $this->syncScheduler->cancelScheduledSyncs();

        wp_safe_redirect(add_query_arg('sccc_status', 'disconnected', admin_url('admin.php?page=sccc&tab=platform')));
        exit;
    }
}
