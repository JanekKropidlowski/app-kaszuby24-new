import React from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { useThemeStore } from '@/store/themeStore';

interface TemperatureChartProps {
  hourlyData: {
    time: string[];
    temperature_2m: number[];
  };
}

const { width: screenWidth } = Dimensions.get('window');
const CHART_WIDTH = screenWidth - 40;
const CHART_HEIGHT = 150;

export const TemperatureChart: React.FC<TemperatureChartProps> = ({ hourlyData }) => {
  const { theme } = useThemeStore();
  
  if (!theme || !hourlyData || !hourlyData.temperature_2m || hourlyData.temperature_2m.length === 0) {
    return null;
  }

  // Take next 24 hours
  const temps = hourlyData.temperature_2m.slice(0, 24);
  const times = hourlyData.time.slice(0, 24);
  
  const minTemp = Math.min(...temps);
  const maxTemp = Math.max(...temps);
  const tempRange = maxTemp - minTemp || 1;
  
  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.colors.text }]}>Temperatura (24h)</Text>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chartContainer}>
        <View style={styles.chart}>
          {temps.map((temp, index) => {
            const height = ((temp - minTemp) / tempRange) * (CHART_HEIGHT - 40) + 20;
            const isCurrentHour = index === new Date().getHours();
            
            return (
              <View key={index} style={styles.barContainer}>
                <View 
                  style={[
                    styles.bar, 
                    { 
                      height,
                      backgroundColor: isCurrentHour ? theme.colors.primary : theme.colors.subtle,
                      borderColor: theme.colors.primary
                    }
                  ]} 
                />
                <Text style={[styles.timeLabel, { color: theme.colors.textSecondary }]}>
                  {index % 6 === 0 ? `${new Date(times[index]).getHours()}:00` : ''}
                </Text>
                <Text style={[styles.tempLabel, { color: theme.colors.text }]}>
                  {temp.toFixed(0)}°
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
      
      <View style={styles.legend}>
        <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>
          Min: {minTemp.toFixed(1)}° | Max: {maxTemp.toFixed(1)}°
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
  },
  title: {
    fontFamily: 'Poppins_Bold',
    fontSize: 18,
    marginBottom: 10,
  },
  chartContainer: {
    marginVertical: 10,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: CHART_HEIGHT,
    paddingHorizontal: 20,
  },
  barContainer: {
    alignItems: 'center',
    marginHorizontal: 2,
    minWidth: 30,
  },
  bar: {
    width: 20,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 5,
  },
  timeLabel: {
    fontFamily: 'Poppins_Regular',
    fontSize: 10,
    textAlign: 'center',
  },
  tempLabel: {
    fontFamily: 'Poppins_Medium',
    fontSize: 11,
    textAlign: 'center',
  },
  legend: {
    marginTop: 10,
    alignItems: 'center',
  },
  legendText: {
    fontFamily: 'Poppins_Regular',
    fontSize: 12,
  },
});