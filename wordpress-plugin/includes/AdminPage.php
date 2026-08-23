<?php
/**
 * WordPress admin UI.
 *
 * @package SCCC
 */

declare(strict_types=1);

namespace SCCC\Plugin;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class AdminPage {

	private const PAGE_SIZE = 50;

	public function __construct(
		private readonly ?LocalAuditStore $auditStore = null,
		private readonly ?LocalAuditSettings $auditSettings = null,
		private readonly ?LocalAuditRunner $auditRunner = null,
		private readonly ?ConnectionStore $connectionStore = null,
		private readonly ?PlatformConversion $platformConversion = null
	) {
	}

	public function registerMenu(): void {
		add_menu_page(
			__( 'Content Health Audit', 'content-signal-seo-content-audit' ),
			__( 'Content Health', 'content-signal-seo-content-audit' ),
			'manage_options',
			'sccc',
			array( $this, 'render' ),
			'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMCAyMCI+CiAgPHJlY3QgeD0iNS42IiB5PSIxMSIgd2lkdGg9IjIuMyIgaGVpZ2h0PSI0LjUiIHJ4PSIwLjYiIGZpbGw9ImJsYWNrIi8+CiAgPHJlY3QgeD0iOS4xIiB5PSI3LjgiIHdpZHRoPSIyLjMiIGhlaWdodD0iNy43IiByeD0iMC42IiBmaWxsPSJibGFjayIvPgogIDxyZWN0IHg9IjEyLjYiIHk9IjQuNSIgd2lkdGg9IjIuMyIgaGVpZ2h0PSIxMSIgcng9IjAuNiIgZmlsbD0iYmxhY2siLz4KPC9zdmc+Cg==',
			65
		);
	}

	public function enqueueAssets( string $hook ): void {
		if ( 'toplevel_page_sccc' !== $hook ) {
			return;
		}

		wp_enqueue_style(
			'sccc-admin',
			plugin_dir_url( SCCC_PLUGIN_FILE ) . 'assets/admin.css',
			array(),
			SCCC_PLUGIN_VERSION
		);
	}

	public function render(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You do not have permission to view this page.', 'content-signal-seo-content-audit' ) );
		}

		$tab         = 'platform' === $this->readQueryValue( 'tab' ) ? 'platform' : 'health';
		$notice      = $this->getFeedbackNotice(
			$this->readQueryValue( 'sccc_status' ),
			$this->readQueryValue( 'sccc_error' )
		);
		$isConnected = null !== $this->connectionStore()->get();
		?>
		<div class="wrap sccc-wrap">
			<div class="sccc-app-shell">
				<header class="sccc-app-header">
					<div class="sccc-brand-lockup">
						<svg class="sccc-brand-mark" viewBox="0 0 100 100" aria-hidden="true">
						<rect width="100" height="100" rx="14" fill="#050505" />
						<rect x="30" y="51" width="10" height="22" rx="2.5" fill="#fbfbfa" />
						<rect x="45" y="39" width="10" height="34" rx="2.5" fill="#fbfbfa" />
						<rect x="60" y="27" width="10" height="46" rx="2.5" fill="#fbfbfa" />
					</svg>
						<div>
							<h1><?php echo esc_html__( 'Content Signal', 'content-signal-seo-content-audit' ); ?></h1>
							<p><?php echo esc_html__( 'Local SEO health and review-first operations for WordPress.', 'content-signal-seo-content-audit' ); ?></p>
						</div>
					</div>
					<span class="sccc-connection-state <?php echo $isConnected ? 'is-connected' : 'is-local'; ?>">
						<span aria-hidden="true"></span>
						<?php echo $isConnected ? esc_html__( 'Platform connected', 'content-signal-seo-content-audit' ) : esc_html__( 'Local mode', 'content-signal-seo-content-audit' ); ?>
					</span>
				</header>

				<nav class="sccc-tabs" aria-label="<?php echo esc_attr__( 'Plugin sections', 'content-signal-seo-content-audit' ); ?>">
					<a class="sccc-tab <?php echo 'health' === $tab ? 'is-active' : ''; ?>" <?php echo 'health' === $tab ? 'aria-current="page"' : ''; ?> href="<?php echo esc_url( admin_url( 'admin.php?page=sccc' ) ); ?>">
						<?php echo esc_html__( 'Content health', 'content-signal-seo-content-audit' ); ?>
					</a>
					<a class="sccc-tab <?php echo 'platform' === $tab ? 'is-active' : ''; ?>" <?php echo 'platform' === $tab ? 'aria-current="page"' : ''; ?> href="<?php echo esc_url( admin_url( 'admin.php?page=sccc&tab=platform' ) ); ?>">
						<?php echo esc_html__( 'Platform connection', 'content-signal-seo-content-audit' ); ?>
					</a>
				</nav>

				<main class="sccc-workspace">
					<?php if ( null !== $notice ) : ?>
						<div class="notice notice-<?php echo esc_attr( $notice['type'] ); ?> is-dismissible sccc-feedback sccc-feedback-<?php echo esc_attr( $notice['type'] ); ?>">
							<p><?php echo esc_html( $notice['message'] ); ?></p>
						</div>
					<?php endif; ?>

					<?php 'platform' === $tab ? $this->renderPlatform() : $this->renderHealth(); ?>
				</main>
			</div>
		</div>
		<?php
	}

	public function exportAuditCsv(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You do not have permission to export this audit.', 'content-signal-seo-content-audit' ) );
		}

		check_admin_referer( 'sccc_export_local_audit' );
		$audit = $this->store()->get();
		$items = is_array( $audit ) && isset( $audit['items'] ) && is_array( $audit['items'] ) ? $audit['items'] : array();

		nocache_headers();
		header( 'Content-Type: text/csv; charset=utf-8' );
		header( 'Content-Disposition: attachment; filename="sccc-content-health-' . gmdate( 'Y-m-d' ) . '.csv"' );
		$output = fopen( 'php://output', 'wb' );

		if ( false === $output ) {
			wp_die( esc_html__( 'Could not create the CSV export.', 'content-signal-seo-content-audit' ) );
		}

		echo "\xEF\xBB\xBF";
		fputcsv( $output, array( 'Post ID', 'Type', 'Title', 'URL', 'Modified', 'Inbound links', 'Severity', 'Issue', 'Evidence', 'State' ) );

		foreach ( $items as $item ) {
			if ( ! is_array( $item ) || ! isset( $item['findings'] ) || ! is_array( $item['findings'] ) ) {
				continue;
			}

			foreach ( $item['findings'] as $finding ) {
				if ( ! is_array( $finding ) ) {
					continue;
				}

				fputcsv(
					$output,
					array(
						(string) ( $item['post_id'] ?? '' ),
						(string) ( $item['type'] ?? '' ),
						(string) ( $item['title'] ?? '' ),
						(string) ( $item['url'] ?? '' ),
						(string) ( $item['modified_at'] ?? '' ),
						(string) ( $item['inbound_link_count'] ?? '' ),
						(string) ( $finding['severity'] ?? '' ),
						(string) ( $finding['label'] ?? '' ),
						(string) ( $finding['evidence'] ?? '' ),
						true === ( $finding['ignored'] ?? false ) ? 'ignored' : (string) ( $finding['change'] ?? 'current' ),
					)
				);
			}
		}

		exit;
	}

	public function handleFindingRule(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You do not have permission to manage audit findings.', 'content-signal-seo-content-audit' ) );
		}

		check_admin_referer( 'sccc_update_finding_rule' );
		$fingerprint = isset( $_POST['sccc_fingerprint'] )
			? sanitize_key( (string) wp_unslash( $_POST['sccc_fingerprint'] ) )
			: '';
		$mode        = isset( $_POST['sccc_rule_mode'] )
			? sanitize_key( (string) wp_unslash( $_POST['sccc_rule_mode'] ) )
			: '';
		$ignored     = 'ignore' === $mode;

		$this->settings()->setIgnored( $fingerprint, $ignored );
		$this->store()->setIgnored( $fingerprint, $ignored );

		wp_safe_redirect(
			add_query_arg(
				'sccc_status',
				$ignored ? 'finding_ignored' : 'finding_restored',
				admin_url( 'admin.php?page=sccc' )
			)
		);
		exit;
	}

	public function registerDashboardWidget(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		wp_add_dashboard_widget(
			'sccc_content_health',
			__( 'Content Health', 'content-signal-seo-content-audit' ),
			array( $this, 'renderDashboardWidget' )
		);
	}

	public function renderDashboardWidget(): void {
		$audit = $this->store()->get();

		if ( ! is_array( $audit ) || 'complete' !== ( $audit['status'] ?? null ) ) {
			echo '<p>' . esc_html__( 'Run a local content audit to find SEO and maintenance issues across posts and pages.', 'content-signal-seo-content-audit' ) . '</p>';
			echo '<p><a class="button button-primary" href="' . esc_url( admin_url( 'admin.php?page=sccc' ) ) . '">' . esc_html__( 'Open Content Health', 'content-signal-seo-content-audit' ) . '</a></p>';
			return;
		}

		$summary = is_array( $audit['summary'] ?? null ) ? $audit['summary'] : array();
		printf(
			'<p><strong>%1$d</strong> %2$s · <strong>%3$d</strong> %4$s · <strong>%5$d</strong> %6$s</p>',
			(int) ( $summary['affected_urls'] ?? 0 ),
			esc_html__( 'URLs need review', 'content-signal-seo-content-audit' ),
			(int) ( $summary['critical'] ?? 0 ),
			esc_html__( 'critical findings', 'content-signal-seo-content-audit' ),
			(int) ( $summary['new_findings'] ?? 0 ),
			esc_html__( 'new since last scan', 'content-signal-seo-content-audit' )
		);
		echo '<p><a href="' . esc_url( admin_url( 'admin.php?page=sccc' ) ) . '">' . esc_html__( 'Review findings', 'content-signal-seo-content-audit' ) . '</a></p>';
	}

	/**
	 * @param array<string,mixed> $tests
	 * @return array<string,mixed>
	 */
	public function registerSiteHealthTests( array $tests ): array {
		$tests['direct']['sccc_content_health'] = array(
			'label' => __( 'Content health audit', 'content-signal-seo-content-audit' ),
			'test'  => array( $this, 'siteHealthTest' ),
		);

		return $tests;
	}

	/**
	 * @return array<string,mixed>
	 */
	public function siteHealthTest(): array {
		$audit    = $this->store()->get();
		$summary  = is_array( $audit ) && is_array( $audit['summary'] ?? null ) ? $audit['summary'] : array();
		$critical = (int) ( $summary['critical'] ?? 0 );

		if ( ! is_array( $audit ) || 'complete' !== ( $audit['status'] ?? null ) ) {
			return $this->siteHealthResult(
				'recommended',
				__( 'Run the local content health audit', 'content-signal-seo-content-audit' ),
				__( 'No completed content health audit is available yet.', 'content-signal-seo-content-audit' )
			);
		}

		if ( $critical > 0 ) {
			return $this->siteHealthResult(
				'critical',
				__( 'Published content has risky index settings', 'content-signal-seo-content-audit' ),
				sprintf(
					/* translators: %d: number of critical findings. */
					_n( '%d critical noindex finding needs review.', '%d critical noindex findings need review.', $critical, 'content-signal-seo-content-audit' ),
					$critical
				)
			);
		}

		return $this->siteHealthResult(
			'good',
			__( 'No critical content health risks detected', 'content-signal-seo-content-audit' ),
			__( 'The latest local audit found no published content marked noindex.', 'content-signal-seo-content-audit' )
		);
	}

	/**
	 * @return array{type:string,message:string}|null
	 */
	public function getFeedbackNotice( string $status, string $error ): ?array {
		if ( '' !== $error ) {
			return match ( $error ) {
				'missing_fields' => array(
					'type'    => 'error',
					'message' => __( 'SaaS endpoint and connection challenge are required.', 'content-signal-seo-content-audit' ),
				),
				'connection_exchange_failed' => array(
					'type'    => 'error',
					'message' => __( 'Could not connect this site. Check the SaaS endpoint and challenge.', 'content-signal-seo-content-audit' ),
				),
				'disconnect_failed' => array(
					'type'    => 'error',
					'message' => __( 'Could not disconnect this site. The local connection was kept so you can retry safely.', 'content-signal-seo-content-audit' ),
				),
				default => null,
			};
		}

		return match ( $status ) {
			'audit_queued' => array(
				'type'    => 'success',
				'message' => __( 'Content audit queued. Results will appear here after the background scan completes.', 'content-signal-seo-content-audit' ),
			),
			'audit_schedule_saved' => array(
				'type'    => 'success',
				'message' => __( 'Local audit schedule saved.', 'content-signal-seo-content-audit' ),
			),
			'finding_ignored' => array(
				'type'    => 'success',
				'message' => __( 'Finding ignored. It remains available through the Ignored filter.', 'content-signal-seo-content-audit' ),
			),
			'finding_restored' => array(
				'type'    => 'success',
				'message' => __( 'Finding restored to the active audit.', 'content-signal-seo-content-audit' ),
			),
			'connected' => array(
				'type'    => 'success',
				'message' => __( 'Site connected. Automatic sync has been scheduled.', 'content-signal-seo-content-audit' ),
			),
			'sync_queued' => array(
				'type'    => 'success',
				'message' => __( 'Manual sync queued. It will run shortly.', 'content-signal-seo-content-audit' ),
			),
			'disconnected' => array(
				'type'    => 'success',
				'message' => __( 'Site disconnected. Local sync jobs were cleared.', 'content-signal-seo-content-audit' ),
			),
			default => null,
		};
	}

	private function renderHealth(): void {
		$audit      = $this->store()->get();
		$schedule   = $this->runner()->getRecurringStatus();
		$connection = $this->connectionStore()->get();
		?>
		<section class="sccc-section sccc-health-section" aria-labelledby="sccc-health-title">
			<div class="sccc-section-header">
				<div>
					<h2 id="sccc-health-title"><?php echo esc_html__( 'WordPress Content Health Audit', 'content-signal-seo-content-audit' ); ?></h2>
					<p><?php echo esc_html__( 'Find SEO metadata, indexability, internal-link, thin-content, and freshness issues locally. No account required.', 'content-signal-seo-content-audit' ); ?></p>
				</div>
				<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
					<input type="hidden" name="action" value="sccc_run_local_audit" />
					<?php wp_nonce_field( 'sccc_run_local_audit' ); ?>
					<?php
					submit_button(
						is_array( $audit ) ? __( 'Run audit again', 'content-signal-seo-content-audit' ) : __( 'Run content audit', 'content-signal-seo-content-audit' ),
						'primary',
						'submit',
						false
					);
					?>
				</form>
			</div>
			<div class="sccc-audit-schedule">
				<div>
					<strong><?php echo esc_html__( 'Automatic local audit', 'content-signal-seo-content-audit' ); ?></strong>
					<p><?php echo esc_html( $this->formatAuditScheduleStatus( $schedule ) ); ?></p>
				</div>
				<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
					<input type="hidden" name="action" value="sccc_save_local_audit_schedule" />
					<?php wp_nonce_field( 'sccc_save_local_audit_schedule' ); ?>
					<label>
						<span class="screen-reader-text"><?php echo esc_html__( 'Audit interval', 'content-signal-seo-content-audit' ); ?></span>
						<select name="sccc_audit_interval">
							<option value="off" <?php selected( $schedule['interval'], 'off' ); ?>><?php echo esc_html__( 'Off', 'content-signal-seo-content-audit' ); ?></option>
							<option value="daily" <?php selected( $schedule['interval'], 'daily' ); ?>><?php echo esc_html__( 'Daily', 'content-signal-seo-content-audit' ); ?></option>
							<option value="weekly" <?php selected( $schedule['interval'], 'weekly' ); ?>><?php echo esc_html__( 'Weekly', 'content-signal-seo-content-audit' ); ?></option>
						</select>
					</label>
					<?php submit_button( __( 'Save schedule', 'content-signal-seo-content-audit' ), 'secondary', 'submit', false ); ?>
				</form>
			</div>
			<?php $this->renderAuditBody( $audit, $connection ); ?>
		</section>
		<?php
	}

	/**
	 * @param array<string,mixed>|null $audit
	 * @param array<string,mixed>|null $connection
	 */
	private function renderAuditBody( ?array $audit, ?array $connection ): void {
		if ( null === $audit ) {
			?>
			<div class="sccc-empty-state">
				<h3><?php echo esc_html__( 'See what needs attention before opening every post', 'content-signal-seo-content-audit' ); ?></h3>
				<p><?php echo esc_html__( 'The audit reads posts, pages, and supported SEO metadata on this WordPress site. It does not change content or contact an external service.', 'content-signal-seo-content-audit' ); ?></p>
			</div>
			<?php
			return;
		}

		if ( 'queued' === ( $audit['status'] ?? null ) ) {
			echo '<div class="notice notice-info inline"><p>' . esc_html__( 'The audit is queued and will run through Action Scheduler or WP-Cron. Refresh this page shortly.', 'content-signal-seo-content-audit' ) . '</p></div>';

			if ( ! isset( $audit['items'] ) || ! is_array( $audit['items'] ) || array() === $audit['items'] ) {
				return;
			}
		}

		if ( 'error' === ( $audit['status'] ?? null ) ) {
			echo '<div class="notice notice-error inline"><p>' . esc_html__( 'The latest audit failed.', 'content-signal-seo-content-audit' ) . ' ' . esc_html( (string) ( $audit['error'] ?? '' ) ) . '</p></div>';
			return;
		}

		$summary = is_array( $audit['summary'] ?? null ) ? $audit['summary'] : array();
		$items   = isset( $audit['items'] ) && is_array( $audit['items'] ) ? $audit['items'] : array();
		$this->renderSummary( $summary, (int) ( $audit['completed_at'] ?? 0 ) );
		$this->renderChanges( is_array( $audit['changes'] ?? null ) ? $audit['changes'] : array() );
		$this->renderPlatformContext( $connection );
		$this->renderFindings( $items, $connection );
	}

	/**
	 * @param array<string,mixed>|null $connection
	 */
	private function renderPlatformContext( ?array $connection ): void {
		if ( null === $connection ) {
			return;
		}

		$endpoint   = rtrim( (string) ( $connection['endpoint'] ?? '' ), '/' );
		$siteId     = (string) ( $connection['site_id'] ?? '' );
		$contentUrl = $endpoint . '/content?site=' . rawurlencode( $siteId );
		$auditsUrl  = $endpoint . '/audits?site=' . rawurlencode( $siteId );
		?>
		<div class="sccc-platform-context">
			<div>
				<strong><?php echo esc_html__( 'Connected evidence', 'content-signal-seo-content-audit' ); ?></strong>
				<p><?php echo esc_html__( 'Findings marked GSC evidence can gain clicks, impressions, position, and traffic-change context after Search Console sync. Safe preview appears only for supported Yoast or Rank Math metadata fields.', 'content-signal-seo-content-audit' ); ?></p>
			</div>
			<div class="sccc-inline-actions">
				<a class="button" href="<?php echo esc_url( $contentUrl ); ?>" target="_blank" rel="noopener noreferrer"><?php echo esc_html__( 'Synced content', 'content-signal-seo-content-audit' ); ?></a>
				<a class="button" href="<?php echo esc_url( $auditsUrl ); ?>" target="_blank" rel="noopener noreferrer"><?php echo esc_html__( 'Platform audits', 'content-signal-seo-content-audit' ); ?></a>
			</div>
		</div>
		<?php
	}

	/**
	 * @param array<string,mixed> $summary
	 */
	private function renderSummary( array $summary, int $completedAt ): void {
		$cards = array(
			array(
				'label' => __( 'Audited URLs', 'content-signal-seo-content-audit' ),
				'value' => (int) ( $summary['total_urls'] ?? 0 ),
				'tone'  => 'neutral',
			),
			array(
				'label' => __( 'Need review', 'content-signal-seo-content-audit' ),
				'value' => (int) ( $summary['affected_urls'] ?? 0 ),
				'tone'  => 'attention',
			),
			array(
				'label' => __( 'Critical', 'content-signal-seo-content-audit' ),
				'value' => (int) ( $summary['critical'] ?? 0 ),
				'tone'  => 'critical',
			),
			array(
				'label' => __( 'Checks complete', 'content-signal-seo-content-audit' ),
				'value' => (int) ( $summary['complete'] ?? 0 ),
				'tone'  => 'success',
			),
		);
		?>
		<div class="sccc-summary-grid" aria-label="<?php echo esc_attr__( 'Audit summary', 'content-signal-seo-content-audit' ); ?>">
			<?php foreach ( $cards as $card ) : ?>
				<div class="sccc-summary-card sccc-summary-<?php echo esc_attr( $card['tone'] ); ?>">
					<span><?php echo esc_html( $card['label'] ); ?></span>
					<strong><?php echo esc_html( number_format_i18n( $card['value'] ) ); ?></strong>
				</div>
			<?php endforeach; ?>
		</div>
		<?php if ( $completedAt > 0 ) : ?>
			<p class="description">
				<?php
				printf(
					/* translators: %s: audit completion date. */
					esc_html__( 'Last completed: %s', 'content-signal-seo-content-audit' ),
					esc_html( $this->formatTimestamp( $completedAt ) )
				);
				?>
			</p>
		<?php endif; ?>
		<?php
	}

	/**
	 * @param array<string,mixed> $changes
	 */
	private function renderChanges( array $changes ): void {
		$new       = (int) ( $changes['new_count'] ?? 0 );
		$resolved  = (int) ( $changes['resolved_count'] ?? 0 );
		$unchanged = (int) ( $changes['unchanged_count'] ?? 0 );

		if ( 0 === $new && 0 === $resolved && 0 === $unchanged ) {
			return;
		}
		?>
		<div class="sccc-change-summary" aria-label="<?php echo esc_attr__( 'Changes since the previous audit', 'content-signal-seo-content-audit' ); ?>">
			<strong><?php echo esc_html__( 'Since previous audit', 'content-signal-seo-content-audit' ); ?></strong>
			<span><b><?php echo esc_html( number_format_i18n( $new ) ); ?></b> <?php echo esc_html__( 'new', 'content-signal-seo-content-audit' ); ?></span>
			<span><b><?php echo esc_html( number_format_i18n( $resolved ) ); ?></b> <?php echo esc_html__( 'resolved', 'content-signal-seo-content-audit' ); ?></span>
			<span><b><?php echo esc_html( number_format_i18n( $unchanged ) ); ?></b> <?php echo esc_html__( 'unchanged', 'content-signal-seo-content-audit' ); ?></span>
		</div>
		<?php if ( $resolved > 0 && isset( $changes['resolved'] ) && is_array( $changes['resolved'] ) ) : ?>
			<details class="sccc-resolved-findings">
				<summary><?php echo esc_html__( 'Review resolved findings', 'content-signal-seo-content-audit' ); ?></summary>
				<ul>
					<?php foreach ( $changes['resolved'] as $finding ) : ?>
						<?php if ( is_array( $finding ) ) : ?>
							<li>
								<strong><?php echo esc_html( (string) ( $finding['title'] ?? __( 'Untitled content', 'content-signal-seo-content-audit' ) ) ); ?></strong>
								<span><?php echo esc_html( (string) ( $finding['label'] ?? '' ) ); ?></span>
							</li>
						<?php endif; ?>
					<?php endforeach; ?>
				</ul>
			</details>
		<?php endif; ?>
		<?php
	}

	/**
	 * @param array<int,mixed>         $items
	 * @param array<string,mixed>|null $connection
	 */
	private function renderFindings( array $items, ?array $connection ): void {
		// The filter form below submits this nonce with every GET request. An
		// absent or invalid nonce (a bookmarked or hand-edited URL) falls back
		// to the unfiltered, first-page view instead of trusting the input.
		$filtersNonceValid = isset( $_GET['sccc_filters_nonce'] ) && wp_verify_nonce(
			sanitize_text_field( wp_unslash( $_GET['sccc_filters_nonce'] ) ),
			'sccc_filter_findings'
		);

		$search     = $filtersNonceValid ? $this->readTextQuery( 'sccc_search' ) : '';
		$severity   = $filtersNonceValid ? $this->readQueryValue( 'sccc_severity' ) : '';
		$issue      = $filtersNonceValid ? $this->readQueryValue( 'sccc_issue' ) : '';
		$postType   = $filtersNonceValid ? $this->readQueryValue( 'sccc_type' ) : '';
		$visibility = $filtersNonceValid ? $this->readQueryValue( 'sccc_visibility' ) : '';
		$change     = $filtersNonceValid ? $this->readQueryValue( 'sccc_change' ) : '';
		$rows       = $this->filterRows( $this->flattenFindings( $items ), $search, $severity, $issue, $postType, $visibility, $change );
		$page       = $filtersNonceValid ? max( 1, (int) $this->readQueryValue( 'paged' ) ) : 1;
		$totalPages = max( 1, (int) ceil( count( $rows ) / self::PAGE_SIZE ) );
		$page       = min( $page, $totalPages );
		$visible    = array_slice( $rows, ( $page - 1 ) * self::PAGE_SIZE, self::PAGE_SIZE );
		?>
		<div class="sccc-results-header">
			<div>
				<h3><?php echo esc_html__( 'Findings', 'content-signal-seo-content-audit' ); ?></h3>
				<p>
				<?php
				/* translators: %d: number of matching findings. */
				echo esc_html( sprintf( _n( '%d matching finding', '%d matching findings', count( $rows ), 'content-signal-seo-content-audit' ), count( $rows ) ) );
				?>
				</p>
			</div>
			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
				<input type="hidden" name="action" value="sccc_export_local_audit" />
				<?php wp_nonce_field( 'sccc_export_local_audit' ); ?>
				<?php submit_button( __( 'Export CSV', 'content-signal-seo-content-audit' ), 'secondary', 'submit', false ); ?>
			</form>
		</div>
		<form class="sccc-filters" method="get" action="<?php echo esc_url( admin_url( 'admin.php' ) ); ?>">
			<input type="hidden" name="page" value="sccc" />
			<?php wp_nonce_field( 'sccc_filter_findings', 'sccc_filters_nonce' ); ?>
			<label>
				<span class="screen-reader-text"><?php echo esc_html__( 'Search findings', 'content-signal-seo-content-audit' ); ?></span>
				<input type="search" name="sccc_search" value="<?php echo esc_attr( $search ); ?>" placeholder="<?php echo esc_attr__( 'Search title or URL', 'content-signal-seo-content-audit' ); ?>" />
			</label>
			<?php $this->renderFilterSelect( 'sccc_severity', $severity, __( 'All severities', 'content-signal-seo-content-audit' ), $this->severityOptions() ); ?>
			<?php $this->renderFilterSelect( 'sccc_issue', $issue, __( 'All issues', 'content-signal-seo-content-audit' ), $this->issueOptions() ); ?>
			<?php
			$this->renderFilterSelect(
				'sccc_type',
				$postType,
				__( 'All content types', 'content-signal-seo-content-audit' ),
				array(
					'post' => __( 'Posts', 'content-signal-seo-content-audit' ),
					'page' => __( 'Pages', 'content-signal-seo-content-audit' ),
				)
			);
			?>
			<?php
			$this->renderFilterSelect(
				'sccc_change',
				$change,
				__( 'Any change', 'content-signal-seo-content-audit' ),
				array(
					'new'       => __( 'New since last audit', 'content-signal-seo-content-audit' ),
					'unchanged' => __( 'Unchanged', 'content-signal-seo-content-audit' ),
				)
			);
			?>
			<?php
			$this->renderFilterSelect(
				'sccc_visibility',
				$visibility,
				__( 'Active findings', 'content-signal-seo-content-audit' ),
				array(
					'all'     => __( 'Active and ignored', 'content-signal-seo-content-audit' ),
					'ignored' => __( 'Ignored only', 'content-signal-seo-content-audit' ),
				)
			);
			?>
			<div class="sccc-filter-actions">
				<?php submit_button( __( 'Filter', 'content-signal-seo-content-audit' ), 'secondary', 'submit', false ); ?>
				<a class="button" href="<?php echo esc_url( admin_url( 'admin.php?page=sccc' ) ); ?>"><?php echo esc_html__( 'Reset', 'content-signal-seo-content-audit' ); ?></a>
			</div>
		</form>
		<div class="sccc-table-scroll" role="region" aria-label="<?php echo esc_attr__( 'Content health findings', 'content-signal-seo-content-audit' ); ?>" tabindex="0">
			<table class="widefat striped sccc-findings-table">
				<thead>
					<tr>
						<th scope="col"><?php echo esc_html__( 'Content', 'content-signal-seo-content-audit' ); ?></th>
						<th scope="col"><?php echo esc_html__( 'Issue', 'content-signal-seo-content-audit' ); ?></th>
						<th scope="col"><?php echo esc_html__( 'Evidence', 'content-signal-seo-content-audit' ); ?></th>
						<th scope="col"><?php echo esc_html__( 'Modified', 'content-signal-seo-content-audit' ); ?></th>
						<th scope="col"><?php echo esc_html__( 'Actions', 'content-signal-seo-content-audit' ); ?></th>
					</tr>
				</thead>
				<tbody>
					<?php if ( array() === $visible ) : ?>
						<tr><td colspan="5"><?php echo esc_html__( 'No findings match the current filters.', 'content-signal-seo-content-audit' ); ?></td></tr>
					<?php else : ?>
						<?php foreach ( $visible as $row ) : ?>
							<?php $this->renderFindingRow( $row, $connection ); ?>
						<?php endforeach; ?>
					<?php endif; ?>
				</tbody>
			</table>
		</div>
		<?php $this->renderPagination( $page, $totalPages ); ?>
		<?php
	}

	/**
	 * @param array<string,mixed>      $row
	 * @param array<string,mixed>|null $connection
	 */
	private function renderFindingRow( array $row, ?array $connection ): void {
		$postId   = (int) ( $row['post_id'] ?? 0 );
		$editUrl  = $postId > 0 ? get_edit_post_link( $postId, 'raw' ) : '';
		$platform = null !== $connection ? $this->conversion()->describe( $connection, $row ) : null;
		?>
		<tr class="<?php echo true === ( $row['ignored'] ?? false ) ? 'sccc-finding-ignored' : ''; ?>">
			<td>
				<strong><?php echo esc_html( (string) ( $row['title'] ?: __( 'Untitled content', 'content-signal-seo-content-audit' ) ) ); ?></strong>
				<div class="row-actions visible"><?php echo esc_html( (string) ( $row['type'] ?? '' ) ); ?></div>
			</td>
			<td>
				<span class="sccc-severity sccc-severity-<?php echo esc_attr( (string) $row['severity'] ); ?>"><?php echo esc_html( $this->severityLabel( (string) $row['severity'] ) ); ?></span>
				<?php if ( 'new' === ( $row['change'] ?? null ) ) : ?>
					<span class="sccc-change-badge"><?php echo esc_html__( 'New', 'content-signal-seo-content-audit' ); ?></span>
				<?php endif; ?>
				<?php if ( true === ( $row['ignored'] ?? false ) ) : ?>
					<span class="sccc-ignored-badge"><?php echo esc_html__( 'Ignored', 'content-signal-seo-content-audit' ); ?></span>
				<?php endif; ?>
				<div><?php echo esc_html( (string) $row['label'] ); ?></div>
			</td>
			<td>
				<?php echo esc_html( (string) $row['evidence'] ); ?>
				<?php if ( is_array( $platform ) && true === $platform['gsc_enrichable'] ) : ?>
					<span class="sccc-evidence-hint"><?php echo esc_html__( 'GSC evidence', 'content-signal-seo-content-audit' ); ?></span>
				<?php endif; ?>
				<?php if ( is_array( $platform ) && true === $platform['safe_operation']['available'] ) : ?>
					<span class="sccc-safe-hint">
						<?php
						printf(
							/* translators: %s: supported metadata field. */
							esc_html__( 'Safe preview: %s', 'content-signal-seo-content-audit' ),
							esc_html( (string) $platform['safe_operation']['field'] )
						);
						?>
					</span>
				<?php endif; ?>
			</td>
			<td><?php echo esc_html( $this->formatIsoDate( (string) ( $row['modified_at'] ?? '' ) ) ); ?></td>
			<td class="sccc-row-actions">
				<?php if ( is_string( $editUrl ) && '' !== $editUrl ) : ?>
					<a href="<?php echo esc_url( $editUrl ); ?>"><?php echo esc_html__( 'Edit', 'content-signal-seo-content-audit' ); ?></a>
				<?php endif; ?>
				<a href="<?php echo esc_url( (string) ( $row['url'] ?? '' ) ); ?>" target="_blank" rel="noopener noreferrer"><?php echo esc_html__( 'View', 'content-signal-seo-content-audit' ); ?></a>
				<?php if ( is_array( $platform ) ) : ?>
					<a href="<?php echo esc_url( $platform['content_url'] ); ?>" target="_blank" rel="noopener noreferrer"><?php echo esc_html__( 'Content', 'content-signal-seo-content-audit' ); ?></a>
					<a href="<?php echo esc_url( $platform['audit_url'] ); ?>" target="_blank" rel="noopener noreferrer"><?php echo esc_html__( 'Audit', 'content-signal-seo-content-audit' ); ?></a>
				<?php endif; ?>
				<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
					<input type="hidden" name="action" value="sccc_update_finding_rule" />
					<input type="hidden" name="sccc_fingerprint" value="<?php echo esc_attr( (string) ( $row['fingerprint'] ?? '' ) ); ?>" />
					<input type="hidden" name="sccc_rule_mode" value="<?php echo true === ( $row['ignored'] ?? false ) ? 'restore' : 'ignore'; ?>" />
					<?php wp_nonce_field( 'sccc_update_finding_rule' ); ?>
					<button class="button-link" type="submit"><?php echo true === ( $row['ignored'] ?? false ) ? esc_html__( 'Restore', 'content-signal-seo-content-audit' ) : esc_html__( 'Ignore', 'content-signal-seo-content-audit' ); ?></button>
				</form>
			</td>
		</tr>
		<?php
	}

	private function renderPlatform(): void {
		$store         = $this->connectionStore();
		$connection    = $store->get();
		$syncLogStore  = new SyncLogStore();
		$syncLogs      = $syncLogStore->all();
		$scheduler     = new SyncScheduler(
			$store,
			new ApiClient( new RequestSigner() ),
			new ContentCollector(),
			$syncLogStore,
			ContentCollector::BATCH_SIZE,
			$this->store()
		);
		$recurringSync = $scheduler->getRecurringSyncStatus();
		?>
		<section class="sccc-section sccc-platform-section" aria-labelledby="sccc-platform-title">
			<div class="sccc-section-header">
				<div>
					<h2 id="sccc-platform-title"><?php echo esc_html__( 'SEO operations platform', 'content-signal-seo-content-audit' ); ?></h2>
					<p><?php echo esc_html__( 'Optional: add Search Console evidence, prioritization, audit history, team backlog, and review-first metadata operations.', 'content-signal-seo-content-audit' ); ?></p>
				</div>
			</div>
			<?php if ( null === $connection ) : ?>
				<div class="sccc-connect-layout">
					<form class="sccc-connect-form" method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
						<input type="hidden" name="action" value="sccc_exchange_connection" />
						<?php wp_nonce_field( 'sccc_exchange_connection' ); ?>
						<div class="sccc-field-group">
							<label for="sccc_endpoint"><?php echo esc_html__( 'Platform URL', 'content-signal-seo-content-audit' ); ?></label>
							<input id="sccc_endpoint" name="sccc_endpoint" type="url" placeholder="https://app.example.com" autocomplete="url" required />
							<p><?php echo esc_html__( 'Use the URL of your Content Signal workspace.', 'content-signal-seo-content-audit' ); ?></p>
						</div>
						<div class="sccc-field-group">
							<label for="sccc_challenge"><?php echo esc_html__( 'Connection challenge', 'content-signal-seo-content-audit' ); ?></label>
							<input id="sccc_challenge" name="sccc_challenge" type="password" autocomplete="one-time-code" required />
							<p><?php echo esc_html__( 'Generate this one-time challenge from the Sites page in the platform.', 'content-signal-seo-content-audit' ); ?></p>
						</div>
						<?php submit_button( __( 'Connect platform', 'content-signal-seo-content-audit' ), 'primary', 'submit', false ); ?>
					</form>
					<aside class="sccc-connect-benefits" aria-label="<?php echo esc_attr__( 'Platform capabilities', 'content-signal-seo-content-audit' ); ?>">
						<strong><?php echo esc_html__( 'What the connection adds', 'content-signal-seo-content-audit' ); ?></strong>
						<ul>
							<li><?php echo esc_html__( 'Search Console evidence and traffic context', 'content-signal-seo-content-audit' ); ?></li>
							<li><?php echo esc_html__( 'Prioritized team backlog and audit history', 'content-signal-seo-content-audit' ); ?></li>
							<li><?php echo esc_html__( 'Preview and approval before metadata changes', 'content-signal-seo-content-audit' ); ?></li>
						</ul>
						<p><?php echo esc_html__( 'The local audit remains available without an account.', 'content-signal-seo-content-audit' ); ?></p>
					</aside>
				</div>
			<?php else : ?>
				<div class="sccc-connected-panel">
					<div class="sccc-connected-copy">
						<span class="sccc-status-dot" aria-hidden="true"></span>
						<div>
							<strong><?php echo esc_html__( 'Connection active', 'content-signal-seo-content-audit' ); ?></strong>
							<p>
							<?php
							/* translators: %s: connected site ID. */
							echo esc_html( sprintf( __( 'Site ID: %s', 'content-signal-seo-content-audit' ), $connection['site_id'] ) );
							?>
							</p>
							<p><?php echo esc_html( $this->formatRecurringSyncStatus( $recurringSync ) ); ?></p>
						</div>
					</div>
					<div class="sccc-inline-actions">
						<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
							<input type="hidden" name="action" value="sccc_manual_sync" />
							<?php wp_nonce_field( 'sccc_manual_sync' ); ?>
							<?php submit_button( __( 'Queue manual sync', 'content-signal-seo-content-audit' ), 'primary', 'submit', false ); ?>
						</form>
						<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
							<input type="hidden" name="action" value="sccc_disconnect" />
							<?php wp_nonce_field( 'sccc_disconnect' ); ?>
							<?php submit_button( __( 'Disconnect', 'content-signal-seo-content-audit' ), 'delete', 'submit', false ); ?>
						</form>
					</div>
				</div>
				<div class="sccc-sync-log">
					<div class="sccc-results-header">
						<div>
							<h3><?php echo esc_html__( 'Sync activity', 'content-signal-seo-content-audit' ); ?></h3>
							<p><?php echo esc_html__( 'Recent transfers between WordPress and the platform.', 'content-signal-seo-content-audit' ); ?></p>
						</div>
					</div>
					<?php $this->renderSyncLogs( $syncLogs ); ?>
				</div>
			<?php endif; ?>
		</section>
		<?php
	}

	/**
	 * @param array<int,array{id:string,status:string,message:string,item_count:int|null,created_at:int}> $syncLogs
	 */
	private function renderSyncLogs( array $syncLogs ): void {
		if ( array() === $syncLogs ) {
			echo '<p>' . esc_html__( 'No sync attempts have been recorded yet.', 'content-signal-seo-content-audit' ) . '</p>';
			return;
		}
		?>
		<table class="widefat striped sccc-sync-table">
			<thead><tr><th><?php echo esc_html__( 'Time', 'content-signal-seo-content-audit' ); ?></th><th><?php echo esc_html__( 'Status', 'content-signal-seo-content-audit' ); ?></th><th><?php echo esc_html__( 'Items', 'content-signal-seo-content-audit' ); ?></th><th><?php echo esc_html__( 'Details', 'content-signal-seo-content-audit' ); ?></th></tr></thead>
			<tbody>
				<?php foreach ( $syncLogs as $entry ) : ?>
					<tr>
						<td><?php echo esc_html( $this->formatTimestamp( $entry['created_at'] ) ); ?></td>
						<td><span class="sccc-sync-status sccc-sync-status-<?php echo esc_attr( sanitize_key( $entry['status'] ) ); ?>"><?php echo esc_html( ucfirst( $entry['status'] ) ); ?></span></td>
						<td><?php echo esc_html( null === $entry['item_count'] ? __( 'n/a', 'content-signal-seo-content-audit' ) : (string) $entry['item_count'] ); ?></td>
						<td><?php echo esc_html( $entry['message'] ); ?></td>
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
	private function flattenFindings( array $items ): array {
		$rows = array();

		foreach ( $items as $item ) {
			if ( ! is_array( $item ) || ! isset( $item['findings'] ) || ! is_array( $item['findings'] ) ) {
				continue;
			}

			foreach ( $item['findings'] as $finding ) {
				if ( is_array( $finding ) ) {
					$rows[] = array_merge( $item, $finding );
				}
			}
		}

		usort(
			$rows,
			fn ( array $left, array $right ): int => ( (int) ( $left['ignored'] ?? false ) ) <=> ( (int) ( $right['ignored'] ?? false ) )
				?: $this->severityRank( (string) $left['severity'] ) <=> $this->severityRank( (string) $right['severity'] )
				?: strcmp( (string) $right['modified_at'], (string) $left['modified_at'] )
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
	): array {
		$needle = strtolower( $search );

		return array_values(
			array_filter(
				$rows,
				static function ( array $row ) use ( $needle, $severity, $issue, $postType, $visibility, $change ): bool {
					$matchesSearch     = '' === $needle || str_contains( strtolower( (string) ( $row['title'] ?? '' ) . ' ' . (string) ( $row['url'] ?? '' ) ), $needle );
					$matchesSeverity   = '' === $severity || $severity === ( $row['severity'] ?? null );
					$matchesIssue      = '' === $issue || $issue === ( $row['code'] ?? null );
					$matchesType       = '' === $postType || $postType === ( $row['type'] ?? null );
					$isIgnored         = true === ( $row['ignored'] ?? false );
					$matchesVisibility = 'all' === $visibility || ( 'ignored' === $visibility ? $isIgnored : ! $isIgnored );
					$matchesChange     = '' === $change || $change === ( $row['change'] ?? null );

					return $matchesSearch && $matchesSeverity && $matchesIssue && $matchesType && $matchesVisibility && $matchesChange;
				}
			)
		);
	}

	/**
	 * @param array<string,string> $options
	 */
	private function renderFilterSelect( string $name, string $selected, string $emptyLabel, array $options ): void {
		echo '<label><span class="screen-reader-text">' . esc_html( $emptyLabel ) . '</span><select name="' . esc_attr( $name ) . '">';
		echo '<option value="">' . esc_html( $emptyLabel ) . '</option>';

		foreach ( $options as $value => $label ) {
			echo '<option value="' . esc_attr( $value ) . '" ' . selected( $selected, $value, false ) . '>' . esc_html( $label ) . '</option>';
		}

		echo '</select></label>';
	}

	private function renderPagination( int $page, int $totalPages ): void {
		if ( $totalPages <= 1 ) {
			return;
		}

		$base = remove_query_arg( 'paged' );
		echo '<div class="tablenav"><div class="tablenav-pages">';
		echo wp_kses_post(
			paginate_links(
				array(
					'base'    => add_query_arg( 'paged', '%#%', $base ),
					'current' => $page,
					'total'   => $totalPages,
					'type'    => 'plain',
				)
			) ?: ''
		);
		echo '</div></div>';
	}

	/**
	 * @return array<string,string>
	 */
	private function severityOptions(): array {
		return array(
			'critical'    => __( 'Critical', 'content-signal-seo-content-audit' ),
			'warning'     => __( 'Needs attention', 'content-signal-seo-content-audit' ),
			'opportunity' => __( 'Opportunity', 'content-signal-seo-content-audit' ),
			'maintenance' => __( 'Maintenance', 'content-signal-seo-content-audit' ),
		);
	}

	/**
	 * @return array<string,string>
	 */
	private function issueOptions(): array {
		return array(
			'published-noindex'        => __( 'Published noindex', 'content-signal-seo-content-audit' ),
			'seo-title-missing'        => __( 'Missing SEO title', 'content-signal-seo-content-audit' ),
			'meta-description-missing' => __( 'Missing meta description', 'content-signal-seo-content-audit' ),
			'canonical-different'      => __( 'Canonical mismatch', 'content-signal-seo-content-audit' ),
			'thin-content'             => __( 'Thin content', 'content-signal-seo-content-audit' ),
			'internal-links-missing'   => __( 'No internal links', 'content-signal-seo-content-audit' ),
			'orphan-content'           => __( 'No inbound internal links', 'content-signal-seo-content-audit' ),
			'weakly-linked-content'    => __( 'Only one inbound internal link', 'content-signal-seo-content-audit' ),
			'content-stale'            => __( 'Stale content', 'content-signal-seo-content-audit' ),
		);
	}

	private function severityRank( string $severity ): int {
		return match ( $severity ) {
			'critical' => 0,
			'warning' => 1,
			'opportunity' => 2,
			'maintenance' => 3,
			default => 4,
		};
	}

	private function severityLabel( string $severity ): string {
		return $this->severityOptions()[ $severity ] ?? __( 'Unknown', 'content-signal-seo-content-audit' );
	}

	/**
	 * @return array<string,mixed>
	 */
	private function siteHealthResult( string $status, string $label, string $description ): array {
		return array(
			'status'      => $status,
			'label'       => $label,
			'badge'       => array(
				'label' => __( 'SEO', 'content-signal-seo-content-audit' ),
				'color' => 'blue',
			),
			'description' => '<p>' . esc_html( $description ) . '</p>',
			'actions'     => '<p><a href="' . esc_url( admin_url( 'admin.php?page=sccc' ) ) . '">' . esc_html__( 'Open Content Health', 'content-signal-seo-content-audit' ) . '</a></p>',
			'test'        => 'sccc_content_health',
		);
	}

	private function store(): LocalAuditStore {
		return $this->auditStore ?? new LocalAuditStore();
	}

	private function settings(): LocalAuditSettings {
		return $this->auditSettings ?? new LocalAuditSettings();
	}

	private function runner(): LocalAuditRunner {
		return $this->auditRunner ?? new LocalAuditRunner(
			new ContentCollector(),
			new LocalAuditEngine(),
			$this->store(),
			ContentCollector::BATCH_SIZE,
			new LocalLinkGraph(),
			$this->settings()
		);
	}

	private function connectionStore(): ConnectionStore {
		return $this->connectionStore ?? new ConnectionStore();
	}

	private function conversion(): PlatformConversion {
		return $this->platformConversion ?? new PlatformConversion();
	}

	private function formatTimestamp( int $timestamp ): string {
		return function_exists( 'wp_date' ) ? wp_date( 'Y-m-d H:i:s', $timestamp ) : gmdate( 'Y-m-d H:i:s', $timestamp );
	}

	private function formatIsoDate( string $value ): string {
		$timestamp = strtotime( $value );

		return false === $timestamp ? $value : $this->formatTimestamp( $timestamp );
	}

	/**
	 * @param array{enabled:bool,interval:string,scheduler:string|null,next_run_at:int|null} $status
	 */
	private function formatAuditScheduleStatus( array $status ): string {
		if ( ! $status['enabled'] || null === $status['scheduler'] || null === $status['next_run_at'] ) {
			return 'off' === $status['interval']
				? __( 'Disabled. Manual audits remain available.', 'content-signal-seo-content-audit' )
				: __( 'The schedule will be created on the next WordPress request.', 'content-signal-seo-content-audit' );
		}

		return sprintf(
			/* translators: 1: scheduler name, 2: next run date. */
			__( 'Runs via %1$s. Next audit: %2$s.', 'content-signal-seo-content-audit' ),
			$status['scheduler'],
			$this->formatTimestamp( $status['next_run_at'] )
		);
	}

	/**
	 * @param array{enabled:bool,scheduler:string|null,next_run_at:int|null} $status
	 */
	private function formatRecurringSyncStatus( array $status ): string {
		if ( ! $status['enabled'] || null === $status['scheduler'] || null === $status['next_run_at'] ) {
			return __( 'Automatic sync is not scheduled yet.', 'content-signal-seo-content-audit' );
		}

		return sprintf(
			/* translators: 1: scheduler name, 2: next run date. */
			__( 'Automatic sync runs via %1$s. Next run: %2$s.', 'content-signal-seo-content-audit' ),
			$status['scheduler'],
			$this->formatTimestamp( $status['next_run_at'] )
		);
	}

	/**
	 * Reads and sanitizes an admin-page query argument as a key-safe string.
	 *
	 * Every caller runs behind the current_user_can( 'manage_options' ) gate
	 * in render(). Callers that read a value the visitor supplied through the
	 * findings filter form additionally require a valid sccc_filters_nonce
	 * before calling this method (see renderFindings()). The remaining
	 * callers only read `tab`, `sccc_status`, and `sccc_error`: fixed,
	 * server-generated redirect targets from this plugin's own
	 * wp_safe_redirect() calls, matched against a strict allow-list at the
	 * call site, with no user-facing form to attach a nonce to.
	 *
	 * @param string $key Query argument name.
	 */
	private function readQueryValue( string $key ): string {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- see the docblock above: nonce-verified by the caller for form-submitted keys, or not applicable for internal redirect-target keys.
		if ( ! isset( $_GET[ $key ] ) ) {
			return '';
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Recommended, WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- see the docblock above; sanitized immediately below via sanitize_key().
		$value = wp_unslash( $_GET[ $key ] );

		return is_string( $value ) ? sanitize_key( $value ) : '';
	}

	/**
	 * Reads and sanitizes an admin-page query argument as free text.
	 *
	 * Only used for the findings filter search box; see readQueryValue() and
	 * renderFindings() for the nonce-verification contract.
	 *
	 * @param string $key Query argument name.
	 */
	private function readTextQuery( string $key ): string {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- see readQueryValue() docblock; the sole caller (renderFindings()) verifies sccc_filters_nonce before calling this method.
		if ( ! isset( $_GET[ $key ] ) ) {
			return '';
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Recommended, WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- see readQueryValue() docblock; sanitized immediately below via sanitize_text_field().
		$value = wp_unslash( $_GET[ $key ] );

		return is_string( $value ) ? sanitize_text_field( $value ) : '';
	}
}
