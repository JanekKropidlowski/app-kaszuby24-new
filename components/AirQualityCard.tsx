import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Wind, AlertCircle, Activity, Eye, Cloud, Leaf } from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';
import { LinearGradient } from 'expo-linear-gradient';

interface AirQualityCardProps {
  airQuality: {
    hourly: {
      pm10: number[];
      pm2_5: number[];
      time: string[];
    };
    daily?: {
      pm10: number[];
      pm2_5: number[];
      time: string[];
    };
  };
  onPress?: () => void;
}

export const AirQualityCard: React.FC<AirQualityCardProps> = ({ airQuality, onPress }) => {
  const { theme } = useThemeStore();
  
  if (!theme || !airQuality || !airQuality.hourly) {
    return null;
  }
  
  const styles = getStyles(theme);
  
  const getAQILevel = (pm25: number, pm10: number) => {
    const aqi = Math.max(pm25, pm10);
    if (aqi <= 20) return { level: 'Dobra', color: '#10b981', description: 'Powietrze jest czyste' };
    if (aqi <= 50) return { level: 'Umiarkowana', color: '#f59e0b', description: 'Jakość powietrza jest akceptowalna' };
    if (aqi <= 100) return { level: 'Niezdrowa', color: '#ef4444', description: 'Może wpływać na zdrowie' };
    if (aqi <= 150) return { level: 'Bardzo niezdrowa', color: '#dc2626', description: 'Może powodować problemy zdrowotne' };
    return { level: 'Niebezpieczna', color: '#7c2d12', description: 'Unikaj przebywania na zewnątrz' };
  };

  const currentPM25 = airQuality.hourly.pm2_5?.[0] || 0;
  const currentPM10 = airQuality.hourly.pm10?.[0] || 0;
  const aqiInfo = getAQILevel(currentPM25, currentPM10);

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
      <LinearGradient colors={['#1e40af', '#3b82f6']} style={styles.gradient}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Wind size={24} color="#fff" />
            <Text style={styles.title}>Jakość powietrza</Text>
          </View>
          <View style={[styles.aqiBadge, { backgroundColor: `${aqiInfo.color}30` }]}>
            <Text style={[styles.aqiText, { color: aqiInfo.color }]}>
              {aqiInfo.level}
            </Text>
          </View>
        </View>

        <View style={styles.aqiContainer}>
          <Text style={styles.aqiValue}>
            {Math.max(currentPM25, currentPM10).toFixed(0)}
          </Text>
          <Text style={styles.aqiLabel}>AQI</Text>
        </View>

        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Activity size={20} color="#fff" />
            <Text style={styles.metricLabel}>PM2.5</Text>
            <Text style={styles.metricValue}>{currentPM25.toFixed(1)}</Text>
          </View>

          <View style={styles.metricCard}>
            <Cloud size={20} color="#fff" />
            <Text style={styles.metricLabel}>PM10</Text>
            <Text style={styles.metricValue}>{currentPM10.toFixed(1)}</Text>
          </View>
        </View>

        <View style={styles.descriptionContainer}>
          <Text style={styles.descriptionText}>{aqiInfo.description}</Text>
        </View>

        <View style={styles.additionalInfo}>
          <View style={styles.infoItem}>
            <Eye size={16} color="#fff" />
            <Text style={styles.infoText}>
              Widoczność: {aqiInfo.level === 'Dobra' ? 'Dobra' : 'Ograniczona'}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Leaf size={16} color="#fff" />
            <Text style={styles.infoText}>
              Wpływ na zdrowie: {aqiInfo.level === 'Dobra' ? 'Minimalny' : 'Możliwy'}
            </Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const getStyles = (theme: any) => StyleSheet.create({
  container: {
    borderRadius: 20,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  gradient: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontFamily: 'Poppins_Bold',
    fontSize: 20,
    color: '#fff',
  },
  aqiBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  aqiText: {
    fontFamily: 'Poppins_Bold',
    fontSize: 12,
  },
  aqiContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  aqiValue: {
    fontFamily: 'Poppins_Bold',
    fontSize: 48,
    color: '#fff',
    lineHeight: 56,
  },
  aqiLabel: {
    fontFamily: 'Poppins_Medium',
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  metricLabel: {
    fontFamily: 'Poppins_Medium',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
    marginBottom: 4,
  },
  metricValue: {
    fontFamily: 'Poppins_Bold',
    fontSize: 16,
    color: '#fff',
  },
  descriptionContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  descriptionText: {
    fontFamily: 'Poppins_Regular',
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
  },
  additionalInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    paddingTop: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontFamily: 'Poppins_Regular',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
});