import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Dimensions, Animated, StatusBar } from 'react-native';
import { useThemeStore } from '@/store/themeStore';
import { X, Info, AlertTriangle, Clock, MapPin, Navigation, Shield, TrendingUp, TrendingDown, Minus, Star, CheckCircle, AlertCircle, Thermometer, Droplets, Wind, Eye, Gauge, Sun, CloudRain, Snowflake, Waves, Compass, Car, Mountain, Bike, Camera, Sprout, Activity, Anchor } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface DetailedWeatherModalProps {
  visible: boolean;
  onClose: () => void;
  weatherType: 'agricultural' | 'sailing' | 'driving' | 'hiking' | 'cycling' | 'tourist' | 'sports' | 'marine';
  weatherData: any;
  forecastData?: any;
  synopData?: any;
}

const { width, height } = Dimensions.get('window');

const DetailedWeatherModal: React.FC<DetailedWeatherModalProps> = ({
  visible,
  onClose,
  weatherType,
  weatherData,
  forecastData,
  synopData
}) => {
  const { theme } = useThemeStore();
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
    }
  }, [visible]);

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

  const getModalConfig = () => {
    const configs = {
      agricultural: {
        title: 'Szczegółowa pogoda dla rolnictwa',
        subtitle: 'Warunki upraw, indeksy rolnicze i prognozy',
        icon: Sprout,
        gradient: ['#16a34a', '#22c55e', '#4ade80'],
        accentColor: '#16a34a',
      },
      sailing: {
        title: 'Szczegółowa pogoda dla żeglarzy',
        subtitle: 'Warunki żeglarskie, prądy morskie i bezpieczeństwo',
        icon: Anchor,
        gradient: ['#0ea5e9', '#38bdf8', '#7dd3fc'],
        accentColor: '#0ea5e9',
      },
      driving: {
        title: 'Szczegółowa pogoda dla kierowców',
        subtitle: 'Warunki drogowe, bezpieczeństwo i zalecenia',
        icon: Car,
        gradient: ['#7c3aed', '#a855f7', '#c084fc'],
        accentColor: '#7c3aed',
      },
      hiking: {
        title: 'Szczegółowa pogoda dla turystyki pieszej',
        subtitle: 'Warunki wędrówek i trekkingu',
        icon: Mountain,
        gradient: ['#059669', '#10b981', '#34d399'],
        accentColor: '#059669',
      },
      cycling: {
        title: 'Szczegółowa pogoda dla rowerzystów',
        subtitle: 'Warunki jazdy rowerowej',
        icon: Bike,
        gradient: ['#dc2626', '#ef4444', '#f87171'],
        accentColor: '#dc2626',
      },
      tourist: {
        title: 'Szczegółowa pogoda dla turystów',
        subtitle: 'Warunki zwiedzania i turystyki',
        icon: Camera,
        gradient: ['#7c2d12', '#dc2626', '#f87171'],
        accentColor: '#7c2d12',
      },
      sports: {
        title: 'Szczegółowa pogoda dla sportu',
        subtitle: 'Warunki dla aktywności outdoorowych',
        icon: Activity,
        gradient: ['#f59e0b', '#fbbf24', '#fcd34d'],
        accentColor: '#f59e0b',
      },
      marine: {
        title: 'Szczegółowa pogoda morska',
        subtitle: 'Warunki dla żeglarzy i rybaków',
        icon: Waves,
        gradient: ['#0ea5e9', '#38bdf8', '#7dd3fc'],
        accentColor: '#0ea5e9',
      }
    };
    
    return configs[weatherType] || configs.agricultural;
  };

  const getTrendIcon = (trend?: string) => {
    if (!trend) return null;
    switch (trend) {
      case 'up': return <TrendingUp size={16} color={colors.success} />;
      case 'down': return <TrendingDown size={16} color={colors.error} />;
      case 'stable': return <Minus size={16} color={colors.warning} />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return colors.success;
      case 'good': return colors.info;
      case 'moderate': return colors.warning;
      case 'poor': return colors.error;
      case 'dangerous': return '#dc2626';
      default: return '#6b7280';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return colors.error;
      case 'medium': return colors.warning;
      case 'low': return colors.success;
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent': return <CheckCircle size={16} color={colors.success} />;
      case 'good': return <Star size={16} color={colors.info} />;
      case 'moderate': return <AlertCircle size={16} color={colors.warning} />;
      case 'poor': return <AlertTriangle size={16} color={colors.error} />;
      case 'dangerous': return <AlertTriangle size={16} color={colors.error} />;
      default: return <Info size={16} color={colors.textSecondary} />;
    }
  };

  const renderAgriculturalDetails = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      {/* Enhanced Indeksy rolnicze */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: getModalConfig().accentColor + '20' }]}>
            <Sprout size={24} color={getModalConfig().accentColor} />
          </View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Indeksy rolnicze</Text>
        </View>
        <View style={styles.indicesGrid}>
          <View style={[styles.indexCard, { backgroundColor: colors.success + '15', borderColor: colors.success + '30' }]}>
            <View style={styles.indexHeader}>
              <Text style={[styles.indexLabel, { color: colors.success }]}>Wzrost roślin</Text>
              {getTrendIcon('up')}
            </View>
            <Text style={[styles.indexValue, { color: colors.success }]}>
              {Math.round((parseFloat(weatherData?.temperatura || '0') + 10) * 2 + (parseFloat(weatherData?.wilgotnosc_wzgledna || '0') * 0.3) - (parseFloat(weatherData?.predkosc_wiatru || '0') * 0.5))}
            </Text>
            <Text style={[styles.indexDescription, { color: colors.textSecondary }]}>
              Optymalne warunki dla wzrostu roślin
            </Text>
          </View>
          
          <View style={[styles.indexCard, { backgroundColor: colors.warning + '15', borderColor: colors.warning + '30' }]}>
            <View style={styles.indexHeader}>
              <Text style={[styles.indexLabel, { color: colors.warning }]}>Ryzyko suszy</Text>
              {getTrendIcon('down')}
            </View>
            <Text style={[styles.indexValue, { color: colors.warning }]}>
              {Math.round((30 - parseFloat(weatherData?.temperatura || '0')) * 2 + (100 - parseFloat(weatherData?.wilgotnosc_wzgledna || '0')) * 0.5 + (parseFloat(weatherData?.predkosc_wiatru || '0') * 0.3))}
            </Text>
            <Text style={[styles.indexDescription, { color: colors.textSecondary }]}>
              Monitoruj wilgotność gleby
            </Text>
          </View>
          
          <View style={[styles.indexCard, { backgroundColor: colors.error + '15', borderColor: colors.error + '30' }]}>
            <View style={styles.indexHeader}>
              <Text style={[styles.indexLabel, { color: colors.error }]}>Ryzyko mrozu</Text>
              {getTrendIcon('stable')}
            </View>
            <Text style={[styles.indexValue, { color: colors.error }]}>
              {Math.round(Math.max(0, (0 - parseFloat(weatherData?.temperatura || '0')) * 10))}
            </Text>
            <Text style={[styles.indexDescription, { color: colors.textSecondary }]}>
              Ochrona przed przymrozkami
            </Text>
          </View>
        </View>
      </View>

      {/* Enhanced Warunki dla upraw */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: '#f59e0b' + '20' }]}>
            <CheckCircle size={24} color="#f59e0b" />
          </View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Warunki dla upraw</Text>
        </View>
        <View style={styles.cropsGrid}>
          {[
            { name: 'Zboża', minTemp: 5, maxTemp: 25, minHumidity: 40, icon: Sprout },
            { name: 'Ziemniaki', minTemp: 8, maxTemp: 22, minHumidity: 50, icon: Sprout },
            { name: 'Kukurydza', minTemp: 10, maxTemp: 30, minHumidity: 45, icon: Sprout },
            { name: 'Rzepak', minTemp: 3, maxTemp: 20, minHumidity: 35, icon: Sprout }
          ].map((crop, index) => {
            const temp = parseFloat(weatherData?.temperatura || '0');
            const humidity = parseFloat(weatherData?.wilgotnosc_wzgledna || '0');
            const isOptimal = temp >= crop.minTemp && temp <= crop.maxTemp && humidity >= crop.minHumidity;
            
            return (
              <View key={index} style={[styles.cropCard, { 
                backgroundColor: isOptimal ? colors.success + '15' : colors.warning + '15',
                borderColor: isOptimal ? colors.success + '30' : colors.warning + '30'
              }]}>
                <View style={styles.cropHeader}>
                  <crop.icon size={20} color={isOptimal ? colors.success : colors.warning} />
                  <Text style={[styles.cropName, { color: colors.text }]}>{crop.name}</Text>
                </View>
                <Text style={[styles.cropStatus, { color: isOptimal ? colors.success : colors.warning }]}>
                  {isOptimal ? 'Optymalne' : 'Nieoptymalne'}
                </Text>
                <View style={styles.cropDetails}>
                  <Text style={[styles.cropDetailsText, { color: colors.textSecondary }]}>
                    Temp: {crop.minTemp}°C - {crop.maxTemp}°C
                  </Text>
                  <Text style={[styles.cropDetailsText, { color: colors.textSecondary }]}>
                    Wilg.: min. {crop.minHumidity}%
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Enhanced Prognoza opadów */}
      {forecastData?.daily?.precipitation_sum && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#3b82f6' + '20' }]}>
              <CloudRain size={24} color="#3b82f6" />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Prognoza opadów (7 dni)</Text>
          </View>
          <View style={styles.precipitationChart}>
            {forecastData.daily.precipitation_sum.slice(0, 7).map((precip: number, index: number) => (
              <View key={index} style={styles.precipitationBar}>
                <View style={[styles.precipitationBarFill, { 
                  height: Math.min(80, (precip / 20) * 80),
                  backgroundColor: precip > 15 ? colors.error : precip > 8 ? colors.warning : colors.success
                }]} />
                <Text style={[styles.precipitationLabel, { color: colors.textSecondary }]}>
                  {precip.toFixed(1)}
                </Text>
                <Text style={[styles.precipitationDay, { color: colors.textSecondary }]}>
                  D+{index + 1}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Enhanced Zalecenia rolnicze */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: '#10b981' + '20' }]}>
            <Star size={24} color="#10b981" />
          </View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Zalecenia rolnicze</Text>
        </View>
        <View style={styles.recommendationsList}>
          {[
            { text: 'Sprawdź wilgotność gleby przed siewem', priority: 'high', icon: Info },
            { text: 'Monitoruj prognozy przymrozków', priority: 'medium', icon: AlertTriangle },
            { text: 'Dostosuj termin oprysków do warunków wietrznych', priority: 'medium', icon: Wind },
            { text: 'Kontroluj stan upraw w okresie suszy', priority: 'high', icon: Sun }
          ].map((recommendation, index) => (
            <View key={index} style={[styles.recommendationItem, { 
              backgroundColor: getPriorityColor(recommendation.priority) + '10',
              borderColor: getPriorityColor(recommendation.priority) + '20'
            }]}>
              <recommendation.icon size={18} color={getPriorityColor(recommendation.priority)} />
              <Text style={[styles.recommendationText, { color: colors.text }]}>
                {recommendation.text}
              </Text>
              <View style={[styles.priorityBadge, { 
                backgroundColor: getPriorityColor(recommendation.priority) + '20'
              }]}>
                <Text style={[styles.priorityText, { 
                  color: getPriorityColor(recommendation.priority)
                }]}>
                  {recommendation.priority === 'high' ? 'Wysokie' : 'Średnie'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Data Sources Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: colors.primary + '20' }]}>
            <Shield size={24} color={colors.primary} />
          </View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Źródła danych i stacja</Text>
        </View>
        <View style={styles.sourcesContainer}>
          <View style={[styles.sourceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sourceHeader}>
              <Shield size={18} color="#16a34a" />
              <Text style={[styles.sourceTitle, { color: colors.text }]}>Stacja IMGW-PIB</Text>
            </View>
            <Text style={[styles.sourceText, { color: colors.textSecondary }]}>
              Gdańsk-Rebiechowo (automatyczna)
            </Text>
            <Text style={[styles.sourceSubtext, { color: colors.textSecondary }]}>
              ID: 12160, Wysokość: 138m n.p.m.
            </Text>
          </View>
          
          <View style={[styles.sourceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sourceHeader}>
              <Shield size={18} color="#0ea5e9" />
              <Text style={[styles.sourceTitle, { color: colors.text }]}>Dane synoptyczne</Text>
            </View>
            <Text style={[styles.sourceText, { color: colors.textSecondary }]}>
              Temperatura, wilgotność, ciśnienie, wiatr, opady
            </Text>
            <Text style={[styles.sourceSubtext, { color: colors.textSecondary }]}>
              Aktualizacja: co 15 minut
            </Text>
          </View>

          <View style={[styles.sourceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sourceHeader}>
              <Shield size={18} color="#f59e0b" />
              <Text style={[styles.sourceTitle, { color: colors.text }]}>Dane automatyczne</Text>
            </View>
            <Text style={[styles.sourceText, { color: colors.textSecondary }]}>
              Widoczność, temperatura gruntu, nasłonecznienie
            </Text>
            <Text style={[styles.sourceSubtext, { color: colors.textSecondary }]}>
              Aktualizacja: co 1 godzinę
            </Text>
          </View>

          <View style={[styles.sourceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sourceHeader}>
              <Clock size={18} color={colors.primary} />
              <Text style={[styles.sourceTitle, { color: colors.text }]}>Ostatnia aktualizacja</Text>
            </View>
            <Text style={[styles.sourceText, { color: colors.textSecondary }]}>
              {weatherData?.data_pomiaru ? new Date(weatherData.data_pomiaru).toLocaleString('pl-PL') : 'Nieznana'}
            </Text>
            <Text style={[styles.sourceSubtext, { color: colors.textSecondary }]}>
              Czas lokalny (UTC+1/UTC+2)
            </Text>
          </View>

          <View style={[styles.sourceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sourceHeader}>
              <Shield size={18} color="#8b5cf6" />
              <Text style={[styles.sourceTitle, { color: colors.text }]}>Jakość danych</Text>
            </View>
            <Text style={[styles.sourceText, { color: colors.textSecondary }]}>
              {synopData && Object.keys(synopData).length > 0 ? 'Wysoka - dane z stacji synoptycznej' : 'Średnia - dane z stacji automatycznej'}
            </Text>
            <Text style={[styles.sourceSubtext, { color: colors.textSecondary }]}>
              Dokładność: ±0.5°C, ±2% wilgotność
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const renderSailingDetails = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      {/* Warunki żeglarskie */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Ocena warunków żeglowania</Text>
        <View style={styles.sailingConditionsGrid}>
          <View style={[styles.conditionCard, { backgroundColor: colors.success + '15' }]}>
            <Text style={[styles.conditionTitle, { color: colors.success }]}>Wiatr</Text>
            <Text style={[styles.conditionValue, { color: colors.text }]}>
              {weatherData?.predkosc_wiatru || '0'} km/h
            </Text>
            <Text style={[styles.conditionDescription, { color: colors.textSecondary }]}>
              {parseFloat(weatherData?.predkosc_wiatru || '0') <= 15 ? 'Idealne warunki' : 'Wymaga uwagi'}
            </Text>
          </View>
          
          <View style={[styles.conditionCard, { backgroundColor: colors.info + '15' }]}>
            <Text style={[styles.conditionTitle, { color: colors.info }]}>Widoczność</Text>
            <Text style={[styles.conditionValue, { color: colors.text }]}>
              {weatherData?.widocznosc || '10'} km
            </Text>
            <Text style={[styles.conditionDescription, { color: colors.textSecondary }]}>
              {parseFloat(weatherData?.widocznosc || '10') > 8 ? 'Dobra' : 'Ograniczona'}
            </Text>
          </View>
          
          <View style={[styles.conditionCard, { backgroundColor: colors.warning + '15' }]}>
            <Text style={[styles.conditionTitle, { color: colors.warning }]}>Fale</Text>
            <Text style={[styles.conditionValue, { color: colors.text }]}>
              {parseFloat(weatherData?.predkosc_wiatru || '0') <= 5 ? '0.2-0.5m' : 
               parseFloat(weatherData?.predkosc_wiatru || '0') <= 15 ? '0.5-1.5m' : '1.5m+'}
            </Text>
            <Text style={[styles.conditionDescription, { color: colors.textSecondary }]}>
              {parseFloat(weatherData?.predkosc_wiatru || '0') <= 15 ? 'Spokojne' : 'Wzburzone'}
            </Text>
          </View>
        </View>
      </View>

      {/* Prądy morskie */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Prądy morskie</Text>
        <View style={styles.currentsGrid}>
          <View style={[styles.currentCard, { backgroundColor: colors.primary + '15' }]}>
            <Navigation size={20} color={colors.primary} />
            <Text style={[styles.currentTitle, { color: colors.primary }]}>Prąd powierzchniowy</Text>
            <Text style={[styles.currentValue, { color: colors.text }]}>0.5-1.0 m/s NE</Text>
            <Text style={[styles.currentDescription, { color: colors.textSecondary }]}>
              Wpływa na nawigację i zużycie paliwa
            </Text>
          </View>
          
          <View style={[styles.currentCard, { backgroundColor: colors.info + '15' }]}>
            <MapPin size={20} color={colors.info} />
            <Text style={[styles.currentTitle, { color: colors.info }]}>Pływy</Text>
            <Text style={[styles.currentValue, { color: colors.text }]}>Przypływ 14:30</Text>
            <Text style={[styles.currentDescription, { color: colors.textSecondary }]}>
              Wysokość: 0.8m
            </Text>
          </View>
        </View>
      </View>

      {/* Prognoza żeglarska */}
      {forecastData?.hourly && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Prognoza 24h</Text>
          <View style={styles.sailingForecast}>
            <View style={styles.forecastHeader}>
              <Text style={[styles.forecastHeaderText, { color: colors.textSecondary }]}>Godzina</Text>
              <Text style={[styles.forecastHeaderText, { color: colors.textSecondary }]}>Wiatr</Text>
              <Text style={[styles.forecastHeaderText, { color: colors.textSecondary }]}>Widoczność</Text>
            </View>
            {[0, 6, 12, 18].map(hour => (
              <View key={hour} style={styles.forecastRow}>
                <Text style={[styles.forecastTime, { color: colors.text }]}>{hour}:00</Text>
                <Text style={[styles.forecastWind, { color: colors.text }]}>
                  {forecastData.hourly[hour]?.windspeed_10m?.toFixed(1) || '0'} km/h
                </Text>
                <Text style={[styles.forecastVisibility, { color: colors.text }]}>
                  {forecastData.hourly[hour]?.visibility?.toFixed(1) || '10'} km
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Bezpieczeństwo żeglarskie */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Bezpieczeństwo żeglarskie</Text>
        <View style={styles.safetyList}>
          {[
            'Sprawdź lokalne ostrzeżenia morskie',
            'Monitoruj komunikaty nawigacyjne',
            'Upewnij się o sprawności sprzętu ratunkowego',
            'Sprawdź prognozy dla planowanego rejsu'
          ].map((safety, index) => (
            <View key={index} style={styles.safetyItem}>
              <AlertTriangle size={16} color={colors.warning} />
              <Text style={[styles.safetyText, { color: colors.text }]}>
                {safety}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );

  const renderDrivingDetails = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      {/* Indeks bezpieczeństwa */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Indeks bezpieczeństwa jazdy</Text>
        <View style={styles.safetyIndexContainer}>
          <Shield size={40} color={colors.primary} />
          <Text style={[styles.safetyIndexValue, { color: colors.primary }]}>
            {(() => {
              let score = 100;
              const temp = parseFloat(weatherData?.temperatura || '0');
              const visibility = parseFloat(weatherData?.widocznosc || '10');
              const precip = parseFloat(weatherData?.opady || '0');
              const wind = parseFloat(weatherData?.predkosc_wiatru || '0');
              
              if (temp <= 0) score -= 20;
              else if (temp <= 5) score -= 10;
              if (visibility < 2) score -= 40;
              else if (visibility < 4) score -= 25;
              if (precip > 5) score -= 20;
              if (wind > 25) score -= 15;
              
              return Math.max(0, score);
            })()}
          </Text>
          <Text style={[styles.safetyIndexUnit, { color: colors.textSecondary }]}>/100</Text>
          <Text style={[styles.safetyIndexDescription, { color: colors.textSecondary }]}>
            {(() => {
              const score = (() => {
                let score = 100;
                const temp = parseFloat(weatherData?.temperatura || '0');
                const visibility = parseFloat(weatherData?.widocznosc || '10');
                const precip = parseFloat(weatherData?.opady || '0');
                const wind = parseFloat(weatherData?.predkosc_wiatru || '0');
                
                if (temp <= 0) score -= 20;
                else if (temp <= 5) score -= 10;
                if (visibility < 2) score -= 40;
                else if (visibility < 4) score -= 25;
                if (precip > 5) score -= 20;
                if (wind > 25) score -= 15;
                
                return Math.max(0, score);
              })();
              
              if (score >= 70) return 'Bezpieczne warunki jazdy';
              if (score >= 40) return 'Wymaga zwiększonej uwagi';
              return 'Niebezpieczne warunki - rozważ odłożenie podróży';
            })()}
          </Text>
        </View>
      </View>

      {/* Warunki drogowe */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Analiza warunków drogowych</Text>
        <View style={styles.roadConditionsGrid}>
          <View style={[styles.roadConditionCard, { backgroundColor: colors.success + '15' }]}>
            <Text style={[styles.roadConditionTitle, { color: colors.success }]}>Przyczepność</Text>
            <Text style={[styles.roadConditionValue, { color: colors.text }]}>
              {(() => {
                const temp = parseFloat(weatherData?.temperatura || '0');
                const precip = parseFloat(weatherData?.opady || '0');
                const humidity = parseFloat(weatherData?.wilgotnosc_wzgledna || '0');
                
                if (temp <= 2 && humidity > 80) return 'Słaba (lód)';
                if (temp <= 5 && precip > 0) return 'Ograniczona (śliskie)';
                if (precip > 2) return 'Dobra (mokre)';
                return 'Optymalna (suche)';
              })()}
            </Text>
          </View>
          
          <View style={[styles.roadConditionCard, { backgroundColor: colors.info + '15' }]}>
            <Text style={[styles.roadConditionTitle, { color: colors.info }]}>Widoczność</Text>
            <Text style={[styles.roadConditionValue, { color: colors.text }]}>
              {parseFloat(weatherData?.widocznosc || '10') > 8 ? 'Dobra' : 
               parseFloat(weatherData?.widocznosc || '10') > 4 ? 'Umiarkowana' : 'Słaba'}
            </Text>
          </View>
          
          <View style={[styles.roadConditionCard, { backgroundColor: colors.warning + '15' }]}>
            <Text style={[styles.roadConditionTitle, { color: colors.warning }]}>Stabilność</Text>
            <Text style={[styles.roadConditionValue, { color: colors.text }]}>
              {parseFloat(weatherData?.predkosc_wiatru || '0') <= 15 ? 'Dobra' : 
               parseFloat(weatherData?.predkosc_wiatru || '0') <= 25 ? 'Ograniczona' : 'Słaba'}
            </Text>
          </View>
        </View>
      </View>

      {/* Prognoza jazdy */}
      {forecastData?.hourly && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Prognoza warunków jazdy</Text>
          <View style={styles.drivingForecast}>
            <View style={styles.forecastHeader}>
              <Text style={[styles.forecastHeaderText, { color: colors.textSecondary }]}>Godzina</Text>
              <Text style={[styles.forecastHeaderText, { color: colors.textSecondary }]}>Temperatura</Text>
              <Text style={[styles.forecastHeaderText, { color: colors.textSecondary }]}>Opady</Text>
              <Text style={[styles.forecastHeaderText, { color: colors.textSecondary }]}>Widoczność</Text>
            </View>
            {[0, 3, 6, 9, 12, 15, 18, 21].map(hour => (
              <View key={hour} style={styles.forecastRow}>
                <Text style={[styles.forecastTime, { color: colors.text }]}>{hour}:00</Text>
                <Text style={[styles.forecastTemp, { color: colors.text }]}>
                  {forecastData.hourly[hour]?.temperature_2m?.toFixed(1) || '0'}°C
                </Text>
                <Text style={[styles.forecastPrecip, { color: colors.text }]}>
                  {forecastData.hourly[hour]?.precipitation?.toFixed(1) || '0'} mm
                </Text>
                <Text style={[styles.forecastVisibility, { color: colors.text }]}>
                  {forecastData.hourly[hour]?.visibility?.toFixed(1) || '10'} km
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Zalecenia dla kierowców */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Zalecenia dla kierowców</Text>
        <View style={styles.drivingRecommendations}>
          {[
            'Dostosuj prędkość do warunków atmosferycznych',
            'Zwiększ dystans od poprzedzającego pojazdu',
            'Sprawdź stan opon i hamulców',
            'Włącz odpowiednie światła (przeciwmgłowe, dzienne)',
            'Monitoruj komunikaty drogowe i ostrzeżenia'
          ].map((recommendation, index) => (
            <View key={index} style={styles.recommendationItem}>
              <Info size={16} color={colors.info} />
              <Text style={[styles.recommendationText, { color: colors.text }]}>
                {recommendation}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );

  const renderHikingDetails = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      {/* Hiking Conditions */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: getModalConfig().accentColor + '20' }]}>
            <Mountain size={24} color={getModalConfig().accentColor} />
          </View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Warunki wędrówek</Text>
        </View>
        <View style={styles.indicesGrid}>
          <View style={[styles.indexCard, { backgroundColor: colors.success + '15', borderColor: colors.success + '30' }]}>
            <View style={styles.indexHeader}>
              <Text style={[styles.indexLabel, { color: colors.success }]}>Bezpieczeństwo</Text>
              {getTrendIcon('up')}
            </View>
            <Text style={[styles.indexValue, { color: colors.success }]}>
              {(() => {
                const temp = parseFloat(weatherData?.temperatura || '0');
                const visibility = parseFloat(weatherData?.widocznosc || '10');
                if (temp >= 10 && temp <= 25 && visibility >= 8) return 'Wysokie';
                if (temp >= 5 && temp <= 30 && visibility >= 5) return 'Dobre';
                return 'Ograniczone';
              })()}
            </Text>
            <Text style={[styles.indexDescription, { color: colors.textSecondary }]}>
              Ocena warunków bezpieczeństwa
            </Text>
          </View>
          
          <View style={[styles.indexCard, { backgroundColor: colors.info + '15', borderColor: colors.info + '30' }]}>
            <View style={styles.indexHeader}>
              <Text style={[styles.indexLabel, { color: colors.info }]}>Komfort</Text>
              {getTrendIcon('stable')}
            </View>
            <Text style={[styles.indexValue, { color: colors.info }]}>
              {(() => {
                const temp = parseFloat(weatherData?.temperatura || '0');
                const wind = parseFloat(weatherData?.predkosc_wiatru || '0');
                if (temp >= 15 && temp <= 22 && wind <= 10) return 'Wysoki';
                if (temp >= 10 && temp <= 25 && wind <= 15) return 'Dobry';
                return 'Ograniczony';
              })()}
            </Text>
            <Text style={[styles.indexDescription, { color: colors.textSecondary }]}>
              Poziom komfortu wędrówki
            </Text>
          </View>
        </View>
      </View>

      {/* Trail Difficulty */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: '#f59e0b' + '20' }]}>
            <TrendingUp size={24} color="#f59e0b" />
          </View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Trudność szlaku</Text>
        </View>
        <View style={styles.cropsGrid}>
          <View style={[styles.cropCard, { 
            backgroundColor: colors.success + '15',
            borderColor: colors.success + '30'
          }]}>
            <View style={styles.cropHeader}>
              <Mountain size={20} color={colors.success} />
              <Text style={[styles.cropName, { color: colors.text }]}>Temperatura</Text>
            </View>
            <Text style={[styles.cropStatus, { color: colors.success }]}>
              {(() => {
                const temp = parseFloat(weatherData?.temperatura || '0');
                if (temp >= 10 && temp <= 20) return 'Optymalna';
                if (temp >= 5 && temp <= 25) return 'Dobra';
                return 'Wymaga uwagi';
              })()}
            </Text>
            <View style={styles.cropDetails}>
              <Text style={[styles.cropDetailsText, { color: colors.textSecondary }]}>
                Aktualna: {weatherData?.temperatura || '0'}°C
              </Text>
              <Text style={[styles.cropDetailsText, { color: colors.textSecondary }]}>
                Zakres: 10-20°C (optymalny)
              </Text>
            </View>
          </View>

          <View style={[styles.cropCard, { 
            backgroundColor: colors.info + '15',
            borderColor: colors.info + '30'
          }]}>
            <View style={styles.cropHeader}>
              <Eye size={20} color={colors.info} />
              <Text style={[styles.cropName, { color: colors.text }]}>Widoczność</Text>
            </View>
            <Text style={[styles.cropStatus, { color: colors.info }]}>
              {(() => {
                const visibility = parseFloat(weatherData?.widocznosc || '10');
                if (visibility >= 10) return 'Doskonała';
                if (visibility >= 5) return 'Dobra';
                return 'Ograniczona';
              })()}
            </Text>
            <View style={styles.cropDetails}>
              <Text style={[styles.cropDetailsText, { color: colors.textSecondary }]}>
                Aktualna: {weatherData?.widocznosc || '10'}km
              </Text>
              <Text style={[styles.cropDetailsText, { color: colors.textSecondary }]}>
                Minimum: 5km (bezpieczna)
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Recommendations Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: '#10b981' + '20' }]}>
            <Star size={24} color="#10b981" />
          </View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Rekomendacje</Text>
        </View>
        <View style={styles.recommendationsList}>
          {[
            { text: 'Sprawdź prognozę przed wyjściem w góry', priority: 'high', icon: Info },
            { text: 'Zabierz odpowiedni sprzęt i ubranie', priority: 'medium', icon: Shield },
            { text: 'Informuj o trasie i czasie powrotu', priority: 'medium', icon: AlertTriangle },
            { text: 'Monitoruj warunki atmosferyczne', priority: 'high', icon: Eye }
          ].map((recommendation, index) => (
            <View key={index} style={[styles.recommendationItem, { 
              backgroundColor: getPriorityColor(recommendation.priority) + '10',
              borderColor: getPriorityColor(recommendation.priority) + '20'
            }]}>
              <recommendation.icon size={18} color={getPriorityColor(recommendation.priority)} />
              <Text style={[styles.recommendationText, { color: colors.text }]}>
                {recommendation.text}
              </Text>
              <View style={[styles.priorityBadge, { 
                backgroundColor: getPriorityColor(recommendation.priority) + '20'
              }]}>
                <Text style={[styles.priorityText, { 
                  color: getPriorityColor(recommendation.priority)
                }]}>
                  {recommendation.priority === 'high' ? 'Wysokie' : 'Średnie'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Data Sources Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: colors.primary + '20' }]}>
            <Shield size={24} color={colors.primary} />
          </View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Źródła danych i stacja</Text>
        </View>
        <View style={styles.sourcesContainer}>
          <View style={[styles.sourceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sourceHeader}>
              <Shield size={18} color="#16a34a" />
              <Text style={[styles.sourceTitle, { color: colors.text }]}>Stacja IMGW-PIB</Text>
            </View>
            <Text style={[styles.sourceText, { color: colors.textSecondary }]}>
              Gdańsk-Rebiechowo (automatyczna)
            </Text>
            <Text style={[styles.sourceSubtext, { color: colors.textSecondary }]}>
              ID: 12160, Wysokość: 138m n.p.m.
            </Text>
          </View>
          
          <View style={[styles.sourceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sourceHeader}>
              <Clock size={18} color={colors.primary} />
              <Text style={[styles.sourceTitle, { color: colors.text }]}>Ostatnia aktualizacja</Text>
            </View>
            <Text style={[styles.sourceText, { color: colors.textSecondary }]}>
              {weatherData?.data_pomiaru ? new Date(weatherData.data_pomiaru).toLocaleString('pl-PL') : 'Nieznana'}
            </Text>
            <Text style={[styles.sourceSubtext, { color: colors.textSecondary }]}>
              Czas lokalny (UTC+1/UTC+2)
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const renderContent = () => {
    switch (weatherType) {
      case 'agricultural':
        return renderAgriculturalDetails();
      case 'sailing':
        return renderSailingDetails();
      case 'driving':
        return renderDrivingDetails();
      case 'hiking':
        return renderHikingDetails();
      default:
        return renderAgriculturalDetails();
    }
  };

  const modalConfig = getModalConfig();

  return (
    <Modal
      visible={visible}
      animationType="none"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <StatusBar backgroundColor="rgba(0,0,0,0.8)" barStyle="light-content" />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Enhanced Header */}
        <LinearGradient
          colors={modalConfig.gradient as [string, string, string]}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <View style={[styles.headerIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <modalConfig.icon size={24} color="#FFFFFF" />
              </View>
              <View style={styles.headerText}>
                <Text style={styles.modalTitle}>{modalConfig.title}</Text>
                <Text style={styles.modalSubtitle}>{modalConfig.subtitle}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Enhanced Content */}
        <Animated.View 
          style={[
            styles.animatedContent,
            { 
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {renderContent()}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  headerText: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    color: '#fff',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 18,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  animatedContent: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    letterSpacing: 0.3,
  },
  indicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  indexCard: {
    width: '48%',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 12,
  },
  indexHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  indexLabel: {
    fontSize: 13,
    fontFamily: 'Poppins-SemiBold',
    textAlign: 'center',
  },
  indexValue: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    marginBottom: 6,
  },
  indexDescription: {
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
    lineHeight: 15,
  },
  cropsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  cropCard: {
    width: '48%',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 12,
  },
  cropHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  cropName: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    flex: 1,
  },
  cropStatus: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    marginBottom: 10,
    textAlign: 'center',
  },
  cropDetails: {
    gap: 3,
  },
  cropDetailsText: {
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
    lineHeight: 14,
  },
  precipitationChart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 100,
    paddingVertical: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingHorizontal: 16,
  },
  precipitationBar: {
    alignItems: 'center',
    flex: 1,
  },
  precipitationBarFill: {
    width: 20,
    borderRadius: 10,
    marginBottom: 6,
  },
  precipitationLabel: {
    fontSize: 11,
    fontFamily: 'Poppins-Medium',
    marginBottom: 3,
  },
  precipitationDay: {
    fontSize: 10,
    fontFamily: 'Poppins-Regular',
  },
  recommendationsList: {
    gap: 10,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  recommendationText: {
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
    flex: 1,
    lineHeight: 18,
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 9,
    fontFamily: 'Poppins-Medium',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  sourcesContainer: {
    gap: 10,
  },
  sourceCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sourceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  sourceTitle: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
  },
  sourceText: {
    fontSize: 12,
    lineHeight: 18,
    opacity: 0.8,
    marginBottom: 3,
    fontFamily: 'Poppins-Regular',
  },
  sourceSubtext: {
    fontSize: 10,
    lineHeight: 14,
    opacity: 0.6,
    fontStyle: 'italic',
    fontFamily: 'Poppins-Regular',
  },
  sailingConditionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  conditionCard: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  conditionTitle: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    marginBottom: 8,
  },
  conditionValue: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    marginBottom: 4,
  },
  conditionDescription: {
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
  },
  currentsGrid: {
    gap: 12,
  },
  currentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  currentTitle: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    marginBottom: 4,
  },
  currentValue: {
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    marginBottom: 4,
  },
  currentDescription: {
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
    flex: 1,
  },
  sailingForecast: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
  },
  forecastHeader: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  forecastHeaderText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    textAlign: 'center',
  },
  forecastRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  forecastTime: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    textAlign: 'center',
  },
  forecastWind: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    textAlign: 'center',
  },
  forecastVisibility: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    textAlign: 'center',
  },
  safetyList: {
    gap: 8,
  },
  safetyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    gap: 8,
  },
  safetyText: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    flex: 1,
  },
  safetyIndexContainer: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
  },
  safetyIndexValue: {
    fontSize: 48,
    fontFamily: 'Poppins-Bold',
    marginVertical: 16,
  },
  safetyIndexUnit: {
    fontSize: 20,
    fontFamily: 'Poppins-Medium',
    marginBottom: 8,
  },
  safetyIndexDescription: {
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    textAlign: 'center',
  },
  roadConditionsGrid: {
    gap: 12,
  },
  roadConditionCard: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  roadConditionTitle: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    marginBottom: 8,
  },
  roadConditionValue: {
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    textAlign: 'center',
  },
  drivingForecast: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
  },
  forecastTemp: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    textAlign: 'center',
  },
  forecastPrecip: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    textAlign: 'center',
  },
  drivingRecommendations: {
    gap: 8,
  },
});

export default DetailedWeatherModal;

