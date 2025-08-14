import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Dimensions, StatusBar, RefreshControl 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  BarChart3, TrendingUp, Calendar, Clock, Thermometer, 
  Droplets, Wind, Gauge, Eye, Sun, CloudRain, Activity
} from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';
import { LinearGradient } from 'expo-linear-gradient';
import { SynopData, MeteoData, HydroData } from '@/types/weather';
import SwipeableModal from './SwipeableModal';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface WeatherChartsModalProps {
  visible: boolean;
  onClose: () => void;
  synopData: SynopData[];
  meteoData: MeteoData[];
  hydroData: HydroData[];
  forecastData?: any;
}

export const WeatherChartsModal: React.FC<WeatherChartsModalProps> = ({
  visible,
  onClose,
  synopData,
  meteoData,
  hydroData,
  forecastData,
}) => {
  const { theme } = useThemeStore();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'temperature' | 'precipitation' | 'wind' | 'pressure'>('temperature');

  const onRefresh = async () => {
    setRefreshing(true);
    // Simulate refresh
    setTimeout(() => setRefreshing(false), 1000);
  };

  const renderTabButton = (tab: 'temperature' | 'precipitation' | 'wind' | 'pressure', label: string, icon: React.ReactNode) => (
    <TouchableOpacity
      key={tab}
      style={[
        styles.tabButton,
        activeTab === tab && { backgroundColor: theme.colors.primary }
      ]}
      onPress={() => setActiveTab(tab)}
    >
      {icon}
      <Text style={[
        styles.tabLabel,
        { color: activeTab === tab ? 'white' : theme.colors.textSecondary }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderChartContent = () => {
    switch (activeTab) {
      case 'temperature':
        return (
          <View style={styles.chartContainer}>
            <View style={styles.chartHeader}>
              <Thermometer size={24} color={theme.colors.primary} />
              <Text style={[styles.chartTitle, { color: theme.colors.text }]}>
                Temperatura w czasie
              </Text>
            </View>
            <View style={styles.chartPlaceholder}>
              <Text style={[styles.placeholderText, { color: theme.colors.textSecondary }]}>
                Wykres temperatury
              </Text>
              <Text style={[styles.placeholderSubtext, { color: theme.colors.textSecondary }]}>
                Dane będą dostępne wkrótce
              </Text>
            </View>
          </View>
        );
      
      case 'precipitation':
        return (
          <View style={styles.chartContainer}>
            <View style={styles.chartHeader}>
              <CloudRain size={24} color={theme.colors.primary} />
              <Text style={[styles.chartTitle, { color: theme.colors.text }]}>
                Opady atmosferyczne
              </Text>
            </View>
            <View style={styles.chartPlaceholder}>
              <Text style={[styles.placeholderText, { color: theme.colors.textSecondary }]}>
                Wykres opadów
              </Text>
              <Text style={[styles.placeholderSubtext, { color: theme.colors.textSecondary }]}>
                Dane będą dostępne wkrótce
              </Text>
            </View>
          </View>
        );
      
      case 'wind':
        return (
          <View style={styles.chartContainer}>
            <View style={styles.chartHeader}>
              <Wind size={24} color={theme.colors.primary} />
              <Text style={[styles.chartTitle, { color: theme.colors.text }]}>
                Prędkość i kierunek wiatru
              </Text>
            </View>
            <View style={styles.chartPlaceholder}>
              <Text style={[styles.placeholderText, { color: theme.colors.textSecondary }]}>
                Wykres wiatru
              </Text>
              <Text style={[styles.placeholderSubtext, { color: theme.colors.textSecondary }]}>
                Dane będą dostępne wkrótce
              </Text>
            </View>
          </View>
        );
      
      case 'pressure':
        return (
          <View style={styles.chartContainer}>
            <View style={styles.chartHeader}>
              <Gauge size={24} color={theme.colors.primary} />
              <Text style={[styles.chartTitle, { color: theme.colors.text }]}>
                Ciśnienie atmosferyczne
              </Text>
            </View>
            <View style={styles.chartPlaceholder}>
              <Text style={[styles.placeholderText, { color: theme.colors.textSecondary }]}>
                Wykres ciśnienia
              </Text>
              <Text style={[styles.placeholderSubtext, { color: theme.colors.textSecondary }]}>
                Dane będą dostępne wkrótce
              </Text>
            </View>
          </View>
        );
      
      default:
        return null;
    }
  };

  return (
    <SwipeableModal
      visible={visible}
      onClose={onClose}
      title="Wykresy pogodowe"
      showCloseButton={true}
    >
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          {renderTabButton('temperature', 'Temperatura', <Thermometer size={18} />)}
          {renderTabButton('precipitation', 'Opady', <CloudRain size={18} />)}
          {renderTabButton('wind', 'Wiatr', <Wind size={18} />)}
          {renderTabButton('pressure', 'Ciśnienie', <Gauge size={18} />)}
        </View>

        {/* Chart Content */}
        {renderChartContent()}

        {/* Data Summary */}
        <View style={styles.summaryContainer}>
          <Text style={[styles.summaryTitle, { color: theme.colors.text }]}>
            Podsumowanie danych
          </Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                Stacje SYNOP
              </Text>
              <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
                {synopData?.length || 0}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                Stacje meteo
              </Text>
              <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
                {meteoData?.length || 0}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                Stacje hydro
              </Text>
              <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
                {hydroData?.length || 0}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SwipeableModal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    gap: 6,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  chartContainer: {
    marginBottom: 24,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  chartPlaceholder: {
    height: 200,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  placeholderText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  placeholderSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  summaryContainer: {
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 12,
    marginHorizontal: 4,
  },
  summaryLabel: {
    fontSize: 12,
    marginBottom: 4,
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '600',
  },
});

export default WeatherChartsModal;

