import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SorMap } from '@/components/essentials/SorMap';
import { useEssentials, FilterType } from '@/hooks/useEssentials';
import GlobalTabBar from '@/components/GlobalTabBar';

const VALID_FILTERS: FilterType[] = ['ALL', 'SOR', 'AED', 'HOSPITAL', 'PHARMACY', 'MEDICAL', 'MEVO'];

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

    // Preselekcja zakładki z deeplinka: /essentials?filter=AED|SOR|... (np. z kaszuby24.pl/aed)
    const { filter } = useLocalSearchParams<{ filter?: string }>();
    React.useEffect(() => {
        const f = (filter || '').toUpperCase() as FilterType;
        if (filter && VALID_FILTERS.includes(f)) {
            setActiveFilter(f);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filter]);

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
