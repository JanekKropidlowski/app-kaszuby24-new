<?php
/**
 * Plugin Name: Kaszuby24 Waste Manager
 * Description: Zaawansowany system zarządzania harmonogramem odpadów dla miast i regionów.
 * Version: 1.0.0
 * Author: Kaszuby24
 * Text Domain: k24-waste
 */

if (!defined('ABSPATH')) {
    exit;
}

define('K24_WASTE_PATH', plugin_dir_path(__FILE__));
define('K24_WASTE_URL', plugin_dir_url(__FILE__));

// Wymagane pliki
require_once K24_WASTE_PATH . 'includes/class-db.php';
require_once K24_WASTE_PATH . 'includes/class-admin.php';
require_once K24_WASTE_PATH . 'includes/class-api.php';
require_once K24_WASTE_PATH . 'includes/class-waste-scraper.php';

class Kaszuby24_Waste_Manager
{
    public static function init()
    {
        new K24_Waste_DB();
        new K24_Waste_Admin();
        new K24_Waste_API();
        new K24_Waste_Scraper();
    }
}

add_action('plugins_loaded', array('Kaszuby24_Waste_Manager', 'init'));
