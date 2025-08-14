import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform, Dimensions } from 'react-native';
import { useThemeStore } from '@/store/themeStore';
import { MapPin, BarChart3, AlertTriangle, Settings, RefreshCw } from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming,
  withSequence
} from 'react-native-reanimated';

interface WeatherActionBarProps {
  onLocationPress: () => void;
  onChartsPress: () => void;
  onAlertsPress: () => void;
  onSettingsPress: () => void;
  onRefreshPress: () => void;
  hasAlerts: boolean;
  alertCount: number;
}

export const WeatherActionBar: React.FC<WeatherActionBarProps> = ({
  onLocationPress,
  onChartsPress,
  onAlertsPress,
  onSettingsPress,
  onRefreshPress,
  hasAlerts,
  alertCount,
}) => {
  const { theme, isDarkMode } = useThemeStore();
  const { width: screenWidth } = Dimensions.get('window');
  
  // Enhanced animation values
  const scaleValues = useRef([
    useSharedValue(0.8),
    useSharedValue(0.8),
    useSharedValue(0.8),
    useSharedValue(0.8),
    useSharedValue(0.8),
  ]).current;
  
  const opacityValues = useRef([
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
  ]).current;

  const actions = [
    {
      id: 'location',
      icon: MapPin,
      label: 'Lokalizacja',
      onPress: onLocationPress,
      color: theme.colors.primary,
      badge: null,
    },
    {
      id: 'charts',
      icon: BarChart3,
      label: 'Wykresy',
      onPress: onChartsPress,
      color: theme.colors.secondary,
      badge: null,
    },
    {
      id: 'alerts',
      icon: AlertTriangle,
      label: 'Ostrzeżenia',
      onPress: onAlertsPress,
      color: theme.colors.error,
      badge: hasAlerts ? alertCount : null,
    },
    {
      id: 'settings',
      icon: Settings,
      label: 'Ustawienia',
      onPress: onSettingsPress,
      color: theme.colors.textSecondary,
      badge: null,
    },
    {
      id: 'refresh',
      icon: RefreshCw,
      label: 'Odśwież',
      onPress: onRefreshPress,
      color: theme.colors.success,
      badge: null,
    },
  ];

  useEffect(() => {
    // Staggered entrance animations for each action button
    actions.forEach((_, index) => {
      const delay = index * 100;
      
      setTimeout(() => {
        scaleValues[index].value = withSpring(1, { 
          damping: 20, 
          stiffness: 120 
        });
        opacityValues[index].value = withTiming(1, { duration: 400 });
      }, delay);
    });
  }, []);

  const getAnimatedStyle = (index: number) => {
    return useAnimatedStyle(() => ({
      transform: [{ scale: scaleValues[index].value }],
      opacity: opacityValues[index].value,
    }));
  };

  const handlePressIn = (index: number) => {
    scaleValues[index].value = withSpring(0.95, { 
      damping: 15, 
      stiffness: 300 
    });
  };

  const handlePressOut = (index: number) => {
    scaleValues[index].value = withSpring(1, { 
      damping: 15, 
      stiffness: 300 
    });
  };

  const handlePress = (index: number, onPress: () => void) => {
    // Add a subtle bounce effect
    scaleValues[index].value = withSequence(
      withSpring(0.9, { damping: 10, stiffness: 400 }),
      withSpring(1, { damping: 15, stiffness: 300 })
    );
    // Call onPress after animation
    setTimeout(() => onPress(), 100);
  };

  return (
    <View style={styles.container}>
      <View style={styles.actionsGrid}>
        {actions.map((action, index) => {
          const IconComponent = action.icon;
          const animatedStyle = getAnimatedStyle(index);
          
          return (
            <Animated.View key={action.id} style={[styles.actionButtonContainer, animatedStyle]}>
              <TouchableOpacity
                style={[
                  styles.actionButton, 
                  { backgroundColor: theme.colors.card }
                ]}
                onPressIn={() => handlePressIn(index)}
                onPressOut={() => handlePressOut(index)}
                onPress={() => handlePress(index, action.onPress)}
                activeOpacity={0.9}
              >
                <View style={[
                  styles.iconContainer, 
                  { backgroundColor: action.color + '15' }
                ]}>
                  <IconComponent 
                    size={22} 
                    color={action.color} 
                  />
                  {action.badge && (
                    <View style={[
                      styles.badge, 
                      { backgroundColor: theme.colors.error }
                    ]}>
                      <Text style={styles.badgeText}>
                        {action.badge > 99 ? '99+' : action.badge}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[
                  styles.actionLabel, 
                  { color: theme.colors.textSecondary }
                ]}>
                  {action.label}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
    marginHorizontal: '5%',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButtonContainer: {
    flex: 1,
    minWidth: Math.max(Dimensions.get('window').width * 0.28, 100),
  },
  actionButton: {
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.03)',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontFamily: Platform.select({
      default: 'Poppins_Bold',
      android: 'Poppins_Bold',
    }) || 'Poppins_Bold',
    lineHeight: 16,
  },
  actionLabel: {
    fontSize: 12,
    fontFamily: Platform.select({
      default: 'Poppins_Medium',
      android: 'Poppins_Medium',
    }) || 'Poppins_Medium',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    lineHeight: 16,
  },
});
