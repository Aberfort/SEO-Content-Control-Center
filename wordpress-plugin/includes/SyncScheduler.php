<?php
/**
 * Sync scheduling boundary.
 *
 * @package SCCC
 */

declare(strict_types=1);

namespace SCCC\Plugin;

final class SyncScheduler
{
    private const ACTION = 'sccc_run_incremental_sync';

    public function handleManualSync(): void
    {
        if (! current_user_can('manage_options')) {
            wp_die(esc_html__('You do not have permission to sync this site.', 'seo-content-control-center'));
        }

        check_admin_referer('sccc_manual_sync');
        $this->queueSync();

        wp_safe_redirect(add_query_arg('sccc_status', 'sync_queued', admin_url('options-general.php?page=sccc')));
        exit;
    }

    public function queueSync(): void
    {
        if (function_exists('as_enqueue_async_action')) {
            as_enqueue_async_action(self::ACTION, [], 'seo-content-control-center');
            return;
        }

        if (! wp_next_scheduled(self::ACTION)) {
            wp_schedule_single_event(time() + 60, self::ACTION);
        }
    }
}

