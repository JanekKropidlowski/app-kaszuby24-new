<?php

class K24_Waste_API {
    public function __construct() {
        add_action('rest_api_init', array($this, 'register_routes'));
    }

    public function register_routes() {
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
    }

    public function get_cities() {
        return new WP_REST_Response(array_values(K24_Waste_DB::get_cities()), 200);
    }

    public function get_waste_schedule($request) {
        $city_slug = $request->get_param('city');
        if (empty($city_slug)) $city_slug = 'reda';

        $regions = K24_Waste_DB::get_regions($city_slug);
        $full_schedule = K24_Waste_DB::get_schedule($city_slug);

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

        return new WP_REST_Response(array(
            'city' => ucfirst($city_slug),
            'regions' => $response_regions
        ), 200);
    }
}
