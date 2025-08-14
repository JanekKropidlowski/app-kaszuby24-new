import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated,
} from 'react-native';
import { useThemeStore } from '@/store/themeStore';
import {
  X,
  Thermometer,
  Droplets,
  Wind,
  Gauge,
  Eye,
  Sun,
  Moon,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  MapPin,
  Clock,
  AlertTriangle,
  ChevronRight,
  Calendar,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { WeatherIcon } from '@/components/WeatherIcon';

interface WeatherDetailModalProps {
  visible: boolean;
  onClose: () => void;
  weatherData: any;
  forecastData?: any;
  location?: string;
  type: 'current' | 'forecast' | 'marine' | 'agricultural' | 'driver' | 'air-quality';
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const WeatherDetailModal = ({
  visible,
  onClose,
  weatherData,
  forecastData,
  location = 'Nieznana lokalizacja',
  type,
}: WeatherDetailModalProps) => {
  const { theme } = useThemeStore();
  const styles = getStyles(theme);

  const getWeatherIcon = (weatherCode: number, size: number = 24) => {
    const iconProps = { size, color: theme.colors.primary };
    
    if (weatherCode <= 1) return <Sun {...iconProps} />;
    if (weatherCode === 2) return <Cloud {...iconProps} />;
    if (weatherCode === 3) return <Cloud {...iconProps} />;
    if (weatherCode >= 45 && weatherCode <= 48) return <Cloud {...iconProps} />;
    if (weatherCode >= 51 && weatherCode <= 55) return <CloudRain {...iconProps} />;
    if (weatherCode >= 56 && weatherCode <= 67) return <CloudRain {...iconProps} />;
    if (weatherCode >= 71 && weatherCode <= 77) return <CloudSnow {...iconProps} />;
    if (weatherCode >= 80 && weatherCode <= 82) return <CloudRain {...iconProps} />;
    if (weatherCode >= 85 && weatherCode <= 86) return <CloudSnow {...iconProps} />;
    if (weatherCode >= 95 && weatherCode <= 99) return <CloudLightning {...iconProps} />;
    return <Cloud {...iconProps} />;
  };

  const getWeatherDescription = (weatherCode: number) => {
    if (weatherCode <= 1) return 'Bezchmurnie';
    if (weatherCode === 2) return 'Lekko pochmurno';
    if (weatherCode === 3) return 'Pochmurno';
    if (weatherCode === 4) return 'Zachmurzenie całkowite';
    if (weatherCode >= 45 && weatherCode <= 48) return 'Mgliście';
    if (weatherCode >= 51 && weatherCode <= 57) return 'Mżawka';
    if (weatherCode >= 61 && weatherCode <= 67) return 'Deszczowo';
    if (weatherCode >= 71 && weatherCode <= 77) return 'Śnieżnie';
    if (weatherCode >= 80 && weatherCode <= 82) return 'Przelotne opady';
    if (weatherCode >= 95 && weatherCode <= 99) return 'Burza';
    return 'Bezchmurnie';
  };

  const getGradientColors = () => {
    const temp = parseFloat(weatherData?.temperatura || '0');
    if (temp >= 25) return ['#FF6B6B', '#FF8E53'];
    if (temp >= 15) return ['#4ECDC4', '#44A08D'];
    if (temp >= 5) return ['#667eea', '#764ba2'];
    return ['#667eea', '#764ba2'];
  };

  const renderCurrentWeatherDetails = () => (
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={getGradientColors() as [string, string, string]} style={styles.headerGradient}>
        <View style={styles.headerContent}>
          <View style={styles.locationInfo}>
            <MapPin size={20} color="#fff" />
            <Text style={styles.locationText}>{location}</Text>
          </View>
          <Text style={styles.temperatureText}>
            {parseFloat(weatherData?.temperatura || '0').toFixed(1)}°
          </Text>
          <Text style={styles.descriptionText}>
            {getWeatherDescription(weatherData?.weathercode || 0)}
          </Text>
          <View style={styles.weatherIconContainer}>
            <WeatherIcon 
              wmoCode={weatherData?.weathercode || 0} 
              size={80} 
            />
          </View>
        </View>
      </LinearGradient>

      <View style={styles.detailsContainer}>
        <Text style={styles.sectionTitle}>Szczegóły pogodowe</Text>
        
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Thermometer size={24} color={theme.colors.primary} />
            <Text style={styles.metricLabel}>Temperatura</Text>
            <Text style={styles.metricValue}>
              {parseFloat(weatherData?.temperatura || '0').toFixed(1)}°C
            </Text>
            <Text style={styles.metricSubtext}>
              Odczuwalna: {(parseFloat(weatherData?.temperatura || '0') - 2).toFixed(1)}°C
            </Text>
          </View>

          <View style={styles.metricCard}>
            <Droplets size={24} color={theme.colors.primary} />
            <Text style={styles.metricLabel}>Wilgotność</Text>
            <Text style={styles.metricValue}>
              {parseFloat(weatherData?.wilgotnosc_wzgledna || '0').toFixed(0)}%
            </Text>
          </View>

          <View style={styles.metricCard}>
            <Wind size={24} color={theme.colors.primary} />
            <Text style={styles.metricLabel}>Wiatr</Text>
            <Text style={styles.metricValue}>
              {parseFloat(weatherData?.predkosc_wiatru || '0').toFixed(1)} m/s
            </Text>
            <Text style={styles.metricSubtext}>
              Kierunek: {weatherData?.kierunek_wiatru || '0'}°
            </Text>
          </View>

          <View style={styles.metricCard}>
            <Gauge size={24} color={theme.colors.primary} />
            <Text style={styles.metricLabel}>Ciśnienie</Text>
            <Text style={styles.metricValue}>
              {parseFloat(weatherData?.cisnienie || '0').toFixed(0)} hPa
            </Text>
          </View>

          <View style={styles.metricCard}>
            <Eye size={24} color={theme.colors.primary} />
            <Text style={styles.metricLabel}>Widoczność</Text>
            <Text style={styles.metricValue}>Dobra</Text>
          </View>

          <View style={styles.metricCard}>
            <CloudRain size={24} color={theme.colors.primary} />
            <Text style={styles.metricLabel}>Opady</Text>
            <Text style={styles.metricValue}>
              {parseFloat(weatherData?.suma_opadu || '0').toFixed(1)} mm
            </Text>
          </View>
        </View>

        {forecastData && (
          <View style={styles.forecastSection}>
            <Text style={styles.sectionTitle}>Prognoza na dziś</Text>
            <View style={styles.forecastCards}>
              {forecastData?.hourly?.time?.slice(0, 8).map((time: string, index: number) => {
                const hour = new Date(time).getHours();
                const temp = forecastData?.hourly?.temperature_2m?.[index] || 0;
                const weatherCode = forecastData?.hourly?.weathercode?.[index] || 0;
                
                return (
                  <View key={time} style={styles.forecastCard}>
                    <Text style={styles.forecastTime}>{hour}:00</Text>
                    <WeatherIcon wmoCode={weatherCode} size={32} />
                    <Text style={styles.forecastTemp}>{temp.toFixed(0)}°</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );

  const renderForecastDetails = () => (
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={['rgba(30, 58, 138, 0.7)', 'rgba(15, 23, 42, 0.7)']} style={styles.headerGradient}>
        <View style={styles.headerContent}>
          <View style={styles.weatherDescription}>
            <View style={styles.weatherIconContainer}>
              <WeatherIcon 
                wmoCode={parseInt(weatherData?.wmo_code || '0')} 
                size={80} 
              />
            </View>
            <Text style={styles.temperatureText}>
              {parseFloat(weatherData?.temperatura || '0').toFixed(1)}°
            </Text>
            <Text style={styles.weatherDescriptionText}>
              {getWeatherDescription(parseInt(weatherData?.wmo_code || '0'))}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.detailsContainer}>
        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <View style={[styles.detailIcon, { backgroundColor: theme.colors.primary + '20' }]}>
              <Thermometer size={20} color={theme.colors.primary} />
            </View>
            <Text style={styles.detailLabel}>Temperatura</Text>
            <Text style={styles.detailValue}>
              {parseFloat(weatherData?.temperatura || '0').toFixed(1)}°C
            </Text>
          </View>

          <View style={styles.detailItem}>
            <View style={[styles.detailIcon, { backgroundColor: '#45B7D1' + '20' }]}>
              <Wind size={20} color="#45B7D1" />
            </View>
            <Text style={styles.detailLabel}>Wiatr</Text>
            <Text style={styles.detailValue}>
              {parseFloat(weatherData?.predkosc_wiatru || '0').toFixed(1)} km/h
            </Text>
          </View>

          <View style={styles.detailItem}>
            <View style={[styles.detailIcon, { backgroundColor: '#4ECDC4' + '20' }]}>
              <Droplets size={20} color="#4ECDC4" />
            </View>
            <Text style={styles.detailLabel}>Wilgotność</Text>
            <Text style={styles.detailValue}>
              {parseFloat(weatherData?.wilgotnosc_wzgledna || '0').toFixed(0)}%
            </Text>
          </View>

          <View style={styles.detailItem}>
            <View style={[styles.detailIcon, { backgroundColor: '#96CEB4' + '20' }]}>
              <CloudRain size={20} color="#96CEB4" />
            </View>
            <Text style={styles.detailLabel}>Opady</Text>
            <Text style={styles.detailValue}>
              {parseFloat(weatherData?.suma_opadu || '0').toFixed(1)} mm/h
            </Text>
          </View>
        </View>

        <View style={styles.timeInfo}>
          <View style={styles.timeItem}>
            <Clock size={16} color={theme.colors.textSecondary} />
            <Text style={styles.timeText}>
              {weatherData?.godzina_pomiaru}:00
            </Text>
          </View>
          <View style={styles.timeItem}>
            <Calendar size={16} color={theme.colors.textSecondary} />
            <Text style={styles.timeText}>
              {weatherData?.data_pomiaru}
            </Text>
          </View>
        </View>

        <View style={styles.forecastTip}>
          <AlertTriangle size={16} color={theme.colors.primary} />
          <Text style={styles.forecastTipText}>
            Prognoza godzinowa pokazuje szczegółowe warunki pogodowe dla konkretnej godziny
          </Text>
        </View>
      </View>
    </ScrollView>
  );

  const renderContent = () => {
    switch (type) {
      case 'current':
        return renderCurrentWeatherDetails();
      case 'forecast':
        return renderForecastDetails();
      case 'marine':
        return <Text style={styles.placeholderText}>Szczegóły warunków morskich</Text>;
      case 'agricultural':
        return <Text style={styles.placeholderText}>Szczegóły warunków rolniczych</Text>;
      case 'driver':
        return <Text style={styles.placeholderText}>Szczegóły warunków drogowych</Text>;
      case 'air-quality':
        return <Text style={styles.placeholderText}>Szczegóły jakości powietrza</Text>;
      default:
        return renderCurrentWeatherDetails();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>
            {type === 'current' && 'Szczegóły pogody'}
            {type === 'forecast' && 'Prognoza godzinowa'}
            {type === 'marine' && 'Warunki morskie'}
            {type === 'agricultural' && 'Warunki rolnicze'}
            {type === 'driver' && 'Warunki drogowe'}
            {type === 'air-quality' && 'Jakość powietrza'}
          </Text>
          <View style={styles.placeholder} />
        </View>
        
        {renderContent()}
      </View>
    </Modal>
  );
};

const getStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontFamily: 'Poppins_Bold',
    fontSize: 18,
    color: theme.colors.text,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  headerGradient: {
    padding: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  locationText: {
    fontFamily: 'Poppins_Medium',
    fontSize: 16,
    color: '#fff',
  },

  descriptionText: {
    fontFamily: 'Poppins_Medium',
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 22,
  },

  detailsContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontFamily: 'Poppins_Bold',
    fontSize: 20,
    color: theme.colors.text,
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 24,
  },
  metricCard: {
    width: '48%',
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 12,
  },
  metricLabel: {
    fontFamily: 'Poppins_Medium',
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 8,
    marginBottom: 4,
  },
  metricValue: {
    fontFamily: 'Poppins_Bold',
    fontSize: 18,
    color: theme.colors.text,
  },
  metricSubtext: {
    fontFamily: 'Poppins_Regular',
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  forecastSection: {
    marginTop: 16,
  },
  forecastCards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  forecastCard: {
    width: '48%',
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  forecastTime: {
    fontFamily: 'Poppins_Medium',
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  forecastTemp: {
    fontFamily: 'Poppins_Bold',
    fontSize: 16,
    color: theme.colors.text,
    marginTop: 8,
  },
  placeholderText: {
    fontFamily: 'Poppins_Medium',
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 100,
  },
  mainWeatherInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  temperatureContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flex: 1,
  },
  temperatureValue: {
    fontFamily: 'Poppins_Bold',
    fontSize: 64,
    color: '#fff',
    lineHeight: 72,
    letterSpacing: -1,
  },
  temperatureUnit: {
    fontFamily: 'Poppins_Bold',
    fontSize: 32,
    color: '#fff',
    marginLeft: 8,
    opacity: 0.9,
  },
  weatherDescription: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 12,
  },
  weatherIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  temperatureText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  weatherDescriptionText: {
    fontFamily: 'Poppins_Medium',
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 20,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  detailItem: {
    width: '48%',
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontFamily: 'Poppins_Medium',
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  detailValue: {
    fontFamily: 'Poppins_Bold',
    fontSize: 18,
    color: theme.colors.text,
  },
  timeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  timeItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontFamily: 'Poppins_Medium',
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: 8,
  },
  forecastTip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.subtle,
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
  },
  forecastTipText: {
    fontFamily: 'Poppins_Medium',
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: 8,
  },
});

export default WeatherDetailModal;