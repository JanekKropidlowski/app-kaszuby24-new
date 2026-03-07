<?php
/**
 * Plugin Name: Kaszuby24 Transport V2
 * Description: Nowa wersja systemu transportowego dla aplikacji Kaszuby24 (SKM, Kolej, Autobusy)
 * Version: 2.0.0
 * Author: Antigravity
 */

if (!defined('ABSPATH'))
    exit;

// Definicja ścieżek
define('K24_TRANS_V2_PATH', plugin_dir_path(__FILE__));
define('K24_TRANS_V2_URL', plugin_dir_url(__FILE__));

// Ładowanie klas
require_once K24_TRANS_V2_PATH . 'includes/class-transport-v2.php';

// Inicjalizacja
add_action('plugins_loaded', function () {
    new Kaszuby24_Transport_V2();
});