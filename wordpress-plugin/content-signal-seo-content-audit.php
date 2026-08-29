<?php
/**
 * Plugin Name: Content Signal — SEO Content Audit
 * Plugin URI: https://seo-content-control-center-marketin.vercel.app/download
 * Description: Audits WordPress content health locally and optionally connects it to evidence-backed SEO workflows.
 * Version: 0.9.0
 * Requires PHP: 8.1
 * Requires at least: 6.4
 * Author: Serhii Vasyliev
 * Author URI: https://seo-content-control-center-marketin.vercel.app
 * Text Domain: content-signal-seo-content-audit
 * License: GPLv2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 *
 * @package SCCC
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'SCCC_PLUGIN_FILE', __FILE__ );
define( 'SCCC_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'SCCC_PLUGIN_VERSION', '0.9.0' );

$sccc_autoload = SCCC_PLUGIN_DIR . 'vendor/autoload.php';

if ( file_exists( $sccc_autoload ) ) {
	require_once $sccc_autoload;
} else {
	require_once SCCC_PLUGIN_DIR . 'includes/Plugin.php';
	require_once SCCC_PLUGIN_DIR . 'includes/ConnectionStore.php';
	require_once SCCC_PLUGIN_DIR . 'includes/AdminPage.php';
	require_once SCCC_PLUGIN_DIR . 'includes/RequestSigner.php';
	require_once SCCC_PLUGIN_DIR . 'includes/ApiClient.php';
	require_once SCCC_PLUGIN_DIR . 'includes/SafeOperationEndpoint.php';
	require_once SCCC_PLUGIN_DIR . 'includes/ContentCollector.php';
	require_once SCCC_PLUGIN_DIR . 'includes/SyncLogStore.php';
	require_once SCCC_PLUGIN_DIR . 'includes/SyncScheduler.php';
	require_once SCCC_PLUGIN_DIR . 'includes/LocalAuditEngine.php';
	require_once SCCC_PLUGIN_DIR . 'includes/LocalLinkGraph.php';
	require_once SCCC_PLUGIN_DIR . 'includes/LocalAuditSettings.php';
	require_once SCCC_PLUGIN_DIR . 'includes/LocalAuditStore.php';
	require_once SCCC_PLUGIN_DIR . 'includes/LocalAuditRunner.php';
	require_once SCCC_PLUGIN_DIR . 'includes/PlatformConversion.php';
	require_once SCCC_PLUGIN_DIR . 'includes/SystemEventReporter.php';
}

add_action(
	'plugins_loaded',
	static function (): void {
		$requestSigner      = new SCCC\Plugin\RequestSigner();
		$apiClient          = new SCCC\Plugin\ApiClient( $requestSigner );
		$connectionStore    = new SCCC\Plugin\ConnectionStore();
		$contentCollector   = new SCCC\Plugin\ContentCollector();
		$localAuditStore    = new SCCC\Plugin\LocalAuditStore();
		$localAuditSettings = new SCCC\Plugin\LocalAuditSettings();
		$localAuditRunner   = new SCCC\Plugin\LocalAuditRunner(
			$contentCollector,
			new SCCC\Plugin\LocalAuditEngine(),
			$localAuditStore,
			SCCC\Plugin\ContentCollector::BATCH_SIZE,
			new SCCC\Plugin\LocalLinkGraph(),
			$localAuditSettings
		);
		$plugin             = new SCCC\Plugin\Plugin(
			$connectionStore,
			new SCCC\Plugin\AdminPage(
				$localAuditStore,
				$localAuditSettings,
				$localAuditRunner,
				$connectionStore,
				new SCCC\Plugin\PlatformConversion()
			),
			new SCCC\Plugin\SyncScheduler(
				$connectionStore,
				$apiClient,
				$contentCollector,
				new SCCC\Plugin\SyncLogStore(),
				SCCC\Plugin\ContentCollector::BATCH_SIZE,
				$localAuditStore
			),
			$localAuditRunner,
			$apiClient,
			new SCCC\Plugin\SafeOperationEndpoint( $connectionStore, $requestSigner ),
			new SCCC\Plugin\SystemEventReporter( $connectionStore, $apiClient )
		);
		$plugin->register();
	}
);

register_deactivation_hook(
	__FILE__,
	static function (): void {
		$requestSigner = new SCCC\Plugin\RequestSigner();
		$apiClient     = new SCCC\Plugin\ApiClient( $requestSigner );
		$scheduler     = new SCCC\Plugin\SyncScheduler(
			new SCCC\Plugin\ConnectionStore(),
			$apiClient,
			new SCCC\Plugin\ContentCollector(),
			new SCCC\Plugin\SyncLogStore()
		);

		$scheduler->cancelScheduledSyncs();
		$localAuditRunner = new SCCC\Plugin\LocalAuditRunner(
			new SCCC\Plugin\ContentCollector(),
			new SCCC\Plugin\LocalAuditEngine(),
			new SCCC\Plugin\LocalAuditStore(),
			SCCC\Plugin\ContentCollector::BATCH_SIZE,
			new SCCC\Plugin\LocalLinkGraph(),
			new SCCC\Plugin\LocalAuditSettings()
		);
		$localAuditRunner->cancelScheduled();
	}
);
