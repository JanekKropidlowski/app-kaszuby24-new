import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Animated } from 'react-native';
import { useThemeStore } from '@/store/themeStore';
import { MapPin, CloudRain, ChevronDown, ChevronUp, Info, Droplets } from 'lucide-react-native';

interface RadarMapProps {
  precipitation: number[];
  time: string[];
}

const { width: screenWidth } = Dimensions.get('window');
const MAP_SIZE = screenWidth - 40;

export const RadarMap: React.FC<RadarMapProps> = ({ precipitation, time }) => {
  const { theme } = useThemeStore();
  const [isLegendExpanded, setIsLegendExpanded] = useState(false);
  const legendAnimation = useState(new Animated.Value(0))[0];
  
  if (!theme || !precipitation || precipitation.length === 0) {
    return null;
  }
  
  const toggleLegend = () => {
    const toValue = isLegendExpanded ? 0 : 1;
    Animated.timing(legendAnimation, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
    setIsLegendExpanded(!isLegendExpanded);
  };

  // Get current precipitation intensity
  const currentHour = new Date().getHours();
  const currentPrecipitation = precipitation[currentHour] || 0;
  
  // Calculate precipitation level
  const getPrecipitationLevel = (mm: number) => {
    if (mm === 0) return { level: 'Brak opadów', color: '#10B981', intensity: 0 };
    if (mm < 0.5) return { level: 'Lekkie opady', color: '#3B82F6', intensity: 1 };
    if (mm < 2.5) return { level: 'Umiarkowane opady', color: '#8B5CF6', intensity: 2 };
    if (mm < 7.5) return { level: 'Silne opady', color: '#DC2626', intensity: 3 };
    return { level: 'Bardzo silne opady', color: '#7C3AED', intensity: 4 };
  };
  
  const precipInfo = getPrecipitationLevel(currentPrecipitation);
  
  // Create radar visualization
  const radarCircles = [1, 2, 3, 4].map(ring => {
    const size = (ring * MAP_SIZE) / 8;
    const opacity = 0.1 + (ring * 0.05);
    
    return (
      <View
        key={ring}
        style={[
          styles.radarCircle,
          {
            width: size,
            height: size,
            borderColor: theme.colors.textSecondary,
            opacity,
          }
        ]}
      />
    );
  });
  
  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.colors.text }]}>Radar opadów</Text>
      
      <View style={styles.radarContainer}>
        <View style={[styles.radarBackground, { borderColor: theme.colors.border, backgroundColor: theme.colors.subtle }]}>
          {radarCircles}
          
          {/* Center point */}
          <View style={[styles.centerPoint, { backgroundColor: precipInfo.color }]} />
          
          {/* Precipitation indicator */}
          <View style={[styles.precipIndicator, { backgroundColor: `${precipInfo.color}20`, borderColor: `${precipInfo.color}40` }]}>
            <CloudRain size={24} color={precipInfo.color} />
            <Text style={[styles.precipText, { color: precipInfo.color }]}>
              {currentPrecipitation.toFixed(1)} mm/h
            </Text>
          </View>
        </View>
      </View>
      
      <View style={styles.infoContainer}>
        <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
          {precipInfo.level}
        </Text>
        <Text style={[styles.timeText, { color: theme.colors.textSecondary }]}>
          Ostatnia aktualizacja: {new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
      
      {/* Expandable Legend */}
      <TouchableOpacity 
        style={[styles.legendToggle, { backgroundColor: theme.colors.subtle }]}
        onPress={toggleLegend}
      >
        <View style={styles.legendToggleHeader}>
          <Info size={16} color={theme.colors.primary} />
          <Text style={[styles.legendToggleText, { color: theme.colors.text }]}>
            Legenda i informacje
          </Text>
          {isLegendExpanded ? 
            <ChevronUp size={20} color={theme.colors.textSecondary} /> : 
            <ChevronDown size={20} color={theme.colors.textSecondary} />
          }
        </View>
      </TouchableOpacity>
      
      <Animated.View 
        style={[
          styles.legendContent,
          {
            maxHeight: legendAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 400],
            }),
            opacity: legendAnimation,
          }
        ]}
      >
        <View style={[styles.legendCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.legendTitle, { color: theme.colors.text }]}>
            Skala intensywności opadów:
          </Text>
          
          <View style={styles.legendItems}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#10B981' }]} />
              <Text style={[styles.legendLabel, { color: theme.colors.text }]}>
                Brak opadów (0 mm/h)
              </Text>
            </View>
            
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#3B82F6' }]} />
              <Text style={[styles.legendLabel, { color: theme.colors.text }]}>
                Lekkie opady (&lt; 0.5 mm/h)
              </Text>
            </View>
            
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#8B5CF6' }]} />
              <Text style={[styles.legendLabel, { color: theme.colors.text }]}>
                Umiarkowane (0.5-2.5 mm/h)
              </Text>
            </View>
            
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#DC2626' }]} />
              <Text style={[styles.legendLabel, { color: theme.colors.text }]}>
                Silne opady (2.5-7.5 mm/h)
              </Text>
            </View>
            
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#7C3AED' }]} />
              <Text style={[styles.legendLabel, { color: theme.colors.text }]}>
                Bardzo silne (&gt; 7.5 mm/h)
              </Text>
            </View>
          </View>
          
          <View style={[styles.legendDivider, { backgroundColor: theme.colors.subtle }]} />
          
          <Text style={[styles.legendSubtitle, { color: theme.colors.text }]}>
            Co oznaczają wartości?
          </Text>
          
          <View style={styles.legendInfo}>
            <Droplets size={14} color={theme.colors.primary} />
            <Text style={[styles.legendInfoText, { color: theme.colors.textSecondary }]}>
              <Text style={{ fontFamily: 'Poppins_Bold' }}>mm/h</Text> - milimetry na godzinę, 
              czyli ilość wody która spadnie na 1m² powierzchni w ciągu godziny
            </Text>
          </View>
          
          <View style={styles.legendInfo}>
            <CloudRain size={14} color={theme.colors.primary} />
            <Text style={[styles.legendInfoText, { color: theme.colors.textSecondary }]}>
              <Text style={{ fontFamily: 'Poppins_Bold' }}>1 mm opadów</Text> = 1 litr wody na 1m²
            </Text>
          </View>
          
          <View style={[styles.legendDivider, { backgroundColor: theme.colors.subtle }]} />
          
          <Text style={[styles.legendNote, { color: theme.colors.textSecondary }]}>
            Wskazówka: powyżej 2.5 mm/h warto wziąć parasol, a powyżej 7.5 mm/h lepiej zostać w domu.
          </Text>
        </View>
      </Animated.View>
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
  radarContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  radarBackground: {
    width: MAP_SIZE,
    height: MAP_SIZE,
    borderRadius: MAP_SIZE / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarCircle: {
    position: 'absolute',
    borderRadius: 1000,
    borderWidth: 1,
  },
  centerPoint: {
    width: 20,
    height: 20,
    borderRadius: 10,
    position: 'absolute',
  },
  precipIndicator: {
    position: 'absolute',
    padding: 12,
    borderRadius: 16,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
  },
  precipText: {
    fontFamily: 'Poppins_Bold',
    fontSize: 14,
  },
  infoContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  infoText: {
    fontFamily: 'Poppins_Medium',
    fontSize: 16,
    marginBottom: 4,
  },
  timeText: {
    fontFamily: 'Poppins_Regular',
    fontSize: 12,
  },
  legendToggle: {
    marginTop: 12,
    borderRadius: 12,
    padding: 12,
  },
  legendToggleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  legendToggleText: {
    fontFamily: 'Poppins_Medium',
    fontSize: 14,
    flex: 1,
    marginLeft: 8,
  },
  legendContent: {
    overflow: 'hidden',
  },
  legendCard: {
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  legendTitle: {
    fontFamily: 'Poppins_Bold',
    fontSize: 16,
    marginBottom: 12,
  },
  legendSubtitle: {
    fontFamily: 'Poppins_Bold',
    fontSize: 14,
    marginBottom: 8,
  },
  legendItems: {
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendColor: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 12,
  },
  legendLabel: {
    fontFamily: 'Poppins_Regular',
    fontSize: 13,
  },
  legendDivider: {
    height: 1,
    marginVertical: 12,
  },
  legendInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  legendInfoText: {
    fontFamily: 'Poppins_Regular',
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
  legendNote: {
    fontFamily: 'Poppins_Regular',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
}); 