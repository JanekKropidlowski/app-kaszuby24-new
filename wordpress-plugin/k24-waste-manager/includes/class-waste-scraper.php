<?php

class K24_Waste_Scraper
{

    const SOURCE_URL = 'https://ekofabrykawejherowo.pl/wyszukiwarka-odpadow/';
    const TRANSIENT_KEY = 'k24_waste_search_data';
    const TRANSIENT_EXPIRATION = 86400; // 24 hours

    public function __construct()
    {
        add_action('rest_api_init', array($this, 'register_routes'));
    }

    public function register_routes()
    {
        register_rest_route('kaszuby24/v2', '/waste-search', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_waste_data_endpoint'),
            'permission_callback' => '__return_true',
        ));
    }

    public function get_waste_data_endpoint($request)
    {
        $force = $request->get_param('force');
        $data = $this->get_cached_data($force === '1');

        if (is_wp_error($data)) {
            return $data;
        }

        if (empty($data)) {
            return new WP_Error('no_data', 'Could not fetch waste data', array('status' => 500));
        }

        $query = $request->get_param('q');
        if (!empty($query)) {
            $data = $this->filter_data($data, $query);
        }

        return rest_ensure_response($data);
    }

    private function get_cached_data($force = false)
    {
        if (!$force) {
            $cached = get_transient(self::TRANSIENT_KEY);
            if ($cached) {
                return $cached;
            }
        }

        return $this->fetch_and_parse_data();
    }

    private function fetch_and_parse_data()
    {
        $response = wp_remote_get(self::SOURCE_URL);

        if (is_wp_error($response)) {
            return $response;
        }

        if (wp_remote_retrieve_response_code($response) !== 200) {
            return new WP_Error('http_error', 'Source returned code ' . wp_remote_retrieve_response_code($response), array('status' => 500));
        }

        // For HTML page, retrieve the whole body
        $html_content = wp_remote_retrieve_body($response);

        if (empty($html_content)) {
            return null;
        }

        // Extract the JS array 'searchData = "[...]";' or "let searchData = '[...]';"
        // It's a JSON string literal.
        $pattern = '/searchData\s*=\s*[\'"](\[.*?\])[\'"];/s';
        if (preg_match($pattern, $html_content, $matches)) {
            $json_string = $matches[1];

            // The string might contain Unicode escapes (\uXXXX).
            $data = json_decode($json_string, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                // Cleanup common JSON issues if standard decode fails
                $json_string = preg_replace('/,\s*([\]\}])/', '$1', $json_string);
                $data = json_decode($json_string, true);
            }

            if (!empty($data) && is_array($data)) {
                $processed = $this->process_items($data);
                set_transient(self::TRANSIENT_KEY, $processed, self::TRANSIENT_EXPIRATION);
                return $processed;
            }

            return new WP_Error('parse_error', 'Could not parse JSON data from source', array('status' => 500));
        }

        return new WP_Error('no_match', 'Could not find searchData in source HTML', array('status' => 500));
    }

    private function process_items($items)
    {
        $processed = array();

        foreach ($items as $item) {
            // The data from Ekofabryka is an array of arrays: [["Name", "Category"], ...]
            if (is_array($item) && count($item) >= 2) {
                $name = strip_tags($item[0]);
                $category = strip_tags($item[1]);
            } else {
                // Fallback for object-based format
                $name = isset($item['label']) ? strip_tags($item['label']) : (isset($item['name']) ? strip_tags($item['name']) : 'Nieznany');
                $category = isset($item['category']) ? strip_tags($item['category']) : 'Inne';
            }

            $mapped_cat = $this->map_category($category);

            $processed[] = array(
                'name' => $name,
                'category' => $category,
                'color' => $mapped_cat['color'],
                'icon' => $mapped_cat['icon']
            );
        }

        return $processed;
    }

    private function map_category($category)
    {
        $category = mb_strtolower($category);

        if (strpos($category, 'metale') !== false || strpos($category, 'tworzywa') !== false || strpos($category, 'plastik') !== false) {
            return array('color' => '#EAB308', 'icon' => 'recycle'); // Yellow
        } elseif (strpos($category, 'szkło') !== false || strpos($category, 'szklo') !== false) {
            return array('color' => '#22c55e', 'icon' => 'glass-fragile'); // Green
        } elseif (strpos($category, 'papier') !== false || strpos($category, 'makulatura') !== false) {
            return array('color' => '#3b82f6', 'icon' => 'file-document'); // Blue
        } elseif (strpos($category, 'bio') !== false) {
            return array('color' => '#854d0e', 'icon' => 'leaf'); // Brown
        } elseif (strpos($category, 'zmieszane') !== false || strpos($category, 'pozostałe') !== false) {
            return array('color' => '#000000', 'icon' => 'trash'); // Black
        } elseif (strpos($category, 'zielone') !== false) {
            return array('color' => '#854d0e', 'icon' => 'sprout'); // Brown (Green waste usually brown bin)
        } else {
            return array('color' => '#6b7280', 'icon' => 'help'); // Grey
        }
    }

    private function filter_data($data, $query)
    {
        $query = mb_strtolower($query);
        return array_values(array_filter($data, function ($item) use ($query) {
            return strpos(mb_strtolower($item['name']), $query) !== false;
        }));
    }

}
