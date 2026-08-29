import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Waves, TrendingUp, TrendingDown, Minus } from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';
import { HydroData } from '@/types/weather';

interface HydroStationCardProps {
  station: HydroData;
}

const getTrend = (station: HydroData) => {
  // Placeholder for more advanced trend logic
  return { icon: Minus, color: '#6b7280', label: 'Stabilny' };
};

export const HydroStationCard = ({ station }: HydroStationCardProps) => {
  const { theme } = useThemeStore();
  
  // Fallback if theme is not loaded yet
  if (!theme) {
    return null;
  }
  
  const styles = getStyles(theme);
  const trend = getTrend(station);

  const getStatusColor = (stanWody: string | null) => {
    if (stanWody === null) return theme.colors.textSecondary;
    const stan = parseInt(stanWody, 10);
    if (stan > 500) return theme.colors.error;
    if (stan > 300) return theme.colors.warning;
    return theme.colors.success;
  }

  return (
    <View style={styles.card}>
        <View style={styles.header}>
            <Text style={styles.stationName}>{station.stacja}</Text>
            <Text style={styles.riverName}>{station.rzeka}</Text>
        </View>
        <View style={styles.body}>
            <View style={styles.metric}>
                <Text style={styles.metricLabel}>Stan wody</Text>
                <Text style={[styles.metricValue, { color: getStatusColor(station.stan_wody) }]}>
                    {station.stan_wody ?? 'N/A'}
                    <Text style={styles.metricUnit}> cm</Text>
                </Text>
            </View>
             <View style={styles.metric}>
                <Text style={styles.metricLabel}>Trend</Text>
                <View style={styles.trendValue}>
                    <trend.icon size={20} color={trend.color} />
                    <Text style={[styles.trendLabelText, {color: trend.color}]}>{trend.label}</Text>
                </View>
            </View>
        </View>
        <Text style={styles.updateTime}>
            Pomiar: {station.stan_wody_data_pomiaru ? new Date(station.stan_wody_data_pomiaru).toLocaleString('pl-PL') : 'Brak danych'}
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
  header: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: 12,
  },
  stationName: {
    fontFamily: 'Poppins_Bold',
    fontSize: 18,
    color: theme.colors.text,
    textAlign: 'center',
  },
  riverName: {
    fontFamily: 'Poppins_Regular',
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  body: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 16,
  },
  metric: {
      alignItems: 'center',
      gap: 4
  },
  metricLabel: {
    fontFamily: 'Poppins_Medium',
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  metricValue: {
    fontFamily: 'Poppins_Bold',
    fontSize: 28,
  },
  metricUnit: {
    fontFamily: 'Poppins_Regular',
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  trendValue: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6
  },
  trendLabelText: {
    fontFamily: 'Poppins_SemiBold',
    fontSize: 16,
  },
  updateTime: {
    fontFamily: 'Poppins_Regular',
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border
  },
});
