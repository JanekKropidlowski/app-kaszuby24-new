(function(){
	function qs(el, sel){ return el.querySelector(sel); }
	function qsa(el, sel){ return Array.prototype.slice.call(el.querySelectorAll(sel)); }
	function ce(tag, cls){ var el = document.createElement(tag); if (cls) el.className = cls; return el; }
	function fmt(v, unit){ if(v===undefined||v===null||isNaN(v)) return '—'; return String(v) + (unit||''); }

	// Inline critical CSS for immediate styling (clean, 8px scale)
	function injectStyles(){
		if (document.getElementById('k24w-inline-styles')) return;
		var style = document.createElement('style');
		style.id = 'k24w-inline-styles';
		style.textContent = `
			@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
			@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');
			@import url('https://cdnjs.cloudflare.com/ajax/libs/feather-icons/4.29.0/feather.min.css');
			
			:root{ 
				--k24w-primary:#224A96; --k24w-primary-600:#1a3a7a; --k24w-accent:#FECC00; 
				--k24w-surface:#ffffff; --k24w-muted:#6b7280; --k24w-border:#f1f5f9; 
				--k24w-bg:#fafbfc; --k24w-ink:#0f172a; --k24w-warning:#f59e0b; --k24w-danger:#dc2626;
				--k24w-success:#10b981; --k24w-info:#3b82f6;
			}
			
			.k24w-page, .k24w-widget { 
				font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
				color: var(--k24w-ink); 
				line-height: 1.6; 
				max-width: 1100px; 
				margin: 0 auto; 
				padding: 0 20px; 
				box-sizing: border-box;
			}
			
			.k24w-loading { padding: 32px; text-align: center; color: var(--k24w-muted); font-weight: 400; }
			
			@keyframes k24wFadeUp { 
				from { opacity:0; transform: translateY(12px); } 
				to { opacity:1; transform: translateY(0); } 
			}
			.k24w-animate { animation: k24wFadeUp .4s ease-out both; }

			/* Dashboard Header */
			.k24w-dashboard-header { 
				background: linear-gradient(135deg, var(--k24w-primary) 0%, var(--k24w-primary-600) 100%); 
				color: white; 
				padding: 24px; 
				border-radius: 24px; 
				margin: 0 0 24px 0; 
				box-shadow: 0 12px 32px rgba(34,74,150,.2); 
				border: none;
			}
			
			.k24w-header-grid { 
				display: grid; 
				grid-template-columns: 1fr auto; 
				gap: 20px; 
				align-items: center; 
			}
			
			.k24w-header-info { 
				display: grid; 
				grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); 
				gap: 16px; 
			}
			
			.k24w-header-item { 
				display: flex; 
				flex-direction: column; 
				gap: 6px; 
			}
			
			.k24w-header-label { 
				font-size: 11px; 
				opacity: 0.85; 
				text-transform: uppercase; 
				letter-spacing: 0.8px; 
				font-weight: 500;
			}
			
			.k24w-header-value { 
				font-size: 18px; 
				font-weight: 600; 
			}
			
			.k24w-header-icon { 
				width: 72px; 
				height: 72px; 
				background: rgba(255,255,255,.15); 
				border-radius: 20px; 
				display: flex; 
				align-items: center; 
				justify-content: center; 
				backdrop-filter: blur(12px); 
				border: 1px solid rgba(255,255,255,.2);
			}

			/* Key Metrics Tiles */
			.k24w-metrics { 
				display: grid; 
				grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
				gap: 16px; 
				margin: 0 0 24px 0; 
			}
			
			.k24w-metric-tile { 
				background: var(--k24w-surface); 
				border-radius: 20px; 
				padding: 24px; 
				text-align: center; 
				box-shadow: 0 4px 16px rgba(0,0,0,.08); 
				border: 1px solid var(--k24w-border);
				transition: all .3s ease;
			}
			
			.k24w-metric-tile:hover { 
				transform: translateY(-4px); 
				box-shadow: 0 8px 24px rgba(0,0,0,.12); 
				border-color: var(--k24w-primary);
			}
			
			.k24w-metric-icon { 
				font-size: 32px; 
				color: var(--k24w-primary); 
				margin-bottom: 12px; 
			}
			
			.k24w-metric-value { 
				font-size: 28px; 
				font-weight: 700; 
				color: var(--k24w-ink); 
				margin-bottom: 8px; 
			}
			
			.k24w-metric-label { 
				font-size: 14px; 
				color: var(--k24w-muted); 
				font-weight: 500; 
			}

			/* Improved Tabs */
			.k24w-tabs { 
				display: flex; 
				gap: 8px; 
				margin: 0 0 24px 0; 
				padding: 0; 
				overflow-x: auto; 
				scrollbar-width: none;
			}
			
			.k24w-tabs::-webkit-scrollbar{ 
				display: none; 
			}
			
			.k24w-tab { 
				background: var(--k24w-bg); 
				border: 1px solid var(--k24w-border); 
				border-radius: 16px; 
				padding: 16px 24px; 
				font-family: inherit; 
				font-size: 15px; 
				font-weight: 500; 
				color: var(--k24w-muted); 
				cursor: pointer; 
				transition: all .2s ease; 
				white-space: nowrap;
				min-width: 140px;
				text-align: center;
			}
			
			.k24w-tab:hover { 
				background: var(--k24w-surface); 
				border-color: var(--k24w-primary); 
				color: var(--k24w-primary);
			}
			
			.k24w-tab.active { 
				background: var(--k24w-primary); 
				border-color: var(--k24w-primary); 
				color: white; 
				box-shadow: 0 4px 16px rgba(34,74,150,.3);
			}

			/* Controls */
			.k24w-controls { 
				display: grid; 
				grid-template-columns: auto 1fr auto; 
				gap: 16px; 
				align-items: center; 
				margin: 0 0 24px 0; 
			}
			
			.k24w-btn { 
				background: var(--k24w-primary); 
				color: white; 
				border: none; 
				border-radius: 16px; 
				padding: 12px 20px; 
				font-family: inherit; 
				font-size: 14px; 
				font-weight: 500; 
				cursor: pointer; 
				transition: all .2s ease; 
				display: flex; 
				align-items: center; 
				gap: 8px;
			}
			
			.k24w-btn:hover { 
				background: var(--k24w-primary-600); 
				transform: translateY(-1px);
			}
			
			.k24w-select { 
				background: var(--k24w-surface); 
				border: 1px solid var(--k24w-border); 
				border-radius: 16px; 
				padding: 12px 16px; 
				font-family: inherit; 
				font-size: 14px; 
				color: var(--k24w-ink); 
				min-width: 200px; 
				max-width: 300px;
			}
			
			.k24w-search-wrap { 
				position: relative; 
				min-width: 200px; 
				max-width: 300px;
			}
			
			.k24w-search-input { 
				width: 100%; 
				background: var(--k24w-surface); 
				border: 1px solid var(--k24w-border); 
				border-radius: 16px; 
				padding: 12px 16px; 
				font-family: inherit; 
				font-size: 14px; 
				color: var(--k24w-ink); 
			}
			
			.k24w-suggest { 
				position: absolute; 
				top: 100%; 
				left: 0; 
				right: 0; 
				background: var(--k24w-surface); 
				border: 1px solid var(--k24w-border); 
				border-radius: 16px; 
				margin-top: 4px; 
				box-shadow: 0 8px 24px rgba(0,0,0,.12); 
				z-index: 1000; 
				max-height: 200px; 
				overflow-y: auto; 
				display: none;
			}
			
			.k24w-suggest-item { 
				padding: 12px 16px; 
				cursor: pointer; 
				border-bottom: 1px solid var(--k24w-border); 
				transition: background .2s ease;
			}
			
			.k24w-suggest-item:hover { 
				background: var(--k24w-bg); 
			}
			
			.k24w-suggest-item:last-child { 
				border-bottom: none; 
			}

			/* Enhanced Hero Section */
			.k24w-hero { 
				background: linear-gradient(135deg, var(--k24w-primary) 0%, var(--k24w-primary-600) 100%); 
				color: white; 
				border-radius: 24px; 
				padding: 32px; 
				margin: 0 0 24px 0; 
				box-shadow: 0 12px 32px rgba(34,74,150,.2); 
				border: none;
			}
			
			.k24w-hero-main { 
				display: grid; 
				grid-template-columns: 1fr auto; 
				gap: 24px; 
				align-items: center; 
				margin-bottom: 24px; 
			}
			
			.k24w-hero-left { 
				display: flex; 
				flex-direction: column; 
				gap: 16px; 
			}
			
			.k24w-hero-temp { 
				font-size: 64px; 
				font-weight: 700; 
				line-height: 1; 
			}
			
			.k24w-hero-desc { 
				font-size: 20px; 
				font-weight: 500; 
				opacity: 0.9; 
			}
			
			.k24w-hero-right { 
				width: 120px; 
				height: 120px; 
				background: rgba(255,255,255,.15); 
				border-radius: 24px; 
				display: flex; 
				align-items: center; 
				justify-content: center; 
				backdrop-filter: blur(12px); 
				border: 1px solid rgba(255,255,255,.2);
			}
			
			.k24w-hero-icon { 
				font-size: 48px; 
				color: white; 
			}
			
			.k24w-hero-details { 
				display: grid; 
				grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
				gap: 20px; 
				padding-top: 24px; 
				border-top: 1px solid rgba(255,255,255,.2);
			}
			
			.k24w-hero-detail { 
				display: flex; 
				align-items: center; 
				gap: 12px; 
			}
			
			.k24w-hero-detail-icon { 
				width: 40px; 
				height: 40px; 
				background: rgba(255,255,255,.2); 
				border-radius: 12px; 
				display: flex; 
				align-items: center; 
				justify-content: center; 
				font-size: 18px; 
			}
			
			.k24w-hero-detail-text { 
				display: flex; 
				flex-direction: column; 
				gap: 2px; 
			}
			
			.k24w-hero-detail-label { 
				font-size: 12px; 
				opacity: 0.7; 
				text-transform: uppercase; 
				letter-spacing: 0.5px; 
			}
			
			.k24w-hero-detail-value { 
				font-size: 16px; 
				font-weight: 600; 
			}
			
			.k24w-mini-forecast-wrap { 
				display: grid; 
				grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); 
				gap: 16px; 
				margin-top: 24px; 
			}
			
			.k24w-mini-forecast { 
				background: rgba(255,255,255,.1); 
				border-radius: 16px; 
				padding: 20px; 
				text-align: center; 
				border: 1px solid rgba(255,255,255,.2);
			}
			
			.k24w-mini-title { 
				font-size: 14px; 
				font-weight: 500; 
				margin-bottom: 12px; 
				opacity: 0.9; 
			}
			
			.k24w-mini-temps { 
				font-size: 18px; 
				font-weight: 600; 
				margin-top: 8px; 
			}

			/* Cards and Layout */
			.k24w-card { 
				background: var(--k24w-surface); 
				border-radius: 20px; 
				padding: 24px; 
				margin: 0 0 24px 0; 
				box-shadow: 0 4px 16px rgba(0,0,0,.08); 
				border: 1px solid var(--k24w-border);
			}
			
			.k24w-title { 
				font-size: 20px; 
				font-weight: 600; 
				color: var(--k24w-ink); 
				margin: 0 0 20px 0; 
				display: flex; 
				align-items: center; 
				gap: 12px; 
			}
			
			.k24w-grid { 
				display: grid; 
				grid-template-columns: 1fr; 
				gap: 16px; 
			}
			
			.k24w-row { 
				display: flex; 
				align-items: center; 
				justify-content: space-between; 
				padding: 16px; 
				background: var(--k24w-bg); 
				border-radius: 16px; 
				border: 1px solid var(--k24w-border);
			}
			
			.k24w-badge { 
				background: var(--k24w-primary); 
				color: white; 
				padding: 4px 12px; 
				border-radius: 12px; 
				font-size: 12px; 
				font-weight: 600; 
			}
			
			.k24w-current-details { 
				display: grid; 
				grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); 
				gap: 16px; 
			}
			
			.k24w-detail-item { 
				display: flex; 
				justify-content: space-between; 
				align-items: center; 
				padding: 12px 16px; 
				background: var(--k24w-bg); 
				border-radius: 12px; 
				border: 1px solid var(--k24w-border);
			}
			
			.k24w-detail-label { 
				font-size: 14px; 
				color: var(--k24w-muted); 
				font-weight: 500; 
			}
			
			.k24w-detail-value { 
				font-size: 16px; 
				font-weight: 600; 
				color: var(--k24w-ink); 
			}

			/* Improved Daily Forecast - List Style */
			.k24w-forecast-day { 
				display: grid; 
				grid-template-columns: auto 1fr auto auto; 
				align-items: center; 
				gap: 20px; 
				padding: 20px; 
				background: var(--k24w-bg); 
				border: 1px solid var(--k24w-border); 
				border-radius: 20px; 
				margin: 0 0 16px 0; 
				transition: all .2s ease;
			}
			
			.k24w-forecast-day:hover { 
				background: var(--k24w-surface); 
				border-color: var(--k24w-primary);
				transform: translateY(-2px);
				box-shadow: 0 8px 24px rgba(0,0,0,.12);
			}
			
			.k24w-forecast-left { 
				display: flex; 
				align-items: center; 
				gap: 16px; 
			}
			
			.k24w-forecast-icon { 
				width: 48px; 
				height: 48px; 
				display: flex; 
				align-items: center; 
				justify-content: center; 
			}
			
			.k24w-forecast-date { 
				display: flex; 
				flex-direction: column; 
				gap: 4px; 
			}
			
			.k24w-forecast-day-name { 
				font-weight: 700; 
				color: var(--k24w-ink); 
				font-size: 16px; 
			}
			
			.k24w-forecast-day-date { 
				font-size: 13px; 
				color: var(--k24w-muted); 
				font-weight: 500; 
			}
			
			.k24w-forecast-conditions { 
				display: flex; 
				flex-direction: column; 
				gap: 4px; 
				text-align: center; 
			}
			
			.k24w-forecast-desc { 
				font-size: 14px; 
				color: var(--k24w-muted); 
				font-weight: 500; 
			}
			
			.k24w-forecast-precip { 
				font-size: 12px; 
				color: var(--k24w-muted); 
				font-weight: 500; 
				margin-top: 4px; 
				display: flex; 
				align-items: center; 
				justify-content: center; 
			}
			
			.k24w-forecast-temps { 
				display: flex; 
				gap: 24px; 
				align-items: center; 
				font-weight: 700; 
			}
			
			.k24w-temp-min { 
				color: var(--k24w-primary); 
				font-size: 18px; 
			}
			
			.k24w-temp-max { 
				color: var(--k24w-danger); 
				font-size: 18px; 
			}

			/* Icons */
			.k24w-wi { 
				font-size: 32px; 
				line-height: 1; 
			}
			
			.k24w-wi--sun { 
				color: var(--k24w-accent); 
			}
			
			.k24w-wi--cloud { 
				color: var(--k24w-muted); 
			}
			
			.k24w-wi--rain { 
				color: var(--k24w-primary); 
			}
			
			.k24w-wi--storm { 
				color: var(--k24w-warning); 
			}
			
			.k24w-wi--snow { 
				color: #93c5fd; 
			}
			
			.k24w-wi--fog { 
				color: #9ca3af; 
			}

			/* Improved Hourly Forecast - Single Line Slider */
			.k24w-hourly { 
				display: flex; 
				gap: 12px; 
				overflow-x: auto; 
				padding: 8px 0 16px 0; 
				scrollbar-width: none;
				scroll-behavior: smooth;
			}
			
			.k24w-hourly::-webkit-scrollbar{ 
				display: none; 
			}
			
			.k24w-hourly-item{ 
				background: var(--k24w-bg); 
				border: 1px solid var(--k24w-border); 
				border-radius: 20px; 
				padding: 20px 16px; 
				text-align: center; 
				transition: all .2s ease;
				min-width: 100px;
				flex-shrink: 0;
			}
			
			.k24w-hourly-item:hover { 
				background: var(--k24w-surface); 
				border-color: var(--k24w-primary);
				transform: translateY(-4px);
				box-shadow: 0 8px 24px rgba(0,0,0,.12);
			}
			
			.k24w-hourly-time{ 
				font-size: 13px; 
				color: var(--k24w-muted); 
				font-weight: 600; 
				margin-bottom: 12px; 
			}
			
			.k24w-hourly-icon { 
				margin: 8px 0; 
			}
			
			.k24w-hourly-temp{ 
				font-size: 22px; 
				font-weight: 700; 
				color: var(--k24w-ink); 
				margin-top: 8px; 
			}
			
			.k24w-hourly-precip { 
				font-size: 10px; 
				color: var(--k24w-muted); 
				font-weight: 500; 
				margin-top: 4px; 
				display: flex; 
				align-items: center; 
				justify-content: center; 
				gap: 2px; 
			}

			.k24w-map-container { 
				border-radius: 20px; 
				overflow: hidden; 
				border: 1px solid var(--k24w-border);
			}
			
			.k24w-split-layout { 
				display: grid; 
				grid-template-columns: 1fr 1fr; 
				gap: 24px; 
			}
			
			.k24w-location-header { 
				background: var(--k24w-bg); 
				border-radius: 20px; 
				padding: 20px; 
				margin: 0 0 24px 0; 
				border: 1px solid var(--k24w-border);
			}
			
			.k24w-location-name { 
				font-size: 24px; 
				font-weight: 600; 
				color: var(--k24w-ink); 
				margin: 0 0 8px 0; 
			}
			
			.k24w-location-coords { 
				font-size: 14px; 
				color: var(--k24w-muted); 
				font-weight: 500; 
			}

			/* Responsive fixes */
			@media (max-width: 768px) {
				.k24w-page, .k24w-widget { 
					padding: 0 16px; 
				}
				
				.k24w-header-info { 
					grid-template-columns: 1fr; 
				}
				
				.k24w-metrics { 
					grid-template-columns: repeat(2, 1fr); 
				}
				
				.k24w-tabs { 
					grid-template-columns: repeat(2, 1fr); 
				}
				
				.k24w-controls { 
					grid-template-columns: 1fr; 
					gap: 12px; 
				}
				
				.k24w-hero-main { 
					grid-template-columns: 1fr; 
					text-align: center; 
				}
				
				.k24w-hero-details { 
					grid-template-columns: 1fr; 
				}
				
				.k24w-mini-forecast-wrap { 
					grid-template-columns: 1fr; 
				}
				
				.k24w-split-layout { 
					grid-template-columns: 1fr; 
				}
				
				.k24w-forecast-day { 
					grid-template-columns: 1fr; 
					gap: 16px; 
					text-align: center; 
				}
				
				.k24w-forecast-left { 
					justify-content: center; 
				}
				
				.k24w-forecast-temps { 
					justify-content: center; 
				}
			}
		`;
		document.head.appendChild(style);
	}

	// Weather icon library loader with fallback
	var hasWeatherIcons = false; // 'basmilius' | 'wi' | false
	function ensureWeatherIcons(cb){
		if (hasWeatherIcons) { cb && cb(); return; }
		var link = document.createElement('link');
		link.rel = 'stylesheet';
		link.href = 'https://unpkg.com/@basmilius/weather-icons/css/weather-icons.min.css';
		link.onload = function(){ hasWeatherIcons = 'basmilius'; cb && cb(); };
		link.onerror = function(){
			var l2 = document.createElement('link');
			l2.rel='stylesheet';
			l2.href='https://cdnjs.cloudflare.com/ajax/libs/weather-icons/2.0.10/css/weather-icons.min.css';
			l2.onload=function(){ hasWeatherIcons = 'wi'; cb && cb(); };
			document.head.appendChild(l2);
		};
		document.head.appendChild(link);
	}

	// Cache
	var apiCache = new Map();
	var cacheTimeout = 5 * 60 * 1000; // 5 minutes
	function cachedFetch(url, ttl = cacheTimeout) {
		var now = Date.now(); var cached = apiCache.get(url);
		if (cached && (now - cached.timestamp) < ttl) return Promise.resolve(cached.data);
		return fetch(url).then(r => r.json()).then(data => { apiCache.set(url, { data, timestamp: now }); return data; });
	}

	// Open-Meteo endpoints
	function omForecastUrl(lat, lon){
		return 'https://api.open-meteo.com/v1/forecast?latitude='+lat+'&longitude='+lon+'&current=temperature_2m,relative_humidity_2m,pressure_msl,wind_speed_10m,wind_direction_10m,weather_code,apparent_temperature,uv_index,visibility&daily=temperature_2m_max,temperature_2m_min,weather_code,sunrise,sunset,precipitation_probability_max&timezone=auto';
	}
	function omAirUrl(lat, lon){ return 'https://air-quality-api.open-meteo.com/v1/air-quality?latitude='+lat+'&longitude='+lon+'&hourly=pm10,pm2_5,european_aqi&timezone=auto'; }
	function omMarineUrl(lat, lon){ return 'https://marine-api.open-meteo.com/v1/marine?latitude='+lat+'&longitude='+lon+'&hourly=wave_height,wave_direction,wave_period&timezone=auto'; }
	function omHourlyUrl(lat, lon){ return 'https://api.open-meteo.com/v1/forecast?latitude='+lat+'&longitude='+lon+'&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,weather_code,wind_speed_10m,apparent_temperature&timezone=auto'; }

	// IMGW helpers
	function haversineKm(aLat, aLon, bLat, bLon){ var R=6371, dLat=(bLat-aLat)*Math.PI/180, dLon=(bLon-aLon)*Math.PI/180; var sa=Math.sin(dLat/2), sb=Math.sin(dLon/2); var c=2*Math.atan2(Math.sqrt(sa*sa+Math.cos(aLat*Math.PI/180)*Math.cos(bLat*Math.PI/180)*sb*sb), Math.sqrt(1-(sa*sa+Math.cos(aLat*Math.PI/180)*Math.cos(bLat*Math.PI/180)*sb*sb))); return R*c; }
	function parseFloatSafe(v){ if(v==null) return NaN; if(typeof v==='number') return v; if(typeof v==='string'){ return parseFloat(v.replace(',', '.')); } return NaN; }
	function extractLatLon(obj){ var lat = parseFloatSafe(obj.szerokoscGeograficzna || obj.szer_geo || obj.latitude || obj.szer || obj.lat || obj.y || obj.wgs84_y || obj.geo_y); var lon = parseFloatSafe(obj.dlugoscGeograficzna || obj.dlug_geo || obj.longitude || obj.dlug || obj.lon || obj.x || obj.wgs84_x || obj.geo_x); if (!isFinite(lat) || !isFinite(lon)) return null; return {lat:lat, lon:lon}; }
	function fetchImgwStationsRaw(){ var urls = ['https://danepubliczne.imgw.pl/api/data/synop','https://danepubliczne.imgw.pl/api/data/meteo','https://danepubliczne.imgw.pl/api/data/hydro']; return Promise.all(urls.map(function(u){ return cachedFetch(u, 24*60*60*1000).catch(function(){ return []; }); })).then(function(arr){ return arr.flat().filter(Boolean); }); }
	function fetchNearestStations(lat, lon, limit){ limit = limit || 8; return fetchImgwStationsRaw().then(function(list){ var stations = []; list.forEach(function(s){ var c = extractLatLon(s); if (!c) return; var d = haversineKm(lat, lon, c.lat, c.lon); stations.push({ name: s.stacja || s.nazwa_stacji || s.nazwa || s.station || 'Stacja IMGW', lat: c.lat, lon: c.lon, distance_km: d, type: 'IMGW' }); }); stations.sort(function(a,b){ return a.distance_km - b.distance_km; }); return stations.slice(0, limit); }).catch(function(){ return []; }); }
	function fetchImgwWarnings(){ var tries=['https://alerts.imgw.pl/api/data/alerts.json','https://alerts.imgw.pl/api/data/mapy/ostrzezenia.json','https://danepubliczne.imgw.pl/api/data/ostrzezenia']; function tryNext(i){ if(i>=tries.length) return Promise.resolve({meteo:[],hydro:[]}); return fetch(tries[i]).then(r=>r.json()).catch(()=>tryNext(i+1)); } return tryNext(0).then(d=>d); }

	// Geocoding
	function geocode(name){ if(!name||name.length<2) return Promise.resolve([]); var url='https://geocoding-api.open-meteo.com/v1/search?name='+encodeURIComponent(name)+'&count=6&language=pl&format=json'; return cachedFetch(url, 10*60*1000).then(function(d){ return (d && d.results) ? d.results : []; }); }

	// Icons
	function iconTheme(code){ code=Number(code); if([0,1].includes(code)) return 'sun'; if([2,3].includes(code)) return 'cloud'; if([45,48].includes(code)) return 'fog'; if([51,53,55,61,63,65,80,81,82].includes(code)) return 'rain'; if([71,73,75,77,85,86].includes(code)) return 'snow'; if([95,96,99].includes(code)) return 'storm'; return 'cloud'; }
	function iconClass(code, isDay){ var day=isDay!==false; code=Number(code); if([0].includes(code)) return day?'wi-day-sunny':'wi-night-clear'; if([1,2].includes(code)) return day?'wi-day-cloudy':'wi-night-alt-cloudy'; if([3].includes(code)) return 'wi-cloudy'; if([45,48].includes(code)) return 'wi-fog'; if([51,53,55].includes(code)) return 'wi-sprinkle'; if([61,63,65,80,81,82].includes(code)) return 'wi-showers'; if([66,67].includes(code)) return 'wi-rain-mix'; if([71,73,75,77,85,86].includes(code)) return 'wi-snow'; if([95].includes(code)) return 'wi-thunderstorm'; if([96,99].includes(code)) return 'wi-storm-showers'; return 'wi-cloudy'; }
	function iconSvg(code){ code=Number(code); var sun="%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cg fill='none' stroke='%23FFD166' stroke-width='2'%3E%3Ccircle cx='12' cy='12' r='4' fill='%23FFE29A'/%3E%3Cpath d='M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12'/%3E%3C/g%3E%3C/svg%3E"; var cloud="%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23CBD5E1' d='M6 18a4 4 0 010-8 5 5 0 019.58-1.37A4.5 4.5 0 1118 18H6z'/%3E%3C/svg%3E"; var rain="%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23A0AEC0' d='M6 16a4 4 0 010-8 5 5 0 019.58-1.37A4.5 4.5 0 1118 16H6z'/%3E%3Cpath stroke='%233189F6' stroke-width='2' d='M8 19l-1 3M12 19l-1 3M16 19l-1 3'/%3E%3C/svg%3E"; var storm="%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%239CA3AF' d='M6 16a4 4 0 010-8 5 5 0 019.58-1.37A4.5 4.5 0 1118 16H6z'/%3E%3Cpath fill='%23F59E0B' d='M11 14h3l-2 3h2l-3 5 1-4h-2l1-4z'/%3E%3C/svg%3E"; var snow="%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23E2E8F0' d='M6 16a4 4 0 010-8 5 5 0 019.58-1.37A4.5 4.5 0 1118 16H6z'/%3E%3Cg stroke='%2390CDF4' stroke-width='2'%3E%3Cpath d='M8 19l1 3M12 19l1 3M16 19l1 3'/%3E%3C/g%3E%3C/svg%3E"; if([0,1].indexOf(code)>=0) return 'data:image/svg+xml;utf8,'+sun; if([2,3,45,48].indexOf(code)>=0) return 'data:image/svg+xml;utf8,'+cloud; if([51,53,55,61,63,65,80,81,82].indexOf(code)>=0) return 'data:image/svg+xml;utf8,'+rain; if([95,96,99].indexOf(code)>=0) return 'data:image/svg+xml;utf8,'+storm; if([71,73,75,77].indexOf(code)>=0) return 'data:image/svg+xml;utf8,'+snow; return 'data:image/svg+xml;utf8,'+cloud; }
	function renderIcon(code, size, isDay){ 
		var theme = iconTheme(code); 
		var con = ce('div'); 
		
		// Try Font Awesome first (more modern icons)
		if (window.FontAwesome) {
			var i = document.createElement('i');
			i.className = getFontAwesomeIcon(code, isDay);
			i.style.fontSize = (size||28)+'px';
			con.appendChild(i);
		}
		// Fallback to weather icons library
		else if(hasWeatherIcons){ 
			var i = document.createElement('i'); 
			i.className = 'k24w-wi wi '+iconClass(code, isDay)+' k24w-wi--'+theme; 
			i.style.fontSize = (size||28)+'px'; 
			con.appendChild(i); 
		} 
		// Final fallback to SVG
		else { 
			var d = ce('div'); 
			d.className = 'k24w-forecast-icon'; 
			d.style.width = (size||28)+'px'; 
			d.style.height=(size||28)+'px'; 
			d.style.backgroundImage = 'url('+iconSvg(code)+')'; 
			con.appendChild(d); 
		} 
		return con; 
	}
	
	// New Font Awesome icon mapping
	function getFontAwesomeIcon(code, isDay) {
		code = Number(code);
		var day = isDay !== false;
		
		if ([0,1].includes(code)) return day ? 'fas fa-sun' : 'fas fa-moon';
		if ([2,3].includes(code)) return day ? 'fas fa-cloud-sun' : 'fas fa-cloud-moon';
		if ([45,48].includes(code)) return 'fas fa-smog';
		if ([51,53,55].includes(code)) return 'fas fa-cloud-drizzle';
		if ([61,63,65,80,81,82].includes(code)) return 'fas fa-cloud-rain';
		if ([66,67].includes(code)) return 'fas fa-cloud-rain';
		if ([71,73,75,77,85,86].includes(code)) return 'fas fa-snowflake';
		if ([95].includes(code)) return 'fas fa-bolt';
		if ([96,99].includes(code)) return 'fas fa-bolt';
		
		return 'fas fa-cloud';
	}

	function ensureLeaflet(cb){ if (window.L && window.L.map) { cb(); return; } var link = document.createElement('link'); link.rel='stylesheet'; link.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(link); var s = document.createElement('script'); s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; s.onload=cb; document.body.appendChild(s); }

	function describeWeather(code){ var map = { 0:'Bezchmurnie', 1:'Głównie słonecznie', 2:'Częściowe zachmurzenie', 3:'Pochmurno', 45:'Mgła', 48:'Mgła osadzająca', 51:'Mżawka', 61:'Deszcz', 71:'Śnieg', 80:'Przelotne opady', 95:'Burze' }; return map[Number(code)] || 'Pogoda'; }

	function getWeatherDescription(code) {
		var map = { 
			0:'Bezchmurnie', 
			1:'Głównie słonecznie', 
			2:'Częściowe zachmurzenie', 
			3:'Pochmurno', 
			45:'Mgła', 
			48:'Mgła osadzająca', 
			51:'Mżawka', 
			53:'Mżawka umiarkowana', 
			55:'Mżawka intensywna',
			56:'Mżawka zamarzająca', 
			57:'Mżawka zamarzająca intensywna',
			61:'Deszcz słaby', 
			63:'Deszcz umiarkowany', 
			65:'Deszcz intensywny',
			66:'Deszcz zamarzający słaby', 
			67:'Deszcz zamarzający intensywny',
			71:'Śnieg słaby', 
			73:'Śnieg umiarkowany', 
			75:'Śnieg intensywny',
			77:'Śnieg ziarnisty',
			80:'Przelotne opady słabe', 
			81:'Przelotne opady umiarkowane', 
			82:'Przelotne opady intensywne',
			85:'Przelotne opady śniegu słabe', 
			86:'Przelotne opady śniegu intensywne',
			95:'Burze', 
			96:'Burze z gradem słabym', 
			99:'Burze z gradem intensywnym'
		}; 
		return map[Number(code)] || 'Pogoda'; 
	}

	function renderHero(mainContainer, lat, lon){
		var hero = ce('div','k24w-hero k24w-animate'); 
		var main = ce('div','k24w-hero-main'); 
		var left = ce('div','k24w-hero-left'); 
		var right = ce('div','k24w-hero-right'); 
		var temp = ce('div','k24w-hero-temp'); 
		var desc = ce('div','k24w-hero-desc'); 
		var icon = ce('div','k24w-hero-icon'); 
		temp.textContent='--°C'; 
		desc.textContent='Ładowanie...'; 
		icon.innerHTML='<i class="fas fa-cloud-sun"></i>'; 
		left.appendChild(temp); 
		left.appendChild(desc); 
		right.appendChild(icon); 
		main.appendChild(left); 
		main.appendChild(right); 
		hero.appendChild(main);
		
		// Enhanced hero details section below main
		var details = ce('div','k24w-hero-details');
		
		// Pressure detail
		var pressureDetail = ce('div','k24w-hero-detail');
		var pressureIcon = ce('div','k24w-hero-detail-icon');
		pressureIcon.innerHTML = '<i class="fas fa-tachometer-alt"></i>';
		var pressureText = ce('div','k24w-hero-detail-text');
		var pressureLabel = ce('div','k24w-hero-detail-label');
		pressureLabel.textContent = 'Ciśnienie';
		var pressureValue = ce('div','k24w-hero-detail-value');
		pressureValue.textContent = '-- hPa';
		pressureText.appendChild(pressureLabel);
		pressureText.appendChild(pressureValue);
		pressureDetail.appendChild(pressureIcon);
		pressureDetail.appendChild(pressureText);
		
		// Wind detail
		var windDetail = ce('div','k24w-hero-detail');
		var windIcon = ce('div','k24w-hero-detail-icon');
		windIcon.innerHTML = '<i class="fas fa-wind"></i>';
		var windText = ce('div','k24w-hero-detail-text');
		var windLabel = ce('div','k24w-hero-detail-label');
		windLabel.textContent = 'Wiatr';
		var windValue = ce('div','k24w-hero-detail-value');
		windValue.textContent = '-- m/s';
		windText.appendChild(windLabel);
		windText.appendChild(windValue);
		windDetail.appendChild(windIcon);
		windDetail.appendChild(windText);
		
		// Humidity detail
		var humidityDetail = ce('div','k24w-hero-detail');
		var humidityIcon = ce('div','k24w-hero-detail-icon');
		humidityIcon.innerHTML = '<i class="fas fa-tint"></i>';
		var humidityText = ce('div','k24w-hero-detail-text');
		var humidityLabel = ce('div','k24w-hero-detail-label');
		humidityLabel.textContent = 'Wilgotność';
		var humidityValue = ce('div','k24w-hero-detail-value');
		humidityValue.textContent = '--%';
		humidityText.appendChild(humidityLabel);
		humidityText.appendChild(humidityValue);
		humidityDetail.appendChild(humidityIcon);
		humidityDetail.appendChild(humidityText);
		
		// Sunrise detail
		var sunriseDetail = ce('div','k24w-hero-detail');
		var sunriseIcon = ce('div','k24w-hero-detail-icon');
		sunriseIcon.innerHTML = '<i class="fas fa-sun"></i>';
		var sunriseText = ce('div','k24w-hero-detail-text');
		var sunriseLabel = ce('div','k24w-hero-detail-label');
		sunriseLabel.textContent = 'Wschód';
		var sunriseValue = ce('div','k24w-hero-detail-value');
		sunriseValue.textContent = '--:--';
		sunriseText.appendChild(sunriseLabel);
		sunriseText.appendChild(sunriseValue);
		sunriseDetail.appendChild(sunriseIcon);
		sunriseDetail.appendChild(sunriseText);
		
		// Sunset detail
		var sunsetDetail = ce('div','k24w-hero-detail');
		var sunsetIcon = ce('div','k24w-hero-detail-icon');
		sunsetIcon.innerHTML = '<i class="fas fa-moon"></i>';
		var sunsetText = ce('div','k24w-hero-detail-text');
		var sunsetLabel = ce('div','k24w-hero-detail-label');
		sunsetLabel.textContent = 'Zachód';
		var sunsetValue = ce('div','k24w-hero-detail-value');
		sunsetValue.textContent = '--:--';
		sunsetText.appendChild(sunsetLabel);
		sunsetText.appendChild(sunsetValue);
		sunsetDetail.appendChild(sunsetIcon);
		sunsetDetail.appendChild(sunsetText);
		
		// Feels like temperature detail
		var feelsLikeDetail = ce('div','k24w-hero-detail');
		var feelsLikeIcon = ce('div','k24w-hero-detail-icon');
		feelsLikeIcon.innerHTML = '<i class="fas fa-thermometer-half"></i>';
		var feelsLikeText = ce('div','k24w-hero-detail-text');
		var feelsLikeLabel = ce('div','k24w-hero-detail-label');
		feelsLikeLabel.textContent = 'Odczuwalna';
		var feelsLikeValue = ce('div','k24w-hero-detail-value');
		feelsLikeValue.textContent = '--°C';
		feelsLikeText.appendChild(feelsLikeLabel);
		feelsLikeText.appendChild(feelsLikeValue);
		feelsLikeDetail.appendChild(feelsLikeIcon);
		feelsLikeDetail.appendChild(feelsLikeText);
		
		// UV index detail
		var uvDetail = ce('div','k24w-hero-detail');
		var uvIcon = ce('div','k24w-hero-detail-icon');
		uvIcon.innerHTML = '<i class="fas fa-sun"></i>';
		var uvText = ce('div','k24w-hero-detail-text');
		var uvLabel = ce('div','k24w-hero-detail-label');
		uvLabel.textContent = 'UV';
		var uvValue = ce('div','k24w-hero-detail-value');
		uvValue.textContent = '--';
		uvText.appendChild(uvLabel);
		uvText.appendChild(uvValue);
		uvDetail.appendChild(uvIcon);
		uvDetail.appendChild(uvText);
		
		details.appendChild(pressureDetail);
		details.appendChild(windDetail);
		details.appendChild(humidityDetail);
		details.appendChild(sunriseDetail);
		details.appendChild(sunsetDetail);
		details.appendChild(feelsLikeDetail);
		details.appendChild(uvDetail);
		hero.appendChild(details);
		
		// Tomorrow/Day After forecast boxes
		var wrap = ce('div','k24w-mini-forecast-wrap'); 
		function mini(title, min, max, code){ 
			var m=ce('div','k24w-mini-forecast'); 
			var tt=ce('div','k24w-mini-title'); 
			tt.textContent=title; 
			var ic=renderIcon(code, 28, true); 
			ic.style.margin='0 auto 6px'; 
			var tv=ce('div','k24w-mini-temps'); 
			tv.textContent = fmt(min,'°')+' / '+fmt(max,'°'); 
			m.appendChild(tt); 
			m.appendChild(ic); 
			m.appendChild(tv); 
			return m; 
		} 
		if (forecast.daily && forecast.daily.time){ 
			var days=forecast.daily.time; 
			if (days[1]) wrap.appendChild(mini('Jutro', forecast.daily.temperature_2m_min[1], forecast.daily.temperature_2m_max[1], forecast.daily.weather_code ? forecast.daily.weather_code[1] : null)); 
			if (days[2]) wrap.appendChild(mini('Pojutrze', forecast.daily.temperature_2m_min[2], forecast.daily.temperature_2m_max[2], forecast.daily.weather_code ? forecast.daily.weather_code[2] : null)); 
		} 
		hero.appendChild(wrap);
		
		mainContainer.appendChild(hero);
		
		// Fetch and populate hero data
		Promise.all([cachedFetch(omForecastUrl(lat, lon)), cachedFetch(omAirUrl(lat, lon))]).then(function(results){
			var forecast = results[0] || {};
			var air = results[1] || {};
			var cur = forecast.current || forecast.current_weather || {};
			var t = cur.temperature_2m || cur.temperature;
			var wind = cur.wind_speed_10m || cur.windspeed;
			var pressure = cur.pressure_msl;
			var humidity = cur.relative_humidity_2m;
			var feelsLike = cur.apparent_temperature;
			var uvIndex = cur.uv_index;
			
			// Update main hero elements
			if(t != null) temp.textContent = fmt(t,'°C');
			if(cur.weather_code != null) {
				icon.innerHTML = renderIcon(cur.weather_code, 48, true).outerHTML;
			}
			
			// Update detailed info
			if(pressure != null) pressureValue.textContent = fmt(pressure,' hPa');
			if(wind != null) windValue.textContent = fmt(wind,' m/s');
			if(humidity != null) humidityValue.textContent = fmt(humidity,'%');
			if(feelsLike != null) feelsLikeValue.textContent = fmt(feelsLike,'°C');
			if(uvIndex != null) uvValue.textContent = fmt(uvIndex,'');
			
			// Update sunrise/sunset if available
			if(forecast.daily && forecast.daily.sunrise && forecast.daily.sunset) {
				var sunrise = new Date(forecast.daily.sunrise[0]);
				var sunset = new Date(forecast.daily.sunset[0]);
				sunriseValue.textContent = sunrise.toLocaleTimeString('pl-PL', {hour: '2-digit', minute: '2-digit'});
				sunsetValue.textContent = sunset.toLocaleTimeString('pl-PL', {hour: '2-digit', minute: '2-digit'});
			}
			
			// Update weather description
			if(cur.weather_code != null) {
				var weatherDesc = getWeatherDescription(cur.weather_code);
				desc.textContent = weatherDesc;
			}
		}).catch(function(){});
	}

	function renderHourly(mainContainer, lat, lon){ 
		var c = ce('div','k24w-card k24w-animate'); 
		c.id='k24w-hourly-card'; 
		var h = ce('h3','k24w-title'); 
		h.textContent='Pogoda godzinowa (24h)'; 
		c.appendChild(h); 
		var track = ce('div','k24w-hourly'); 
		c.appendChild(track); 
		mainContainer.appendChild(c); 
		cachedFetch(omHourlyUrl(lat, lon)).then(function(d){ 
			if(!d || !d.hourly){ 
				track.textContent='Brak danych'; 
				return; 
			} 
			var hours = d.hourly.time || []; 
			var now = new Date(); 
			for(var i=0,added=0;i<hours.length && added<24;i++){ 
				var t = new Date(hours[i]); 
				if (t < now) continue; 
				var item = ce('div','k24w-hourly-item'); 
				
				// Time
				var time = ce('div','k24w-hourly-time'); 
				time.textContent = t.toLocaleTimeString('pl-PL',{hour:'2-digit'}); 
				item.appendChild(time); 
				
				// Weather icon
				var icWrap = renderIcon(d.hourly.weather_code?d.hourly.weather_code[i]:null, 24, true); 
				icWrap.className = 'k24w-hourly-icon'; 
				item.appendChild(icWrap); 
				
				// Temperature
				var temp = ce('div','k24w-hourly-temp'); 
				temp.textContent = fmt(d.hourly.temperature_2m?d.hourly.temperature_2m[i]:null,'°C'); 
				item.appendChild(temp);
				
				// Additional info (precipitation probability, feels like)
				if (d.hourly.precipitation_probability && d.hourly.precipitation_probability[i] !== null) {
					var precipDiv = ce('div','k24w-hourly-precip');
					precipDiv.innerHTML = '<i class="fas fa-tint" style="font-size: 10px; color: var(--k24w-primary);"></i> ' + 
						(d.hourly.precipitation_probability[i] || 0) + '%';
					precipDiv.style.fontSize = '10px';
					precipDiv.style.color = 'var(--k24w-muted)';
					precipDiv.style.marginTop = '4px';
					item.appendChild(precipDiv);
				} 
				
				track.appendChild(item); 
				added++; 
			} 
		}).catch(function(){ 
			track.textContent='Brak danych'; 
		}); 
	}

	function renderPage(root, props){
		root.innerHTML = '';
		if (props.location) { var header = ce('div', 'k24w-location-header'); var name = ce('h2', 'k24w-location-name'); name.textContent = props.location; var coords = ce('div', 'k24w-location-coords'); if (props.lat && props.lon) coords.textContent = props.lat + ', ' + props.lon; header.appendChild(name); header.appendChild(coords); root.appendChild(header); }
		var state = {lat:null, lon:null, name: props.location||''};
		try{ if(!props.lat || !props.lon){ var last = JSON.parse(localStorage.getItem('k24w:last')||'null'); if(last && last.lat && last.lon){ state.lat=last.lat; state.lon=last.lon; state.name=last.name||state.name; } } }catch(e){}
		if (props.lat && props.lon){ state.lat = parseFloat(props.lat); state.lon = parseFloat(props.lon); }

		// Dashboard Header
		var dashboardHeader = ce('div', 'k24w-dashboard-header k24w-animate');
		var headerGrid = ce('div', 'k24w-header-grid');
		var headerInfo = ce('div', 'k24w-header-info');
		var headerIcon = ce('div', 'k24w-header-icon');
		headerIcon.innerHTML = '<i class="fas fa-cloud-sun" style="font-size: 32px; color: white;"></i>';
		
		// Header items will be populated when we have data
		var reportDate = ce('div', 'k24w-header-item');
		reportDate.innerHTML = '<div class="k24w-header-label">Data raportu</div><div class="k24w-header-value">' + new Date().toLocaleDateString('pl-PL', {year: 'numeric', month: 'long', day: 'numeric'}) + '</div>';
		var locationInfo = ce('div', 'k24w-header-item');
		locationInfo.innerHTML = '<div class="k24w-header-label">Lokalizacja</div><div class="k24w-header-value">' + (state.name || 'Ustalanie...') + '</div>';
		var eventType = ce('div', 'k24w-header-item');
		eventType.innerHTML = '<div class="k24w-header-label">Typ zdarzenia</div><div class="k24w-header-value">Monitoring pogody</div>';
		
		headerInfo.appendChild(reportDate);
		headerInfo.appendChild(locationInfo);
		headerInfo.appendChild(eventType);
		headerGrid.appendChild(headerInfo);
		headerGrid.appendChild(headerIcon);
		dashboardHeader.appendChild(headerGrid);
		root.appendChild(dashboardHeader);

		// Key Metrics Tiles
		var metricsContainer = ce('div', 'k24w-metrics k24w-animate');
		var tempTile = ce('div', 'k24w-metric-tile');
		tempTile.innerHTML = '<div class="k24w-metric-icon"><i class="fas fa-thermometer-half"></i></div><div class="k24w-metric-value">--°C</div><div class="k24w-metric-label">Temperatura</div>';
		var windTile = ce('div', 'k24w-metric-tile');
		windTile.innerHTML = '<div class="k24w-metric-icon"><i class="fas fa-wind"></i></div><div class="k24w-metric-value">-- m/s</div><div class="k24w-metric-label">Prędkość wiatru</div>';
		var pressureTile = ce('div', 'k24w-metric-tile');
		pressureTile.innerHTML = '<div class="k24w-metric-icon"><i class="fas fa-tachometer-alt"></i></div><div class="k24w-metric-value">-- hPa</div><div class="k24w-metric-label">Ciśnienie</div>';
		var aqiTile = ce('div', 'k24w-metric-tile');
		aqiTile.innerHTML = '<div class="k24w-metric-icon"><i class="fas fa-lungs"></i></div><div class="k24w-metric-value">--</div><div class="k24w-metric-label">Jakość powietrza</div>';
		
		metricsContainer.appendChild(tempTile);
		metricsContainer.appendChild(windTile);
		metricsContainer.appendChild(pressureTile);
		metricsContainer.appendChild(aqiTile);
		root.appendChild(metricsContainer);

		// Tabs
		var tabsContainer = ce('div', 'k24w-tabs k24w-animate');
		var liveTab = ce('button', 'k24w-tab active');
		liveTab.innerHTML = '<i class="fas fa-sun" style="margin-right: 8px;"></i>Bieżąca pogoda';
		var historyTab = ce('button', 'k24w-tab');
		historyTab.innerHTML = '<i class="fas fa-calendar-alt" style="margin-right: 8px;"></i>Historia zdarzeń';
		var forecastTab = ce('button', 'k24w-tab');
		forecastTab.innerHTML = '<i class="fas fa-star" style="margin-right: 8px;"></i>Prognoza';
		var radarTab = ce('button', 'k24w-tab');
		radarTab.innerHTML = '<i class="fas fa-map" style="margin-right: 8px;"></i>Mapa radarowa';
		var detailsTab = ce('button', 'k24w-tab');
		detailsTab.innerHTML = '<i class="fas fa-info-circle" style="margin-right: 8px;"></i>Szczegóły';
		
		tabsContainer.appendChild(liveTab);
		tabsContainer.appendChild(historyTab);
		tabsContainer.appendChild(forecastTab);
		tabsContainer.appendChild(radarTab);
		tabsContainer.appendChild(detailsTab);
		root.appendChild(tabsContainer);

		// Tab functionality
		function switchTab(activeTab) {
			// Remove active class from all tabs
			qsa(tabsContainer, '.k24w-tab').forEach(tab => tab.classList.remove('active'));
			// Add active class to clicked tab
			activeTab.classList.add('active');
			// Load content based on active tab
			loadTabContent(activeTab);
		}

		function loadTabContent(activeTab) {
			if (!state.lat || !state.lon) return;
			
			main.innerHTML = '';
			
			if (activeTab === liveTab) {
				loadLiveWeather();
			} else if (activeTab === historyTab) {
				loadHistoryView();
			} else if (activeTab === forecastTab) {
				loadForecastView();
			} else if (activeTab === radarTab) {
				loadRadarView();
			} else if (activeTab === detailsTab) {
				loadDetailsView();
			}
		}

		liveTab.addEventListener('click', () => switchTab(liveTab));
		historyTab.addEventListener('click', () => switchTab(historyTab));
		forecastTab.addEventListener('click', () => switchTab(forecastTab));
		radarTab.addEventListener('click', () => switchTab(radarTab));
		detailsTab.addEventListener('click', () => switchTab(detailsTab));

		var controls = ce('div','k24w-controls k24w-animate');
		var btnGeo = ce('button','k24w-btn'); btnGeo.type='button'; 
		btnGeo.innerHTML = '<i class="fas fa-map-marker-alt" style="margin-right: 8px;"></i>Użyj mojej lokalizacji';
		var searchWrap = ce('div','k24w-search'); var search = ce('input','k24w-search-input'); search.type='search'; search.placeholder='Wpisz nazwę miejscowości…'; var suggest = ce('div','k24w-suggest'); suggest.style.display='none'; searchWrap.appendChild(search); searchWrap.appendChild(suggest);
		var sel = ce('select','k24w-select'); var opt0=ce('option'); opt0.value=''; opt0.innerHTML = '<i class="fas fa-map-marker-alt" style="margin-right: 8px;"></i>Wybierz najbliższą stację'; sel.appendChild(opt0);
		controls.appendChild(btnGeo); controls.appendChild(searchWrap); controls.appendChild(sel); root.appendChild(controls);

		var layout = ce('div','k24w-layout'); var main = ce('div','k24w-main'); layout.appendChild(main); root.appendChild(layout);
		
		function onCoords(lat, lon, name){ state.lat=lat; state.lon=lon; if(name) state.name=name; try{ localStorage.setItem('k24w:last', JSON.stringify({lat:lat, lon:lon, name: name||''})); }catch(e){} updateHeaderInfo(); updateMetrics(); populateStations(); loadTabContent(liveTab); updateTitle(); }
		function geolocate(){ if (!navigator.geolocation) return; navigator.geolocation.getCurrentPosition(function(pos){ onCoords(pos.coords.latitude, pos.coords.longitude); }, function(){}, {enableHighAccuracy:true, timeout:8000}); }
		btnGeo.addEventListener('click', function(){ geolocate(); }); sel.addEventListener('change', function(){ var v=this.value; if(!v) return; try{ var s=JSON.parse(v); onCoords(parseFloat(s.lat), parseFloat(s.lon)); }catch(e){} });
		search.addEventListener('input', function(){ var q=this.value.trim(); if(q.length<2){ suggest.style.display='none'; suggest.innerHTML=''; return; } geocode(q).then(function(list){ suggest.innerHTML=''; if(!list.length){ suggest.style.display='none'; return; } list.forEach(function(r){ var it=ce('div','k24w-suggest-item'); it.textContent = (r.name||'') + (r.admin1? ', '+r.admin1:'') + (r.country? ', '+r.country:''); it.addEventListener('click', function(){ suggest.style.display='none'; suggest.innerHTML=''; search.value=it.textContent; onCoords(r.latitude, r.longitude, it.textContent); }); }); suggest.style.display='block'; }); });
		document.addEventListener('click', function(e){ if(!searchWrap.contains(e.target)){ suggest.style.display='none'; }});
		
		function updateTitle(){ try { if (state.lat && state.lon) { document.title = 'Pogoda — ' + (state.name? state.name+' ' : state.lat.toFixed(3)+','+state.lon.toFixed(3)+' ') + '| ' + document.title.replace(/^.*?\|\s*/,''); } } catch(e){} }
		function updateHeaderInfo(){ if(state.name) locationInfo.querySelector('.k24w-header-value').textContent = state.name; }
		function updateMetrics(){ if(!state.lat || !state.lon) return; Promise.all([cachedFetch(omForecastUrl(state.lat, state.lon)), cachedFetch(omAirUrl(state.lat, state.lon))]).then(function(results){ var forecast = results[0] || {}; var air = results[1] || {}; var cur = forecast.current || forecast.current_weather || {}; var temp = cur.temperature_2m || cur.temperature; var wind = cur.wind_speed_10m || cur.windspeed; var pressure = cur.pressure_msl; var aqi = air.hourly && air.hourly.european_aqi ? air.hourly.european_aqi[0] : null; if(temp!=null) tempTile.querySelector('.k24w-metric-value').textContent = fmt(temp,'°C'); if(wind!=null) windTile.querySelector('.k24w-metric-value').textContent = fmt(wind,' m/s'); if(pressure!=null) pressureTile.querySelector('.k24w-metric-value').textContent = fmt(pressure,' hPa'); if(aqi!=null) aqiTile.querySelector('.k24w-metric-value').textContent = fmt(aqi,''); }).catch(function(){}); }
		
		function card(title, icon){ var c=ce('div','k24w-card k24w-animate'); var h=ce('h3','k24w-title'); if(icon){ var ico=renderIcon(0, 22, true); ico.firstChild && ico.firstChild.classList.add('k24w-wi--cloud'); h.appendChild(ico); } h.appendChild(document.createTextNode(title)); c.appendChild(h); return c; }
		function populateStations(){ 
			if (!state.lat || !state.lon) return; 
			sel.innerHTML=''; 
			var o=ce('option'); 
			o.value=''; 
			o.innerHTML = '<i class="fas fa-map-marker-alt" style="margin-right: 8px;"></i>Najbliższe stacje IMGW'; 
			sel.appendChild(o); 
			fetchNearestStations(state.lat, state.lon, 8).then(function(list){ 
				(list||[]).forEach(function(s){ 
					var opt=ce('option'); 
					opt.value=JSON.stringify({lat:s.lat,lon:s.lon}); 
					opt.textContent=(s.name||s.type)+' — '+(s.distance_km? s.distance_km.toFixed(1)+' km':'' ); 
					sel.appendChild(opt); 
				}); 
			}).catch(function(){}); 
		}

		// Tab content functions
		function loadLiveWeather() {
			var show = String(props.show||'hourly,daily,alerts,aqi,marine').split(',').reduce(function(a,s){ a[s.trim()]=true; return a; },{});
			
			// Render hero section first (current weather)
			renderHero(main, state.lat, state.lon);
			
			if (show.hourly){ renderHourly(main, state.lat, state.lon); }
			if (show.daily !== false){ 
				var c = card('Prognoza dzienna', 'daily'); 
				c.id='k24w-daily-card'; 
				main.appendChild(c); 
				var grid=ce('div','k24w-grid'); 
				c.appendChild(grid); 
				cachedFetch(omForecastUrl(state.lat, state.lon)).then(function(d){ 
					if (!d || !d.daily) { 
						c.appendChild(document.createTextNode('Brak danych')); 
						return; 
					} 
					var days = d.daily.time || []; 
					for (var i=0;i<Math.min(days.length,7);i++){ 
						var dayDiv = ce('div','k24w-forecast-day'); 
						
						// Left side - Icon and date
						var left = ce('div','k24w-forecast-left'); 
						var iconDiv = ce('div','k24w-forecast-icon'); 
						iconDiv.appendChild(renderIcon(d.daily.weather_code?d.daily.weather_code[i]:null, 32, true)); 
						left.appendChild(iconDiv); 
						
						var dateDiv = ce('div','k24w-forecast-date'); 
						var date = new Date(days[i]); 
						var dayName = ce('div','k24w-forecast-day-name'); 
						dayName.textContent = date.toLocaleDateString('pl-PL', { weekday: 'long' }); 
						var dayDate = ce('div','k24w-forecast-day-date'); 
						dayDate.textContent = date.toLocaleDateString('pl-PL', { month: 'long', day: 'numeric' }); 
						dateDiv.appendChild(dayName); 
						dateDiv.appendChild(dayDate); 
						left.appendChild(dateDiv); 
						dayDiv.appendChild(left); 
						
								// Center - Weather conditions description
		var conditionsDiv = ce('div','k24w-forecast-conditions'); 
		var descDiv = ce('div','k24w-forecast-desc'); 
		var weatherCode = d.daily.weather_code ? d.daily.weather_code[i] : null; 
		descDiv.textContent = getWeatherDescription(weatherCode); 
		conditionsDiv.appendChild(descDiv); 
		
		// Add precipitation probability if available
		if (d.daily.precipitation_probability_max && d.daily.precipitation_probability_max[i] !== null) {
			var precipDiv = ce('div','k24w-forecast-precip');
			precipDiv.innerHTML = '<i class="fas fa-tint" style="margin-right: 4px; color: var(--k24w-primary);"></i>' + 
				(d.daily.precipitation_probability_max[i] || 0) + '%';
			precipDiv.style.fontSize = '12px';
			precipDiv.style.color = 'var(--k24w-muted)';
			conditionsDiv.appendChild(precipDiv);
		}
		
		dayDiv.appendChild(conditionsDiv); 
						
						// Right side - Temperatures
						var tempsDiv = ce('div','k24w-forecast-temps'); 
						var max = d.daily.temperature_2m_max && d.daily.temperature_2m_max[i]; 
						var min = d.daily.temperature_2m_min && d.daily.temperature_2m_min[i]; 
						var minSpan = ce('span','k24w-temp-min'); 
						minSpan.textContent = fmt(min,'°'); 
						tempsDiv.appendChild(minSpan); 
						var maxSpan = ce('span','k24w-temp-max'); 
						maxSpan.textContent = fmt(max,'°'); 
						tempsDiv.appendChild(maxSpan); 
						dayDiv.appendChild(tempsDiv); 
						
						grid.appendChild(dayDiv); 
					} 
				}).catch(function(){ 
					c.appendChild(document.createTextNode('Brak danych')); 
				}); 
			}
			if (show.alerts){ var c2 = card('Ostrzeżenia IMGW', 'alerts'); c2.classList.add('k24w-alert'); main.appendChild(c2); fetchImgwWarnings().then(function(d){ var items = Array.isArray(d) ? d : ([].concat(d.meteo||[], d.hydro||[], d.ostrzezenia||[])); if (!items || !items.length){ c2.appendChild(document.createTextNode('Brak ostrzeżeń')); return; } items.slice(0,6).forEach(function(w){ var r=ce('div','k24w-row'); var level = w.stopien || w["stopień"] || w.level || '1'; r.innerHTML='<div>'+(w.nazwa_zdarzenia||w.zdarzenie||w.event||'Ostrzeżenie')+'</div><div class="k24w-badge" data-level="' + level + '">' + level + '</div>'; c2.appendChild(r); }); }).catch(function(){ c2.appendChild(document.createTextNode('Brak danych')); }); }
			if (show.aqi){ var c3 = card('Jakość powietrza', 'aqi'); main.appendChild(c3); cachedFetch(omAirUrl(state.lat, state.lon)).then(function(d){ if (!d || !d.hourly){ c3.appendChild(document.createTextNode('Brak danych')); return; } var idx = 0; var pm10 = d.hourly.pm10 && d.hourly.pm10[idx]; var pm25 = d.hourly.pm2_5 && d.hourly.pm2_5[idx]; var detailsGrid = ce('div', 'k24w-current-details'); var pm10Item = ce('div', 'k24w-detail-item'); pm10Item.innerHTML = '<div class="k24w-detail-label">PM10</div><div class="k24w-detail-value">' + fmt(pm10,' µg/m³') + '</div>'; detailsGrid.appendChild(pm10Item); var pm25Item = ce('div', 'k24w-detail-item'); pm25Item.innerHTML = '<div class="k24w-detail-label">PM2.5</div><div class="k24w-detail-value">' + fmt(pm25,' µg/m³') + '</div>'; detailsGrid.appendChild(pm25Item); c3.appendChild(detailsGrid); }).catch(function(){ c3.appendChild(document.createTextNode('Brak danych')); }); }
			if (show.marine){ var c4 = card('Morze', 'marine'); main.appendChild(c4); cachedFetch(omMarineUrl(state.lat, state.lon)).then(function(d){ if (!d || !d.hourly) { c4.appendChild(document.createTextNode('Brak danych')); return; } var idx = 0; var wave = d.hourly.wave_height && d.hourly.wave_height[idx]; var detailsGrid = ce('div', 'k24w-current-details'); var waveItem = ce('div', 'k24w-detail-item'); waveItem.innerHTML = '<div class="k24w-detail-label">Wysokość fali</div><div class="k24w-detail-value">' + fmt(wave,' m') + '</div>'; detailsGrid.appendChild(waveItem); c4.appendChild(detailsGrid); }).catch(function(){ c4.appendChild(document.createTextNode('Brak danych')); }); }
		}

		function loadHistoryView() {
			var splitLayout = ce('div', 'k24w-split-layout');
			
			// Left side - Event history table
			var historyCard = card('Historia zdarzeń pogodowych', 'history');
			var historyTable = ce('div');
			historyTable.innerHTML = '<div style="padding: 16px; text-align: center; color: var(--k24w-muted);">Funkcja w trakcie implementacji</div>';
			historyCard.appendChild(historyTable);
			
			// Right side - Interactive map
			var mapCard = card('Mapa zdarzeń', 'map');
			var mapEl = ce('div', 'k24w-map-container');
			mapEl.style.height = '400px';
			mapCard.appendChild(mapEl);
			
			splitLayout.appendChild(historyCard);
			splitLayout.appendChild(mapCard);
			main.appendChild(splitLayout);
			
			// Initialize map
			ensureLeaflet(function(){
				var map = L.map(mapEl, { attributionControl: false }).setView([state.lat, state.lon], 8);
				L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 12 }).addTo(map);
				L.marker([state.lat, state.lon]).addTo(map).bindPopup(state.name || 'Wybrana lokalizacja');
			});
		}

		function loadForecastView() {
			var forecastCard = card('Prognoza długoterminowa', 'forecast');
			var forecastContent = ce('div');
			forecastContent.innerHTML = '<div style="padding: 16px; text-align: center; color: var(--k24w-muted);">Funkcja w trakcie implementacji</div>';
			forecastCard.appendChild(forecastContent);
			main.appendChild(forecastCard);
		}

		function loadRadarView() {
			var radarCard = card('Mapa radarowa', 'radar');
			var mapEl = ce('div', 'k24w-map-container');
			mapEl.style.height = '500px';
			radarCard.appendChild(mapEl);
			main.appendChild(radarCard);
			
			// Initialize radar map
			ensureLeaflet(function(){
				var map = L.map(mapEl, { attributionControl: false }).setView([state.lat, state.lon], 7);
				L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 12 }).addTo(map);
				var rv = L.tileLayer('https://tilecache.rainviewer.com/v2/radar/nowcast_0/512/{z}/{x}/{y}/2/1_1.png', { opacity: 0.6 });
				rv.addTo(map);
			});
		}
		
		function loadDetailsView() {
			var detailsCard = card('Szczegółowe informacje pogodowe', 'details');
			var detailsContent = ce('div');
			
			// Fetch comprehensive weather data
			Promise.all([
				cachedFetch(omForecastUrl(state.lat, state.lon)),
				cachedFetch(omAirUrl(state.lat, state.lon)),
				cachedFetch(omMarineUrl(state.lat, state.lon))
			]).then(function(results) {
				var forecast = results[0] || {};
				var air = results[1] || {};
				var marine = results[2] || {};
				var cur = forecast.current || forecast.current_weather || {};
				
				// Create detailed weather grid
				var detailsGrid = ce('div', 'k24w-current-details');
				
				// Temperature details
				var tempDetails = ce('div', 'k24w-detail-item');
				tempDetails.innerHTML = '<div class="k24w-detail-label">Temperatura odczuwalna</div><div class="k24w-detail-value">' + fmt(cur.apparent_temperature, '°C') + '</div>';
				detailsGrid.appendChild(tempDetails);
				
				// UV Index
				var uvDetails = ce('div', 'k24w-detail-item');
				uvDetails.innerHTML = '<div class="k24w-detail-label">Indeks UV</div><div class="k24w-detail-value">' + fmt(cur.uv_index, '') + '</div>';
				detailsGrid.appendChild(uvDetails);
				
				// Wind direction
				var windDirDetails = ce('div', 'k24w-detail-item');
				windDirDetails.innerHTML = '<div class="k24w-detail-label">Kierunek wiatru</div><div class="k24w-detail-value">' + fmt(cur.wind_direction_10m, '°') + '</div>';
				detailsGrid.appendChild(windDirDetails);
				
				// Visibility
				var visibilityDetails = ce('div', 'k24w-detail-item');
				visibilityDetails.innerHTML = '<div class="k24w-detail-label">Widoczność</div><div class="k24w-detail-value">' + fmt(cur.visibility, ' km') + '</div>';
				detailsGrid.appendChild(visibilityDetails);
				
				// Air quality details
				if (air.hourly && air.hourly.european_aqi) {
					var aqiDetails = ce('div', 'k24w-detail-item');
					aqiDetails.innerHTML = '<div class="k24w-detail-label">Jakość powietrza (AQI)</div><div class="k24w-detail-value">' + fmt(air.hourly.european_aqi[0], '') + '</div>';
					detailsGrid.appendChild(aqiDetails);
				}
				
				// Marine details
				if (marine.hourly && marine.hourly.wave_height) {
					var waveDetails = ce('div', 'k24w-detail-item');
					waveDetails.innerHTML = '<div class="k24w-detail-label">Wysokość fali</div><div class="k24w-detail-value">' + fmt(marine.hourly.wave_height[0], ' m') + '</div>';
					detailsGrid.appendChild(waveDetails);
				}
				
				detailsContent.appendChild(detailsGrid);
			}).catch(function() {
				detailsContent.innerHTML = '<div style="padding: 16px; text-align: center; color: var(--k24w-muted);">Brak danych</div>';
			});
			
			detailsCard.appendChild(detailsContent);
			main.appendChild(detailsCard);
		}
		if (state.lat && state.lon){ onCoords(state.lat, state.lon, state.name); } else { geolocate(); }
	}

	function renderWidget(root, props){ root.innerHTML=''; var view = props.view || 'current'; var wrap = ce('div','k24w-card k24w-animate'); root.appendChild(wrap); var title = ce('h3','k24w-title'); title.textContent = 'Pogoda'; wrap.appendChild(title); var lat = parseFloat(props.lat), lon = parseFloat(props.lon); function fail(){ wrap.appendChild(document.createTextNode('Brak danych')); }
		if (!lat || !lon) { if (navigator.geolocation){ navigator.geolocation.getCurrentPosition(function(pos){ lat=pos.coords.latitude; lon=pos.coords.longitude; load(); }, fail, {enableHighAccuracy:true, timeout:8000}); } else { fail(); } } else { load(); }
		function load(){ if (view==='current'){ cachedFetch(omForecastUrl(lat, lon)).then(function(d){ var t=(d.current||d.current_weather||{}); var tempDiv = ce('div', 'k24w-current-temp'); tempDiv.textContent = fmt(t.temperature_2m||t.temperature,'°C'); wrap.appendChild(tempDiv); }).catch(fail); } else if (view==='daily'){ cachedFetch(omForecastUrl(lat, lon)).then(function(d){ if(!d.daily){ fail(); return;} var days=d.daily.time||[]; for(var i=0;i<Math.min(days.length,3);i++){ var dayDiv = ce('div','k24w-forecast-day'); var left = ce('div','k24w-forecast-left'); left.appendChild(renderIcon(d.daily.weather_code?d.daily.weather_code[i]:null, 28, true)); var dateDiv = ce('div','k24w-forecast-date'); var date = new Date(days[i]); dateDiv.textContent = date.toLocaleDateString('pl-PL', { weekday: 'short', month: 'short', day: 'numeric' }); left.appendChild(dateDiv); dayDiv.appendChild(left); var tempsDiv = ce('div','k24w-forecast-temps'); var max=d.daily.temperature_2m_max[i], min=d.daily.temperature_2m_min[i]; var minSpan = ce('span','k24w-temp-min'); minSpan.textContent = fmt(min,'°'); tempsDiv.appendChild(minSpan); var maxSpan = ce('span','k24w-temp-max'); maxSpan.textContent = fmt(max,'°'); tempsDiv.appendChild(maxSpan); dayDiv.appendChild(tempsDiv); wrap.appendChild(dayDiv);} }).catch(fail); } else if (view==='alerts'){ fetchImgwWarnings().then(function(d){ var items = Array.isArray(d) ? d : ([].concat(d.meteo||[], d.hydro||[], d.ostrzezenia||[])); if(!items.length){ fail(); return;} items.slice(0,3).forEach(function(w){ var r=ce('div','k24w-row'); var level = w.stopien || w["stopień"] || w.level || '1'; r.innerHTML='<div>'+(w.nazwa_zdarzenia||w.zdarzenie||w.event||'Ostrzeżenie')+'</div><div class="k24w-badge" data-level="' + level + '">' + level + '</div>'; wrap.appendChild(r); }); }).catch(fail); } else { fail(); } }
	}

	function hydrate(){ injectStyles(); ensureWeatherIcons(); qsa(document, '.k24w-page').forEach(function(root){ try{ var props=JSON.parse(root.getAttribute('data-props')||'{}'); renderPage(root, props); }catch(e){} }); qsa(document, '.k24w-widget').forEach(function(root){ try{ var props=JSON.parse(root.getAttribute('data-props')||'{}'); renderWidget(root, props); }catch(e){} }); }
	if (document.readyState === 'complete' || document.readyState === 'interactive') { hydrate(); } else { document.addEventListener('DOMContentLoaded', hydrate); }
})();
