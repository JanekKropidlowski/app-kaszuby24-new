import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { MevoMap2 } from '@/components/maps/MevoMap2';
import { useEssentials } from '@/hooks/useEssentials';
import GlobalTabBar from '@/components/GlobalTabBar';
import { useRouter } from 'expo-router';

export default function MevoScreen() {
    const router = useRouter();
    const {
        mevoBikes,
        mevoStations,
        setActiveFilter,
        fetchByViewport,
        loading,
    } = useEssentials();

    // Force active filter to MEVO when mounting this screen
    useEffect(() => {
        if (Platform.OS === 'android') {
            router.replace('/(tabs)/menu');
            return;
        }
        setActiveFilter('MEVO');
    }, [router, setActiveFilter]);

    if (Platform.OS === 'android') {
        return null;
    }

    const handleRefresh = () => {
        // useEssentials triggers refreshes via fetchByViewport or internal timers
        // We can manually trigger a refresh if needed
        setActiveFilter('MEVO');
    };

    return (
        <View style={styles.container}>
            <MevoMap2
                bikes={mevoBikes}
                stations={mevoStations}
                loading={loading}
                onRefresh={handleRefresh}
                onBack={() => router.back()}
            />
            <GlobalTabBar activeTab="menu" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
});
