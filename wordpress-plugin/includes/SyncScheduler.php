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
    private const RECURRING_ACTION = 'sccc_run_incremental_sync';
    private const MANUAL_ACTION = 'sccc_run_manual_sync';
    private const GROUP = 'seo-content-control-center';
    private const INTERVAL_SECONDS = 3600;

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
            $this->cancelScheduledSyncs();
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
            as_enqueue_async_action(self::MANUAL_ACTION, [], self::GROUP);
            return 'Action Scheduler';
        }

        if (! wp_next_scheduled(self::MANUAL_ACTION)) {
            wp_schedule_single_event(time() + 60, self::MANUAL_ACTION);
            return 'WP-Cron';
        }

        return 'existing WP-Cron event';
    }

    public function ensureRecurringSync(): string
    {
        if (! $this->connectionStore->isConnected()) {
            $this->cancelScheduledSyncs();
            return 'not connected';
        }

        if (function_exists('as_next_scheduled_action') && function_exists('as_schedule_recurring_action')) {
            $next = as_next_scheduled_action(self::RECURRING_ACTION, [], self::GROUP);

            if (false === $next) {
                as_schedule_recurring_action(
                    time() + self::INTERVAL_SECONDS,
                    self::INTERVAL_SECONDS,
                    self::RECURRING_ACTION,
                    [],
                    self::GROUP
                );
            }

            return 'Action Scheduler';
        }

        if (! wp_next_scheduled(self::RECURRING_ACTION)) {
            wp_schedule_event(time() + self::INTERVAL_SECONDS, 'hourly', self::RECURRING_ACTION);
        }

        return 'WP-Cron';
    }

    public function cancelRecurringSync(): void
    {
        $this->cancelScheduledAction(self::RECURRING_ACTION);
    }

    public function cancelScheduledSyncs(): void
    {
        $this->cancelScheduledAction(self::RECURRING_ACTION);
        $this->cancelScheduledAction(self::MANUAL_ACTION);
    }

    private function cancelScheduledAction(string $action): void
    {
        if (function_exists('as_unschedule_all_actions')) {
            as_unschedule_all_actions($action, [], self::GROUP);
        }

        while (true) {
            $next = wp_next_scheduled($action);

            if (false === $next) {
                return;
            }

            wp_unschedule_event($next, $action);
        }
    }

    /**
     * @return array{enabled:bool,scheduler:string|null,next_run_at:int|null}
     */
    public function getRecurringSyncStatus(): array
    {
        if (! $this->connectionStore->isConnected()) {
            return [
                'enabled' => false,
                'scheduler' => null,
                'next_run_at' => null,
            ];
        }

        if (function_exists('as_next_scheduled_action')) {
            $next = as_next_scheduled_action(self::RECURRING_ACTION, [], self::GROUP);

            if (false !== $next) {
                return [
                    'enabled' => true,
                    'scheduler' => 'Action Scheduler',
                    'next_run_at' => (int) $next,
                ];
            }
        }

        $next = wp_next_scheduled(self::RECURRING_ACTION);

        if (false === $next) {
            return [
                'enabled' => false,
                'scheduler' => null,
                'next_run_at' => null,
            ];
        }

        return [
            'enabled' => true,
            'scheduler' => 'WP-Cron',
            'next_run_at' => (int) $next,
        ];
    }
}
