import React, { memo } from 'react';
import { View, Text, StyleSheet, Platform, Image } from 'react-native';
import { Marker } from 'react-native-maps';

// ─── DEBUG: ustaw true żeby zobaczyć granice wrapperów markerów ───────────────
const DEBUG_MARKERS = false;

interface ClusterMarkerProps {
  latitude: number;
  longitude: number;
  pointCount: number;
  onPress: () => void;
  color?: string;
  // Parent przekazuje true na starcie, false po wyrenderowaniu (~2s)
  // Bez tego Android snapshot-uje marker zanim layout jest gotowy → "trójkąt"
  tracksViewChanges?: boolean;
}

// ─── Android Cluster PNGs ───────────────────────────────────────────────────
const AM_CLUSTERS = Platform.OS === 'android' ? {
  c1: require('@/assets/images/markers/cluster_1.png'),
  c2: require('@/assets/images/markers/cluster_2.png'),
  c3: require('@/assets/images/markers/cluster_3.png'),
  c4: require('@/assets/images/markers/cluster_4.png'),
  c5: require('@/assets/images/markers/cluster_5.png'),
  c6: require('@/assets/images/markers/cluster_6.png'),
  c7: require('@/assets/images/markers/cluster_7.png'),
  c8: require('@/assets/images/markers/cluster_8.png'),
  c9: require('@/assets/images/markers/cluster_9.png'),
  c10p: require('@/assets/images/markers/cluster_10p.png'),
  c50p: require('@/assets/images/markers/cluster_50p.png'),
  c100p: require('@/assets/images/markers/cluster_100p.png'),
} : null;

/**
 * Ultra-lightweight cluster marker component
 * Memoized for maximum performance
 */
const ClusterMarkerComponent: React.FC<ClusterMarkerProps> = ({
  latitude,
  longitude,
  pointCount,
  onPress,
  color = '#3B82F6',
  tracksViewChanges = true,
}) => {
  // Calculate size based on point count
  const getClusterSize = (count: number): number => {
    if (count < 10) return 30;
    if (count < 50) return 38;
    if (count < 100) return 46;
    return 54;
  };

  const size = getClusterSize(pointCount);
  const fontSize = size < 50 ? 14 : size < 60 ? 16 : 18;

  // Format point count for display
  const formatPointCount = (count: number): string => {
    if (count < 1000) return count.toString();
    if (count < 10000) return `${(count / 1000).toFixed(1)}k`;
    return `${Math.floor(count / 1000)}k`;
  };

  // NO-OP: Using the standard View-based markers for consistency and easier styling
  // until clipping is fully resolved via wrapper padding.
  // if (Platform.OS === 'android' && AM_CLUSTERS) { ... }


  return (
    <Marker
      coordinate={{ latitude, longitude }}
      onPress={onPress}
      tracksViewChanges={tracksViewChanges}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      {/* Transparentny wrapper z paddingiem — zapobiega przycinaniu okręgu przez Androida */}
      <View collapsable={false} style={[styles.outerWrapper, DEBUG_MARKERS && styles.debugWrapper]}>
        <View
          collapsable={false}
          style={[
            styles.clusterContainer,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}
        >
          <View
            collapsable={false}
            style={[
              styles.clusterInner,
              {
                backgroundColor: color,
                width: size - 6,
                height: size - 6,
                borderRadius: (size - 6) / 2,
              },
            ]}
          >
            <Text
              style={[
                styles.clusterText,
                { fontSize },
              ]}
              numberOfLines={1}
            >
              {formatPointCount(pointCount)}
            </Text>
          </View>
        </View>
      </View>
    </Marker>
  );
};

const styles = StyleSheet.create({
  // Transparentny bufor — Android przycina elevation/cień do granic widoku bez tego wrappera
  outerWrapper: {
    padding: 24, // Increased significantly to prevent clipping of large clusters
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Debug: żółta ramka pokazuje granice wrappera
  debugWrapper: {
    backgroundColor: 'rgba(255,255,0,0.25)',
    borderWidth: 1,
    borderColor: 'yellow',
  },
  clusterContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
        borderWidth: 1,
        borderColor: '#f0f0f0',
      },
    }),
  },
  clusterInner: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  clusterText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});


// Memoize to prevent unnecessary re-renders
export const ClusterMarker = memo(
  ClusterMarkerComponent,
  (prevProps, nextProps) =>
    prevProps.latitude === nextProps.latitude &&
    prevProps.longitude === nextProps.longitude &&
    prevProps.pointCount === nextProps.pointCount &&
    prevProps.color === nextProps.color &&
    prevProps.tracksViewChanges === nextProps.tracksViewChanges
);
