<?php
/**
 * Reports WordPress plugin/theme/core lifecycle changes to the SaaS timeline.
 *
 * @package SCCC
 */

declare(strict_types=1);

namespace SCCC\Plugin;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use RuntimeException;

final class SystemEventReporter {

	public const DELIVER_ACTION = 'sccc_send_system_event';

	private const GROUP                  = 'content-signal-seo-content-audit';
	private const PLUGIN_VERSIONS_OPTION = 'sccc_plugin_versions';
	private const THEME_VERSIONS_OPTION  = 'sccc_theme_versions';
	private const CORE_VERSION_OPTION    = 'sccc_core_version';

	public function __construct(
		private readonly ConnectionStore $connectionStore,
		private readonly ApiClient $apiClient
	) {
	}

	/**
	 * Seeds the plugin/theme/core version baseline the first time it runs so
	 * the first observed change afterward has a real "old value" to diff
	 * against, mirroring the baseline-then-diff pattern used for monitored
	 * URLs on the SaaS side.
	 */
	public function ensureBaseline(): void {
		if ( ! $this->connectionStore->isConnected() ) {
			return;
		}

		if ( false === get_option( self::PLUGIN_VERSIONS_OPTION ) ) {
			update_option( self::PLUGIN_VERSIONS_OPTION, $this->currentPluginVersions(), false );
		}

		if ( false === get_option( self::THEME_VERSIONS_OPTION ) ) {
			update_option( self::THEME_VERSIONS_OPTION, $this->currentThemeVersions(), false );
		}

		if ( false === get_option( self::CORE_VERSION_OPTION ) ) {
			update_option( self::CORE_VERSION_OPTION, function_exists( 'get_bloginfo' ) ? get_bloginfo( 'version' ) : null, false );
		}
	}

	public function onPluginActivated( string $plugin, bool $networkWide = false ): void {
		unset( $networkWide );

		$data    = $this->readPluginData( $plugin );
		$name    = $data['Name'] ?? $plugin;
		$version = $data['Version'] ?? null;

		$this->rememberPluginVersion( $plugin, $version );
		$this->queue(
			'plugin_activated',
			sprintf( '%s activated', $name ),
			null,
			$version,
			array(
				'plugin'  => $plugin,
				'name'    => $name,
				'version' => $version,
			)
		);
	}

	public function onPluginDeactivated( string $plugin, bool $networkDeactivating = false ): void {
		unset( $networkDeactivating );

		$data    = $this->readPluginData( $plugin );
		$name    = $data['Name'] ?? $plugin;
		$version = $data['Version'] ?? null;

		$this->queue(
			'plugin_deactivated',
			sprintf( '%s deactivated', $name ),
			$version,
			null,
			array(
				'plugin'  => $plugin,
				'name'    => $name,
				'version' => $version,
			)
		);
	}

	public function onPluginDeleted( string $pluginFile, bool $deleted = true ): void {
		if ( ! $deleted ) {
			return;
		}

		$versions         = $this->pluginVersionsOption();
		$lastKnownVersion = $versions[ $pluginFile ] ?? null;

		unset( $versions[ $pluginFile ] );
		update_option( self::PLUGIN_VERSIONS_OPTION, $versions, false );

		$this->queue(
			'plugin_deleted',
			sprintf( '%s deleted', $pluginFile ),
			$lastKnownVersion,
			null,
			array(
				'plugin'  => $pluginFile,
				'version' => $lastKnownVersion,
			)
		);
	}

	/**
	 * @param object $newTheme WP_Theme instance for the theme being switched to.
	 * @param object $oldTheme WP_Theme instance for the previously active theme.
	 */
	public function onThemeSwitched( string $newName, object $newTheme, object $oldTheme ): void {
		$newVersion = method_exists( $newTheme, 'get' ) ? $newTheme->get( 'Version' ) : null;
		$oldVersion = method_exists( $oldTheme, 'get' ) ? $oldTheme->get( 'Version' ) : null;
		$oldName    = method_exists( $oldTheme, 'get' ) ? $oldTheme->get( 'Name' ) : null;

		$this->queue(
			'theme_activated',
			sprintf( '%s activated', $newName ),
			array(
				'name'    => $oldName,
				'version' => $oldVersion,
			),
			array(
				'name'    => $newName,
				'version' => $newVersion,
			),
			array(
				'theme' => $newName,
			)
		);
	}

	/**
	 * @param object              $upgrader  WP_Upgrader instance running the update.
	 * @param array<string,mixed> $hookExtra Upgrade context (type/action/affected items).
	 */
	public function onUpgraderProcessComplete( object $upgrader, array $hookExtra ): void {
		unset( $upgrader );

		$type   = $hookExtra['type'] ?? null;
		$action = $hookExtra['action'] ?? null;

		if ( 'plugin' === $type ) {
			$plugins = $hookExtra['plugins'] ?? ( isset( $hookExtra['plugin'] ) ? array( $hookExtra['plugin'] ) : array() );

			foreach ( $plugins as $plugin ) {
				$this->reportPluginChange( (string) $plugin, 'install' === $action );
			}

			return;
		}

		if ( 'theme' === $type ) {
			$themes = $hookExtra['themes'] ?? ( isset( $hookExtra['theme'] ) ? array( $hookExtra['theme'] ) : array() );

			foreach ( $themes as $theme ) {
				$this->reportThemeChange( (string) $theme, 'install' === $action );
			}

			return;
		}

		if ( 'core' === $type ) {
			$this->onCoreUpdated( function_exists( 'get_bloginfo' ) ? get_bloginfo( 'version' ) : '' );
		}
	}

	public function onCoreUpdated( string $newVersion ): void {
		if ( '' === $newVersion ) {
			return;
		}

		$storedVersion = get_option( self::CORE_VERSION_OPTION );
		$oldVersion    = is_string( $storedVersion ) && '' !== $storedVersion ? $storedVersion : null;

		if ( $oldVersion === $newVersion ) {
			return;
		}

		update_option( self::CORE_VERSION_OPTION, $newVersion, false );

		$this->queue(
			'wordpress_core_updated',
			sprintf( 'WordPress core updated to %s', $newVersion ),
			$oldVersion,
			$newVersion,
			array()
		);
	}

	/**
	 * Delivers a queued event over the signed HTTP channel. Bound to
	 * self::DELIVER_ACTION by Plugin::register().
	 *
	 * @param array<string,mixed> $event
	 */
	public function deliver( array $event ): void {
		$connection = $this->connectionStore->get();

		if ( null === $connection ) {
			return;
		}

		try {
			$this->apiClient->sendSystemEvent( $connection, $event );
		} catch ( RuntimeException $error ) {
			// Action Scheduler surfaces a thrown exception as a failed action in
			// its own admin UI; WP-Cron has no equivalent, so a failure there is
			// silently dropped until the next observed change re-triggers a send.
			unset( $error );
		}
	}

	private function reportPluginChange( string $plugin, bool $isInstall ): void {
		$data       = $this->readPluginData( $plugin );
		$name       = $data['Name'] ?? $plugin;
		$newVersion = $data['Version'] ?? null;
		$versions   = $this->pluginVersionsOption();
		$oldVersion = $versions[ $plugin ] ?? null;

		if ( ! $isInstall && $oldVersion === $newVersion ) {
			return;
		}

		$this->rememberPluginVersion( $plugin, $newVersion );

		$this->queue(
			$isInstall ? 'plugin_installed' : 'plugin_updated',
			$isInstall
				? sprintf( '%s installed', $name )
				: sprintf( '%s updated from %s to %s', $name, $oldVersion ?? 'unknown', $newVersion ?? 'unknown' ),
			$isInstall ? null : $oldVersion,
			$newVersion,
			array(
				'plugin' => $plugin,
				'name'   => $name,
			)
		);
	}

	private function reportThemeChange( string $stylesheet, bool $isInstall ): void {
		$theme      = function_exists( 'wp_get_theme' ) ? wp_get_theme( $stylesheet ) : null;
		$name       = $theme && method_exists( $theme, 'get' ) ? $theme->get( 'Name' ) : $stylesheet;
		$newVersion = $theme && method_exists( $theme, 'get' ) ? $theme->get( 'Version' ) : null;
		$versions   = $this->themeVersionsOption();
		$oldVersion = $versions[ $stylesheet ] ?? null;

		$versions[ $stylesheet ] = $newVersion;
		update_option( self::THEME_VERSIONS_OPTION, $versions, false );

		if ( $isInstall || $oldVersion === $newVersion ) {
			return;
		}

		$this->queue(
			'theme_updated',
			sprintf( '%s updated from %s to %s', $name, $oldVersion ?? 'unknown', $newVersion ?? 'unknown' ),
			$oldVersion,
			$newVersion,
			array(
				'theme' => $stylesheet,
				'name'  => $name,
			)
		);
	}

	/**
	 * @return array{Name?:string,Version?:string}
	 */
	private function readPluginData( string $plugin ): array {
		if ( ! function_exists( 'get_plugin_data' ) && defined( 'ABSPATH' ) && file_exists( ABSPATH . 'wp-admin/includes/plugin.php' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}

		if ( ! function_exists( 'get_plugin_data' ) || ! defined( 'WP_PLUGIN_DIR' ) ) {
			return array();
		}

		// get_plugin_data() itself degrades gracefully (empty header values)
		// when the file is missing, so no local file_exists() check is needed.
		return get_plugin_data( WP_PLUGIN_DIR . '/' . $plugin, false, false );
	}

	/**
	 * @return array<string,string|null>
	 */
	private function pluginVersionsOption(): array {
		$value = get_option( self::PLUGIN_VERSIONS_OPTION );

		return is_array( $value ) ? $value : array();
	}

	/**
	 * @return array<string,string|null>
	 */
	private function themeVersionsOption(): array {
		$value = get_option( self::THEME_VERSIONS_OPTION );

		return is_array( $value ) ? $value : array();
	}

	private function rememberPluginVersion( string $plugin, ?string $version ): void {
		$versions            = $this->pluginVersionsOption();
		$versions[ $plugin ] = $version;
		update_option( self::PLUGIN_VERSIONS_OPTION, $versions, false );
	}

	/**
	 * @return array<string,string|null>
	 */
	private function currentPluginVersions(): array {
		if ( ! function_exists( 'get_plugins' ) && defined( 'ABSPATH' ) && file_exists( ABSPATH . 'wp-admin/includes/plugin.php' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}

		if ( ! function_exists( 'get_plugins' ) ) {
			return array();
		}

		$versions = array();

		foreach ( get_plugins() as $file => $data ) {
			$versions[ $file ] = $data['Version'] ?? null;
		}

		return $versions;
	}

	/**
	 * @return array<string,string|null>
	 */
	private function currentThemeVersions(): array {
		if ( ! function_exists( 'wp_get_themes' ) ) {
			return array();
		}

		$versions = array();

		foreach ( wp_get_themes() as $stylesheet => $theme ) {
			$versions[ $stylesheet ] = method_exists( $theme, 'get' ) ? $theme->get( 'Version' ) : null;
		}

		return $versions;
	}

	/**
	 * @param mixed               $oldValue
	 * @param mixed               $newValue
	 * @param array<string,mixed> $metadata
	 */
	private function queue( string $type, string $title, $oldValue, $newValue, array $metadata ): void {
		if ( ! $this->connectionStore->isConnected() ) {
			return;
		}

		$this->enqueueDelivery(
			array(
				'type'       => $type,
				'title'      => $title,
				'oldValue'   => $oldValue,
				'newValue'   => $newValue,
				'metadata'   => array() === $metadata ? null : $metadata,
				'occurredAt' => gmdate( 'c' ),
			)
		);
	}

	/**
	 * @param array<string,mixed> $event
	 */
	private function enqueueDelivery( array $event ): void {
		if ( function_exists( 'as_enqueue_async_action' ) ) {
			as_enqueue_async_action( self::DELIVER_ACTION, array( $event ), self::GROUP );
			return;
		}

		wp_schedule_single_event( time(), self::DELIVER_ACTION, array( $event ) );
	}
}
