<?php
namespace K24W;

if (!defined('ABSPATH')) exit;

class Shortcodes {
	public static function register() {
		add_shortcode('k24_weather', [__CLASS__, 'render_page']);
		add_shortcode('k24_weather_widget', [__CLASS__, 'render_widget']);
	}

	public static function render_page($atts = []) {
		$atts = shortcode_atts([
			'location' => '',
			'lat' => '',
			'lon' => '',
			'show' => 'current,hourly,daily,alerts,aqi,marine,hydro',
		], $atts, 'k24_weather');

		// Resolve location from URL slug
		$slug = get_query_var('k24w_loc');
		$resolved = null;
		if ($slug) {
			$resolved = Locations::resolve_slug($slug);
			if ($resolved) {
				$atts['location'] = $resolved['name'];
				$atts['lat'] = $resolved['lat'];
				$atts['lon'] = $resolved['lon'];
			}
		}

		wp_enqueue_style('k24w-style');
		wp_enqueue_script('k24w-script');

		$container_id = 'k24w-' . wp_generate_uuid4();
		$data = [
			'location' => (string)$atts['location'],
			'lat' => (string)$atts['lat'],
			'lon' => (string)$atts['lon'],
			'show' => (string)$atts['show'],
		];

		ob_start();
		?>
		<div id="<?php echo esc_attr($container_id); ?>" class="k24w-page" data-props='<?php echo wp_json_encode($data); ?>'>
			<div class="k24w-loading"><?php echo esc_html__('Ładowanie...', 'kaszuby24-weather'); ?></div>
		</div>
		<?php if ($resolved) : $schema = [
			'@context' => 'https://schema.org',
			'@type' => 'Place',
			'name' => $resolved['name'],
			'geo' => [
				'@type' => 'GeoCoordinates',
				'latitude' => $resolved['lat'],
				'longitude' => $resolved['lon'],
			]
		]; ?>
		<script type="application/ld+json"><?php echo wp_json_encode($schema); ?></script>
		<?php endif; ?>
		<?php
		return ob_get_clean();
	}

	public static function render_widget($atts = []) {
		$atts = shortcode_atts([
			'view' => 'current',
			'location' => '',
			'lat' => '',
			'lon' => '',
		], $atts, 'k24_weather_widget');

		wp_enqueue_style('k24w-style');
		wp_enqueue_script('k24w-script');

		$container_id = 'k24w-' . wp_generate_uuid4();
		$data = [
			'view' => (string)$atts['view'],
			'location' => (string)$atts['location'],
			'lat' => (string)$atts['lat'],
			'lon' => (string)$atts['lon'],
		];

		ob_start();
		?>
		<div id="<?php echo esc_attr($container_id); ?>" class="k24w-widget" data-props='<?php echo wp_json_encode($data); ?>'>
			<div class="k24w-loading"><?php echo esc_html__('Ładowanie...', 'kaszuby24-weather'); ?></div>
		</div>
		<?php
		return ob_get_clean();
	}
}
