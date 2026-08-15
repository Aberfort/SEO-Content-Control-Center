<?php
/**
 * WordPress admin UI.
 *
 * @package SCCC
 */

declare(strict_types=1);

namespace SCCC\Plugin;

if (! defined('ABSPATH')) {
    exit;
}

final class AdminPage
{
    private const PAGE_SIZE = 50;

    public function __construct(
        private readonly ?LocalAuditStore $auditStore = null,
        private readonly ?LocalAuditSettings $auditSettings = null,
        private readonly ?LocalAuditRunner $auditRunner = null,
        private readonly ?ConnectionStore $connectionStore = null,
        private readonly ?PlatformConversion $platformConversion = null
    ) {
    }

    public function registerMenu(): void
    {
        add_menu_page(
            __('Content Health Audit', 'seo-content-control-center'),
            __('Content Health', 'seo-content-control-center'),
            'manage_options',
            'sccc',
            [$this, 'render'],
            'dashicons-chart-area',
            65
        );
    }

    public function enqueueAssets(string $hook): void
    {
        if ('toplevel_page_sccc' !== $hook) {
            return;
        }

        wp_enqueue_style(
            'sccc-admin',
            plugin_dir_url(SCCC_PLUGIN_FILE) . 'assets/admin.css',
            [],
            SCCC_PLUGIN_VERSION
        );
    }

    public function render(): void
    {
        if (! current_user_can('manage_options')) {
            wp_die(esc_html__('You do not have permission to view this page.', 'seo-content-control-center'));
        }

        $tab = 'platform' === $this->readQueryValue('tab') ? 'platform' : 'health';
        $notice = $this->getFeedbackNotice(
            $this->readQueryValue('sccc_status'),
            $this->readQueryValue('sccc_error')
        );
        ?>
        <div class="wrap sccc-wrap">
            <h1><?php echo esc_html__('SEO Content Control Center', 'seo-content-control-center'); ?></h1>
            <nav class="nav-tab-wrapper" aria-label="<?php echo esc_attr__('Plugin sections', 'seo-content-control-center'); ?>">
                <a class="nav-tab <?php echo 'health' === $tab ? 'nav-tab-active' : ''; ?>" href="<?php echo esc_url(admin_url('admin.php?page=sccc')); ?>">
                    <?php echo esc_html__('Content Health', 'seo-content-control-center'); ?>
                </a>
                <a class="nav-tab <?php echo 'platform' === $tab ? 'nav-tab-active' : ''; ?>" href="<?php echo esc_url(admin_url('admin.php?page=sccc&tab=platform')); ?>">
                    <?php echo esc_html__('Platform', 'seo-content-control-center'); ?>
                </a>
            </nav>

            <?php if (null !== $notice) : ?>
                <div class="notice notice-<?php echo esc_attr($notice['type']); ?> is-dismissible">
                    <p><?php echo esc_html($notice['message']); ?></p>
                </div>
            <?php endif; ?>

            <?php 'platform' === $tab ? $this->renderPlatform() : $this->renderHealth(); ?>
        </div>
        <?php
    }

    public function exportAuditCsv(): void
    {
        if (! current_user_can('manage_options')) {
            wp_die(esc_html__('You do not have permission to export this audit.', 'seo-content-control-center'));
        }

        check_admin_referer('sccc_export_local_audit');
        $audit = $this->store()->get();
        $items = is_array($audit) && isset($audit['items']) && is_array($audit['items']) ? $audit['items'] : [];

        nocache_headers();
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="sccc-content-health-' . gmdate('Y-m-d') . '.csv"');
        $output = fopen('php://output', 'wb');

        if (false === $output) {
            wp_die(esc_html__('Could not create the CSV export.', 'seo-content-control-center'));
        }

        fwrite($output, "\xEF\xBB\xBF");
        fputcsv($output, ['Post ID', 'Type', 'Title', 'URL', 'Modified', 'Inbound links', 'Severity', 'Issue', 'Evidence', 'State']);

        foreach ($items as $item) {
            if (! is_array($item) || ! isset($item['findings']) || ! is_array($item['findings'])) {
                continue;
            }

            foreach ($item['findings'] as $finding) {
                if (! is_array($finding)) {
                    continue;
                }

                fputcsv(
                    $output,
                    [
                        (string) ($item['post_id'] ?? ''),
                        (string) ($item['type'] ?? ''),
                        (string) ($item['title'] ?? ''),
                        (string) ($item['url'] ?? ''),
                        (string) ($item['modified_at'] ?? ''),
                        (string) ($item['inbound_link_count'] ?? ''),
                        (string) ($finding['severity'] ?? ''),
                        (string) ($finding['label'] ?? ''),
                        (string) ($finding['evidence'] ?? ''),
                        true === ($finding['ignored'] ?? false) ? 'ignored' : (string) ($finding['change'] ?? 'current'),
                    ]
                );
            }
        }

        fclose($output);
        exit;
    }

    public function handleFindingRule(): void
    {
        if (! current_user_can('manage_options')) {
            wp_die(esc_html__('You do not have permission to manage audit findings.', 'seo-content-control-center'));
        }

        check_admin_referer('sccc_update_finding_rule');
        $fingerprint = isset($_POST['sccc_fingerprint'])
            ? sanitize_key((string) wp_unslash($_POST['sccc_fingerprint']))
            : '';
        $mode = isset($_POST['sccc_rule_mode'])
            ? sanitize_key((string) wp_unslash($_POST['sccc_rule_mode']))
            : '';
        $ignored = 'ignore' === $mode;

        $this->settings()->setIgnored($fingerprint, $ignored);
        $this->store()->setIgnored($fingerprint, $ignored);

        wp_safe_redirect(
            add_query_arg(
                'sccc_status',
                $ignored ? 'finding_ignored' : 'finding_restored',
                admin_url('admin.php?page=sccc')
            )
        );
        exit;
    }

    public function registerDashboardWidget(): void
    {
        if (! current_user_can('manage_options')) {
            return;
        }

        wp_add_dashboard_widget(
            'sccc_content_health',
            __('Content Health', 'seo-content-control-center'),
            [$this, 'renderDashboardWidget']
        );
    }

    public function renderDashboardWidget(): void
    {
        $audit = $this->store()->get();

        if (! is_array($audit) || 'complete' !== ($audit['status'] ?? null)) {
            echo '<p>' . esc_html__('Run a local content audit to find SEO and maintenance issues across posts and pages.', 'seo-content-control-center') . '</p>';
            echo '<p><a class="button button-primary" href="' . esc_url(admin_url('admin.php?page=sccc')) . '">' . esc_html__('Open Content Health', 'seo-content-control-center') . '</a></p>';
            return;
        }

        $summary = is_array($audit['summary'] ?? null) ? $audit['summary'] : [];
        printf(
            '<p><strong>%1$d</strong> %2$s · <strong>%3$d</strong> %4$s · <strong>%5$d</strong> %6$s</p>',
            (int) ($summary['affected_urls'] ?? 0),
            esc_html__('URLs need review', 'seo-content-control-center'),
            (int) ($summary['critical'] ?? 0),
            esc_html__('critical findings', 'seo-content-control-center'),
            (int) ($summary['new_findings'] ?? 0),
            esc_html__('new since last scan', 'seo-content-control-center')
        );
        echo '<p><a href="' . esc_url(admin_url('admin.php?page=sccc')) . '">' . esc_html__('Review findings', 'seo-content-control-center') . '</a></p>';
    }

    /**
     * @param array<string,mixed> $tests
     * @return array<string,mixed>
     */
    public function registerSiteHealthTests(array $tests): array
    {
        $tests['direct']['sccc_content_health'] = [
            'label' => __('Content health audit', 'seo-content-control-center'),
            'test' => [$this, 'siteHealthTest'],
        ];

        return $tests;
    }

    /**
     * @return array<string,mixed>
     */
    public function siteHealthTest(): array
    {
        $audit = $this->store()->get();
        $summary = is_array($audit) && is_array($audit['summary'] ?? null) ? $audit['summary'] : [];
        $critical = (int) ($summary['critical'] ?? 0);

        if (! is_array($audit) || 'complete' !== ($audit['status'] ?? null)) {
            return $this->siteHealthResult(
                'recommended',
                __('Run the local content health audit', 'seo-content-control-center'),
                __('No completed content health audit is available yet.', 'seo-content-control-center')
            );
        }

        if ($critical > 0) {
            return $this->siteHealthResult(
                'critical',
                __('Published content has risky index settings', 'seo-content-control-center'),
                sprintf(
                    /* translators: %d: number of critical findings. */
                    _n('%d critical noindex finding needs review.', '%d critical noindex findings need review.', $critical, 'seo-content-control-center'),
                    $critical
                )
            );
        }

        return $this->siteHealthResult(
            'good',
            __('No critical content health risks detected', 'seo-content-control-center'),
            __('The latest local audit found no published content marked noindex.', 'seo-content-control-center')
        );
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
            'audit_queued' => [
                'type' => 'success',
                'message' => __('Content audit queued. Results will appear here after the background scan completes.', 'seo-content-control-center'),
            ],
            'audit_schedule_saved' => [
                'type' => 'success',
                'message' => __('Local audit schedule saved.', 'seo-content-control-center'),
            ],
            'finding_ignored' => [
                'type' => 'success',
                'message' => __('Finding ignored. It remains available through the Ignored filter.', 'seo-content-control-center'),
            ],
            'finding_restored' => [
                'type' => 'success',
                'message' => __('Finding restored to the active audit.', 'seo-content-control-center'),
            ],
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

    private function renderHealth(): void
    {
        $audit = $this->store()->get();
        $schedule = $this->runner()->getRecurringStatus();
        $connection = $this->connectionStore()->get();
        ?>
        <section class="sccc-section" aria-labelledby="sccc-health-title">
            <div class="sccc-section-header">
                <div>
                    <h2 id="sccc-health-title"><?php echo esc_html__('WordPress Content Health Audit', 'seo-content-control-center'); ?></h2>
                    <p><?php echo esc_html__('Find SEO metadata, indexability, internal-link, thin-content, and freshness issues locally. No account required.', 'seo-content-control-center'); ?></p>
                </div>
                <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
                    <input type="hidden" name="action" value="sccc_run_local_audit" />
                    <?php wp_nonce_field('sccc_run_local_audit'); ?>
                    <?php submit_button(
                        is_array($audit) ? __('Run audit again', 'seo-content-control-center') : __('Run content audit', 'seo-content-control-center'),
                        'primary',
                        'submit',
                        false
                    ); ?>
                </form>
            </div>
            <div class="sccc-audit-schedule">
                <div>
                    <strong><?php echo esc_html__('Automatic local audit', 'seo-content-control-center'); ?></strong>
                    <p><?php echo esc_html($this->formatAuditScheduleStatus($schedule)); ?></p>
                </div>
                <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
                    <input type="hidden" name="action" value="sccc_save_local_audit_schedule" />
                    <?php wp_nonce_field('sccc_save_local_audit_schedule'); ?>
                    <label>
                        <span class="screen-reader-text"><?php echo esc_html__('Audit interval', 'seo-content-control-center'); ?></span>
                        <select name="sccc_audit_interval">
                            <option value="off" <?php selected($schedule['interval'], 'off'); ?>><?php echo esc_html__('Off', 'seo-content-control-center'); ?></option>
                            <option value="daily" <?php selected($schedule['interval'], 'daily'); ?>><?php echo esc_html__('Daily', 'seo-content-control-center'); ?></option>
                            <option value="weekly" <?php selected($schedule['interval'], 'weekly'); ?>><?php echo esc_html__('Weekly', 'seo-content-control-center'); ?></option>
                        </select>
                    </label>
                    <?php submit_button(__('Save schedule', 'seo-content-control-center'), 'secondary', 'submit', false); ?>
                </form>
            </div>
            <?php $this->renderAuditBody($audit, $connection); ?>
        </section>
        <?php
    }

    /**
     * @param array<string,mixed>|null $audit
     * @param array<string,mixed>|null $connection
     */
    private function renderAuditBody(?array $audit, ?array $connection): void
    {
        if (null === $audit) {
            ?>
            <div class="sccc-empty-state">
                <h3><?php echo esc_html__('See what needs attention before opening every post', 'seo-content-control-center'); ?></h3>
                <p><?php echo esc_html__('The audit reads posts, pages, and supported SEO metadata on this WordPress site. It does not change content or contact an external service.', 'seo-content-control-center'); ?></p>
            </div>
            <?php
            return;
        }

        if ('queued' === ($audit['status'] ?? null)) {
            echo '<div class="notice notice-info inline"><p>' . esc_html__('The audit is queued and will run through Action Scheduler or WP-Cron. Refresh this page shortly.', 'seo-content-control-center') . '</p></div>';

            if (! isset($audit['items']) || ! is_array($audit['items']) || [] === $audit['items']) {
                return;
            }
        }

        if ('error' === ($audit['status'] ?? null)) {
            echo '<div class="notice notice-error inline"><p>' . esc_html__('The latest audit failed.', 'seo-content-control-center') . ' ' . esc_html((string) ($audit['error'] ?? '')) . '</p></div>';
            return;
        }

        $summary = is_array($audit['summary'] ?? null) ? $audit['summary'] : [];
        $items = isset($audit['items']) && is_array($audit['items']) ? $audit['items'] : [];
        $this->renderSummary($summary, (int) ($audit['completed_at'] ?? 0));
        $this->renderChanges(is_array($audit['changes'] ?? null) ? $audit['changes'] : []);
        $this->renderPlatformContext($connection);
        $this->renderFindings($items, $connection);
    }

    /**
     * @param array<string,mixed>|null $connection
     */
    private function renderPlatformContext(?array $connection): void
    {
        if (null === $connection) {
            return;
        }

        $endpoint = rtrim((string) ($connection['endpoint'] ?? ''), '/');
        $siteId = (string) ($connection['site_id'] ?? '');
        $contentUrl = $endpoint . '/content?site=' . rawurlencode($siteId);
        $auditsUrl = $endpoint . '/audits?site=' . rawurlencode($siteId);
        ?>
        <div class="sccc-platform-context">
            <div>
                <strong><?php echo esc_html__('Connected evidence', 'seo-content-control-center'); ?></strong>
                <p><?php echo esc_html__('Findings marked GSC evidence can gain clicks, impressions, position, and traffic-change context after Search Console sync. Safe preview appears only for supported Yoast or Rank Math metadata fields.', 'seo-content-control-center'); ?></p>
            </div>
            <div class="sccc-inline-actions">
                <a class="button" href="<?php echo esc_url($contentUrl); ?>" target="_blank" rel="noopener noreferrer"><?php echo esc_html__('Synced content', 'seo-content-control-center'); ?></a>
                <a class="button" href="<?php echo esc_url($auditsUrl); ?>" target="_blank" rel="noopener noreferrer"><?php echo esc_html__('Platform audits', 'seo-content-control-center'); ?></a>
            </div>
        </div>
        <?php
    }

    /**
     * @param array<string,mixed> $summary
     */
    private function renderSummary(array $summary, int $completedAt): void
    {
        $cards = [
            ['label' => __('Audited URLs', 'seo-content-control-center'), 'value' => (int) ($summary['total_urls'] ?? 0), 'tone' => 'neutral'],
            ['label' => __('Need review', 'seo-content-control-center'), 'value' => (int) ($summary['affected_urls'] ?? 0), 'tone' => 'attention'],
            ['label' => __('Critical', 'seo-content-control-center'), 'value' => (int) ($summary['critical'] ?? 0), 'tone' => 'critical'],
            ['label' => __('Checks complete', 'seo-content-control-center'), 'value' => (int) ($summary['complete'] ?? 0), 'tone' => 'success'],
        ];
        ?>
        <div class="sccc-summary-grid">
            <?php foreach ($cards as $card) : ?>
                <div class="sccc-summary-card sccc-summary-<?php echo esc_attr($card['tone']); ?>">
                    <span><?php echo esc_html($card['label']); ?></span>
                    <strong><?php echo esc_html(number_format_i18n($card['value'])); ?></strong>
                </div>
            <?php endforeach; ?>
        </div>
        <?php if ($completedAt > 0) : ?>
            <p class="description">
                <?php
                printf(
                    /* translators: %s: audit completion date. */
                    esc_html__('Last completed: %s', 'seo-content-control-center'),
                    esc_html($this->formatTimestamp($completedAt))
                );
                ?>
            </p>
        <?php endif; ?>
        <?php
    }

    /**
     * @param array<string,mixed> $changes
     */
    private function renderChanges(array $changes): void
    {
        $new = (int) ($changes['new_count'] ?? 0);
        $resolved = (int) ($changes['resolved_count'] ?? 0);
        $unchanged = (int) ($changes['unchanged_count'] ?? 0);

        if (0 === $new && 0 === $resolved && 0 === $unchanged) {
            return;
        }
        ?>
        <div class="sccc-change-summary" aria-label="<?php echo esc_attr__('Changes since the previous audit', 'seo-content-control-center'); ?>">
            <strong><?php echo esc_html__('Since previous audit', 'seo-content-control-center'); ?></strong>
            <span><b><?php echo esc_html(number_format_i18n($new)); ?></b> <?php echo esc_html__('new', 'seo-content-control-center'); ?></span>
            <span><b><?php echo esc_html(number_format_i18n($resolved)); ?></b> <?php echo esc_html__('resolved', 'seo-content-control-center'); ?></span>
            <span><b><?php echo esc_html(number_format_i18n($unchanged)); ?></b> <?php echo esc_html__('unchanged', 'seo-content-control-center'); ?></span>
        </div>
        <?php if ($resolved > 0 && isset($changes['resolved']) && is_array($changes['resolved'])) : ?>
            <details class="sccc-resolved-findings">
                <summary><?php echo esc_html__('Review resolved findings', 'seo-content-control-center'); ?></summary>
                <ul>
                    <?php foreach ($changes['resolved'] as $finding) : ?>
                        <?php if (is_array($finding)) : ?>
                            <li>
                                <strong><?php echo esc_html((string) ($finding['title'] ?? __('Untitled content', 'seo-content-control-center'))); ?></strong>
                                <span><?php echo esc_html((string) ($finding['label'] ?? '')); ?></span>
                            </li>
                        <?php endif; ?>
                    <?php endforeach; ?>
                </ul>
            </details>
        <?php endif; ?>
        <?php
    }

    /**
     * @param array<int,mixed> $items
     * @param array<string,mixed>|null $connection
     */
    private function renderFindings(array $items, ?array $connection): void
    {
        $search = $this->readTextQuery('sccc_search');
        $severity = $this->readQueryValue('sccc_severity');
        $issue = $this->readQueryValue('sccc_issue');
        $postType = $this->readQueryValue('sccc_type');
        $visibility = $this->readQueryValue('sccc_visibility');
        $change = $this->readQueryValue('sccc_change');
        $rows = $this->filterRows($this->flattenFindings($items), $search, $severity, $issue, $postType, $visibility, $change);
        $page = max(1, (int) $this->readQueryValue('paged'));
        $totalPages = max(1, (int) ceil(count($rows) / self::PAGE_SIZE));
        $page = min($page, $totalPages);
        $visible = array_slice($rows, ($page - 1) * self::PAGE_SIZE, self::PAGE_SIZE);
        ?>
        <div class="sccc-results-header">
            <div>
                <h3><?php echo esc_html__('Findings', 'seo-content-control-center'); ?></h3>
                <p><?php echo esc_html(sprintf(_n('%d matching finding', '%d matching findings', count($rows), 'seo-content-control-center'), count($rows))); ?></p>
            </div>
            <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
                <input type="hidden" name="action" value="sccc_export_local_audit" />
                <?php wp_nonce_field('sccc_export_local_audit'); ?>
                <?php submit_button(__('Export CSV', 'seo-content-control-center'), 'secondary', 'submit', false); ?>
            </form>
        </div>
        <form class="sccc-filters" method="get" action="<?php echo esc_url(admin_url('admin.php')); ?>">
            <input type="hidden" name="page" value="sccc" />
            <label>
                <span class="screen-reader-text"><?php echo esc_html__('Search findings', 'seo-content-control-center'); ?></span>
                <input type="search" name="sccc_search" value="<?php echo esc_attr($search); ?>" placeholder="<?php echo esc_attr__('Search title or URL', 'seo-content-control-center'); ?>" />
            </label>
            <?php $this->renderFilterSelect('sccc_severity', $severity, __('All severities', 'seo-content-control-center'), $this->severityOptions()); ?>
            <?php $this->renderFilterSelect('sccc_issue', $issue, __('All issues', 'seo-content-control-center'), $this->issueOptions()); ?>
            <?php $this->renderFilterSelect('sccc_type', $postType, __('All content types', 'seo-content-control-center'), ['post' => __('Posts', 'seo-content-control-center'), 'page' => __('Pages', 'seo-content-control-center')]); ?>
            <?php $this->renderFilterSelect('sccc_change', $change, __('Any change', 'seo-content-control-center'), ['new' => __('New since last audit', 'seo-content-control-center'), 'unchanged' => __('Unchanged', 'seo-content-control-center')]); ?>
            <?php $this->renderFilterSelect('sccc_visibility', $visibility, __('Active findings', 'seo-content-control-center'), ['all' => __('Active and ignored', 'seo-content-control-center'), 'ignored' => __('Ignored only', 'seo-content-control-center')]); ?>
            <div class="sccc-filter-actions">
                <?php submit_button(__('Filter', 'seo-content-control-center'), 'secondary', 'submit', false); ?>
                <a class="button" href="<?php echo esc_url(admin_url('admin.php?page=sccc')); ?>"><?php echo esc_html__('Reset', 'seo-content-control-center'); ?></a>
            </div>
        </form>
        <div class="sccc-table-scroll" role="region" aria-label="<?php echo esc_attr__('Content health findings', 'seo-content-control-center'); ?>" tabindex="0">
            <table class="widefat striped sccc-findings-table">
                <thead>
                    <tr>
                        <th scope="col"><?php echo esc_html__('Content', 'seo-content-control-center'); ?></th>
                        <th scope="col"><?php echo esc_html__('Issue', 'seo-content-control-center'); ?></th>
                        <th scope="col"><?php echo esc_html__('Evidence', 'seo-content-control-center'); ?></th>
                        <th scope="col"><?php echo esc_html__('Modified', 'seo-content-control-center'); ?></th>
                        <th scope="col"><?php echo esc_html__('Actions', 'seo-content-control-center'); ?></th>
                    </tr>
                </thead>
                <tbody>
                    <?php if ([] === $visible) : ?>
                        <tr><td colspan="5"><?php echo esc_html__('No findings match the current filters.', 'seo-content-control-center'); ?></td></tr>
                    <?php else : ?>
                        <?php foreach ($visible as $row) : ?>
                            <?php $this->renderFindingRow($row, $connection); ?>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
        <?php $this->renderPagination($page, $totalPages); ?>
        <?php
    }

    /**
     * @param array<string,mixed> $row
     * @param array<string,mixed>|null $connection
     */
    private function renderFindingRow(array $row, ?array $connection): void
    {
        $postId = (int) ($row['post_id'] ?? 0);
        $editUrl = $postId > 0 ? get_edit_post_link($postId, 'raw') : '';
        $platform = null !== $connection ? $this->conversion()->describe($connection, $row) : null;
        ?>
        <tr class="<?php echo true === ($row['ignored'] ?? false) ? 'sccc-finding-ignored' : ''; ?>">
            <td>
                <strong><?php echo esc_html((string) ($row['title'] ?: __('Untitled content', 'seo-content-control-center'))); ?></strong>
                <div class="row-actions visible"><?php echo esc_html((string) ($row['type'] ?? '')); ?></div>
            </td>
            <td>
                <span class="sccc-severity sccc-severity-<?php echo esc_attr((string) $row['severity']); ?>"><?php echo esc_html($this->severityLabel((string) $row['severity'])); ?></span>
                <?php if ('new' === ($row['change'] ?? null)) : ?>
                    <span class="sccc-change-badge"><?php echo esc_html__('New', 'seo-content-control-center'); ?></span>
                <?php endif; ?>
                <?php if (true === ($row['ignored'] ?? false)) : ?>
                    <span class="sccc-ignored-badge"><?php echo esc_html__('Ignored', 'seo-content-control-center'); ?></span>
                <?php endif; ?>
                <div><?php echo esc_html((string) $row['label']); ?></div>
            </td>
            <td>
                <?php echo esc_html((string) $row['evidence']); ?>
                <?php if (is_array($platform) && true === $platform['gsc_enrichable']) : ?>
                    <span class="sccc-evidence-hint"><?php echo esc_html__('GSC evidence', 'seo-content-control-center'); ?></span>
                <?php endif; ?>
                <?php if (is_array($platform) && true === $platform['safe_operation']['available']) : ?>
                    <span class="sccc-safe-hint">
                        <?php
                        printf(
                            /* translators: %s: supported metadata field. */
                            esc_html__('Safe preview: %s', 'seo-content-control-center'),
                            esc_html((string) $platform['safe_operation']['field'])
                        );
                        ?>
                    </span>
                <?php endif; ?>
            </td>
            <td><?php echo esc_html($this->formatIsoDate((string) ($row['modified_at'] ?? ''))); ?></td>
            <td class="sccc-row-actions">
                <?php if (is_string($editUrl) && '' !== $editUrl) : ?>
                    <a href="<?php echo esc_url($editUrl); ?>"><?php echo esc_html__('Edit', 'seo-content-control-center'); ?></a>
                <?php endif; ?>
                <a href="<?php echo esc_url((string) ($row['url'] ?? '')); ?>" target="_blank" rel="noopener noreferrer"><?php echo esc_html__('View', 'seo-content-control-center'); ?></a>
                <?php if (is_array($platform)) : ?>
                    <a href="<?php echo esc_url($platform['content_url']); ?>" target="_blank" rel="noopener noreferrer"><?php echo esc_html__('Content', 'seo-content-control-center'); ?></a>
                    <a href="<?php echo esc_url($platform['audit_url']); ?>" target="_blank" rel="noopener noreferrer"><?php echo esc_html__('Audit', 'seo-content-control-center'); ?></a>
                <?php endif; ?>
                <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
                    <input type="hidden" name="action" value="sccc_update_finding_rule" />
                    <input type="hidden" name="sccc_fingerprint" value="<?php echo esc_attr((string) ($row['fingerprint'] ?? '')); ?>" />
                    <input type="hidden" name="sccc_rule_mode" value="<?php echo true === ($row['ignored'] ?? false) ? 'restore' : 'ignore'; ?>" />
                    <?php wp_nonce_field('sccc_update_finding_rule'); ?>
                    <button class="button-link" type="submit"><?php echo true === ($row['ignored'] ?? false) ? esc_html__('Restore', 'seo-content-control-center') : esc_html__('Ignore', 'seo-content-control-center'); ?></button>
                </form>
            </td>
        </tr>
        <?php
    }

    private function renderPlatform(): void
    {
        $store = $this->connectionStore();
        $connection = $store->get();
        $syncLogStore = new SyncLogStore();
        $syncLogs = $syncLogStore->all();
        $scheduler = new SyncScheduler($store, new ApiClient(new RequestSigner()), new ContentCollector(), $syncLogStore);
        $recurringSync = $scheduler->getRecurringSyncStatus();
        ?>
        <section class="sccc-section" aria-labelledby="sccc-platform-title">
            <div class="sccc-section-header">
                <div>
                    <h2 id="sccc-platform-title"><?php echo esc_html__('SEO operations platform', 'seo-content-control-center'); ?></h2>
                    <p><?php echo esc_html__('Optional: add Search Console evidence, prioritization, audit history, team backlog, and review-first metadata operations.', 'seo-content-control-center'); ?></p>
                </div>
            </div>
            <?php if (null === $connection) : ?>
                <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
                    <input type="hidden" name="action" value="sccc_exchange_connection" />
                    <?php wp_nonce_field('sccc_exchange_connection'); ?>
                    <table class="form-table" role="presentation">
                        <tr>
                            <th scope="row"><label for="sccc_endpoint"><?php echo esc_html__('SaaS endpoint', 'seo-content-control-center'); ?></label></th>
                            <td><input class="regular-text" id="sccc_endpoint" name="sccc_endpoint" type="url" required /></td>
                        </tr>
                        <tr>
                            <th scope="row"><label for="sccc_challenge"><?php echo esc_html__('Connection challenge', 'seo-content-control-center'); ?></label></th>
                            <td><input class="regular-text" id="sccc_challenge" name="sccc_challenge" type="password" required /></td>
                        </tr>
                    </table>
                    <?php submit_button(__('Connect platform', 'seo-content-control-center')); ?>
                </form>
            <?php else : ?>
                <p><?php echo esc_html(sprintf(__('Connected to site %s.', 'seo-content-control-center'), $connection['site_id'])); ?></p>
                <p><?php echo esc_html($this->formatRecurringSyncStatus($recurringSync)); ?></p>
                <div class="sccc-inline-actions">
                    <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
                        <input type="hidden" name="action" value="sccc_manual_sync" />
                        <?php wp_nonce_field('sccc_manual_sync'); ?>
                        <?php submit_button(__('Queue manual sync', 'seo-content-control-center'), 'primary', 'submit', false); ?>
                    </form>
                    <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
                        <input type="hidden" name="action" value="sccc_disconnect" />
                        <?php wp_nonce_field('sccc_disconnect'); ?>
                        <?php submit_button(__('Disconnect', 'seo-content-control-center'), 'delete', 'submit', false); ?>
                    </form>
                </div>
                <h3><?php echo esc_html__('Sync log', 'seo-content-control-center'); ?></h3>
                <?php $this->renderSyncLogs($syncLogs); ?>
            <?php endif; ?>
        </section>
        <?php
    }

    /**
     * @param array<int,array{id:string,status:string,message:string,item_count:int|null,created_at:int}> $syncLogs
     */
    private function renderSyncLogs(array $syncLogs): void
    {
        if ([] === $syncLogs) {
            echo '<p>' . esc_html__('No sync attempts have been recorded yet.', 'seo-content-control-center') . '</p>';
            return;
        }
        ?>
        <table class="widefat striped sccc-sync-table">
            <thead><tr><th><?php echo esc_html__('Time', 'seo-content-control-center'); ?></th><th><?php echo esc_html__('Status', 'seo-content-control-center'); ?></th><th><?php echo esc_html__('Items', 'seo-content-control-center'); ?></th><th><?php echo esc_html__('Details', 'seo-content-control-center'); ?></th></tr></thead>
            <tbody>
                <?php foreach ($syncLogs as $entry) : ?>
                    <tr>
                        <td><?php echo esc_html($this->formatTimestamp($entry['created_at'])); ?></td>
                        <td><?php echo esc_html(ucfirst($entry['status'])); ?></td>
                        <td><?php echo esc_html(null === $entry['item_count'] ? __('n/a', 'seo-content-control-center') : (string) $entry['item_count']); ?></td>
                        <td><?php echo esc_html($entry['message']); ?></td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
        <?php
    }

    /**
     * @param array<int,mixed> $items
     * @return array<int,array<string,mixed>>
     */
    private function flattenFindings(array $items): array
    {
        $rows = [];

        foreach ($items as $item) {
            if (! is_array($item) || ! isset($item['findings']) || ! is_array($item['findings'])) {
                continue;
            }

            foreach ($item['findings'] as $finding) {
                if (is_array($finding)) {
                    $rows[] = array_merge($item, $finding);
                }
            }
        }

        usort(
            $rows,
            fn (array $left, array $right): int => ((int) ($left['ignored'] ?? false)) <=> ((int) ($right['ignored'] ?? false))
                ?: $this->severityRank((string) $left['severity']) <=> $this->severityRank((string) $right['severity'])
                ?: strcmp((string) $right['modified_at'], (string) $left['modified_at'])
        );

        return $rows;
    }

    /**
     * @param array<int,array<string,mixed>> $rows
     * @return array<int,array<string,mixed>>
     */
    private function filterRows(
        array $rows,
        string $search,
        string $severity,
        string $issue,
        string $postType,
        string $visibility,
        string $change
    ): array
    {
        $needle = strtolower($search);

        return array_values(
            array_filter(
                $rows,
                static function (array $row) use ($needle, $severity, $issue, $postType, $visibility, $change): bool {
                    $matchesSearch = '' === $needle || str_contains(strtolower((string) ($row['title'] ?? '') . ' ' . (string) ($row['url'] ?? '')), $needle);
                    $matchesSeverity = '' === $severity || $severity === ($row['severity'] ?? null);
                    $matchesIssue = '' === $issue || $issue === ($row['code'] ?? null);
                    $matchesType = '' === $postType || $postType === ($row['type'] ?? null);
                    $isIgnored = true === ($row['ignored'] ?? false);
                    $matchesVisibility = 'all' === $visibility || ('ignored' === $visibility ? $isIgnored : ! $isIgnored);
                    $matchesChange = '' === $change || $change === ($row['change'] ?? null);

                    return $matchesSearch && $matchesSeverity && $matchesIssue && $matchesType && $matchesVisibility && $matchesChange;
                }
            )
        );
    }

    /**
     * @param array<string,string> $options
     */
    private function renderFilterSelect(string $name, string $selected, string $emptyLabel, array $options): void
    {
        echo '<label><span class="screen-reader-text">' . esc_html($emptyLabel) . '</span><select name="' . esc_attr($name) . '">';
        echo '<option value="">' . esc_html($emptyLabel) . '</option>';

        foreach ($options as $value => $label) {
            echo '<option value="' . esc_attr($value) . '" ' . selected($selected, $value, false) . '>' . esc_html($label) . '</option>';
        }

        echo '</select></label>';
    }

    private function renderPagination(int $page, int $totalPages): void
    {
        if ($totalPages <= 1) {
            return;
        }

        $base = remove_query_arg('paged');
        echo '<div class="tablenav"><div class="tablenav-pages">';
        echo wp_kses_post(
            paginate_links(
                [
                    'base' => add_query_arg('paged', '%#%', $base),
                    'current' => $page,
                    'total' => $totalPages,
                    'type' => 'plain',
                ]
            ) ?: ''
        );
        echo '</div></div>';
    }

    /**
     * @return array<string,string>
     */
    private function severityOptions(): array
    {
        return [
            'critical' => __('Critical', 'seo-content-control-center'),
            'warning' => __('Needs attention', 'seo-content-control-center'),
            'opportunity' => __('Opportunity', 'seo-content-control-center'),
            'maintenance' => __('Maintenance', 'seo-content-control-center'),
        ];
    }

    /**
     * @return array<string,string>
     */
    private function issueOptions(): array
    {
        return [
            'published-noindex' => __('Published noindex', 'seo-content-control-center'),
            'seo-title-missing' => __('Missing SEO title', 'seo-content-control-center'),
            'meta-description-missing' => __('Missing meta description', 'seo-content-control-center'),
            'canonical-different' => __('Canonical mismatch', 'seo-content-control-center'),
            'thin-content' => __('Thin content', 'seo-content-control-center'),
            'internal-links-missing' => __('No internal links', 'seo-content-control-center'),
            'orphan-content' => __('No inbound internal links', 'seo-content-control-center'),
            'weakly-linked-content' => __('Only one inbound internal link', 'seo-content-control-center'),
            'content-stale' => __('Stale content', 'seo-content-control-center'),
        ];
    }

    private function severityRank(string $severity): int
    {
        return match ($severity) {
            'critical' => 0,
            'warning' => 1,
            'opportunity' => 2,
            'maintenance' => 3,
            default => 4,
        };
    }

    private function severityLabel(string $severity): string
    {
        return $this->severityOptions()[$severity] ?? __('Unknown', 'seo-content-control-center');
    }

    /**
     * @return array<string,mixed>
     */
    private function siteHealthResult(string $status, string $label, string $description): array
    {
        return [
            'status' => $status,
            'label' => $label,
            'badge' => [
                'label' => __('SEO', 'seo-content-control-center'),
                'color' => 'blue',
            ],
            'description' => '<p>' . esc_html($description) . '</p>',
            'actions' => '<p><a href="' . esc_url(admin_url('admin.php?page=sccc')) . '">' . esc_html__('Open Content Health', 'seo-content-control-center') . '</a></p>',
            'test' => 'sccc_content_health',
        ];
    }

    private function store(): LocalAuditStore
    {
        return $this->auditStore ?? new LocalAuditStore();
    }

    private function settings(): LocalAuditSettings
    {
        return $this->auditSettings ?? new LocalAuditSettings();
    }

    private function runner(): LocalAuditRunner
    {
        return $this->auditRunner ?? new LocalAuditRunner(
            new ContentCollector(),
            new LocalAuditEngine(),
            $this->store(),
            ContentCollector::BATCH_SIZE,
            new LocalLinkGraph(),
            $this->settings()
        );
    }

    private function connectionStore(): ConnectionStore
    {
        return $this->connectionStore ?? new ConnectionStore();
    }

    private function conversion(): PlatformConversion
    {
        return $this->platformConversion ?? new PlatformConversion();
    }

    private function formatTimestamp(int $timestamp): string
    {
        return function_exists('wp_date') ? wp_date('Y-m-d H:i:s', $timestamp) : gmdate('Y-m-d H:i:s', $timestamp);
    }

    private function formatIsoDate(string $value): string
    {
        $timestamp = strtotime($value);

        return false === $timestamp ? $value : $this->formatTimestamp($timestamp);
    }

    /**
     * @param array{enabled:bool,interval:string,scheduler:string|null,next_run_at:int|null} $status
     */
    private function formatAuditScheduleStatus(array $status): string
    {
        if (! $status['enabled'] || null === $status['scheduler'] || null === $status['next_run_at']) {
            return 'off' === $status['interval']
                ? __('Disabled. Manual audits remain available.', 'seo-content-control-center')
                : __('The schedule will be created on the next WordPress request.', 'seo-content-control-center');
        }

        return sprintf(
            /* translators: 1: scheduler name, 2: next run date. */
            __('Runs via %1$s. Next audit: %2$s.', 'seo-content-control-center'),
            $status['scheduler'],
            $this->formatTimestamp($status['next_run_at'])
        );
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

        return is_string($value) ? sanitize_key($value) : '';
    }

    private function readTextQuery(string $key): string
    {
        if (! isset($_GET[$key])) {
            return '';
        }

        $value = wp_unslash($_GET[$key]);

        return is_string($value) ? sanitize_text_field($value) : '';
    }
}
