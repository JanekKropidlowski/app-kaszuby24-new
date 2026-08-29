import React, { useEffect, useState, useCallback, useRef } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import Supercluster from 'supercluster';
import { GeoJSONFeature, Shape } from './types';
import { SKMMarker, ClusterMarker, PolRegioMarker, CombinedMarker, getYellowClusterImage } from './MapMarkers';

interface TransportMapProps {
    allStops: GeoJSONFeature[];
    shapes: Shape[];
    showTracks: boolean;
    onStopPress: (stop: GeoJSONFeature) => void;
    initialRegion: Region;
    onRegionChange?: (region: Region) => void;
}

const INITIAL_REGION = {
    latitude: 54.4448,
    longitude: 18.5715,
    latitudeDelta: 0.3,
    longitudeDelta: 0.3,
};

export const TransportMap = ({
    allStops,
    shapes,
    showTracks,
    onStopPress,
    initialRegion,
    onRegionChange
}: TransportMapProps) => {
    const mapRef = useRef<MapView>(null);
    const [visibleMarkers, setVisibleMarkers] = useState<any[]>([]);
    const [region, setRegion] = useState(initialRegion || INITIAL_REGION);
    const clusterIndex = useRef<Supercluster | null>(null);
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);

    // Initialize Supercluster with larger radius for better performance
    useEffect(() => {
        const index = new Supercluster({
            radius: 60,
            maxZoom: 16,
        });

        const points = allStops.map(stop => ({
            type: 'Feature' as const,
            properties: {
                cluster: false,
                ...stop.properties,
            },
            geometry: {
                type: 'Point' as const,
                coordinates: stop.geometry.coordinates,
            },
        }));

        index.load(points as any);
        clusterIndex.current = index;
        updateView(region);
    }, [allStops]);

    const updateView = useCallback((newRegion: Region) => {
        if (!clusterIndex.current) return;

        const bbox: [number, number, number, number] = [
            newRegion.longitude - newRegion.longitudeDelta / 1.5,
            newRegion.latitude - newRegion.latitudeDelta / 1.5,
            newRegion.longitude + newRegion.longitudeDelta / 1.5,
            newRegion.latitude + newRegion.latitudeDelta / 1.5,
        ];

        const zoom = Math.round(Math.log(360 / newRegion.longitudeDelta) / Math.LN2);
        const clusters = clusterIndex.current.getClusters(bbox, zoom);

        setVisibleMarkers(clusters);
    }, []);

    const onRegionChangeComplete = useCallback((newRegion: Region) => {
        setRegion(newRegion);
        if (onRegionChange) onRegionChange(newRegion);

        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            updateView(newRegion);
        }, 150);
    }, [updateView, onRegionChange]);

    const handleMarkerPress = useCallback((marker: any) => {
        if (marker.properties.cluster) {
            const clusterId = marker.properties.cluster_id;
            const expansionZoom = clusterIndex.current?.getClusterExpansionZoom(clusterId);

            if (mapRef.current && expansionZoom) {
                mapRef.current.animateToRegion({
                    latitude: marker.geometry.coordinates[1],
                    longitude: marker.geometry.coordinates[0],
                    latitudeDelta: region.latitudeDelta / 2,
                    longitudeDelta: region.longitudeDelta / 2,
                }, 400);
            }
        } else {
            const stopFeature: GeoJSONFeature = {
                type: 'Feature',
                geometry: marker.geometry,
                properties: marker.properties
            };
            onStopPress(stopFeature);
        }
    }, [region, onStopPress]);

    // OPTIMIZATION: Viewport-based shape (Polyline) filtering
    const renderedTracks = React.useMemo(() => {
        if (!showTracks || shapes.length === 0) return null;

        const pad = region.latitudeDelta;
        const viewportBBox = {
            minLat: region.latitude - region.latitudeDelta - pad,
            maxLat: region.latitude + region.latitudeDelta + pad,
            minLon: region.longitude - region.longitudeDelta - pad,
            maxLon: region.longitude + region.longitudeDelta + pad,
        };

        return shapes
            .filter(shape => {
                const firstPoint = shape.points[0];
                if (!firstPoint) return false;
                return (
                    firstPoint.lat >= viewportBBox.minLat &&
                    firstPoint.lat <= viewportBBox.maxLat &&
                    firstPoint.lon >= viewportBBox.minLon &&
                    firstPoint.lon <= viewportBBox.maxLon
                );
            })
            .map(shape => (
                <Polyline
                    key={shape.id}
                    coordinates={shape.points.map(p => ({ latitude: p.lat, longitude: p.lon }))}
                    strokeColor="#FFC107"
                    strokeWidth={4}
                    lineCap="round"
                    lineJoin="round"
                    tappable={false}
                />
            ));
    }, [shapes, showTracks, region]);

    return (
        <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={initialRegion || INITIAL_REGION}
            onRegionChangeComplete={onRegionChangeComplete}
            showsUserLocation
            showsMyLocationButton={false}
            loadingEnabled={false}
            moveOnMarkerPress={false}
            rotateEnabled={false}
            pitchEnabled={false}
            toolbarEnabled={false}
            provider={PROVIDER_GOOGLE}
            customMapStyle={[
                {
                    "featureType": "poi",
                    "elementType": "labels",
                    "stylers": [{ "visibility": "off" }]
                },
                {
                    "featureType": "transit",
                    "elementType": "labels",
                    "stylers": [{ "visibility": "off" }]
                }
            ]}
        >
            {renderedTracks}

            {visibleMarkers.map((marker) => {
                const isCluster = marker.properties.cluster;
                const coords = marker.geometry.coordinates;
                const uid = isCluster ? `cluster-${marker.properties.cluster_id}` : marker.properties.uid;

                return (
                    <Marker
                        key={uid}
                        coordinate={{
                            latitude: coords[1],
                            longitude: coords[0],
                        }}
                        onPress={() => handleMarkerPress(marker)}
                        tracksViewChanges={false}
                        anchor={{ x: 0.5, y: 0.5 }}
                        icon={isCluster && Platform.OS === 'android' ? getYellowClusterImage(marker.properties.point_count) : undefined}
                    >
                        {isCluster ? (
                            Platform.OS === 'android' ? null : <ClusterMarker count={marker.properties.point_count} />
                        ) : marker.properties.agencies?.length > 1 ? (
                            <CombinedMarker size={26} />
                        ) : marker.properties.agency === 'polregio' ? (
                            <PolRegioMarker size={24} />
                        ) : (
                            <SKMMarker />
                        )}
                    </Marker>
                );
            })}
        </MapView>
    );
};

const styles = StyleSheet.create({
    map: {
        flex: 1,
    }
});
