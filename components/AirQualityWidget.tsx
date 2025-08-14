import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useThemeStore } from '@/store/themeStore';
import { Sun, Wind, Droplets } from 'lucide-react-native';

interface AirQualityWidgetProps {
  aqi?: number; // PM2.5 indeks uproszczony
  pm25?: number;
  pm10?: number;
  uvIndex?: number;
}

const getAqiLabel = (pm25?: number) => {
  if (pm25 == null) return { text: '—', color: '#9CA3AF' };
  if (pm25 <= 12) return { text: 'Dobre', color: '#10B981' };
  if (pm25 <= 35) return { text: 'Umiark.', color: '#F59E0B' };
  return { text: 'Słabe', color: '#EF4444' };
};

export const AirQualityWidget: React.FC<AirQualityWidgetProps> = ({ aqi, pm25, pm10, uvIndex }) => {
  const { theme } = useThemeStore();
  const aqiLabel = getAqiLabel(pm25);

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: theme.colors.card,
        borderColor: theme.colors.border,
        shadowColor: theme.colors.shadow,
      }
    ]}>
      <View style={styles.item}>
        <Droplets size={16} color={aqiLabel.color} />
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>PM2.5</Text>
        <Text style={[styles.value, { color: theme.colors.text }]}>{pm25 != null ? Math.round(pm25) : '—'}</Text>
        <Text style={[styles.tag, { color: aqiLabel.color, borderColor: aqiLabel.color + '55' }]}>{aqiLabel.text}</Text>
      </View>
      <View style={[styles.sep, { backgroundColor: theme.colors.border }]} />
      <View style={styles.item}>
        <Wind size={16} color={theme.colors.secondary} />
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>PM10</Text>
        <Text style={[styles.value, { color: theme.colors.text }]}>{pm10 != null ? Math.round(pm10) : '—'}</Text>
      </View>
      <View style={[styles.sep, { backgroundColor: theme.colors.border }]} />
      <View style={styles.item}>
        <Sun size={16} color={theme.colors.warning} />
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>UV</Text>
        <Text style={[styles.value, { color: theme.colors.text }]}>{uvIndex != null ? Math.round(uvIndex) : '—'}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: '5%',
    marginTop: 10,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontSize: 11,
    fontFamily: Platform.select({ default: 'Poppins_Medium', android: 'Poppins_Medium' }) || 'Poppins_Medium',
  },
  value: {
    fontSize: 17,
    fontFamily: Platform.select({ default: 'Poppins_SemiBold', android: 'Poppins_SemiBold' }) || 'Poppins_SemiBold',
  },
  tag: {
    marginTop: 2,
    fontSize: 10,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  sep: {
    width: 1,
    height: 24,
    backgroundColor: '#E5E7EB',
    opacity: 0.6,
  },
});


