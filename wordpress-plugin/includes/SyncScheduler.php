<?php
/**
 * Sync scheduling boundary.
 *
 * @package SCCC
 */

declare(strict_types=1);

namespace SCCC\Plugin;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class SyncScheduler {

	private const RECURRING_ACTION = 'sccc_run_incremental_sync';
	private const MANUAL_ACTION    = 'sccc_run_manual_sync';
	private const GROUP            = 'content-signal-seo-content-audit';
	private const INTERVAL_SECONDS = 3600;
	private const MAX_SYNC_BATCHES = 50;

	public function __construct(
		private readonly ConnectionStore $connectionStore,
		private readonly ApiClient $apiClient,
		private readonly ContentCollector $contentCollector,
		private readonly SyncLogStore $syncLogStore,
		private readonly int $syncBatchSize = ContentCollector::BATCH_SIZE,
		private readonly ?LocalAuditStore $localAuditStore = null
	) {
	}

	public function handleManualSync(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You do not have permission to sync this site.', 'content-signal-seo-content-audit' ) );
		}

		check_admin_referer( 'sccc_manual_sync' );
		$scheduler = $this->queueSync();
		$this->syncLogStore->recordQueued( $scheduler );

		wp_safe_redirect( add_query_arg( 'sccc_status', 'sync_queued', admin_url( 'admin.php?page=sccc&tab=platform' ) ) );
		exit;
	}

	public function runSync(): void {
		$connection = $this->connectionStore->get();

		if ( null === $connection ) {
			$this->cancelScheduledSyncs();
			return;
		}

		try {
			$offset        = 0;
			$batches       = 0;
			$totalItems    = 0;
			$localFindings = ( $this->localAuditStore ?? new LocalAuditStore() )->findingsForSync();

			do {
				$batch = $this->contentCollector->collectBatch( $offset, $this->syncBatchSize );
				$items = $this->attachLocalFindings( $batch['items'], $localFindings );

				if ( array() !== $items ) {
					$this->apiClient->sendSync( $connection, $items, (string) $offset );
					$totalItems += count( $items );
				}

				$offset += $this->syncBatchSize;
				++$batches;
			} while ( $batch['hasMore'] && $batches < self::MAX_SYNC_BATCHES );

			$this->syncLogStore->recordSuccess( $totalItems );
		} catch ( \RuntimeException $error ) {
			$this->syncLogStore->recordFailure( $error->getMessage() );
			return;
		}
	}

	/**
	 * @param array<int,array{externalId:string,type:string,url:string,title:string|null,status:string,modifiedAt:string,metadata:array<string,mixed>}> $items
	 * @param array<string,array<int,array{code:string,label:string,severity:string,evidence:string,fingerprint:string}>>|null                          $localFindings
	 * @return array<int,array{externalId:string,type:string,url:string,title:string|null,status:string,modifiedAt:string,metadata:array<string,mixed>}>
	 */
	private function attachLocalFindings( array $items, ?array $localFindings ): array {
		if ( null === $localFindings ) {
			return $items;
		}

		foreach ( $items as &$item ) {
			if ( array_key_exists( $item['externalId'], $localFindings ) ) {
				$item['metadata']['localFindings'] = $localFindings[ $item['externalId'] ];
			}
		}
		unset( $item );

		return $items;
	}

	public function queueSync(): string {
		if ( function_exists( 'as_enqueue_async_action' ) ) {
			as_enqueue_async_action( self::MANUAL_ACTION, array(), self::GROUP );
			return 'Action Scheduler';
		}

		if ( ! wp_next_scheduled( self::MANUAL_ACTION ) ) {
			wp_schedule_single_event( time() + 60, self::MANUAL_ACTION );
			return 'WP-Cron';
		}

		return 'existing WP-Cron event';
	}

	public function ensureRecurringSync(): string {
		if ( ! $this->connectionStore->isConnected() ) {
			$this->cancelScheduledSyncs();
			return 'not connected';
		}

		if ( function_exists( 'as_next_scheduled_action' ) && function_exists( 'as_schedule_recurring_action' ) ) {
			$next = as_next_scheduled_action( self::RECURRING_ACTION, array(), self::GROUP );

			if ( false === $next ) {
				as_schedule_recurring_action(
					time() + self::INTERVAL_SECONDS,
					self::INTERVAL_SECONDS,
					self::RECURRING_ACTION,
					array(),
					self::GROUP
				);
			}

			return 'Action Scheduler';
		}

		if ( ! wp_next_scheduled( self::RECURRING_ACTION ) ) {
			wp_schedule_event( time() + self::INTERVAL_SECONDS, 'hourly', self::RECURRING_ACTION );
		}

		return 'WP-Cron';
	}

	public function cancelRecurringSync(): void {
		$this->cancelScheduledAction( self::RECURRING_ACTION );
	}

	public function cancelScheduledSyncs(): void {
		$this->cancelScheduledAction( self::RECURRING_ACTION );
		$this->cancelScheduledAction( self::MANUAL_ACTION );
	}

	private function cancelScheduledAction( string $action ): void {
		if ( function_exists( 'as_unschedule_all_actions' ) ) {
			as_unschedule_all_actions( $action, array(), self::GROUP );
		}

		while ( true ) {
			$next = wp_next_scheduled( $action );

			if ( false === $next ) {
				return;
			}

			wp_unschedule_event( $next, $action );
		}
	}

	/**
	 * @return array{enabled:bool,scheduler:string|null,next_run_at:int|null}
	 */
	public function getRecurringSyncStatus(): array {
		if ( ! $this->connectionStore->isConnected() ) {
			return array(
				'enabled'     => false,
				'scheduler'   => null,
				'next_run_at' => null,
			);
		}

		if ( function_exists( 'as_next_scheduled_action' ) ) {
			$next = as_next_scheduled_action( self::RECURRING_ACTION, array(), self::GROUP );

			if ( false !== $next ) {
				return array(
					'enabled'     => true,
					'scheduler'   => 'Action Scheduler',
					'next_run_at' => (int) $next,
				);
			}
		}

		$next = wp_next_scheduled( self::RECURRING_ACTION );

		if ( false === $next ) {
			return array(
				'enabled'     => false,
				'scheduler'   => null,
				'next_run_at' => null,
			);
		}

		return array(
			'enabled'     => true,
			'scheduler'   => 'WP-Cron',
			'next_run_at' => (int) $next,
		);
	}
}
