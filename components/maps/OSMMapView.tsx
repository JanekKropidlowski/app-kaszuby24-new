import React, { useRef, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface OSMMarker {
  id: string;
  latitude: number;
  longitude: number;
  color: string; // hex np. '#EF4444'
  title?: string;
  subtitle?: string;
  icon?: 'hospital' | 'pharmacy' | 'aed' | 'bike' | 'station' | 'default';
}

export interface OSMMapViewProps {
  markers: OSMMarker[];
  initialLat?: number;
  initialLon?: number;
  initialZoom?: number;
  onMarkerPress?: (id: string) => void;
  style?: any;
  showUserLocation?: boolean;
}

// ─── HTML generowany inline (Leaflet 1.9.4 z CDN + MarkerCluster) ─────────────

const buildHtml = (
  markers: OSMMarker[],
  initialLat: number,
  initialLon: number,
  initialZoom: number,
  showUserLocation: boolean,
): string => {
  const markersJson = JSON.stringify(
    markers.map(m => ({
      id: m.id,
      lat: m.latitude,
      lon: m.longitude,
      color: m.color,
      title: m.title || '',
      subtitle: m.subtitle || '',
      icon: m.icon || 'default',
    })),
  );

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100vw; height: 100vh; overflow: hidden; }
    #map { width: 100vw; height: 100vh; }
    .leaflet-container { background: #e8e0d8; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>
  <script>
    var map = L.map('map', {
      zoomControl: true,
      attributionControl: false,
    }).setView([${initialLat}, ${initialLon}], ${initialZoom});

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    var markers = ${markersJson};

    var cluster = L.markerClusterGroup({
      maxClusterRadius: 60,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: function(c) {
        var count = c.getChildCount();
        var size = count < 10 ? 34 : count < 50 ? 40 : 48;
        return L.divIcon({
          html: '<div style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:#1E3A5F;border:2px solid #fff;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;font-size:13px;box-shadow:0 2px 6px rgba(0,0,0,0.3);">' + count + '</div>',
          className: '',
          iconSize: [size, size],
          iconAnchor: [size/2, size/2],
        });
      }
    });

    markers.forEach(function(m) {
      var circleIcon = L.divIcon({
        html: '<div style="width:24px;height:24px;border-radius:50%;background:' + m.color + ';border:2px solid #fff;box-shadow:0 2px 5px rgba(0,0,0,0.35);"></div>',
        className: '',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -14],
      });

      var marker = L.marker([m.lat, m.lon], { icon: circleIcon });
      marker.on('click', function() {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'markerPress', id: m.id }));
        }
      });
      if (m.title) {
        marker.bindTooltip(m.title, { permanent: false, direction: 'top', offset: [0, -14] });
      }
      cluster.addLayer(marker);
    });

    map.addLayer(cluster);

    ${showUserLocation ? `
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(function(pos) {
        var lat = pos.coords.latitude;
        var lon = pos.coords.longitude;
        if (!window._userMarker) {
          var userIcon = L.divIcon({
            html: '<div style="width:16px;height:16px;border-radius:50%;background:#3B82F6;border:3px solid #fff;box-shadow:0 0 0 3px rgba(59,130,246,0.3);"></div>',
            className: '',
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          });
          window._userMarker = L.marker([lat, lon], { icon: userIcon, zIndexOffset: 1000 }).addTo(map);
        } else {
          window._userMarker.setLatLng([lat, lon]);
        }
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'userLocation', lat: lat, lon: lon }));
        }
      }, null, { enableHighAccuracy: true, maximumAge: 5000 });
    }
    ` : ''}
  </script>
</body>
</html>`;
};

// ─── Component ─────────────────────────────────────────────────────────────────

export const OSMMapView: React.FC<OSMMapViewProps> = ({
  markers,
  initialLat = 54.372,
  initialLon = 18.638,
  initialZoom = 11,
  onMarkerPress,
  style,
  showUserLocation = false,
}) => {
  const webViewRef = useRef<WebView>(null);

  const html = React.useMemo(
    () => buildHtml(markers, initialLat, initialLon, initialZoom, showUserLocation),
    // Przebuduj HTML tylko gdy markery lub region startowy się zmienią
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(markers), initialLat, initialLon, initialZoom, showUserLocation],
  );

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const msg = JSON.parse(event.nativeEvent.data);
        if (msg.type === 'markerPress' && onMarkerPress) {
          onMarkerPress(msg.id);
        }
      } catch {
        // ignoruj niepoprawne wiadomości
      }
    },
    [onMarkerPress],
  );

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef}
        source={{ html }}
        style={styles.webView}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        geolocationEnabled={showUserLocation}
        originWhitelist={['*']}
        mixedContentMode="always"
        // Wyłącz scroll WebView — mapa obsługuje gesty sama
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  webView: { flex: 1 },
});
