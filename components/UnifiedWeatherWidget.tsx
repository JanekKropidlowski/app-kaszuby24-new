import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { useThemeStore } from '@/store/themeStore';
import { LucideIcon, Info, TrendingUp, AlertTriangle, Clock, CheckCircle, Star, AlertCircle } from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface WeatherMetric {
  label: string;
  value: string;
  icon: LucideIcon;
  status: 'excellent' | 'good' | 'moderate' | 'poor' | 'dangerous';
  trend?: 'up' | 'down' | 'stable';
  unit?: string;
  meta?: string;
}

interface UnifiedWeatherWidgetProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  gradientColors: readonly [string, string, string];
  metrics: WeatherMetric[];
  onPress?: () => void;
  lastUpdate?: string;
  quality?: 'high' | 'medium' | 'low';
  alerts?: string[];
}

export const UnifiedWeatherWidget: React.FC<UnifiedWeatherWidgetProps> = ({
  title,
  subtitle,
  icon: IconComponent,
  gradientColors,
  metrics,
  onPress,
  lastUpdate = "Aktualizacja: teraz",
  quality = "high",
  alerts = []
}) => {
  const { theme } = useThemeStore();

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

  const getStatusColor = (status: WeatherMetric['status']): string => {
    switch (status) {
      case 'excellent': return colors.success;
      case 'good': return colors.info;
      case 'moderate': return colors.warning;
      case 'poor': return colors.error;
      case 'dangerous': return '#dc2626';
      default: return '#6b7280';
    }
  };

  const getStatusText = (status: WeatherMetric['status']): string => {
    switch (status) {
      case 'excellent': return 'Doskonałe';
      case 'good': return 'Dobre';
      case 'moderate': return 'Umiarkowane';
      case 'poor': return 'Słabe';
      case 'dangerous': return 'Niebezpieczne';
      default: return 'Nieznane';
    }
  };

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={onPress}
      activeOpacity={0.85}
      delayPressIn={0}
    >
      <View style={[styles.widgetContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        {/* Clean Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconContainer, { backgroundColor: gradientColors[0] + '15' }]}>
              <IconComponent size={24} color={gradientColors[0]} />
            </View>
            <View style={styles.titleContainer}>
              <Text style={[styles.title, { color: theme.colors.text, fontFamily: theme.fontFamily?.bold || 'Poppins_Bold' }]}>
                {title}
              </Text>
              <Text style={[styles.subtitle, { color: theme.colors.textSecondary, fontFamily: theme.fontFamily?.regular || 'Poppins_Regular' }]}>
                {subtitle}
              </Text>
            </View>
          </View>
        </View>

        {/* Simple Metrics Grid */}
        <View style={styles.metricsGrid}>
          {metrics.slice(0, 4).map((metric, index) => (
            <View 
              key={index} 
              style={[
                styles.metricCard, 
                { 
                  backgroundColor: theme.colors.card,
                  borderColor: getStatusColor(metric.status) + '33'
                }
              ]}
            > 
              <View style={styles.metricHeader}>
                <View style={[styles.metricIconContainer, { backgroundColor: getStatusColor(metric.status) + '15' }]}>
                  <metric.icon size={18} color={getStatusColor(metric.status)} />
                </View>
                <View style={[styles.statusDot, { backgroundColor: getStatusColor(metric.status) }]} />
              </View>
              
              <Text style={[styles.metricValue, { color: theme.colors.text, fontFamily: theme.fontFamily?.bold || 'Poppins_Bold' }]}>
                {metric.value}
              </Text>
              
              <Text style={[styles.metricLabel, { color: theme.colors.textSecondary, fontFamily: theme?.fontFamily?.medium || 'Poppins_Medium' }]}>
                {metric.label}
              </Text>

              {!!metric.meta && (
                <Text style={[styles.metricMeta, { color: theme.colors.textSecondary }]}> 
                  {metric.meta}
                </Text>
              )}
            </View>
          ))}
        </View>

        {/* Simple Footer */}
        <View style={styles.footer}>
          <View style={styles.updateInfo}>
            <Clock size={14} color={theme.colors.textSecondary} />
            <Text style={[styles.lastUpdate, { color: theme.colors.textSecondary, fontFamily: theme?.fontFamily?.regular || 'Poppins_Regular' }]}>
              {lastUpdate}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    marginHorizontal: 8,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  widgetContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 160,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    backgroundColor: 'rgba(0,0,0,0.03)',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 3,
    letterSpacing: 0.2,
    color: '#1E293B',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: '#64748B',
    letterSpacing: 0.3,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    minHeight: 100,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    elevation: 1,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
    lineHeight: 24,
    letterSpacing: 0.2,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.6,
    opacity: 0.8,
    lineHeight: 16,
  },
  metricMeta: {
    fontSize: 10,
    opacity: 0.8,
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.04)',
  },
  updateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lastUpdate: {
    fontSize: 12,
    opacity: 0.8,
  },
});

