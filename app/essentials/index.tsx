import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { SorMap } from '@/components/essentials/SorMap';
import { useEssentials } from '@/hooks/useEssentials';
import GlobalTabBar from '@/components/GlobalTabBar';

export default function EssentialsScreen() {
    const {
        hospitals,
        aedPoints,
        generalHospitals,
        pharmacies,
        mevoBikes,
        mevoStations,
        activeFilter,
        setActiveFilter,
        fetchByViewport,
        loading,
        areEssentialsLoading
    } = useEssentials();

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#EF4444" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <SorMap
                hospitals={hospitals}
                aedPoints={aedPoints}
                generalHospitals={generalHospitals}
                pharmacies={pharmacies}
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
                fetchByViewport={fetchByViewport}
                areEssentialsLoading={areEssentialsLoading}
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
