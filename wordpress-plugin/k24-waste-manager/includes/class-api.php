<?php

class K24_Waste_API
{
    public function __construct()
    {
        add_action('rest_api_init', array($this, 'register_routes'));
    }

    public function register_routes()
    {
        register_rest_route('kaszuby24/v2', '/waste-schedule', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_waste_schedule'),
            'permission_callback' => '__return_true',
            'args' => array(
                'city' => array(
                    'required' => false,
                    'type' => 'string'
                )
            )
        ));

        register_rest_route('kaszuby24/v2', '/waste-cities', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_cities'),
            'permission_callback' => '__return_true'
        ));

        register_rest_route('kaszuby24/v2', '/waste-announcements', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_announcements'),
            'permission_callback' => '__return_true',
            'args' => array(
                'city' => array(
                    'required' => false,
                    'type' => 'string'
                )
            )
        ));

        register_rest_route('kaszuby24/v2', '/waste-search', array(
            'methods' => 'GET',
            'callback' => array($this, 'search_waste_items'),
            'permission_callback' => '__return_true',
            'args' => array(
                'q' => array(
                    'required' => true,
                    'type' => 'string'
                )
            )
        ));
    }

    public function get_cities()
    {
        $cities = K24_Waste_DB::get_cities();
        $formatted_cities = array();
        
        foreach ($cities as $city) {
            $formatted_cities[] = array(
                'id' => $city['id'],
                'name' => $city['name'],
                'slug' => $city['slug'],
                'source_url' => isset($city['source_url']) ? $city['source_url'] : '',
                'source_type' => isset($city['source_type']) ? $city['source_type'] : 'manual',
                'news_api_url' => isset($city['news_api_url']) ? $city['news_api_url'] : '',
                'news_category_id' => isset($city['news_category_id']) ? intval($city['news_category_id']) : 0
            );
        }
        
        return new WP_REST_Response($formatted_cities, 200);
    }

    public function get_announcements($request)
    {
        $city_slug = $request->get_param('city');
        if (empty($city_slug))
            $city_slug = 'reda';

        $announcements = K24_Waste_DB::get_announcements($city_slug);

        return new WP_REST_Response(array(
            'city' => ucfirst($city_slug),
            'announcements' => $announcements
        ), 200);
    }

    public function get_waste_schedule($request)
    {
        $city_slug = $request->get_param('city');
        if (empty($city_slug))
            $city_slug = 'reda';

        $regions = K24_Waste_DB::get_regions($city_slug);
        $full_schedule = K24_Waste_DB::get_schedule($city_slug);
        $city_config = K24_Waste_DB::get_city_config($city_slug);

        $response_regions = array();
        foreach ($regions as $region) {
            $region_id = $region['id'];
            $response_regions[] = array(
                'id' => $region_id,
                'name' => $region['name'],
                'streets' => explode(',', $region['streets']),
                'schedule' => isset($full_schedule[$region_id]) ? $full_schedule[$region_id] : array()
            );
        }

        $response = array(
            'city' => ucfirst($city_slug),
            'regions' => $response_regions
        );

        // Add custom footer text if configured
        if (!empty($city_config['footer_text'])) {
            $response['footer_text'] = $city_config['footer_text'];
        }

        // Add custom announcements API URL if configured
        if (!empty($city_config['announcements_api_url'])) {
            $response['announcements_api_url'] = $city_config['announcements_api_url'];
        }

        return new WP_REST_Response($response, 200);
    }

    public function search_waste_items($request)
    {
        $query = strtolower($request->get_param('q'));

        // Database of waste items with Polish search terms
        $waste_database = array(
            // Plastik i metale
            array('name' => 'Butelka plastikowa', 'category' => 'Plastik i metale', 'color' => '#EAB308', 'icon' => 'recycle'),
            array('name' => 'Puszka aluminiowa', 'category' => 'Plastik i metale', 'color' => '#EAB308', 'icon' => 'recycle'),
            array('name' => 'Folia plastikowa', 'category' => 'Plastik i metale', 'color' => '#EAB308', 'icon' => 'recycle'),
            array('name' => 'Opakowanie po jogurcie', 'category' => 'Plastik i metale', 'color' => '#EAB308', 'icon' => 'recycle'),
            array('name' => 'Styropian opakowaniowy', 'category' => 'Plastik i metale', 'color' => '#EAB308', 'icon' => 'recycle'),
            
            // Papier
            array('name' => 'Karton', 'category' => 'Papier', 'color' => '#3b82f6', 'icon' => 'file-document'),
            array('name' => 'Gazeta', 'category' => 'Papier', 'color' => '#3b82f6', 'icon' => 'file-document'),
            array('name' => 'Książka', 'category' => 'Papier', 'color' => '#3b82f6', 'icon' => 'file-document'),
            array('name' => 'Tektura', 'category' => 'Papier', 'color' => '#3b82f6', 'icon' => 'file-document'),
            array('name' => 'Papier biurowy', 'category' => 'Papier', 'color' => '#3b82f6', 'icon' => 'file-document'),
            
            // Szkło
            array('name' => 'Słoik', 'category' => 'Szkło', 'color' => '#22c55e', 'icon' => 'glass-fragile'),
            array('name' => 'Butelka szklana', 'category' => 'Szkło', 'color' => '#22c55e', 'icon' => 'glass-fragile'),
            array('name' => 'Szklanka', 'category' => 'Szkło', 'color' => '#22c55e', 'icon' => 'glass-fragile'),
            
            // Bio
            array('name' => 'Resztki jedzenia', 'category' => 'Bio', 'color' => '#d946ef', 'icon' => 'leaf'),
            array('name' => 'Obierki warzywne', 'category' => 'Bio', 'color' => '#d946ef', 'icon' => 'leaf'),
            array('name' => 'Fusy z kawy', 'category' => 'Bio', 'color' => '#d946ef', 'icon' => 'leaf'),
            array('name' => 'Skorupki jajek', 'category' => 'Bio', 'color' => '#d946ef', 'icon' => 'leaf'),
            
            // Odpady zielone
            array('name' => 'Trawa', 'category' => 'Odpady zielone', 'color' => '#854d0e', 'icon' => 'sprout'),
            array('name' => 'Liście', 'category' => 'Odpady zielone', 'color' => '#854d0e', 'icon' => 'sprout'),
            array('name' => 'Gałęzie', 'category' => 'Odpady zielone', 'color' => '#854d0e', 'icon' => 'sprout'),
            
            // Zmieszane
            array('name' => 'Pieluszki', 'category' => 'Zmieszane', 'color' => '#000000', 'icon' => 'trash'),
            array('name' => 'Mokre chusteczki', 'category' => 'Zmieszane', 'color' => '#000000', 'icon' => 'trash'),
            array('name' => 'Porcelana', 'category' => 'Zmieszane', 'color' => '#000000', 'icon' => 'trash'),
            array('name' => 'Ceramika', 'category' => 'Zmieszane', 'color' => '#000000', 'icon' => 'trash'),
            
            // Gabaryty
            array('name' => 'Meble', 'category' => 'Gabaryty', 'color' => '#9333ea', 'icon' => 'help'),
            array('name' => 'Materac', 'category' => 'Gabaryty', 'color' => '#9333ea', 'icon' => 'help'),
            array('name' => 'Lodówka', 'category' => 'Gabaryty', 'color' => '#9333ea', 'icon' => 'help'),
            array('name' => 'Pralka', 'category' => 'Gabaryty', 'color' => '#9333ea', 'icon' => 'help'),
            array('name' => 'Okno', 'category' => 'Gabaryty', 'color' => '#9333ea', 'icon' => 'help'),
        );

        // Filter by search query
        $results = array_filter($waste_database, function ($item) use ($query) {
            return stripos($item['name'], $query) !== false || stripos($item['category'], $query) !== false;
        });

        return new WP_REST_Response(array_values($results), 200);
    }
}
