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

    public function __construct(
        private readonly ConnectionStore $connectionStore,
        private readonly ApiClient $apiClient,
        private readonly ContentCollector $contentCollector,
        private readonly SyncLogStore $syncLogStore
    ) {
    }

    public function handleManualSync(): void
    {
        if (! current_user_can('manage_options')) {
            wp_die(esc_html__('You do not have permission to sync this site.', 'seo-content-control-center'));
        }

        check_admin_referer('sccc_manual_sync');
        $scheduler = $this->queueSync();
        $this->syncLogStore->recordQueued($scheduler);

        wp_safe_redirect(add_query_arg('sccc_status', 'sync_queued', admin_url('options-general.php?page=sccc')));
        exit;
    }

    public function runSync(): void
    {
        $connection = $this->connectionStore->get();

        if (null === $connection) {
            return;
        }

        try {
            $items = $this->contentCollector->collect();
            $this->apiClient->sendSync($connection, $items);
            $this->syncLogStore->recordSuccess(count($items));
        } catch (\RuntimeException $error) {
            $this->syncLogStore->recordFailure($error->getMessage());
            return;
        }
    }

    public function queueSync(): string
    {
        if (function_exists('as_enqueue_async_action')) {
            as_enqueue_async_action(self::ACTION, [], 'seo-content-control-center');
            return 'Action Scheduler';
        }

        if (! wp_next_scheduled(self::ACTION)) {
            wp_schedule_single_event(time() + 60, self::ACTION);
            return 'WP-Cron';
        }

        return 'existing WP-Cron event';
    }
}
