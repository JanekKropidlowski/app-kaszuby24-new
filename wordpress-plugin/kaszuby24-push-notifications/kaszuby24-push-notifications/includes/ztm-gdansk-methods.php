    private function get_gdansk_stops_from_api($request) {
        $api_url = 'https://ckan.multimediagdansk.pl/dataset/c24aa637-3619-4dc2-a171-a23eec8f2172/resource/4c4025f0-01bf-41f7-a39f-d156d201b82b/download/stops.json';
        $response = wp_remote_get($api_url, array(
            'timeout' => 15,
            'headers' => array('Accept' => 'application/json')
        ));

        if (is_wp_error($response)) {
            error_log('[ZTM Gdańsk API] Error fetching stops: ' . $response->get_error_message());
            return new WP_REST_Response(array(), 200);
        }

        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        $stops = array();

        if (isset($data['stops']) && is_array($data['stops'])) {
            // API format: [{stopId, stopCode, stopName, stopLat, stopLon, ...}]
            foreach ($data['stops'] as $stop) {
                // Filtruj tylko pomorskie przystanki
                $lat = floatval($stop['stopLat'] ?? 0);
                $lon = floatval($stop['stopLon'] ?? 0);
                
                if ($lat >= self::POMERANIA_MIN_LAT && $lat <= self::POMERANIA_MAX_LAT &&
                    $lon >= self::POMERANIA_MIN_LON && $lon <= self::POMERANIA_MAX_LON) {
                    $stops[] = array(
                        'id' => $stop['stopId'],
                        'name' => $stop['stopName'] ?? $stop['stopDesc'] ?? 'Unknown',
                        'lat' => $lat,
                        'lon' => $lon,
                        'agency' => 'gdansk'
                    );
                }
            }
        }

        return new WP_REST_Response($stops, 200);
    }

    private function get_gdansk_timetable($stop_id) {
        // ZTM provides stoptimes.json with all timetables
        $api_url = 'https://ckan.multimediagdansk.pl/dataset/c24aa637-3619-4dc2-a171-a23eec8f2172/resource/a023ceb0-8085-45f6-8261-02e6fcba7971/download/stoptimes.json';
        $result = array();

        $response = wp_remote_get($api_url, array(
            'timeout' => 15,
            'headers' => array('Accept' => 'application/json')
        ));

        if (is_wp_error($response)) {
            error_log('[ZTM Gdańsk API] Error fetching timetable: ' . $response->get_error_message());
            return new WP_REST_Response($result, 200);
        }

        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);

        if (isset($data['stoptimes']) && is_array($data['stoptimes'])) {
            $now = current_time('H:i');
            
            foreach ($data['stoptimes'] as $item) {
                // Filter by stop_id
                if (isset($item['stopId']) && $item['stopId'] == $stop_id) {
                    $time = isset($item['departureTime']) ? substr($item['departureTime'], 0, 5) : '';
                    
                    // Only future departures
                    if (!empty($time) && strcmp($time, $now) >= 0) {
                        $result[] = array(
                            'time' => $time,
                            'line' => $item['routeId'] ?? '',
                            'destination' => $item['tripHeadsign'] ?? '',
                            'platform' => '',
                            'trip_id' => $item['tripId'] ?? '',
                            'attributes' => array()
                        );
                    }
                }
            }

            // Sort by time
            usort($result, function($a, $b) { return strcmp($a['time'], $b['time']); });
            
            // Limit to 15 nearest
            $result = array_slice($result, 0, 15);
        }
        
        return new WP_REST_Response($result, 200);
    }
