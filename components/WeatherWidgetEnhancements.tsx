import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions } from 'react-native';
import { useThemeStore } from '@/store/themeStore';
import { 
  TrendingUp, 
  AlertTriangle, 
  Info, 
  CheckCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react-native';

interface WeatherWidgetEnhancementsProps {
  children: React.ReactNode;
  title: string;
  isExpanded?: boolean;
  onToggle?: () => void;
  showProgress?: boolean;
  progressValue?: number;
  progressMax?: number;
  showTrend?: boolean;
  trendDirection?: 'up' | 'down' | 'stable';
  showAlert?: boolean;
  alertMessage?: string;
  alertType?: 'info' | 'warning' | 'error' | 'success';
}

export const WeatherWidgetEnhancements: React.FC<WeatherWidgetEnhancementsProps> = ({
  children,
  title,
  isExpanded = false,
  onToggle,
  showProgress = false,
  progressValue = 0,
  progressMax = 100,
  showTrend = false,
  trendDirection = 'stable',
  showAlert = false,
  alertMessage = '',
  alertType = 'info'
}) => {
  const { theme } = useThemeStore();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const colors = theme?.colors || {
    primary: '#224A96',
    secondary: '#FECC00',
    background: '#F8FAFC',
    card: '#F8FAFC',
    text: '#1E293B',
    textSecondary: '#64748B',
    border: '#E2E8F0',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  useEffect(() => {
    if (showProgress) {
      Animated.timing(progressAnim, {
        toValue: progressValue / progressMax,
        duration: 1000,
        useNativeDriver: false,
      }).start();
    }
  }, [progressValue, progressMax]);

  const getTrendIcon = () => {
    switch (trendDirection) {
      case 'up':
        return <TrendingUp size={16} color={colors.success} />;
      case 'down':
        return <TrendingUp size={16} color={colors.error} style={{ transform: [{ rotate: '180deg' }] }} />;
      default:
        return <CheckCircle size={16} color={colors.info} />;
    }
  };

  const getAlertIcon = () => {
    switch (alertType) {
      case 'success':
        return <CheckCircle size={16} color={colors.success} />;
      case 'warning':
        return <AlertTriangle size={16} color={colors.warning} />;
      case 'error':
        return <AlertTriangle size={16} color={colors.error} />;
      default:
        return <Info size={16} color={colors.info} />;
    }
  };

  const getAlertColor = () => {
    switch (alertType) {
      case 'success':
        return colors.success;
      case 'warning':
        return colors.warning;
      case 'error':
        return colors.error;
      default:
        return colors.info;
    }
  };

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [50, 0]
          })}]
        }
      ]}
    >
      {/* Enhanced Header with Toggle */}
      <TouchableOpacity 
        style={styles.header} 
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: colors.text }]}>
            {title}
          </Text>
          {onToggle && (
            <View style={styles.toggleContainer}>
              {isExpanded ? (
                <ChevronUp size={20} color={colors.textSecondary} />
              ) : (
                <ChevronDown size={20} color={colors.textSecondary} />
              )}
            </View>
          )}
        </View>
        
        {/* Progress Bar */}
        {showProgress && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <Animated.View 
                style={[
                  styles.progressFill, 
                  { 
                    backgroundColor: colors.primary,
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%']
                    })
                  }
                ]} 
              />
            </View>
            <Text style={[styles.progressText, { color: colors.textSecondary }]}>
              {progressValue}/{progressMax}
            </Text>
          </View>
        )}

        {/* Trend Indicator */}
        {showTrend && (
          <View style={styles.trendContainer}>
            {getTrendIcon()}
            <Text style={[styles.trendText, { color: colors.textSecondary }]}>
              {trendDirection === 'up' ? 'Rosnąco' : 
               trendDirection === 'down' ? 'Spadająco' : 'Stabilnie'}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Alert Banner */}
      {showAlert && (
        <Animated.View 
          style={[
            styles.alertContainer,
            { 
              backgroundColor: getAlertColor() + '15',
              borderLeftColor: getAlertColor()
            }
          ]}
        >
          {getAlertIcon()}
          <Text style={[styles.alertText, { color: colors.text }]}>
            {alertMessage}
          </Text>
        </Animated.View>
      )}

      {/* Content */}
      <View style={styles.content}>
        {children}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 8,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Poppins_Bold',
    flex: 1,
  },
  toggleContainer: {
    padding: 4,
  },
  progressContainer: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Poppins_Medium',
    minWidth: 40,
    textAlign: 'right',
  },
  trendContainer: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Poppins_Medium',
  },
  alertContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
    borderLeftWidth: 4,
  },
  alertText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Poppins_Medium',
    flex: 1,
    lineHeight: 20,
  },
  content: {
    padding: 16,
  },
});

export default WeatherWidgetEnhancements;
