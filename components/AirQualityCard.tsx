import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Wind, AlertCircle, Activity } from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';

interface AirQualityCardProps {
  airQuality: {
    hourly: {
      pm10: number[];
      pm2_5: number[];
      time: string[];
    };
  };
}

export const AirQualityCard: React.FC<AirQualityCardProps> = ({ airQuality }) => {
  const { theme } = useThemeStore();
  
  if (!theme || !airQuality || !airQuality.hourly) {
    return null;
  }
  
  const styles = getStyles(theme);
  
  // Get current hour data
  const currentHour = new Date().getHours();
  const pm10 = airQuality.hourly.pm10?.[currentHour] || 0;
  const pm25 = airQuality.hourly.pm2_5?.[currentHour] || 0;
  
  // Calculate AQI
  const getAQILevel = (pm25: number, pm10: number) => {
    const pm25Index = pm25 / 25 * 100; // WHO guideline: 25 μg/m³
    const pm10Index = pm10 / 50 * 100; // WHO guideline: 50 μg/m³
    const aqi = Math.max(pm25Index, pm10Index);
    
    if (aqi <= 50) return { level: 'Dobra', color: '#10B981', icon: '😊' };
    if (aqi <= 100) return { level: 'Umiarkowana', color: '#F59E0B', icon: '😐' };
    if (aqi <= 150) return { level: 'Niezdrowa dla wrażliwych', color: '#EF4444', icon: '😷' };
    if (aqi <= 200) return { level: 'Niezdrowa', color: '#DC2626', icon: '😵' };
    return { level: 'Bardzo niezdrowa', color: '#7C3AED', icon: '☠️' };
  };
  
  const aqiInfo = getAQILevel(pm25, pm10);
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Wind size={24} color={theme.colors.primary} />
        <Text style={styles.title}>Jakość powietrza</Text>
      </View>
      
      <View style={[styles.aqiCard, { backgroundColor: `${aqiInfo.color}15`, borderColor: aqiInfo.color }]}>
        <Text style={styles.aqiEmoji}>{aqiInfo.icon}</Text>
        <Text style={[styles.aqiLevel, { color: aqiInfo.color }]}>{aqiInfo.level}</Text>
      </View>
      
      <View style={styles.metricsContainer}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>PM2.5</Text>
          <Text style={[styles.metricValue, { color: pm25 > 25 ? theme.colors.warning : theme.colors.success }]}>
            {pm25.toFixed(1)} μg/m³
          </Text>
          <Text style={styles.metricLimit}>Limit: 25 μg/m³</Text>
        </View>
        
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>PM10</Text>
          <Text style={[styles.metricValue, { color: pm10 > 50 ? theme.colors.warning : theme.colors.success }]}>
            {pm10.toFixed(1)} μg/m³
          </Text>
          <Text style={styles.metricLimit}>Limit: 50 μg/m³</Text>
        </View>
      </View>
      
      <View style={styles.recommendation}>
        <AlertCircle size={16} color={theme.colors.textSecondary} />
        <Text style={styles.recommendationText}>
          {aqiInfo.level === 'Dobra' 
            ? 'Idealny czas na aktywność na świeżym powietrzu!'
            : aqiInfo.level === 'Umiarkowana'
            ? 'Ogranicz intensywne ćwiczenia na zewnątrz.'
            : 'Unikaj aktywności na zewnątrz, szczególnie osoby wrażliwe.'}
        </Text>
      </View>
    </View>
  );
};

const getStyles = (theme: any) => StyleSheet.create({
  container: {
    backgroundColor: theme.colors.card,
    borderRadius: 20,
    padding: 20,
    marginVertical: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Poppins_Bold',
    fontSize: 20,
    color: theme.colors.text,
  },
  aqiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 20,
    gap: 12,
  },
  aqiEmoji: {
    fontSize: 32,
  },
  aqiLevel: {
    fontFamily: 'Poppins_Bold',
    fontSize: 24,
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  metric: {
    alignItems: 'center',
  },
  metricLabel: {
    fontFamily: 'Poppins_Medium',
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  metricValue: {
    fontFamily: 'Poppins_Bold',
    fontSize: 20,
    marginBottom: 4,
  },
  metricLimit: {
    fontFamily: 'Poppins_Regular',
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  recommendation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: theme.colors.subtle,
    borderRadius: 12,
  },
  recommendationText: {
    fontFamily: 'Poppins_Regular',
    fontSize: 13,
    color: theme.colors.text,
    flex: 1,
  },
});