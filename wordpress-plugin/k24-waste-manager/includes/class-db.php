<?php

class K24_Waste_DB
{

    public static function get_cities()
    {
        $cities = get_option('k24_waste_cities', array());
        
        // Fix: jeśli to string JSON (z ręcznego SQL UPDATE), zdekoduj go
        if (is_string($cities)) {
            $decoded = json_decode($cities, true);
            if ($decoded && is_array($decoded)) {
                // Zapisz poprawnie przez update_option (serializuje automatycznie)
                update_option('k24_waste_cities', $decoded);
                return $decoded;
            }
        }
        
        return is_array($cities) ? $cities : array();
    }

    public static function save_city($city_data)
    {
        $cities = self::get_cities();
        $id = !empty($city_data['id']) ? $city_data['id'] : uniqid();
        $city_data['id'] = $id;

        // Default metadata
        if (!isset($city_data['source_url']))
            $city_data['source_url'] = '';
        if (!isset($city_data['source_type']))
            $city_data['source_type'] = 'manual'; // manual, ekofabryka, json_api
        if (!isset($city_data['news_api_url']))
            $city_data['news_api_url'] = '';
        if (!isset($city_data['news_category_id']))
            $city_data['news_category_id'] = 0;

        $cities[$id] = $city_data;
        update_option('k24_waste_cities', $cities);
        return $id;
    }

    public static function delete_city($id)
    {
        $cities = self::get_cities();
        if (isset($cities[$id])) {
            $slug = $cities[$id]['slug'];
            delete_option("k24_waste_city_{$slug}_regions");
            delete_option("k24_waste_city_{$slug}_schedule");
            unset($cities[$id]);
            update_option('k24_waste_cities', $cities);
        }
    }

    public static function get_regions($city_slug)
    {
        return get_option("k24_waste_city_{$city_slug}_regions", array());
    }

    public static function save_regions($city_slug, $regions)
    {
        update_option("k24_waste_city_{$city_slug}_regions", $regions);
    }

    public static function get_schedule($city_slug)
    {
        return get_option("k24_waste_city_{$city_slug}_schedule", array());
    }

    public static function save_schedule($city_slug, $schedule)
    {
        update_option("k24_waste_city_{$city_slug}_schedule", $schedule);
    }

    public static function get_announcements($city_slug)
    {
        return get_option("k24_waste_city_{$city_slug}_announcements", array());
    }

    public static function save_announcements($city_slug, $announcements)
    {
        update_option("k24_waste_city_{$city_slug}_announcements", $announcements);
    }

    public static function get_city_config($city_slug)
    {
        return get_option("k24_waste_city_{$city_slug}_config", array(
            'footer_text' => '',
            'announcements_api_url' => ''
        ));
    }

    public static function save_city_config($city_slug, $config)
    {
        update_option("k24_waste_city_{$city_slug}_config", $config);
    }
}
