<?php
/**
 * Plugin Name: SEO Content Control Center
 * Description: Connects WordPress to SEO Content Control Center for safe SEO audits and backlog workflows.
 * Version: 0.1.0
 * Requires PHP: 8.1
 * Requires at least: 6.4
 * Author: SEO Content Control Center
 * Text Domain: seo-content-control-center
 *
 * @package SCCC
 */

declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}

define('SCCC_PLUGIN_FILE', __FILE__);
define('SCCC_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('SCCC_PLUGIN_VERSION', '0.1.0');

$autoload = SCCC_PLUGIN_DIR . 'vendor/autoload.php';

if (file_exists($autoload)) {
    require_once $autoload;
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
}

add_action(
    'plugins_loaded',
    static function (): void {
        $requestSigner = new SCCC\Plugin\RequestSigner();
        $apiClient = new SCCC\Plugin\ApiClient($requestSigner);
        $connectionStore = new SCCC\Plugin\ConnectionStore();
        $plugin = new SCCC\Plugin\Plugin(
            $connectionStore,
            new SCCC\Plugin\AdminPage(),
            new SCCC\Plugin\SyncScheduler(
                $connectionStore,
                $apiClient,
                new SCCC\Plugin\ContentCollector(),
                new SCCC\Plugin\SyncLogStore()
            ),
            $apiClient,
            new SCCC\Plugin\SafeOperationEndpoint($connectionStore, $requestSigner)
        );
        $plugin->register();
    }
);

register_deactivation_hook(
    __FILE__,
    static function (): void {
        $requestSigner = new SCCC\Plugin\RequestSigner();
        $apiClient = new SCCC\Plugin\ApiClient($requestSigner);
        $scheduler = new SCCC\Plugin\SyncScheduler(
            new SCCC\Plugin\ConnectionStore(),
            $apiClient,
            new SCCC\Plugin\ContentCollector(),
            new SCCC\Plugin\SyncLogStore()
        );

        $scheduler->cancelScheduledSyncs();
    }
);
