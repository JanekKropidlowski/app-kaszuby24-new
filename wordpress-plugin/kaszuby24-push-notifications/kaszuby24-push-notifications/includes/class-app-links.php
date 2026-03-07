<?php

/**
 * Class for handling Facebook App Links meta tags
 */
class Kaszuby24_App_Links {

    /**
     * Constructor
     */
    public function __construct() {
        add_action('wp_head', array($this, 'add_app_links_meta_tags'));
    }

    /**
     * Add App Links meta tags to the head
     */
    public function add_app_links_meta_tags() {
        // Only run on single posts or front page to avoid clutter
        if (!is_single() && !is_front_page() && !is_home()) {
            return;
        }

        $app_store_id = '6748219988';
        $app_name = 'Kaszuby24';
        
        // Android URL/Package
        $android_package = 'app.kaszuby24';
        $android_app_name = 'Kaszuby24';

        // URL construction
        $ios_url = 'kaszuby24://home';
        $android_url = 'kaszuby24://home';
        $web_url = home_url('/');

        if (is_single()) {
            global $post;
            if (isset($post->ID)) {
                $ios_url = 'kaszuby24://article/' . $post->ID;
                $android_url = 'kaszuby24://article/' . $post->ID;
                $web_url = get_permalink($post->ID);
            }
        }

        // Output tags
        echo "<!-- Kaszuby24 App Links -->\n";
        
        // iOS
        echo '<meta property="al:ios:url" content="' . esc_attr($ios_url) . '" />' . "\n";
        echo '<meta property="al:ios:app_store_id" content="' . esc_attr($app_store_id) . '" />' . "\n";
        echo '<meta property="al:ios:app_name" content="' . esc_attr($app_name) . '" />' . "\n";
        
        // Android
        echo '<meta property="al:android:url" content="' . esc_attr($android_url) . '" />' . "\n";
        echo '<meta property="al:android:package" content="' . esc_attr($android_package) . '" />' . "\n";
        echo '<meta property="al:android:app_name" content="' . esc_attr($android_app_name) . '" />' . "\n";
        
        // Web Fallback
        echo '<meta property="al:web:url" content="' . esc_attr($web_url) . '" />' . "\n";
        
        echo "<!-- End Kaszuby24 App Links -->\n";
    }
}
