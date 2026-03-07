import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Dimensions, RefreshControl, ActivityIndicator 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  MapPin, Navigation, Thermometer, Droplets, Wind, 
  Gauge, Eye, CloudRain, Activity, Clock, Info, X,
  TrendingUp, AlertTriangle, Sun, Cloud, Zap, Shield
} from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';
import { LinearGradient } from 'expo-linear-gradient';
import { SynopData, MeteoData, HydroData } from '@/types/weather';
import SwipeableModal from './SwipeableModal';

const { width: screenWidth } = Dimensions.get('window');

interface WeatherStationsModalProps {
  visible: boolean;
  onClose: () => void;
  synopData: SynopData[];
  meteoData: MeteoData[];
  hydroData: HydroData[];
}

export const WeatherStationsModal: React.FC<WeatherStationsModalProps> = ({
  visible,
  onClose,
  synopData,
  meteoData,
  hydroData,
}) => {
  const { theme } = useThemeStore();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'alerts'>('overview');

  const onRefresh = async () => {
    setRefreshing(true);
    // Simulate refresh
    setTimeout(() => setRefreshing(false), 1000);
  };

  const renderTabButton = (tab: 'overview' | 'details' | 'alerts', label: string, icon: React.ReactNode, count?: number) => (
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
      {count !== undefined && (
        <View style={[
          styles.tabCount,
          { backgroundColor: activeTab === tab ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }
        ]}>
          <Text style={[
            styles.tabCountText,
            { color: activeTab === tab ? 'white' : theme.colors.textSecondary }
          ]}>
            {count}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderOverviewTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.overviewContainer}>
        {/* Weather Summary Cards */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Podsumowanie Pogodowe</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <View style={styles.summaryCardHeader}>
                <Sun size={20} color="#F59E0B" />
                <Text style={styles.summaryCardTitle}>Dzisiaj</Text>
              </View>
              <Text style={styles.summaryCardValue}>22°C</Text>
              <Text style={styles.summaryCardDescription}>Słonecznie, wiatr 15 km/h</Text>
            </View>
            
            <View style={styles.summaryCard}>
              <View style={styles.summaryCardHeader}>
                <Cloud size={20} color="#64748B" />
                <Text style={styles.summaryCardTitle}>Jutro</Text>
              </View>
              <Text style={styles.summaryCardValue}>18°C</Text>
              <Text style={styles.summaryCardDescription}>Pochmurno, możliwe opady</Text>
            </View>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Szybkie Statystyki</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Thermometer size={24} color="#EF4444" />
              <Text style={styles.statValue}>22°C</Text>
              <Text style={styles.statLabel}>Temperatura</Text>
            </View>
            
            <View style={styles.statCard}>
              <Droplets size={24} color="#3B82F6" />
              <Text style={styles.statValue}>65%</Text>
              <Text style={styles.statLabel}>Wilgotność</Text>
            </View>
            
            <View style={styles.statCard}>
              <Wind size={24} color="#10B981" />
              <Text style={styles.statValue}>15</Text>
              <Text style={styles.statLabel}>Wiatr km/h</Text>
            </View>
            
            <View style={styles.statCard}>
              <Gauge size={24} color="#8B5CF6" />
              <Text style={styles.statValue}>1013</Text>
              <Text style={styles.statLabel}>hPa</Text>
            </View>
          </View>
        </View>

        {/* Weather Alerts */}
        <View style={styles.alertsSection}>
          <Text style={styles.sectionTitle}>Ostrzeżenia</Text>
          <View style={styles.alertCard}>
            <View style={styles.alertHeader}>
              <AlertTriangle size={20} color="#F59E0B" />
              <Text style={styles.alertTitle}>Uwaga na wiatr</Text>
            </View>
            <Text style={styles.alertDescription}>
              Silne porywy wiatru do 50 km/h w godzinach popołudniowych
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const renderDetailsTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.detailsContainer}>
        <Text style={styles.sectionTitle}>Szczegółowe Informacje</Text>
        
        {/* Temperature Chart Placeholder */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <TrendingUp size={20} color={theme.colors.primary} />
            <Text style={styles.chartTitle}>Trend Temperatury</Text>
          </View>
          <View style={styles.chartPlaceholder}>
            <Text style={styles.chartPlaceholderText}>Wykres temperatury</Text>
          </View>
        </View>

        {/* Hourly Forecast */}
        <View style={styles.hourlySection}>
          <Text style={styles.sectionTitle}>Prognoza Godzinowa</Text>
          <View style={styles.hourlyContainer}>
            {[8, 12, 16, 20].map((hour) => (
              <View key={hour} style={styles.hourlyItem}>
                <Text style={styles.hourlyTime}>{hour}:00</Text>
                <Sun size={20} color="#F59E0B" />
                <Text style={styles.hourlyTemp}>22°C</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const renderAlertsTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.alertsContainer}>
        <Text style={styles.sectionTitle}>Aktywne Ostrzeżenia</Text>
        
        <View style={styles.alertItem}>
          <View style={styles.alertIconContainer}>
            <AlertTriangle size={24} color="#F59E0B" />
          </View>
          <View style={styles.alertContent}>
            <Text style={styles.alertItemTitle}>Ostrzeżenie wiatrowe</Text>
            <Text style={styles.alertItemDescription}>
              Silne porywy wiatru do 50 km/h w godzinach 14:00-18:00
            </Text>
            <Text style={styles.alertItemTime}>Aktywne do 18:00</Text>
          </View>
        </View>

        <View style={styles.alertItem}>
          <View style={styles.alertIconContainer}>
            <CloudRain size={24} color="#3B82F6" />
          </View>
          <View style={styles.alertContent}>
            <Text style={styles.alertItemTitle}>Ostrzeżenie opadowe</Text>
            <Text style={styles.alertItemDescription}>
              Intensywne opady deszczu możliwe w godzinach 16:00-20:00
            </Text>
            <Text style={styles.alertItemTime}>Aktywne do 20:00</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <SwipeableModal
      visible={visible}
      onClose={onClose}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerIconContainer}>
              <Navigation size={24} color={theme.colors.primary} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>Informacje Pogodowe</Text>
              <Text style={styles.subtitle}>Kliknij, aby zobaczyć szczegóły</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          {renderTabButton('overview', 'Przegląd', <Info size={16} />)}
          {renderTabButton('details', 'Szczegóły', <TrendingUp size={16} />)}
          {renderTabButton('alerts', 'Ostrzeżenia', <AlertTriangle size={16} />, 2)}
        </View>

        {/* Tab Content */}
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'details' && renderDetailsTab()}
        {activeTab === 'alerts' && renderAlertsTab()}
      </View>
    </SwipeableModal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Poppins_Bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'Poppins_Regular',
    color: '#64748B',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    gap: 8,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Poppins_SemiBold',
  },
  tabCount: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 20,
    alignItems: 'center',
  },
  tabCountText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Poppins_SemiBold',
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  overviewContainer: {
    gap: 24,
    paddingBottom: 20,
  },
  detailsContainer: {
    gap: 24,
    paddingBottom: 20,
  },
  alertsContainer: {
    gap: 24,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Poppins_SemiBold',
    color: '#1E293B',
    marginBottom: 16,
  },
  summarySection: {
    gap: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  summaryCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Poppins_SemiBold',
    color: '#64748B',
  },
  summaryCardValue: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Poppins_Bold',
    color: '#1E293B',
    marginBottom: 8,
  },
  summaryCardDescription: {
    fontSize: 12,
    fontWeight: '400',
    fontFamily: 'Poppins_Regular',
    color: '#64748B',
    lineHeight: 16,
  },
  statsSection: {
    gap: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '47%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Poppins_Bold',
    color: '#1E293B',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Poppins_Medium',
    color: '#64748B',
    textAlign: 'center',
  },
  alertsSection: {
    gap: 16,
  },
  alertCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins_SemiBold',
    color: '#92400E',
  },
  alertDescription: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'Poppins_Regular',
    color: '#92400E',
    lineHeight: 20,
  },
  chartCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    fontFamily: 'Poppins_SemiBold',
    color: '#1E293B',
  },
  chartPlaceholder: {
    height: 120,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chartPlaceholderText: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'Poppins_Regular',
    color: '#64748B',
  },
  hourlySection: {
    gap: 16,
  },
  hourlyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  hourlyItem: {
    alignItems: 'center',
    gap: 8,
  },
  hourlyTime: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Poppins_Medium',
    color: '#64748B',
  },
  hourlyTemp: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins_SemiBold',
    color: '#1E293B',
  },
  alertItem: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 16,
  },
  alertIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertContent: {
    flex: 1,
  },
  alertItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins_SemiBold',
    color: '#1E293B',
    marginBottom: 8,
  },
  alertItemDescription: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'Poppins_Regular',
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 8,
  },
  alertItemTime: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Poppins_Medium',
    color: '#64748B',
  },
});

