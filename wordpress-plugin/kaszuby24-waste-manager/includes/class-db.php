<?php

class K24_Waste_DB {
    
    public static function get_cities() {
        return get_option('k24_waste_cities', array());
    }

    public static function save_city($city_data) {
        $cities = self::get_cities();
        $id = $city_data['id'] ?: uniqid();
        $city_data['id'] = $id;
        
        $cities[$id] = $city_data;
        update_option('k24_waste_cities', $cities);
        return $id;
    }

    public static function delete_city($id) {
        $cities = self::get_cities();
        if (isset($cities[$id])) {
            $slug = $cities[$id]['slug'];
            delete_option("k24_waste_city_{$slug}_regions");
            delete_option("k24_waste_city_{$slug}_schedule");
            unset($cities[$id]);
            update_option('k24_waste_cities', $cities);
        }
    }

    public static function get_regions($city_slug) {
        return get_option("k24_waste_city_{$city_slug}_regions", array());
    }

    public static function save_regions($city_slug, $regions) {
        update_option("k24_waste_city_{$city_slug}_regions", $regions);
    }

    public static function get_schedule($city_slug) {
        return get_option("k24_waste_city_{$city_slug}_schedule", array());
    }

    public static function save_schedule($city_slug, $schedule) {
        update_option("k24_waste_city_{$city_slug}_schedule", $schedule);
    }
}
