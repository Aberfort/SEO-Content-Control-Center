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

$autoload = SCCC_PLUGIN_DIR . 'vendor/autoload.php';

if (file_exists($autoload)) {
    require_once $autoload;
} else {
    require_once SCCC_PLUGIN_DIR . 'includes/Plugin.php';
    require_once SCCC_PLUGIN_DIR . 'includes/ConnectionStore.php';
    require_once SCCC_PLUGIN_DIR . 'includes/AdminPage.php';
    require_once SCCC_PLUGIN_DIR . 'includes/RequestSigner.php';
    require_once SCCC_PLUGIN_DIR . 'includes/SyncScheduler.php';
}

add_action(
    'plugins_loaded',
    static function (): void {
        $plugin = new SCCC\Plugin\Plugin(
            new SCCC\Plugin\ConnectionStore(),
            new SCCC\Plugin\AdminPage(),
            new SCCC\Plugin\SyncScheduler()
        );
        $plugin->register();
    }
);

