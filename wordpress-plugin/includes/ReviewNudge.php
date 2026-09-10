<?php
/**
 * Nudges a site admin toward leaving a WordPress.org review once the local
 * audit has proven itself useful a few times. Deliberately light-touch: it
 * counts completed audits, shows once past a threshold, and stops counting
 * entirely the moment someone dismisses it.
 *
 * @package SCCC
 */

declare(strict_types=1);

namespace SCCC\Plugin;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class ReviewNudge {

	private const OPTION    = 'sccc_review_nudge';
	private const THRESHOLD = 3;

	public const REVIEW_URL = 'https://wordpress.org/support/plugin/content-signal-seo-content-audit/reviews/#new-post';

	/**
	 * Call once per completed local audit (successful runs only — a failed
	 * audit never found anything useful, so it shouldn't count toward this).
	 * A no-op once dismissed, so re-running audits afterward can never
	 * resurface the nudge.
	 */
	public function recordCompletedAudit(): void {
		$state = $this->state();

		if ( $state['dismissed'] ) {
			return;
		}

		++$state['completed_audits'];
		update_option( self::OPTION, $state, false );
	}

	public function shouldShow(): bool {
		$state = $this->state();

		return ! $state['dismissed'] && $state['completed_audits'] >= self::THRESHOLD;
	}

	public function dismiss(): void {
		$state                  = $this->state();
		$state['dismissed']     = true;
		$state['dismissed_at']  = time();
		update_option( self::OPTION, $state, false );
	}

	public function handleDismiss(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You do not have permission to do this.', 'content-signal-seo-content-audit' ) );
		}

		check_admin_referer( 'sccc_dismiss_review_nudge' );
		$this->dismiss();

		wp_safe_redirect( admin_url( 'admin.php?page=sccc' ) );
		exit;
	}

	/**
	 * @return array{completed_audits:int,dismissed:bool,dismissed_at:int|null}
	 */
	public function state(): array {
		$value = get_option( self::OPTION );

		if ( ! is_array( $value ) ) {
			return array(
				'completed_audits' => 0,
				'dismissed'        => false,
				'dismissed_at'     => null,
			);
		}

		return array(
			'completed_audits' => max( 0, (int) ( $value['completed_audits'] ?? 0 ) ),
			'dismissed'        => (bool) ( $value['dismissed'] ?? false ),
			'dismissed_at'     => isset( $value['dismissed_at'] ) ? (int) $value['dismissed_at'] : null,
		);
	}
}
