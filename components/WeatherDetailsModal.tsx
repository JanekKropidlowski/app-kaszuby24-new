import React from 'react';
import { View, Text, StyleSheet, Modal, Dimensions, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '@/store/themeStore';
import { X, Droplets, Wind, SunMedium, Thermometer, Eye, Compass, TrendingUp, AlertTriangle } from 'lucide-react-native';

interface WeatherDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  type: 'humidity' | 'wind' | 'uv';
  data: {
    humidity?: number;
    windSpeed?: number;
    windDirection?: number;
    uvIndex?: number;
    temperature?: number;
    feelsLike?: number;
    pressure?: number;
    visibility?: number;
  };
}

export const WeatherDetailsModal: React.FC<WeatherDetailsModalProps> = ({
  visible,
  onClose,
  type,
  data,
}) => {
  if (!visible) return null;

  const { theme } = useThemeStore();
  const { height: screenHeight } = Dimensions.get('window');

  // Use fallback colors if theme is not ready
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

  const getModalConfig = (type: 'humidity' | 'wind' | 'uv') => {
    switch (type) {
      case 'humidity':
        return {
          icon: Droplets,
          title: 'Wilgotność',
          color: colors.primary,
          gradient: [colors.primary + '20', colors.primary + '05'] as [string, string],
        };
      case 'wind':
        return {
          icon: Wind,
          title: 'Wiatr',
          color: colors.secondary,
          gradient: [colors.secondary + '20', colors.secondary + '05'] as [string, string],
        };
      case 'uv':
        return {
          icon: SunMedium,
          title: 'Indeks UV',
          color: colors.warning,
          gradient: [colors.warning + '20', colors.warning + '05'] as [string, string],
        };
      default:
        return {
          icon: Thermometer,
          title: 'Szczegóły',
          color: colors.primary,
          gradient: [colors.primary + '20', colors.primary + '05'] as [string, string],
        };
    }
  };

  const getUVLevel = (uvIndex: number) => {
    if (uvIndex <= 2) return { level: 'Niski', color: colors.success };
    if (uvIndex <= 5) return { level: 'Średni', color: colors.warning };
    if (uvIndex <= 7) return { level: 'Wysoki', color: colors.error };
    if (uvIndex <= 10) return { level: 'Bardzo wysoki', color: colors.error };
    return { level: 'Ekstremalny', color: colors.error };
  };

  const getHumidityLevel = (humidity: number) => {
    if (humidity <= 30) return { level: 'Niska', color: colors.warning };
    if (humidity <= 60) return { level: 'Optymalna', color: colors.success };
    return { level: 'Wysoka', color: colors.info };
  };

  const getWindLevel = (windSpeed: number) => {
    if (windSpeed <= 10) return { level: 'Słaby', color: colors.success };
    if (windSpeed <= 20) return { level: 'Umiarkowany', color: colors.warning };
    if (windSpeed <= 30) return { level: 'Silny', color: colors.error };
    return { level: 'Bardzo silny', color: colors.error };
  };

  const renderContent = () => {
    const config = getModalConfig(type);
    const IconComponent = config.icon;

    switch (type) {
      case 'humidity':
        const humidityLevel = data.humidity !== undefined ? getHumidityLevel(data.humidity) : null;
        return (
          <View style={styles.contentContainer}>
            <View style={styles.headerSection}>
              <LinearGradient
                colors={config.gradient}
                style={styles.headerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.headerContent}>
                  <View style={[styles.iconContainer, { backgroundColor: config.color + '20' }]}>
                    <IconComponent size={48} color={config.color} fill={config.color} />
                  </View>
                  <View style={styles.headerTextContainer}>
                    <Text style={[styles.title, { color: colors.text }]}>{config.title}</Text>
                    {humidityLevel && (
                      <View style={[styles.levelBadge, { backgroundColor: humidityLevel.color + '20' }]}>
                        <Text style={[styles.levelText, { color: humidityLevel.color }]}>
                          {humidityLevel.level}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </LinearGradient>
            </View>
            
            <View style={styles.mainValue}>
              <Text style={[styles.value, { color: config.color }]}>
                {data.humidity !== undefined ? `${Math.round(data.humidity)}%` : '--'}
              </Text>
              <Text style={[styles.unit, { color: colors.textSecondary }]}>
                wilgotność względna
              </Text>
            </View>

            <View style={styles.detailsGrid}>
              <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: config.color + '20' }]}>
                <Thermometer size={28} color={config.color} fill={config.color} />
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Temperatura</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {data.temperature !== undefined ? `${Math.round(data.temperature)}°` : '--'}
                </Text>
              </View>
              
              <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: config.color + '20' }]}>
                <TrendingUp size={28} color={config.color} fill={config.color} />
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Odczuwalna</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {data.feelsLike !== undefined ? `${Math.round(data.feelsLike)}°` : '--'}
                </Text>
              </View>
            </View>

            <View style={styles.additionalInfo}>
              <Text style={[styles.additionalInfoText, { color: colors.textSecondary }]}>
                Wilgotność względna powietrza wskazuje na zawartość pary wodnej w atmosferze. 
                Wysoka wilgotność może powodować uczucie duszności, a niska może prowadzić do wysuszenia skóry.
              </Text>
            </View>
          </View>
        );

      case 'wind':
        const windLevel = data.windSpeed !== undefined ? getWindLevel(data.windSpeed) : null;
        return (
          <View style={styles.contentContainer}>
            <View style={styles.headerSection}>
              <LinearGradient
                colors={config.gradient}
                style={styles.headerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.headerContent}>
                  <View style={[styles.iconContainer, { backgroundColor: config.color + '20' }]}>
                    <IconComponent size={48} color={config.color} fill={config.color} />
                  </View>
                  <View style={styles.headerTextContainer}>
                    <Text style={[styles.title, { color: colors.text }]}>{config.title}</Text>
                    {windLevel && (
                      <View style={[styles.levelBadge, { backgroundColor: windLevel.color + '20' }]}>
                        <Text style={[styles.levelText, { color: windLevel.color }]}>
                          {windLevel.level}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </LinearGradient>
            </View>
            
            <View style={styles.mainValue}>
              <Text style={[styles.value, { color: config.color }]}>
                {data.windSpeed !== undefined ? `${Math.round(data.windSpeed)} km/h` : '--'}
              </Text>
              <Text style={[styles.unit, { color: colors.textSecondary }]}>
                prędkość wiatru
              </Text>
            </View>

            <View style={styles.detailsGrid}>
              <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: config.color + '20' }]}>
                <Compass size={28} color={config.color} fill={config.color} />
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Kierunek</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {data.windDirection !== undefined ? `${Math.round(data.windDirection)}°` : '--'}
                </Text>
              </View>
              
              <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: config.color + '20' }]}>
                <TrendingUp size={28} color={config.color} fill={config.color} />
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Ciśnienie</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {data.pressure !== undefined ? `${Math.round(data.pressure)} hPa` : '--'}
                </Text>
              </View>
            </View>

            <View style={styles.additionalInfo}>
              <Text style={[styles.additionalInfoText, { color: colors.textSecondary }]}>
                Prędkość wiatru wpływa na odczuwalną temperaturę. Silny wiatr może znacznie obniżyć temperaturę odczuwalną, 
                szczególnie w chłodne dni. Kierunek wiatru wskazuje skąd wieje wiatr.
              </Text>
            </View>
          </View>
        );

      case 'uv':
        const uvLevel = data.uvIndex !== undefined ? getUVLevel(data.uvIndex) : null;
        return (
          <View style={styles.contentContainer}>
            <View style={styles.headerSection}>
              <LinearGradient
                colors={config.gradient}
                style={styles.headerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.headerContent}>
                  <View style={[styles.iconContainer, { backgroundColor: config.color + '20' }]}>
                    <IconComponent size={48} color={config.color} fill={config.color} />
                  </View>
                  <View style={styles.headerTextContainer}>
                    <Text style={[styles.title, { color: colors.text }]}>{config.title}</Text>
                    {uvLevel && (
                      <View style={[styles.levelBadge, { backgroundColor: uvLevel.color + '20' }]}>
                        <Text style={[styles.levelText, { color: uvLevel.color }]}>
                          {uvLevel.level}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </LinearGradient>
            </View>
            
            <View style={styles.mainValue}>
              <Text style={[styles.value, { color: config.color }]}>
                {data.uvIndex !== undefined ? data.uvIndex : '--'}
              </Text>
              <Text style={[styles.unit, { color: colors.textSecondary }]}>
                poziom promieniowania
              </Text>
            </View>

            <View style={styles.detailsGrid}>
              <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: config.color + '20' }]}>
                <Eye size={28} color={config.color} fill={config.color} />
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Widoczność</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {data.visibility !== undefined ? `${Math.round(data.visibility)} km` : '--'}
                </Text>
              </View>
              
              <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: config.color + '20' }]}>
                <Thermometer size={28} color={config.color} fill={config.color} />
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Temperatura</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {data.temperature !== undefined ? `${Math.round(data.temperature)}°` : '--'}
                </Text>
              </View>
            </View>

            {uvLevel && uvLevel.color === colors.error && (
              <View style={[styles.warningCard, { backgroundColor: colors.error + '10', borderColor: colors.error + '30' }]}>
                <AlertTriangle size={24} color={colors.error} fill={colors.error} />
                <Text style={[styles.warningText, { color: colors.error }]}>
                  Wysokie UV - zalecana ochrona przed słońcem
                </Text>
              </View>
            )}

            <View style={styles.additionalInfo}>
              <Text style={[styles.additionalInfoText, { color: colors.textSecondary }]}>
                Indeks UV określa intensywność promieniowania ultrafioletowego. Wysokie wartości (8-11) wymagają 
                szczególnej ochrony przed słońcem, a bardzo wysokie (11+) oznaczają ekstremalne zagrożenie.
              </Text>
            </View>
          </View>
        );

      default:
        return (
          <View style={styles.contentContainer}>
            <Text style={[styles.title, { color: colors.text }]}>Błąd</Text>
            <Text style={[styles.additionalInfoText, { color: colors.textSecondary }]}>
              Nie można wyświetlić szczegółów dla tego typu danych.
            </Text>
          </View>
        );
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.handleBar, { backgroundColor: colors.border }]} />
          
          <Pressable 
            style={[styles.closeButton, { backgroundColor: colors.card }]}
            onPress={onClose}
          >
            <X size={20} color={colors.text} />
          </Pressable>

          <ScrollView 
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {renderContent()}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  contentContainer: {
    alignItems: 'center',
  },
  headerSection: {
    width: '100%',
    marginBottom: 24,
  },
  headerGradient: {
    width: '100%',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Poppins_SemiBold',
    marginBottom: 8,
  },
  levelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  levelText: {
    fontSize: 12,
    fontFamily: 'Poppins_Medium',
    textAlign: 'center',
  },
  mainValue: {
    alignItems: 'center',
    marginBottom: 32,
  },
  value: {
    fontSize: 64,
    fontFamily: 'Poppins_Light',
    lineHeight: 70,
  },
  unit: {
    fontSize: 16,
    fontFamily: 'Poppins_Regular',
    marginTop: 8,
    opacity: 0.8,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    gap: 16,
    marginBottom: 24,
  },
  detailCard: {
    width: '48%',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 100,
    justifyContent: 'center',
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_Medium',
    marginTop: 12,
    textAlign: 'center',
    opacity: 0.8,
  },
  detailValue: {
    fontSize: 22,
    fontFamily: 'Poppins_SemiBold',
    marginTop: 6,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
    gap: 10,
  },
  warningText: {
    fontSize: 14,
    fontFamily: 'Poppins_Medium',
    flex: 1,
    textAlign: 'center',
  },
  additionalInfo: {
    paddingHorizontal: 12,
  },
  additionalInfoText: {
    fontSize: 14,
    fontFamily: 'Poppins_Regular',
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.8,
  },
});

export default WeatherDetailsModal;