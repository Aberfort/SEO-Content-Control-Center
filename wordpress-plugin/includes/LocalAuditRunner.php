<?php
/**
 * Runs the local content health audit in bounded batches.
 *
 * @package SCCC
 */

declare(strict_types=1);

namespace SCCC\Plugin;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class LocalAuditRunner {

	public const HOOK           = 'sccc_run_local_audit';
	public const RECURRING_HOOK = 'sccc_run_scheduled_local_audit';
	private const GROUP         = 'sccc';
	private const MAX_BATCHES   = 50;

	public function __construct(
		private readonly ContentCollector $collector,
		private readonly LocalAuditEngine $engine,
		private readonly LocalAuditStore $store,
		private readonly int $batchSize = ContentCollector::BATCH_SIZE,
		private readonly ?LocalLinkGraph $linkGraph = null,
		private readonly ?LocalAuditSettings $settings = null
	) {
	}

	public function handleScheduleRequest(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You do not have permission to schedule audits.', 'content-signal-seo-content-audit' ) );
		}

		check_admin_referer( 'sccc_save_local_audit_schedule' );
		$interval = isset( $_POST['sccc_audit_interval'] )
			? sanitize_key( (string) wp_unslash( $_POST['sccc_audit_interval'] ) )
			: 'off';
		$this->settings()->setInterval( $interval );
		$this->cancelRecurring();
		$this->ensureRecurring();

		wp_safe_redirect( add_query_arg( 'sccc_status', 'audit_schedule_saved', admin_url( 'admin.php?page=sccc' ) ) );
		exit;
	}

	public function handleRequest(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You do not have permission to run this audit.', 'content-signal-seo-content-audit' ) );
		}

		check_admin_referer( 'sccc_run_local_audit' );
		$this->queue();

		wp_safe_redirect( add_query_arg( 'sccc_status', 'audit_queued', admin_url( 'admin.php?page=sccc' ) ) );
		exit;
	}

	public function queue(): string {
		$this->store->start();

		if ( function_exists( 'as_enqueue_async_action' ) ) {
			as_enqueue_async_action( self::HOOK, array(), self::GROUP );

			return 'Action Scheduler';
		}

		if ( false === wp_next_scheduled( self::HOOK ) ) {
			wp_schedule_single_event( time() + 1, self::HOOK );
		}

		return 'WP-Cron';
	}

	public function run(): void {
		try {
			$items = array();

			for ( $batch = 0; $batch < self::MAX_BATCHES; $batch++ ) {
				$offset = $batch * $this->batchSize;
				$page   = $this->collector->collectBatch( $offset, $this->batchSize );

				foreach ( $page['items'] as $item ) {
					if ( 'publish' !== strtolower( (string) $item['status'] ) ) {
						continue;
					}

					$items[] = array(
						'external_id'   => $item['externalId'],
						'post_id'       => $this->postId( $item['externalId'] ),
						'type'          => $item['type'],
						'url'           => $item['url'],
						'title'         => $item['title'],
						'status'        => $item['status'],
						'modified_at'   => $item['modifiedAt'],
						'seo_plugin'    => (string) ( $item['metadata']['seoPlugin'] ?? 'fallback' ),
						'outbound_urls' => $this->outboundUrls( $item ),
						'findings'      => $this->engine->inspect( $item ),
					);
				}

				if ( ! $page['hasMore'] ) {
					break;
				}
			}

			$items = $this->linkGraph()->analyze( $items );
			$items = $this->applyIgnoredRules( $items );
			$this->store->complete( $items, $this->engine->summarize( $items ) );
		} catch ( \Throwable $error ) {
			$this->store->fail( $error->getMessage() );
		}
	}

	public function runScheduled(): void {
		$this->store->start();
		$this->run();
	}

	public function ensureRecurring(): string {
		$interval = $this->settings()->get()['interval'];

		if ( 'off' === $interval ) {
			$this->cancelRecurring();
			return 'disabled';
		}

		$seconds = 'daily' === $interval ? DAY_IN_SECONDS : WEEK_IN_SECONDS;

		if ( function_exists( 'as_next_scheduled_action' ) && function_exists( 'as_schedule_recurring_action' ) ) {
			if ( false === as_next_scheduled_action( self::RECURRING_HOOK, array(), self::GROUP ) ) {
				as_schedule_recurring_action( time() + $seconds, $seconds, self::RECURRING_HOOK, array(), self::GROUP );
			}

			return 'Action Scheduler';
		}

		if ( false === wp_next_scheduled( self::RECURRING_HOOK ) ) {
			wp_schedule_event( time() + $seconds, $interval, self::RECURRING_HOOK );
		}

		return 'WP-Cron';
	}

	/**
	 * @return array{enabled:bool,interval:string,scheduler:string|null,next_run_at:int|null}
	 */
	public function getRecurringStatus(): array {
		$interval = $this->settings()->get()['interval'];

		if ( 'off' === $interval ) {
			return array(
				'enabled'     => false,
				'interval'    => 'off',
				'scheduler'   => null,
				'next_run_at' => null,
			);
		}

		if ( function_exists( 'as_next_scheduled_action' ) ) {
			$next = as_next_scheduled_action( self::RECURRING_HOOK, array(), self::GROUP );

			if ( is_int( $next ) && $next > 0 ) {
				return array(
					'enabled'     => true,
					'interval'    => $interval,
					'scheduler'   => 'Action Scheduler',
					'next_run_at' => $next,
				);
			}
		}

		$next = wp_next_scheduled( self::RECURRING_HOOK );

		return array(
			'enabled'     => false !== $next,
			'interval'    => $interval,
			'scheduler'   => false === $next ? null : 'WP-Cron',
			'next_run_at' => false === $next ? null : $next,
		);
	}

	public function cancelScheduled(): void {
		if ( function_exists( 'as_unschedule_all_actions' ) ) {
			as_unschedule_all_actions( self::HOOK, array(), self::GROUP );
		}

		while ( false !== ( $timestamp = wp_next_scheduled( self::HOOK ) ) ) {
			wp_unschedule_event( $timestamp, self::HOOK );
		}

		$this->cancelRecurring();
	}

	private function cancelRecurring(): void {
		if ( function_exists( 'as_unschedule_all_actions' ) ) {
			as_unschedule_all_actions( self::RECURRING_HOOK, array(), self::GROUP );
		}

		while ( false !== ( $timestamp = wp_next_scheduled( self::RECURRING_HOOK ) ) ) {
			wp_unschedule_event( $timestamp, self::RECURRING_HOOK );
		}
	}

	/**
	 * @param array<string,mixed> $item
	 * @return array<int,string>
	 */
	private function outboundUrls( array $item ): array {
		$postId = $this->postId( (string) ( $item['externalId'] ?? '' ) );
		$post   = $postId > 0 && function_exists( 'get_post' ) ? get_post( $postId ) : null;

		return is_object( $post )
			? $this->collector->collectInternalLinkTargets( $post, (string) ( $item['url'] ?? '' ) )
			: array();
	}

	/**
	 * @param array<int,array<string,mixed>> $items
	 * @return array<int,array<string,mixed>>
	 */
	private function applyIgnoredRules( array $items ): array {
		$ignored = $this->settings()->get()['ignored'];

		foreach ( $items as &$item ) {
			$externalId = (string) ( $item['external_id'] ?? '' );

			foreach ( $item['findings'] as &$finding ) {
				$fingerprint        = LocalAuditSettings::fingerprint( $externalId, (string) ( $finding['code'] ?? '' ) );
				$finding['ignored'] = isset( $ignored[ $fingerprint ] );
			}
			unset( $finding );
		}
		unset( $item );

		return $items;
	}

	private function linkGraph(): LocalLinkGraph {
		return $this->linkGraph ?? new LocalLinkGraph();
	}

	private function settings(): LocalAuditSettings {
		return $this->settings ?? new LocalAuditSettings();
	}

	private function postId( string $externalId ): int {
		$parts = explode( ':', $externalId, 2 );

		return isset( $parts[1] ) && is_numeric( $parts[1] ) ? max( 0, (int) $parts[1] ) : 0;
	}
}
