import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Thermometer, Wind, Mountain } from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';
import { MeteoData } from '@/types/weather';

interface MeteoStationCardProps {
  station: MeteoData;
}

export const MeteoStationCard = ({ station }: MeteoStationCardProps) => {
  const { theme } = useThemeStore();
  
  // Fallback if theme is not loaded yet
  if (!theme) {
    return null;
  }
  
  const styles = getStyles(theme);

  const renderMetric = (Icon: React.ElementType, label: string, value: string | null, unit: string) => {
    if (value === null) return null;
    return (
      <View style={styles.metric}>
        <Icon size={18} color={theme.colors.textSecondary} />
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={styles.metricValue}>{value}{unit}</Text>
      </View>
    );
  };

  return (
    <View style={styles.card}>
      <Text style={styles.stationName}>{station.nazwa_stacji}</Text>
      <View style={styles.metricsContainer}>
        {renderMetric(Thermometer, 'Powietrze', station.temperatura_powietrza, '°C')}
        {renderMetric(Mountain, 'Grunt', station.temperatura_gruntu, '°C')}
        {renderMetric(Wind, 'Wiatr', station.wiatr_srednia_predkosc, ' m/s')}
      </View>
      <Text style={styles.updateTime}>
        Ostatnia aktualizacja: {station.opad_10min_data ? new Date(station.opad_10min_data).toLocaleTimeString('pl-PL') : 'Brak danych'}
      </Text>
    </View>
  );
};

const getStyles = (theme: any) => StyleSheet.create({
  card: {
    backgroundColor: theme.colors.subtle,
    borderRadius: 16,
    padding: 20,
  },
  stationName: {
    fontFamily: 'Poppins_Bold',
    fontSize: 18,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  metric: {
    alignItems: 'center',
    gap: 6,
  },
  metricLabel: {
    fontFamily: 'Poppins_Regular',
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  metricValue: {
    fontFamily: 'Poppins_Bold',
    fontSize: 18,
    color: theme.colors.text,
  },
  updateTime: {
    fontFamily: 'Poppins_Regular',
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 12,
  },
});
