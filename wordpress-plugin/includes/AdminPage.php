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
        ?>
        <div class="wrap">
            <h1><?php echo esc_html__('SEO Content Control Center', 'seo-content-control-center'); ?></h1>

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
}
