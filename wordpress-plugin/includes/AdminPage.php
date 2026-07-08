<?php
/**
 * WordPress admin UI.
 *
 * @package SCCC
 */

declare(strict_types=1);

namespace SCCC\Plugin;

final class AdminPage
{
    public function registerMenu(): void
    {
        add_options_page(
            __('SEO Content Control Center', 'seo-content-control-center'),
            __('SEO Content Control Center', 'seo-content-control-center'),
            'manage_options',
            'sccc',
            [$this, 'render']
        );
    }

    public function render(): void
    {
        if (! current_user_can('manage_options')) {
            wp_die(esc_html__('You do not have permission to view this page.', 'seo-content-control-center'));
        }

        $store = new ConnectionStore();
        $connection = $store->get();
        $syncLogStore = new SyncLogStore();
        $syncLogs = $syncLogStore->all();
        $scheduler = new SyncScheduler(
            $store,
            new ApiClient(new RequestSigner()),
            new ContentCollector(),
            $syncLogStore
        );
        $recurringSync = $scheduler->getRecurringSyncStatus();
        $notice = $this->getFeedbackNotice(
            $this->readQueryValue('sccc_status'),
            $this->readQueryValue('sccc_error')
        );
        ?>
        <div class="wrap">
            <h1><?php echo esc_html__('SEO Content Control Center', 'seo-content-control-center'); ?></h1>

            <?php if (null !== $notice) : ?>
                <div class="notice notice-<?php echo esc_attr($notice['type']); ?> is-dismissible">
                    <p><?php echo esc_html($notice['message']); ?></p>
                </div>
            <?php endif; ?>

            <?php if (null === $connection) : ?>
                <p><?php echo esc_html__('Connect this WordPress site to begin safe SEO sync.', 'seo-content-control-center'); ?></p>
                <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
                    <input type="hidden" name="action" value="sccc_exchange_connection" />
                    <?php wp_nonce_field('sccc_exchange_connection'); ?>
                    <table class="form-table" role="presentation">
                        <tr>
                            <th scope="row">
                                <label for="sccc_endpoint"><?php echo esc_html__('SaaS endpoint', 'seo-content-control-center'); ?></label>
                            </th>
                            <td><input class="regular-text" id="sccc_endpoint" name="sccc_endpoint" type="url" required /></td>
                        </tr>
                        <tr>
                            <th scope="row">
                                <label for="sccc_challenge"><?php echo esc_html__('Connection challenge', 'seo-content-control-center'); ?></label>
                            </th>
                            <td><input class="regular-text" id="sccc_challenge" name="sccc_challenge" type="password" required /></td>
                        </tr>
                    </table>
                    <?php submit_button(__('Connect site', 'seo-content-control-center')); ?>
                </form>
            <?php else : ?>
                <p>
                    <?php
                    echo esc_html(
                        sprintf(
                            /* translators: %s: connected site id. */
                            __('Connected to site %s.', 'seo-content-control-center'),
                            $connection['site_id']
                        )
                    );
                    ?>
                </p>
                <p>
                    <?php echo esc_html($this->formatRecurringSyncStatus($recurringSync)); ?>
                </p>
                <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" style="display:inline-block;">
                    <input type="hidden" name="action" value="sccc_manual_sync" />
                    <?php wp_nonce_field('sccc_manual_sync'); ?>
                    <?php submit_button(__('Queue manual sync', 'seo-content-control-center'), 'primary', 'submit', false); ?>
                </form>
                <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" style="display:inline-block;margin-left:8px;">
                    <input type="hidden" name="action" value="sccc_disconnect" />
                    <?php wp_nonce_field('sccc_disconnect'); ?>
                    <?php submit_button(__('Disconnect', 'seo-content-control-center'), 'delete', 'submit', false); ?>
                </form>

                <h2><?php echo esc_html__('Sync log', 'seo-content-control-center'); ?></h2>
                <?php if ([] === $syncLogs) : ?>
                    <p><?php echo esc_html__('No sync attempts have been recorded yet.', 'seo-content-control-center'); ?></p>
                <?php else : ?>
                    <table class="widefat striped" style="max-width:960px;">
                        <thead>
                            <tr>
                                <th scope="col"><?php echo esc_html__('Time', 'seo-content-control-center'); ?></th>
                                <th scope="col"><?php echo esc_html__('Status', 'seo-content-control-center'); ?></th>
                                <th scope="col"><?php echo esc_html__('Items', 'seo-content-control-center'); ?></th>
                                <th scope="col"><?php echo esc_html__('Details', 'seo-content-control-center'); ?></th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($syncLogs as $entry) : ?>
                                <tr>
                                    <td><?php echo esc_html($this->formatTimestamp($entry['created_at'])); ?></td>
                                    <td><?php echo esc_html($this->formatStatus($entry['status'])); ?></td>
                                    <td>
                                        <?php
                                        echo esc_html(
                                            null === $entry['item_count']
                                                ? __('n/a', 'seo-content-control-center')
                                                : (string) $entry['item_count']
                                        );
                                        ?>
                                    </td>
                                    <td><?php echo esc_html($entry['message']); ?></td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                <?php endif; ?>
            <?php endif; ?>
        </div>
        <?php
    }

    /**
     * @return array{type:string,message:string}|null
     */
    public function getFeedbackNotice(string $status, string $error): ?array
    {
        if ('' !== $error) {
            return match ($error) {
                'missing_fields' => [
                    'type' => 'error',
                    'message' => __('SaaS endpoint and connection challenge are required.', 'seo-content-control-center'),
                ],
                'connection_exchange_failed' => [
                    'type' => 'error',
                    'message' => __('Could not connect this site. Check the SaaS endpoint and challenge.', 'seo-content-control-center'),
                ],
                'disconnect_failed' => [
                    'type' => 'error',
                    'message' => __('Could not disconnect this site. The local connection was kept so you can retry safely.', 'seo-content-control-center'),
                ],
                default => null,
            };
        }

        return match ($status) {
            'connected' => [
                'type' => 'success',
                'message' => __('Site connected. Automatic sync has been scheduled.', 'seo-content-control-center'),
            ],
            'sync_queued' => [
                'type' => 'success',
                'message' => __('Manual sync queued. It will run shortly.', 'seo-content-control-center'),
            ],
            'disconnected' => [
                'type' => 'success',
                'message' => __('Site disconnected. Local sync jobs were cleared.', 'seo-content-control-center'),
            ],
            default => null,
        };
    }

    private function formatTimestamp(int $timestamp): string
    {
        if (function_exists('wp_date')) {
            return wp_date('Y-m-d H:i:s', $timestamp);
        }

        return gmdate('Y-m-d H:i:s', $timestamp);
    }

    private function formatStatus(string $status): string
    {
        return match ($status) {
            'queued' => __('Queued', 'seo-content-control-center'),
            'success' => __('Success', 'seo-content-control-center'),
            'error' => __('Error', 'seo-content-control-center'),
            default => __('Unknown', 'seo-content-control-center'),
        };
    }

    /**
     * @param array{enabled:bool,scheduler:string|null,next_run_at:int|null} $status
     */
    private function formatRecurringSyncStatus(array $status): string
    {
        if (! $status['enabled'] || null === $status['scheduler'] || null === $status['next_run_at']) {
            return __('Automatic sync is not scheduled yet.', 'seo-content-control-center');
        }

        return sprintf(
            /* translators: 1: scheduler name, 2: formatted next run date. */
            __('Automatic sync runs via %1$s. Next run: %2$s.', 'seo-content-control-center'),
            $status['scheduler'],
            $this->formatTimestamp($status['next_run_at'])
        );
    }

    private function readQueryValue(string $key): string
    {
        if (! isset($_GET[$key])) {
            return '';
        }

        $value = wp_unslash($_GET[$key]);

        if (! is_string($value)) {
            return '';
        }

        return sanitize_key($value);
    }
}
