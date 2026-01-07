import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert } from 'react-native';
import { useThemeStore } from '@/store/themeStore';
import { Bell, AlertTriangle, Settings, X, CheckCircle } from 'lucide-react-native';
import { SynopData, MeteoData, HydroData } from '@/types/weather';

interface WeatherAlert {
  id: string;
  type: 'temperature' | 'wind' | 'precipitation' | 'storm' | 'frost' | 'heat';
  severity: 'low' | 'medium' | 'high' | 'extreme';
  title: string;
  description: string;
  threshold: number;
  currentValue: number;
  unit: string;
  timestamp: Date;
  isActive: boolean;
}

interface WeatherNotificationsProps {
  synopData: SynopData;
  meteoData?: MeteoData;
  hydroData?: HydroData;
  onAlertPress: (alert: WeatherAlert) => void;
}

export const WeatherNotifications: React.FC<WeatherNotificationsProps> = ({
  synopData,
  meteoData,
  hydroData,
  onAlertPress
}) => {
  const { theme } = useThemeStore();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [alerts, setAlerts] = useState<WeatherAlert[]>([]);
  const [showSettings, setShowSettings] = useState(false);

  // Check for extreme weather conditions
  useEffect(() => {
    if (!notificationsEnabled || !synopData) return;

    const newAlerts: WeatherAlert[] = [];
    const now = new Date();

    // Temperature alerts
    const temp = parseFloat(synopData.temperatura);
    if (temp <= -10) {
      newAlerts.push({
        id: 'temp-extreme-cold',
        type: 'temperature',
        severity: 'extreme',
        title: 'Ekstremalnie niska temperatura',
        description: `Temperatura spadła do ${temp.toFixed(1)}°C. Zachowaj szczególną ostrożność.`,
        threshold: -10,
        currentValue: temp,
        unit: '°C',
        timestamp: now,
        isActive: true
      });
    } else if (temp <= -5) {
      newAlerts.push({
        id: 'temp-cold',
        type: 'temperature',
        severity: 'high',
        title: 'Niska temperatura',
        description: `Temperatura wynosi ${temp.toFixed(1)}°C. Uważaj na oblodzenie.`,
        threshold: -5,
        currentValue: temp,
        unit: '°C',
        timestamp: now,
        isActive: true
      });
    } else if (temp >= 35) {
      newAlerts.push({
        id: 'temp-extreme-heat',
        type: 'temperature',
        severity: 'extreme',
        title: 'Ekstremalnie wysoka temperatura',
        description: `Temperatura wzrosła do ${temp.toFixed(1)}°C. Unikaj długotrwałego przebywania na słońcu.`,
        threshold: 35,
        currentValue: temp,
        unit: '°C',
        timestamp: now,
        isActive: true
      });
    } else if (temp >= 30) {
      newAlerts.push({
        id: 'temp-heat',
        type: 'temperature',
        severity: 'high',
        title: 'Wysoka temperatura',
        description: `Temperatura wynosi ${temp.toFixed(1)}°C. Pij dużo wody.`,
        threshold: 30,
        currentValue: temp,
        unit: '°C',
        timestamp: now,
        isActive: true
      });
    }

    // Wind alerts
    const windSpeed = parseFloat(synopData.predkosc_wiatru);
    if (windSpeed >= 70) {
      newAlerts.push({
        id: 'wind-hurricane',
        type: 'wind',
        severity: 'extreme',
        title: 'Huraganowy wiatr',
        description: `Prędkość wiatru wynosi ${windSpeed.toFixed(1)} km/h. Unikaj wychodzenia z domu.`,
        threshold: 70,
        currentValue: windSpeed,
        unit: 'km/h',
        timestamp: now,
        isActive: true
      });
    } else if (windSpeed >= 50) {
      newAlerts.push({
        id: 'wind-strong',
        type: 'wind',
        severity: 'high',
        title: 'Silny wiatr',
        description: `Prędkość wiatru wynosi ${windSpeed.toFixed(1)} km/h. Zachowaj ostrożność.`,
        threshold: 50,
        currentValue: windSpeed,
        unit: 'km/h',
        timestamp: now,
        isActive: true
      });
    }

    // Precipitation alerts
    const precipitation = parseFloat(synopData.suma_opadu || '0');
    if (precipitation >= 20) {
      newAlerts.push({
        id: 'precip-heavy',
        type: 'precipitation',
        severity: 'high',
        title: 'Intensywne opady',
        description: `Suma opadów wynosi ${precipitation.toFixed(1)} mm. Uważaj na podtopienia.`,
        threshold: 20,
        currentValue: precipitation,
        unit: 'mm',
        timestamp: now,
        isActive: true
      });
    }

    // Frost risk (for farmers)
    if (temp <= 2 && meteoData?.temperatura_gruntu) {
      const groundTemp = parseFloat(meteoData.temperatura_gruntu);
      if (groundTemp <= 0) {
        newAlerts.push({
          id: 'frost-risk',
          type: 'frost',
          severity: 'medium',
          title: 'Ryzyko przymrozków',
          description: `Temperatura gruntu wynosi ${groundTemp.toFixed(1)}°C. Zabezpiecz rośliny.`,
          threshold: 0,
          currentValue: groundTemp,
          unit: '°C',
          timestamp: now,
          isActive: true
        });
      }
    }

    setAlerts(newAlerts);
  }, [synopData, meteoData, hydroData, notificationsEnabled]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'extreme': return '#FF0000';
      case 'high': return '#FF6B6B';
      case 'medium': return '#FFA726';
      case 'low': return '#FFD54F';
      default: return theme.colors.warning;
    }
  };

  const getSeverityText = (severity: string) => {
    switch (severity) {
      case 'extreme': return 'EKSTREMALNE';
      case 'high': return 'WYSOKIE';
      case 'medium': return 'ŚREDNIE';
      case 'low': return 'NISKIE';
      default: return 'NIEZNANE';
    }
  };

  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, isActive: false } : alert
    ));
  };

  const activeAlerts = alerts.filter(alert => alert.isActive);

  if (!notificationsEnabled) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
        <View style={styles.header}>
          <Bell size={20} color={theme.colors.textSecondary} />
          <Text style={[styles.title, { color: theme.colors.textSecondary }]}>
            Powiadomienia wyłączone
          </Text>
          <TouchableOpacity onPress={() => setNotificationsEnabled(true)}>
            <Text style={[styles.enableText, { color: theme.colors.primary }]}>
              Włącz
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Bell size={20} color={theme.colors.primary} />
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Powiadomienia pogodowe
          </Text>
          {activeAlerts.length > 0 && (
            <View style={[styles.alertBadge, { backgroundColor: theme.colors.error }]}>
              <Text style={styles.alertBadgeText}>{activeAlerts.length}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={() => setShowSettings(!showSettings)}>
          <Text>
            <Settings size={20} color={theme.colors.textSecondary} />
          </Text>
        </TouchableOpacity>
      </View>

      {showSettings && (
        <View style={styles.settingsContainer}>
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
              Powiadomienia
            </Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={notificationsEnabled ? theme.colors.background : theme.colors.textSecondary}
            />
          </View>
        </View>
      )}

      {activeAlerts.length === 0 ? (
        <View style={styles.noAlertsContainer}>
          <CheckCircle size={24} color={theme.colors.success} />
          <Text style={[styles.noAlertsText, { color: theme.colors.textSecondary }]}>
            Brak ostrzeżeń pogodowych
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.alertsContainer} showsVerticalScrollIndicator={false}>
          {activeAlerts.map((alert) => (
            <TouchableOpacity
              key={alert.id}
              style={[styles.alertItem, { borderLeftColor: getSeverityColor(alert.severity) }]}
              onPress={() => onAlertPress(alert)}
            >
              <View style={styles.alertHeader}>
                <View style={styles.alertInfo}>
                  <AlertTriangle size={16} color={getSeverityColor(alert.severity)} />
                  <View style={styles.alertText}>
                    <Text style={[styles.alertTitle, { color: theme.colors.text }]}>
                      {alert.title}
                    </Text>
                    <Text style={[styles.alertDescription, { color: theme.colors.textSecondary }]}>
                      {alert.description}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => dismissAlert(alert.id)}>
                  <Text>
                    <X size={16} color={theme.colors.textSecondary} />
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.alertFooter}>
                <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(alert.severity) }]}>
                  <Text style={styles.severityText}>
                    {getSeverityText(alert.severity)}
                  </Text>
                </View>
                <Text style={[styles.alertTime, { color: theme.colors.textSecondary }]}>
                  {alert.timestamp.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  alertBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  alertBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  enableText: {
    fontSize: 14,
    fontWeight: '500',
  },
  settingsContainer: {
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  noAlertsContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  noAlertsText: {
    fontSize: 14,
    fontWeight: '500',
  },
  alertsContainer: {
    maxHeight: 300,
  },
  alertItem: {
    borderLeftWidth: 4,
    backgroundColor: 'rgba(255, 107, 107, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  alertInfo: {
    flexDirection: 'row',
    flex: 1,
    gap: 12,
  },
  alertText: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  alertDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  alertFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  severityText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  alertTime: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default WeatherNotifications;
