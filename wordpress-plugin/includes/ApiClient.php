<?php
/**
 * SaaS API client.
 *
 * @package SCCC
 */

declare(strict_types=1);

namespace SCCC\Plugin;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use RuntimeException;

final class ApiClient {

	public function __construct( private readonly RequestSigner $requestSigner ) {
	}

	/**
	 * @return array{organization_id:string,site_id:string,token:string,endpoint:string}
	 */
	public function exchangeConnection( string $endpoint, string $challenge ): array {
		$url      = $this->buildApiUrl( $endpoint, '/api/plugin/connections/exchange' );
		$body     = $this->encodeJson(
			array(
				'challenge' => $challenge,
				'endpoint'  => $endpoint,
			)
		);
		$response = wp_remote_post(
			$url,
			array(
				'headers' => array(
					'Content-Type' => 'application/json',
				),
				'body'    => $body,
				'timeout' => 15,
			)
		);

		if ( is_wp_error( $response ) ) {
			throw new RuntimeException( 'connection_exchange_failed' );
		}

		if ( 200 !== wp_remote_retrieve_response_code( $response ) ) {
			throw new RuntimeException( 'connection_exchange_failed' );
		}

		$payload = json_decode( wp_remote_retrieve_body( $response ), true );

		if ( ! is_array( $payload ) || empty( $payload['data'] ) || ! is_array( $payload['data'] ) ) {
			throw new RuntimeException( 'connection_exchange_failed' );
		}

		$data = $payload['data'];

		if ( empty( $data['organizationId'] ) || empty( $data['siteId'] ) || empty( $data['token'] ) ) {
			throw new RuntimeException( 'connection_exchange_failed' );
		}

		return array(
			'organization_id' => (string) $data['organizationId'],
			'site_id'         => (string) $data['siteId'],
			'token'           => (string) $data['token'],
			'endpoint'        => isset( $data['endpoint'] ) ? (string) $data['endpoint'] : $endpoint,
		);
	}

	/**
	 * @param array{organization_id:string,site_id:string,token:string,endpoint:string,connected_at:int} $connection
	 */
	/**
	 * @param array<int,array{externalId:string,type:string,url:string,title:string|null,status:string,modifiedAt:string,metadata?:array<string,mixed>}> $items
	 */
	public function sendSync( array $connection, array $items, ?string $cursor = null ): void {
		$path      = '/api/plugin/sync';
		$body      = $this->buildSyncBody( $connection, $items, $cursor );
		$timestamp = time();
		$headers   = $this->buildSignedHeaders( $connection, 'POST', $path, $body, $timestamp );
		$response  = wp_remote_post(
			$this->buildApiUrl( $connection['endpoint'], $path ),
			array(
				'headers' => array_merge(
					array(
						'Content-Type' => 'application/json',
					),
					$headers
				),
				'body'    => $body,
				'timeout' => 15,
			)
		);

		if ( is_wp_error( $response ) ) {
			throw new RuntimeException( 'sync_failed' );
		}

		if ( 200 !== wp_remote_retrieve_response_code( $response ) ) {
			throw new RuntimeException( 'sync_failed' );
		}
	}

	/**
	 * @param array{organization_id:string,site_id:string,token:string,endpoint:string,connected_at:int} $connection
	 * @param array<string,mixed>                                                                        $event
	 */
	public function sendSystemEvent( array $connection, array $event ): void {
		$path      = '/api/plugin/system-events';
		$body      = $this->buildSystemEventBody( $connection, $event );
		$timestamp = time();
		$headers   = $this->buildSignedHeaders( $connection, 'POST', $path, $body, $timestamp );
		$response  = wp_remote_post(
			$this->buildApiUrl( $connection['endpoint'], $path ),
			array(
				'headers' => array_merge(
					array(
						'Content-Type' => 'application/json',
					),
					$headers
				),
				'body'    => $body,
				'timeout' => 15,
			)
		);

		if ( is_wp_error( $response ) ) {
			throw new RuntimeException( 'system_event_failed' );
		}

		if ( 200 !== wp_remote_retrieve_response_code( $response ) ) {
			throw new RuntimeException( 'system_event_failed' );
		}
	}

	/**
	 * @param array{organization_id:string,site_id:string,token:string,endpoint:string,connected_at:int} $connection
	 * @param array<string,mixed>                                                                        $event
	 */
	public function buildSystemEventBody( array $connection, array $event ): string {
		return $this->encodeJson(
			array(
				'organizationId' => $connection['organization_id'],
				'siteId'         => $connection['site_id'],
				'events'         => array( $event ),
			)
		);
	}

	/**
	 * @param array{organization_id:string,site_id:string,token:string,endpoint:string,connected_at:int} $connection
	 */
	public function sendDisconnect( array $connection ): void {
		$path      = '/api/plugin/connections/disconnect';
		$body      = $this->buildDisconnectBody( $connection );
		$timestamp = time();
		$headers   = $this->buildSignedHeaders( $connection, 'POST', $path, $body, $timestamp );
		$response  = wp_remote_post(
			$this->buildApiUrl( $connection['endpoint'], $path ),
			array(
				'headers' => array_merge(
					array(
						'Content-Type' => 'application/json',
					),
					$headers
				),
				'body'    => $body,
				'timeout' => 15,
			)
		);

		if ( is_wp_error( $response ) ) {
			throw new RuntimeException( 'disconnect_failed' );
		}

		if ( 200 !== wp_remote_retrieve_response_code( $response ) ) {
			throw new RuntimeException( 'disconnect_failed' );
		}
	}

	/**
	 * @param array{organization_id:string,site_id:string,token:string,endpoint:string,connected_at:int} $connection
	 * @return array{monitoredUrlCount:int,openRegressionCount:int,criticalOpenRegressionCount:int,recentRegressions:array<int,array<string,mixed>>}
	 */
	public function fetchMonitoringSummary( array $connection ): array {
		$path      = '/api/plugin/monitoring-summary';
		$timestamp = time();
		$headers   = $this->buildSignedHeaders( $connection, 'GET', $path, '', $timestamp );
		$response  = wp_remote_get(
			$this->buildApiUrl( $connection['endpoint'], $path ),
			array(
				'headers' => $headers,
				'timeout' => 15,
			)
		);

		if ( is_wp_error( $response ) ) {
			throw new RuntimeException( 'monitoring_summary_failed' );
		}

		if ( 200 !== wp_remote_retrieve_response_code( $response ) ) {
			throw new RuntimeException( 'monitoring_summary_failed' );
		}

		$payload = json_decode( wp_remote_retrieve_body( $response ), true );

		if ( ! is_array( $payload ) || empty( $payload['data'] ) || ! is_array( $payload['data'] ) ) {
			throw new RuntimeException( 'monitoring_summary_failed' );
		}

		$data = $payload['data'];

		return array(
			'monitoredUrlCount'           => isset( $data['monitoredUrlCount'] ) ? (int) $data['monitoredUrlCount'] : 0,
			'openRegressionCount'         => isset( $data['openRegressionCount'] ) ? (int) $data['openRegressionCount'] : 0,
			'criticalOpenRegressionCount' => isset( $data['criticalOpenRegressionCount'] ) ? (int) $data['criticalOpenRegressionCount'] : 0,
			'recentRegressions'           => is_array( $data['recentRegressions'] ?? null ) ? $data['recentRegressions'] : array(),
		);
	}

	public function buildApiUrl( string $endpoint, string $path ): string {
		return rtrim( $endpoint, '/' ) . '/' . ltrim( $path, '/' );
	}

	/**
	 * @param array{organization_id:string,site_id:string,token:string,endpoint:string,connected_at:int} $connection
	 */
	/**
	 * @param array<int,array{externalId:string,type:string,url:string,title:string|null,status:string,modifiedAt:string,metadata?:array<string,mixed>}> $items
	 */
	public function buildSyncBody( array $connection, array $items = array(), ?string $cursor = null ): string {
		return $this->encodeJson(
			array(
				'organizationId' => $connection['organization_id'],
				'siteId'         => $connection['site_id'],
				'cursor'         => $cursor,
				'items'          => $items,
			)
		);
	}

	/**
	 * @param array{organization_id:string,site_id:string,token:string,endpoint:string,connected_at:int} $connection
	 */
	public function buildDisconnectBody( array $connection ): string {
		return $this->encodeJson(
			array(
				'organizationId' => $connection['organization_id'],
				'siteId'         => $connection['site_id'],
			)
		);
	}

	/**
	 * @param array{organization_id:string,site_id:string,token:string,endpoint:string,connected_at:int} $connection
	 * @return array<string,string>
	 */
	public function buildSignedHeaders(
		array $connection,
		string $method,
		string $path,
		string $body,
		int $timestamp
	): array {
		return array(
			'X-SCCC-Site-Id'   => $connection['site_id'],
			'X-SCCC-Timestamp' => (string) $timestamp,
			'X-SCCC-Signature' => $this->requestSigner->sign( $method, $path, $timestamp, $body, $connection['token'] ),
			'X-SCCC-Token'     => $connection['token'],
		);
	}

	/**
	 * @param array<string,mixed> $payload
	 */
	private function encodeJson( array $payload ): string {
		$json = wp_json_encode( $payload, JSON_UNESCAPED_SLASHES );

		if ( ! is_string( $json ) ) {
			throw new RuntimeException( 'json_encode_failed' );
		}

		return $json;
	}
}
