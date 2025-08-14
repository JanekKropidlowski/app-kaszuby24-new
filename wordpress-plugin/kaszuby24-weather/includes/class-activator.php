<?php
namespace K24W;

if (!defined('ABSPATH')) exit;

class Activator {
	public static function activate() {
		// Create page /pogoda if not exists
		$slug = 'pogoda';
		$page = get_page_by_path($slug);
		if (!$page) {
			$page_id = wp_insert_post([
				'post_title' => 'Pogoda',
				'post_name' => $slug,
				'post_status' => 'publish',
				'post_type' => 'page',
				'post_content' => '[k24_weather]'
			]);
			if (!is_wp_error($page_id)) {
				update_option('k24w_page_id', $page_id);
			}
		} else {
			update_option('k24w_page_id', $page->ID);
		}
	}

	public static function deactivate() {
		// Keep page; nothing to do
	}
}
