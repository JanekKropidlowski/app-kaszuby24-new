import React from 'react';
import { View, Text, StyleSheet, Platform, Image } from 'react-native';

const AM_CL_Y = Platform.OS === 'android' ? {
    c1: require('@/assets/images/markers/cluster_y_1.png'),
    c2: require('@/assets/images/markers/cluster_y_2.png'),
    c3: require('@/assets/images/markers/cluster_y_3.png'),
    c4: require('@/assets/images/markers/cluster_y_4.png'),
    c5: require('@/assets/images/markers/cluster_y_5.png'),
    c6: require('@/assets/images/markers/cluster_y_6.png'),
    c7: require('@/assets/images/markers/cluster_y_7.png'),
    c8: require('@/assets/images/markers/cluster_y_8.png'),
    c9: require('@/assets/images/markers/cluster_y_9.png'),
    c10p: require('@/assets/images/markers/cluster_y_10p.png'),
    c50p: require('@/assets/images/markers/cluster_y_50p.png'),
    c100p: require('@/assets/images/markers/cluster_y_100p.png'),
} : null;


// SKM Marker - Darker Yellow Circle with Black Border
export const SKMMarker = React.memo(({ size = 22 }: { size?: number }) => (
    <View style={[styles.skmMarker, { width: size, height: size, borderRadius: size / 2 }]} />
));

// Cluster Marker - White Circle with Black Border and Text (as previously implemented, or darker yellow?)
// User said: "markery jako kola" (markers as circles) "musz byc na zolto ale cimniejszy" (must be yellow but darker)
// I will apply the darker yellow to both for consistency, or keep clusters distinctive.
// Let's make clusters consistent with SKM identity: Darker Yellow background, Black text.

export const getYellowClusterImage = (count: number) => {
    if (!AM_CL_Y) return null;
    let img = AM_CL_Y.c100p;
    if (count < 10) {
        const key = `c${count}` as keyof typeof AM_CL_Y;
        img = AM_CL_Y[key] || AM_CL_Y.c1;
    } else if (count < 50) {
        img = AM_CL_Y.c10p;
    } else if (count < 100) {
        img = AM_CL_Y.c50p;
    }
    return img;
};

export const ClusterMarker = React.memo(({ count, size = 40 }: { count: number; size?: number }) => {
    // Na Androidzie renderuje null, bo obrazek przekazujemy bezpośrednio do propy 'icon' w TransportMap.tsx
    if (Platform.OS === 'android') {
        return null;
    }
    return (
        <View style={[styles.clusterMarker, { width: size, height: size, borderRadius: size / 2 }]}>
            <Text style={styles.clusterText}>{count}</Text>
        </View>
    );
});

// PolRegio Marker - Navy Blue with White/Light Blue border
export const PolRegioMarker = React.memo(({ size = 22 }: { size?: number }) => (
    <View style={[styles.polRegioMarker, { width: size, height: size, borderRadius: size / 2 }]} />
));

// Combined Marker (SKM + PolRegio) - Half Yellow, Half Blue or Gradient-like
export const CombinedMarker = React.memo(({ size = 26 }: { size?: number }) => (
    <View style={[styles.combinedMarker, { width: size, height: size, borderRadius: size / 2 }]}>
        <View style={styles.combinedLeft} />
        <View style={styles.combinedRight} />
    </View>
));

const styles = StyleSheet.create({
    skmMarker: {
        backgroundColor: '#FFB300', // Darker yellow/Amber
        borderWidth: 2,
        borderColor: '#000000',
    },
    clusterMarker: {
        backgroundColor: '#FFB300', // Matching darker yellow
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#000000',
    },
    clusterText: {
        color: '#000000',
        fontSize: 15,
        fontWeight: '700',
        fontFamily: 'Poppins-Bold',
    },
    polRegioMarker: {
        backgroundColor: '#003399', // Navy Blue (PolRegio brand-ish)
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    combinedMarker: {
        flexDirection: 'row',
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#000000',
    },
    combinedLeft: {
        flex: 1,
        backgroundColor: '#FFB300', // SKM Yellow
    },
    combinedRight: {
        flex: 1,
        backgroundColor: '#003399', // PolRegio Blue
    },
});
