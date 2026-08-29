<?php
namespace K24W;

if (!defined('ABSPATH')) exit;

class Router {
	public static function init() {
		add_filter('query_vars', [__CLASS__, 'add_query_vars']);
		add_action('init', [__CLASS__, 'add_rewrite_rules']);
	}

	public static function add_query_vars($vars) {
		$vars[] = 'k24w_loc';
		return $vars;
	}

	public static function add_rewrite_rules() {
		$page = get_option('k24w_page_id');
		// Route: /pogoda/{slug} → page "Pogoda" with query var k24w_loc
		$base_slug = $page ? get_post_field('post_name', $page) : 'pogoda';
		add_rewrite_rule('^' . $base_slug . '/([^/]+)/?$', 'index.php?pagename=' . $base_slug . '&k24w_loc=$matches[1]', 'top');
	}
}
