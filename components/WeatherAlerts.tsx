import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AlertTriangle, ChevronRight } from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';

interface WeatherAlertsProps {
  alerts: Array<{
    id: string;
    severity: 'low' | 'medium' | 'high';
    title: string;
    description: string;
    validFrom: string;
    validTo: string;
  }>;
  onAlertPress: (alertId: string) => void;
}

export const WeatherAlerts: React.FC<WeatherAlertsProps> = ({
  alerts,
  onAlertPress,
}) => {
  const { theme } = useThemeStore();

  if (!alerts || alerts.length === 0) {
    return null;
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return '#EF4444';
      case 'medium':
        return '#F59E0B';
      case 'low':
        return '#10B981';
      default:
        return '#6B7280';
    }
  };

  const getSeverityText = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'Wysokie';
      case 'medium':
        return 'Średnie';
      case 'low':
        return 'Niskie';
      default:
        return 'Nieznane';
    }
  };

    return (
    <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <AlertTriangle size={20} color={theme.colors.error} />
          <Text style={[styles.title, { color: theme.colors.text }]}>Ostrzeżenia pogodowe</Text>
        </View>
        <Text style={[styles.alertCount, { color: theme.colors.error, backgroundColor: theme.colors.error + '20' }]}>{alerts.length}</Text>
      </View>
      
      {alerts.slice(0, 2).map((alert) => (
        <TouchableOpacity
          key={alert.id}
          style={[styles.alertCard, { backgroundColor: theme.colors.background }]}
          onPress={() => onAlertPress(alert.id)}
        >
          <View style={styles.alertHeader}>
            <View style={styles.severityContainer}>
              <View 
                style={[
                  styles.severityDot, 
                  { backgroundColor: getSeverityColor(alert.severity) }
                ]} 
              />
              <Text style={[styles.severityText, { color: theme.colors.textSecondary }]}>
                {getSeverityText(alert.severity)}
              </Text>
            </View>
            <ChevronRight size={16} color={theme.colors.textSecondary} />
          </View>
                  <Text style={[styles.alertTitle, { color: theme.colors.text }]}>{alert.title}</Text>
        <Text style={[styles.alertDescription, { color: theme.colors.textSecondary }]} numberOfLines={2}>
          {alert.description}
        </Text>
        </TouchableOpacity>
      ))}
      
      {alerts.length > 2 && (
        <TouchableOpacity style={styles.moreButton}>
                  <Text style={[styles.moreButtonText, { color: theme.colors.primary }]}>
          Zobacz wszystkie ({alerts.length})
        </Text>
          <ChevronRight size={16} color={theme.colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginVertical: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  alertCount: {
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  alertCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  severityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  severityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  severityText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  alertDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  moreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  moreButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
