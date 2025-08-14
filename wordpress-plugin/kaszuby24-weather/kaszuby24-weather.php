<?php
/**
 * Plugin Name: Kaszuby24 Weather
 * Description: Kompleksowa pogoda dla Kaszuby24: REST API, shortcode, cache, geolokalizacja i SEO.
 * Version: 0.1.1
 * Author: Kaszuby24
 * License: GPLv2 or later
 * Text Domain: kaszuby24-weather
 */

if (!defined('ABSPATH')) {
	exit;
}

// Constants
if (!defined('K24W_VERSION')) define('K24W_VERSION', '0.1.1');
if (!defined('K24W_PLUGIN_FILE')) define('K24W_PLUGIN_FILE', __FILE__);
if (!defined('K24W_PLUGIN_DIR')) define('K24W_PLUGIN_DIR', plugin_dir_path(__FILE__));
if (!defined('K24W_PLUGIN_URL')) define('K24W_PLUGIN_URL', plugin_dir_url(__FILE__));

// Cache TTLs
if (!defined('K24W_TTL_CURRENT')) define('K24W_TTL_CURRENT', 5 * MINUTE_IN_SECONDS);
if (!defined('K24W_TTL_FORECAST')) define('K24W_TTL_FORECAST', 30 * MINUTE_IN_SECONDS);
if (!defined('K24W_TTL_WARNINGS')) define('K24W_TTL_WARNINGS', 15 * MINUTE_IN_SECONDS);
if (!defined('K24W_TTL_HISTORY')) define('K24W_TTL_HISTORY', DAY_IN_SECONDS);

// Includes
require_once K24W_PLUGIN_DIR . 'includes/class-cache.php';
require_once K24W_PLUGIN_DIR . 'includes/class-rest.php';
require_once K24W_PLUGIN_DIR . 'includes/class-shortcodes.php';
require_once K24W_PLUGIN_DIR . 'includes/class-activator.php';
require_once K24W_PLUGIN_DIR . 'includes/class-router.php';

// Init
add_action('plugins_loaded', function () {
	load_plugin_textdomain('kaszuby24-weather', false, dirname(plugin_basename(__FILE__)) . '/languages');
});

add_action('rest_api_init', function () {
	\K24W\REST::register_routes();
});

add_action('init', function () {
	\K24W\Shortcodes::register();
	\K24W\Router::init();
});

// Assets
add_action('wp_enqueue_scripts', function () {
	wp_register_style('k24w-style', K24W_PLUGIN_URL . 'assets/css/weather.css', [], K24W_VERSION);
	wp_register_script('k24w-script', K24W_PLUGIN_URL . 'assets/js/weather.js', [], K24W_VERSION, true);
	wp_localize_script('k24w-script', 'K24W', [
		'rest' => [
			'base' => esc_url_raw(rest_url('kaszuby24-weather/v1/')),
		],
		'i18n' => [
			'locatePermission' => __('Zezwól na dostęp do lokalizacji, aby zobaczyć pogodę w Twojej okolicy.', 'kaszuby24-weather'),
			'loading' => __('Ładowanie...', 'kaszuby24-weather'),
			'error' => __('Wystąpił błąd podczas pobierania danych pogodowych.', 'kaszuby24-weather'),
		],
	]);
});

// Activation hooks
register_activation_hook(__FILE__, ['K24W\\Activator', 'activate']);
register_deactivation_hook(__FILE__, ['K24W\\Activator', 'deactivate']);

register_activation_hook(__FILE__, function(){ flush_rewrite_rules(); });
register_deactivation_hook(__FILE__, function(){ flush_rewrite_rules(); });
