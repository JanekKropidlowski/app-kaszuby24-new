<?php
namespace K24W;

if (!defined('ABSPATH')) exit;

class REST {
	public static function register_routes() {
		register_rest_route('kaszuby24-weather/v1', '/current', [
			'methods' => 'GET',
			'callback' => [__CLASS__, 'get_current'],
			'permission_callback' => '__return_true',
		]);

		register_rest_route('kaszuby24-weather/v1', '/forecast', [
			'methods' => 'GET',
			'callback' => [__CLASS__, 'get_forecast'],
			'permission_callback' => '__return_true',
		]);

		register_rest_route('kaszuby24-weather/v1', '/air', [
			'methods' => 'GET',
			'callback' => [__CLASS__, 'get_air'],
			'permission_callback' => '__return_true',
		]);

		register_rest_route('kaszuby24-weather/v1', '/marine', [
			'methods' => 'GET',
			'callback' => [__CLASS__, 'get_marine'],
			'permission_callback' => '__return_true',
		]);

		register_rest_route('kaszuby24-weather/v1', '/warnings', [
			'methods' => 'GET',
			'callback' => [__CLASS__, 'get_warnings'],
			'permission_callback' => '__return_true',
		]);

		register_rest_route('kaszuby24-weather/v1', '/stations/nearest', [
			'methods' => 'GET',
			'callback' => [__CLASS__, 'get_nearest_stations'],
			'permission_callback' => '__return_true',
		]);

		// Radar: product list and latest composite
		register_rest_route('kaszuby24-weather/v1', '/radar/products', [
			'methods' => 'GET',
			'callback' => [__CLASS__, 'get_radar_products'],
			'permission_callback' => '__return_true',
		]);

		// GIOS: nearest air station and latest measurement
		register_rest_route('kaszuby24-weather/v1', '/gios-nearest', [
			'methods' => 'GET',
			'callback' => [__CLASS__, 'get_gios_nearest'],
			'permission_callback' => '__return_true',
		]);

		// Meteostat: historical daily temps
		register_rest_route('kaszuby24-weather/v1', '/history', [
			'methods' => 'GET',
			'callback' => [__CLASS__, 'get_history'],
			'permission_callback' => '__return_true',
		]);
	}

	private static function param($request, $key, $default = null) {
		$value = $request->get_param($key);
		return $value !== null ? $value : $default;
	}

	public static function get_current($request) {
		$lat = floatval(self::param($request, 'lat'));
		$lon = floatval(self::param($request, 'lon'));
		if (!$lat || !$lon) {
			return new \WP_Error('bad_request', 'Missing lat/lon', ['status' => 400]);
		}
		$url = sprintf(
			'https://api.open-meteo.com/v1/forecast?latitude=%s&longitude=%s&current=temperature_2m,relative_humidity_2m,wind_speed_10m,pressure_msl,weather_code&timezone=auto',
			rawurlencode($lat), rawurlencode($lon)
		);
		$data = Cache::fetch_json($url, defined('K24W_TTL_CURRENT') ? K24W_TTL_CURRENT : 300);
		return rest_ensure_response($data ?: []);
	}

	public static function get_forecast($request) {
		$lat = floatval(self::param($request, 'lat'));
		$lon = floatval(self::param($request, 'lon'));
		if (!$lat || !$lon) {
			return new \WP_Error('bad_request', 'Missing lat/lon', ['status' => 400]);
		}
		$url = sprintf(
			'https://api.open-meteo.com/v1/forecast?latitude=%s&longitude=%s&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,uv_index_max,sunrise,sunset,windspeed_10m_max&hourly=temperature_2m,precipitation_probability,precipitation,weathercode,windspeed_10m,winddirection_10m,relativehumidity_2m,pressure_msl,visibility,uv_index,dew_point_2m,cloudcover,wind_gusts_10m&current_weather=true&timezone=Europe%%2FWarsaw',
			rawurlencode($lat), rawurlencode($lon)
		);
		$data = Cache::fetch_json($url, defined('K24W_TTL_FORECAST') ? K24W_TTL_FORECAST : 1800);
		return rest_ensure_response($data ?: []);
	}

	public static function get_air($request) {
		$lat = floatval(self::param($request, 'lat'));
		$lon = floatval(self::param($request, 'lon'));
		if (!$lat || !$lon) {
			return new \WP_Error('bad_request', 'Missing lat/lon', ['status' => 400]);
		}
		$url = sprintf(
			'https://air-quality-api.open-meteo.com/v1/air-quality?latitude=%s&longitude=%s&hourly=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,aerosol_optical_depth,dust&timezone=Europe%%2FWarsaw',
			rawurlencode($lat), rawurlencode($lon)
		);
		$data = Cache::fetch_json($url, defined('K24W_TTL_FORECAST') ? K24W_TTL_FORECAST : 1800);
		return rest_ensure_response($data ?: []);
	}

	public static function get_marine($request) {
		$lat = floatval(self::param($request, 'lat'));
		$lon = floatval(self::param($request, 'lon'));
		if (!$lat || !$lon) {
			return new \WP_Error('bad_request', 'Missing lat/lon', ['status' => 400]);
		}
		$url = sprintf(
			'https://marine-api.open-meteo.com/v1/marine?latitude=%s&longitude=%s&hourly=wave_height,wave_direction,wave_period,wind_wave_height,wind_wave_direction,wind_wave_period&timezone=Europe%%2FWarsaw',
			rawurlencode($lat), rawurlencode($lon)
		);
		$data = Cache::fetch_json($url, defined('K24W_TTL_FORECAST') ? K24W_TTL_FORECAST : 1800);
		return rest_ensure_response($data ?: []);
	}

	public static function get_warnings() {
		$base = 'https://danepubliczne.imgw.pl/api/data';
		$meteo = Cache::fetch_json($base . '/warningsmeteo', defined('K24W_TTL_WARNINGS') ? K24W_TTL_WARNINGS : 900, 'k24w_warn_meteo');
		$hydro = Cache::fetch_json($base . '/warningshydro', defined('K24W_TTL_WARNINGS') ? K24W_TTL_WARNINGS : 900, 'k24w_warn_hydro');
		return rest_ensure_response([
			'meteo' => is_array($meteo) ? $meteo : [],
			'hydro' => is_array($hydro) ? $hydro : [],
		]);
	}

	public static function get_nearest_stations($request) {
		$lat = floatval(self::param($request, 'lat'));
		$lon = floatval(self::param($request, 'lon'));
		$limit = intval(self::param($request, 'limit', 5));
		if (!$lat || !$lon) {
			return new \WP_Error('bad_request', 'Missing lat/lon', ['status' => 400]);
		}
		$base = 'https://danepubliczne.imgw.pl/api/data';
		$synop = Cache::fetch_json($base . '/synop', defined('K24W_TTL_CURRENT') ? K24W_TTL_CURRENT : 300, 'k24w_synop');
		$meteo = Cache::fetch_json($base . '/meteo', defined('K24W_TTL_FORECAST') ? K24W_TTL_FORECAST : 1800, 'k24w_meteo');
		$hydro = Cache::fetch_json($base . '/hydro', defined('K24W_TTL_FORECAST') ? K24W_TTL_FORECAST : 1800, 'k24w_hydro');

		$stations = [];
		if (is_array($synop)) {
			foreach ($synop as $s) {
				$stations[] = [
					'type' => 'synop',
					'name' => $s['stacja'] ?? '',
					'lat' => isset($s['szerokosc']) ? floatval($s['szerokosc']) : null,
					'lon' => isset($s['dlugosc']) ? floatval($s['dlugosc']) : null,
					'id' => $s['id_stacji'] ?? '',
				];
			}
		}
		if (is_array($meteo)) {
			foreach ($meteo as $m) {
				$stations[] = [
					'type' => 'meteo',
					'name' => $m['nazwa_stacji'] ?? '',
					'lat' => isset($m['lat']) ? floatval($m['lat']) : null,
					'lon' => isset($m['lon']) ? floatval($m['lon']) : null,
					'id' => $m['kod_stacji'] ?? '',
				];
			}
		}
		if (is_array($hydro)) {
			foreach ($hydro as $h) {
				$stations[] = [
					'type' => 'hydro',
					'name' => $h['stacja'] ?? '',
					'lat' => isset($h['lat']) ? floatval($h['lat']) : null,
					'lon' => isset($h['lon']) ? floatval($h['lon']) : null,
					'id' => $h['id_stacji'] ?? '',
				];
			}
		}

		$stations = array_values(array_filter($stations, function ($s) {
			return isset($s['lat'], $s['lon']) && is_finite($s['lat']) && is_finite($s['lon']);
		}));

		foreach ($stations as &$s) {
			$s['distance_km'] = self::haversine($lat, $lon, $s['lat'], $s['lon']);
		}
		unset($s);

		usort($stations, function ($a, $b) {
			return $a['distance_km'] <=> $b['distance_km'];
		});

		return rest_ensure_response(array_slice($stations, 0, max(1, $limit)));
	}

	public static function get_radar_products() {
		$base = 'https://danepubliczne.imgw.pl/api/data/product';
		$products = Cache::fetch_json($base, defined('K24W_TTL_HISTORY') ? K24W_TTL_HISTORY : DAY_IN_SECONDS, 'k24w_imgw_products');
		if (!$products) $products = [];
		return rest_ensure_response($products);
	}

	public static function get_gios_nearest($request) {
		$lat = floatval(self::param($request, 'lat'));
		$lon = floatval(self::param($request, 'lon'));
		if (!$lat || !$lon) {
			return new \WP_Error('bad_request', 'Missing lat/lon', ['status' => 400]);
		}
		// GIOS list of stations
		$stations = Cache::fetch_json('https://api.gios.gov.pl/pjp-api/rest/station/findAll', 12 * HOUR_IN_SECONDS, 'k24w_gios_stations');
		if (!is_array($stations)) return rest_ensure_response([]);
		$best = null; $bestD = PHP_FLOAT_MAX;
		foreach ($stations as $s) {
			if (!isset($s['gegrLat'], $s['gegrLon'])) continue;
			$d = self::haversine($lat, $lon, (float)$s['gegrLat'], (float)$s['gegrLon']);
			if ($d < $bestD) { $best = $s; $bestD = $d; }
		}
		if (!$best) return rest_ensure_response([]);
		$idx = Cache::fetch_json('https://api.gios.gov.pl/pjp-api/rest/aqindex/getIndex/' . intval($best['id']), 15 * MINUTE_IN_SECONDS, 'k24w_gios_idx_' . intval($best['id']));
		return rest_ensure_response(['station' => $best, 'index' => $idx]);
	}

	public static function get_history($request) {
		$lat = floatval(self::param($request, 'lat'));
		$lon = floatval(self::param($request, 'lon'));
		$start = sanitize_text_field(self::param($request, 'start'));
		$end = sanitize_text_field(self::param($request, 'end'));
		if (!$lat || !$lon || !$start || !$end) {
			return new \WP_Error('bad_request', 'Missing lat/lon/start/end', ['status' => 400]);
		}
		// Open-Meteo archive endpoint (free)
		$url = sprintf('https://archive-api.open-meteo.com/v1/era5?latitude=%s&longitude=%s&start_date=%s&end_date=%s&daily=temperature_2m_max,temperature_2m_min&timezone=Europe%%2FWarsaw', rawurlencode($lat), rawurlencode($lon), rawurlencode($start), rawurlencode($end));
		$data = Cache::fetch_json($url, defined('K24W_TTL_HISTORY') ? K24W_TTL_HISTORY : DAY_IN_SECONDS);
		return rest_ensure_response($data ?: []);
	}

	private static function haversine($lat1, $lon1, $lat2, $lon2) {
		$R = 6371; // km
		$dLat = deg2rad($lat2 - $lat1);
		$dLon = deg2rad($lon2 - $lon1);
		$a = sin($dLat/2) * sin($dLat/2) + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon/2) * sin($dLon/2);
		$c = 2 * atan2(sqrt($a), sqrt(1-$a));
		return $R * $c;
	}
}
