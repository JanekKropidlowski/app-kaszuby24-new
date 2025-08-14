<?php
namespace K24W;

if (!defined('ABSPATH')) exit;

class Cache {
	public static function get(string $key) {
		return get_transient($key);
	}

	public static function set(string $key, $value, int $ttl): bool {
		return set_transient($key, $value, $ttl);
	}

	public static function delete(string $key): bool {
		return delete_transient($key);
	}

	public static function remember(string $key, int $ttl, callable $callback) {
		$data = self::get($key);
		if (false !== $data && null !== $data) {
			return $data;
		}
		$data = call_user_func($callback);
		self::set($key, $data, $ttl);
		return $data;
	}

	public static function fetch_json(string $url, int $ttl, string $cacheKey = null) {
		$cacheKey = $cacheKey ?: 'k24w_' . md5($url);
		return self::remember($cacheKey, $ttl, function () use ($url) {
			$args = [
				'timeout' => 15,
				'headers' => [
					'Accept' => 'application/json',
					'User-Agent' => 'Kaszuby24-Weather/1.0',
				],
			];
			$response = wp_remote_get($url, $args);
			if (is_wp_error($response)) {
				return null;
			}
			$status = wp_remote_retrieve_response_code($response);
			if ($status < 200 || $status >= 300) {
				return null;
			}
			$body = wp_remote_retrieve_body($response);
			$data = json_decode($body, true);
			return $data ?: null;
		});
	}
}
