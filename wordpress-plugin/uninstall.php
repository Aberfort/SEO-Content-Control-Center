<?php
/**
 * Removes plugin-owned data when the plugin is deleted.
 *
 * @package SCCC
 */

declare(strict_types=1);

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

delete_option( 'sccc_connection' );
delete_option( 'sccc_sync_log' );
delete_option( 'sccc_local_audit' );
delete_option( 'sccc_local_audit_settings' );

wp_clear_scheduled_hook( 'sccc_run_manual_sync' );
wp_clear_scheduled_hook( 'sccc_run_incremental_sync' );
wp_clear_scheduled_hook( 'sccc_run_local_audit' );
wp_clear_scheduled_hook( 'sccc_run_scheduled_local_audit' );

if ( function_exists( 'as_unschedule_all_actions' ) ) {
	as_unschedule_all_actions( 'sccc_run_manual_sync', array(), 'content-signal-seo-content-audit' );
	as_unschedule_all_actions( 'sccc_run_incremental_sync', array(), 'content-signal-seo-content-audit' );
	as_unschedule_all_actions( 'sccc_run_local_audit', array(), 'sccc' );
	as_unschedule_all_actions( 'sccc_run_scheduled_local_audit', array(), 'sccc' );
}
