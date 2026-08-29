import { useMemo, useCallback } from 'react';
import Supercluster from 'supercluster';
import { Region } from 'react-native-maps';
import { Platform } from 'react-native';


export interface MapPoint {
  id: string;
  latitude: number;
  longitude: number;
  type: string;
  [key: string]: any;
}

export interface ClusterFeature {
  type: 'Feature';
  id: number | string;
  properties: {
    cluster: boolean;
    cluster_id?: number;
    point_count?: number;
    point_count_abbreviated?: string;
    type?: string;
    [key: string]: any;
  };
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
}

interface UseMapClusteringProps {
  points: MapPoint[];
  region: Region;
  minZoom?: number;
  maxZoom?: number;
  radius?: number;
  extent?: number;
}

/**
 * Ultra-lightweight clustering hook using Supercluster
 * Optimized for performance on low-end Android and iOS devices
 */
export const useMapClustering = ({
  points,
  region,
  minZoom = 0,
  maxZoom = 20,
  radius = 60,
  extent = 512,
}: UseMapClusteringProps) => {
  // Convert points to GeoJSON features for Supercluster
  const geojsonFeatures = useMemo(() => {
    return points.map((point) => ({
      type: 'Feature' as const,
      properties: {
        cluster: false,
        ...point,
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [point.longitude, point.latitude] as [number, number],
      },
    }));
  }, [points]);

  // Initialize Supercluster instance
  const supercluster = useMemo(() => {
    const cluster = new Supercluster({
      minZoom,
      maxZoom,
      radius,
      extent,
      nodeSize: Platform.OS === 'android' ? 128 : 64, // Larger nodeSize for Android performance
    });

    if (geojsonFeatures.length > 0) {
      cluster.load(geojsonFeatures);
    }

    return cluster;
  }, [geojsonFeatures, minZoom, maxZoom, radius, extent]);

  // Calculate zoom level from region
  const getZoomLevel = useCallback((region: Region): number => {
    const angle = region.longitudeDelta;
    return Math.round(Math.log(360 / angle) / Math.LN2);
  }, []);

  // Get clusters for current viewport
  const clusters = useMemo(() => {
    if (!region || geojsonFeatures.length === 0) {
      return [];
    }

    const zoom = getZoomLevel(region);

    // Calculate bounding box with margin for smoother experience
    const margin = 0.2; // 20% margin
    const bbox: [number, number, number, number] = [
      region.longitude - region.longitudeDelta * (1 + margin),
      region.latitude - region.latitudeDelta * (1 + margin),
      region.longitude + region.longitudeDelta * (1 + margin),
      region.latitude + region.latitudeDelta * (1 + margin),
    ];

    try {
      return supercluster.getClusters(bbox, zoom) as ClusterFeature[];
    } catch (error) {
      console.error('[useMapClustering] Error getting clusters:', error);
      return [];
    }
    // geojsonFeatures is intentionally omitted - supercluster already depends on it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supercluster, region, getZoomLevel]);

  // Get children of a cluster (for expansion)
  const getClusterExpansionRegion = useCallback(
    (clusterId: number): Region | null => {
      try {
        const zoom = getZoomLevel(region);
        const expansionZoom = supercluster.getClusterExpansionZoom(clusterId);
        const children = supercluster.getChildren(clusterId);

        if (children.length === 0) return null;

        // Calculate center of cluster children
        const coordinates = children.map((child) => child.geometry.coordinates);
        const avgLng = coordinates.reduce((sum, coord) => sum + coord[0], 0) / coordinates.length;
        const avgLat = coordinates.reduce((sum, coord) => sum + coord[1], 0) / coordinates.length;

        // Calculate appropriate deltas for the expansion zoom
        const zoomDelta = Math.max(expansionZoom - zoom, 1);
        const newDelta = region.longitudeDelta / Math.pow(2, zoomDelta);

        return {
          latitude: avgLat,
          longitude: avgLng,
          latitudeDelta: newDelta * 1.5,
          longitudeDelta: newDelta * 1.5,
        };
      } catch (error) {
        console.error('[useMapClustering] Error getting cluster expansion region:', error);
        return null;
      }
    },
    [supercluster, region, getZoomLevel]
  );

  // Get leaves (individual points) of a cluster
  const getClusterLeaves = useCallback(
    (clusterId: number, limit = 100, offset = 0) => {
      try {
        return supercluster.getLeaves(clusterId, limit, offset);
      } catch (error) {
        console.error('[useMapClustering] Error getting cluster leaves:', error);
        return [];
      }
    },
    [supercluster]
  );

  return {
    clusters,
    getClusterExpansionRegion,
    getClusterLeaves,
    supercluster,
  };
};
