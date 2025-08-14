import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  AlertTriangle,
  Thermometer,
  Wind,
  CloudRain,
  Gauge,
  TrendingUp,
  TrendingDown,
  Zap,
  Snowflake,
  Eye,
  Bell,
} from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';
import { SynopData } from '@/types/weather';

interface WeatherAlert {
  id: string;
  type: 'temperature' | 'pressure' | 'wind' | 'precipitation' | 'visibility' | 'frost';
  severity: 'low' | 'medium' | 'high' | 'extreme';
  title: string;
  description: string;
  value: number;
  threshold: number;
  trend: 'rising' | 'falling' | 'stable';
  icon: any;
  color: string;
  timestamp: Date;
}

interface WeatherAlertsWidgetProps {
  currentData?: SynopData;
  forecastData?: any;
  className?: string;
}

export const WeatherAlertsWidget: React.FC<WeatherAlertsWidgetProps> = ({
  currentData,
  forecastData,
}) => {
  const { theme } = useThemeStore();
  const [alerts, setAlerts] = useState<WeatherAlert[]>([]);
  const [animatedValues] = useState(() => 
    Array(5).fill(0).map(() => new Animated.Value(0))
  );

  useEffect(() => {
    if (currentData || forecastData) {
      const newAlerts = generateWeatherAlerts(currentData, forecastData);
      setAlerts(newAlerts);
      
      // Animate alerts
      if (newAlerts.length > 0) {
        Animated.stagger(200, 
          newAlerts.slice(0, 5).map((_, index) =>
            Animated.spring(animatedValues[index], {
              toValue: 1,
              useNativeDriver: true,
              tension: 50,
              friction: 7,
            })
          )
        ).start();
      }
    }
  }, [currentData, forecastData]);

  const generateWeatherAlerts = (synop?: SynopData, forecast?: any): WeatherAlert[] => {
    const alerts: WeatherAlert[] = [];
    
    if (!synop) return alerts;

    const temp = parseFloat(synop.temperatura || '0');
    const pressure = parseFloat(synop.cisnienie || '0');
    const windSpeed = parseFloat(synop.predkosc_wiatru || '0');
    const humidity = parseFloat(synop.wilgotnosc_wzgledna || '0');
    const precipitation = parseFloat(synop.suma_opadu || '0');

    // Temperature alerts
    if (temp > 30) {
      alerts.push({
        id: 'high-temp',
        type: 'temperature',
        severity: temp > 35 ? 'extreme' : 'high',
        title: 'Wysoka temperatura',
        description: `Temperatura osiągnęła ${temp.toFixed(1)}°C. Unikaj długotrwałego przebywania na słońcu.`,
        value: temp,
        threshold: 30,
        trend: 'rising',
        icon: Thermometer,
        color: '#FF4444',
        timestamp: new Date(),
      });
    }

    if (temp < -10) {
      alerts.push({
        id: 'low-temp',
        type: 'temperature',
        severity: temp < -20 ? 'extreme' : 'high',
        title: 'Bardzo niska temperatura',
        description: `Temperatura spadła do ${temp.toFixed(1)}°C. Ryzyko odmrożeń.`,
        value: temp,
        threshold: -10,
        trend: 'falling',
        icon: Snowflake,
        color: '#4A90E2',
        timestamp: new Date(),
      });
    }

    // Frost warning
    if (temp > 0 && temp < 5 && forecast?.hourly?.temperature_2m) {
      const nextHours = Array.isArray(forecast.hourly.temperature_2m) 
        ? forecast.hourly.temperature_2m.slice(0, 12) 
        : [];
      
      if (nextHours.length > 0) {
        const minTemp = Math.min(...nextHours);
        if (minTemp < 0) {
          alerts.push({
            id: 'frost-warning',
            type: 'frost',
            severity: 'medium',
            title: 'Ostrzeżenie o przymrozkach',
            description: `Spodziewane przymrozki w najbliższych godzinach. Min. temp: ${minTemp.toFixed(1)}°C`,
            value: minTemp,
            threshold: 0,
            trend: 'falling',
            icon: Snowflake,
            color: '#87CEEB',
            timestamp: new Date(),
          });
        }
      }
    }

    // Pressure alerts (rapid changes)
    if (pressure > 0) {
      if (pressure > 1025) {
        alerts.push({
          id: 'high-pressure',
          type: 'pressure',
          severity: 'medium',
          title: 'Wysokie ciśnienie',
          description: `Ciśnienie atmosferyczne: ${pressure.toFixed(0)} hPa. Możliwe pogorszenie samopoczucia.`,
          value: pressure,
          threshold: 1025,
          trend: 'rising',
          icon: Gauge,
          color: '#FFA726',
          timestamp: new Date(),
        });
      }

      if (pressure < 990) {
        alerts.push({
          id: 'low-pressure',
          type: 'pressure',
          severity: 'medium',
          title: 'Niskie ciśnienie',
          description: `Ciśnienie atmosferyczne: ${pressure.toFixed(0)} hPa. Możliwe bóle głowy.`,
          value: pressure,
          threshold: 990,
          trend: 'falling',
          icon: Gauge,
          color: '#42A5F5',
          timestamp: new Date(),
        });
      }
    }

    // Wind alerts
    if (windSpeed > 25) {
      alerts.push({
        id: 'strong-wind',
        type: 'wind',
        severity: windSpeed > 40 ? 'extreme' : 'high',
        title: 'Silny wiatr',
        description: `Prędkość wiatru: ${windSpeed.toFixed(1)} km/h. Uważaj na latające przedmioty.`,
        value: windSpeed,
        threshold: 25,
        trend: 'rising',
        icon: Wind,
        color: '#66BB6A',
        timestamp: new Date(),
      });
    }

    // Precipitation alerts
    if (precipitation > 10) {
      alerts.push({
        id: 'heavy-rain',
        type: 'precipitation',
        severity: precipitation > 30 ? 'extreme' : 'high',
        title: 'Intensywne opady',
        description: `Suma opadów: ${precipitation.toFixed(1)} mm. Możliwe lokalne podtopienia.`,
        value: precipitation,
        threshold: 10,
        trend: 'rising',
        icon: CloudRain,
        color: '#29B6F6',
        timestamp: new Date(),
      });
    }

    // Visibility alert (estimated from humidity)
    if (humidity > 95) {
      alerts.push({
        id: 'poor-visibility',
        type: 'visibility',
        severity: 'medium',
        title: 'Ograniczona widoczność',
        description: `Wilgotność ${humidity.toFixed(0)}%. Możliwa mgła - ostrożnie na drogach.`,
        value: humidity,
        threshold: 95,
        trend: 'rising',
        icon: Eye,
        color: '#78909C',
        timestamp: new Date(),
      });
    }

    return alerts.sort((a, b) => {
      const severityOrder = { extreme: 4, high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    }).slice(0, 3); // Show max 3 alerts
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'extreme': return '#D32F2F';
      case 'high': return '#F57C00';
      case 'medium': return '#FFA726';
      case 'low': return '#388E3C';
      default: return '#757575';
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

  if (alerts.length === 0) {
    return (
      <View style={styles.container}>
        <View style={[styles.noAlertsCard, { backgroundColor: theme.colors.card }]}>
          <Bell size={24} color="#4CAF50" fill="#4CAF50" />
          <Text style={[styles.noAlertsTitle, { color: theme.colors.text }]}>
            Brak alertów pogodowych
          </Text>
          <Text style={styles.noAlertsText}>
            Warunki pogodowe są w normie
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.colors.text }]}>
        Alerty pogodowe
      </Text>
      
      {alerts.map((alert, index) => (
        <Animated.View
          key={alert.id}
          style={[
            {
              opacity: animatedValues[index],
              transform: [{
                translateY: animatedValues[index].interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0]
                })
              }]
            }
          ]}
        >
          <TouchableOpacity
            style={styles.alertCard}
            onPress={() => {
              Alert.alert(alert.title, alert.description);
            }}
          >
            <LinearGradient
              colors={[getSeverityColor(alert.severity), getSeverityColor(alert.severity) + '80']}
              style={styles.alertGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.alertHeader}>
                <View style={styles.alertIconContainer}>
                  <alert.icon size={20} color="white" fill="white" />
                </View>
                
                <View style={styles.alertInfo}>
                  <View style={styles.alertTitleRow}>
                    <Text style={styles.alertTitle}>{alert.title}</Text>
                    <View style={styles.severityBadge}>
                      <Text style={styles.severityText}>
                        {getSeverityText(alert.severity)}
                      </Text>
                    </View>
                  </View>
                  
                  <Text style={styles.alertDescription} numberOfLines={2}>
                    {alert.description}
                  </Text>
                </View>
                
                <View style={styles.alertTrend}>
                  {alert.trend === 'rising' ? (
                    <TrendingUp size={16} color="white" />
                  ) : alert.trend === 'falling' ? (
                    <TrendingDown size={16} color="white" />
                  ) : (
                    <View style={styles.stableTrendLine} />
                  )}
                </View>
              </View>
              
              <View style={styles.alertFooter}>
                <Text style={styles.alertValue}>
                  Wartość: {alert.value.toFixed(1)}
                  {alert.type === 'temperature' ? '°C' : 
                   alert.type === 'pressure' ? ' hPa' :
                   alert.type === 'wind' ? ' km/h' :
                   alert.type === 'precipitation' ? ' mm' :
                   alert.type === 'visibility' || alert.type === 'frost' ? '%' : ''}
                </Text>
                <Text style={styles.alertTime}>
                  {alert.timestamp.toLocaleTimeString('pl-PL', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  noAlertsCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noAlertsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  noAlertsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  alertCard: {
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  alertGradient: {
    padding: 16,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  alertIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  alertInfo: {
    flex: 1,
  },
  alertTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
  },
  severityBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  severityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  alertDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 18,
  },
  alertTrend: {
    marginLeft: 8,
  },
  stableTrendLine: {
    width: 16,
    height: 2,
    backgroundColor: 'white',
    borderRadius: 1,
  },
  alertFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  alertValue: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  alertTime: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
  },
});
