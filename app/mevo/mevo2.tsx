import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { MevoMap2 } from '@/components/maps/MevoMap2';
import { useEssentials } from '@/hooks/useEssentials';
import GlobalTabBar from '@/components/GlobalTabBar';
import { useRouter } from 'expo-router';

export default function Mevo2Screen() {
  const router = useRouter();
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
    fetchMevoBikes,
    loading,
    areEssentialsLoading,
  } = useEssentials();

  // Załaduj dane MEVO przy wejściu na ekran (jednorazowo - setActiveFilter/fetchMevoBikes nie są stable refs)
  useEffect(() => {
    if (Platform.OS === 'android') {
      router.replace('/(tabs)/menu');
      return;
    }
    setActiveFilter('MEVO');
    fetchMevoBikes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  if (Platform.OS === 'android') {
    return null;
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DC2626" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MevoMap2
        bikes={mevoBikes}
        stations={mevoStations}
        loading={areEssentialsLoading}
      />
      <GlobalTabBar activeTab="menu" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
