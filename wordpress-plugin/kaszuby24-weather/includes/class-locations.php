<?php
namespace K24W;

if (!defined('ABSPATH')) exit;

class Locations {
	private static $map = [
		'gdansk' => ['name' => 'Gdańsk', 'lat' => 54.3520, 'lon' => 18.6466],
		'gdynia' => ['name' => 'Gdynia', 'lat' => 54.5189, 'lon' => 18.5305],
		'sopot' => ['name' => 'Sopot', 'lat' => 54.4416, 'lon' => 18.5601],
		'lebork' => ['name' => 'Lębork', 'lat' => 54.5395, 'lon' => 17.7501],
		'lebA' => ['name' => 'Łeba', 'lat' => 54.7600, 'lon' => 17.5550],
		'ustka' => ['name' => 'Ustka', 'lat' => 54.5800, 'lon' => 16.8600],
		'wejherowo' => ['name' => 'Wejherowo', 'lat' => 54.6052, 'lon' => 18.2356],
		'puck' => ['name' => 'Puck', 'lat' => 54.7174, 'lon' => 18.4083],
		'hel' => ['name' => 'Hel', 'lat' => 54.6079, 'lon' => 18.8000],
		'chojnice' => ['name' => 'Chojnice', 'lat' => 53.6957, 'lon' => 17.5575],
	];

	public static function resolve_slug($slug) {
		$slug = sanitize_title($slug);
		if (isset(self::$map[$slug])) return self::$map[$slug];
		return null;
	}

	public static function list() {
		return self::$map;
	}
}
