import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Modal, Pressable } from 'react-native';
import { ScrollView as GHScrollView } from 'react-native-gesture-handler';
import { Settings, X, Check, GripVertical } from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';
import { WeatherConfig as WeatherConfigType, useWeatherConfigStore } from '@/store/weatherConfigStore';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';

interface WeatherConfigProps {
  visible: boolean;
  onClose: () => void;
  config: WeatherConfigType;
  onConfigChange: (config: WeatherConfigType) => void;
}

export const WeatherConfig: React.FC<WeatherConfigProps> = ({
  visible,
  onClose,
  config,
  onConfigChange,
}) => {
  const { theme } = useThemeStore();
  const { sectionOrder, setSectionOrder } = useWeatherConfigStore();
  const defaults: WeatherConfigType = {
    showHourlyForecast: true,
    showWeeklyForecast: true,
    showSpecializedWidgets: false,
    showAlerts: true,
    showRadarPrecipitation: true,
    showAgriculturalWeather: false,
    showMarineWeather: false,
    showDrivingWeather: false
  };
  const [tempConfig, setTempConfig] = useState<WeatherConfigType>({ ...defaults, ...config });
  const [tempOrder, setTempOrder] = useState<Array<'weekly' | 'alerts' | 'hourly' | 'radar' | 'specialized'>>(sectionOrder || ['weekly','alerts','hourly','radar','specialized']);

  React.useEffect(() => {
    // Normalize on open or when config updates
    setTempConfig({ ...defaults, ...config });
    setTempOrder(sectionOrder || ['weekly','alerts','hourly','radar','specialized']);
  }, [visible, config, sectionOrder]);

  const handleSave = () => {
    onConfigChange(tempConfig);
    setSectionOrder(tempOrder);
    onClose();
  };

  const toggleOption = (key: keyof WeatherConfigType) => {
    setTempConfig(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const ConfigOption = ({ 
    title, 
    description, 
    value, 
    onToggle 
  }: {
    title: string;
    description: string;
    value: boolean;
    onToggle: () => void;
  }) => (
    <View style={styles.optionRow}>
      <View style={styles.optionInfo}>
        <Text style={[styles.optionTitle, { color: theme.colors.text, fontFamily: theme.fontFamily?.semibold }]}>{title}</Text>
        <Text style={[styles.optionDescription, { color: theme.colors.textSecondary, fontFamily: theme.fontFamily?.regular }]}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
        thumbColor={value ? '#FFFFFF' : '#FFFFFF'}
      />
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <View style={styles.headerContent}>
              <Settings size={24} color={theme.colors.primary} />
              <Text style={[styles.headerTitle, { color: theme.colors.text, fontFamily: theme.fontFamily?.bold }]}>Konfiguracja pogody</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: theme.colors.card }]}>
              <X size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <GHScrollView 
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary, fontFamily: theme.fontFamily?.medium }]}>Co chcesz widzieć na głównym ekranie?</Text>
            
            <ConfigOption
              title="Prognoza godzinowa"
              description="Szczegółowa prognoza na kolejne 24 godziny z danymi IMGW-PIB"
              value={tempConfig.showHourlyForecast}
              onToggle={() => toggleOption('showHourlyForecast')}
            />

            <ConfigOption
              title="Prognoza 7-dniowa"
              description="Tygodniowa prognoza z temperaturami min/max i opadami"
              value={tempConfig.showWeeklyForecast}
              onToggle={() => toggleOption('showWeeklyForecast')}
            />

            <ConfigOption
              title="Pogoda specjalistyczna"
              description="Dla rolników, żeglarzy, kierowców i sportowców"
              value={tempConfig.showSpecializedWidgets}
              onToggle={() => toggleOption('showSpecializedWidgets')}
            />

            {tempConfig.showSpecializedWidgets && (
              <>
                <View style={styles.subsectionHeader}>
                  <Text style={[styles.subsectionTitle, { color: theme.colors.textSecondary, fontFamily: theme.fontFamily?.medium }]}>
                    Rodzaje pogody specjalistycznej
                  </Text>
                </View>
                
                <ConfigOption
                  title="Pogoda dla Rolnictwa"
                  description="Warunki upraw, indeksy rolnicze i prognozy"
                  value={tempConfig.showAgriculturalWeather}
                  onToggle={() => toggleOption('showAgriculturalWeather')}
                />

                <ConfigOption
                  title="Pogoda Morska"
                  description="Warunki żeglarskie, prądy morskie i bezpieczeństwo"
                  value={tempConfig.showMarineWeather}
                  onToggle={() => toggleOption('showMarineWeather')}
                />

                <ConfigOption
                  title="Pogoda dla Kierowców"
                  description="Warunki drogowe, bezpieczeństwo i zalecenia"
                  value={tempConfig.showDrivingWeather}
                  onToggle={() => toggleOption('showDrivingWeather')}
                />
              </>
            )}


            <ConfigOption
              title="Ostrzeżenia pogodowe"
              description="Aktywne ostrzeżenia IMGW-PIB dla Twojego regionu"
              value={tempConfig.showAlerts}
              onToggle={() => toggleOption('showAlerts')}
            />

            <ConfigOption
              title="Radar opadów IMGW"
              description="Interaktywna mapa opadów z danymi radarowymi IMGW-PIB"
              value={tempConfig.showRadarPrecipitation}
              onToggle={() => toggleOption('showRadarPrecipitation')}
            />

            <View style={styles.subsectionHeader}>
              <Text style={[styles.subsectionTitle, { color: theme.colors.textSecondary, fontFamily: theme.fontFamily?.medium }]}>Kolejność sekcji</Text>
              <Text style={[styles.helperNote, { color: theme.colors.textSecondary }]}>Przytrzymaj i przeciągnij, aby ustawić kolejność</Text>
            </View>

            <DraggableFlatList
              data={tempOrder}
              keyExtractor={(k) => k}
              onDragEnd={({ data }) => {
                setTempOrder(data as any);
                setSectionOrder(data as any);
              }}
              containerStyle={{ marginBottom: 12 }}
              scrollEnabled={false}
              nestedScrollEnabled={false}
              dragItemOverflow
              renderItem={({ item, drag, isActive }: RenderItemParams<'weekly' | 'alerts' | 'hourly' | 'radar' | 'specialized'>) => {
                const label = item === 'weekly' ? 'Prognoza 7-dniowa' : item === 'alerts' ? 'Ostrzeżenia pogodowe' : item === 'hourly' ? 'Prognoza godzinowa' : item === 'radar' ? 'Radar opadów' : 'Pogoda specjalistyczna';
                return (
                  <View
                    style={[
                      styles.orderRow,
                      {
                        backgroundColor: theme.colors.card,
                        borderColor: isActive ? theme.colors.primary : theme.colors.border,
                        shadowOpacity: isActive ? 0.08 : 0.04,
                      },
                    ]}
                  >
                    <Pressable
                      onLongPress={drag}
                      android_ripple={{ color: theme.colors.primary + '10' }}
                      style={[styles.dragHandle, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
                      accessibilityRole="button"
                      accessibilityLabel={`Przeciągnij ${label}`}
                    >
                      <GripVertical size={18} color={theme.colors.textSecondary} />
                    </Pressable>

                    <View style={styles.orderRowMain}>
                      <Text style={[styles.orderRowText, { color: theme.colors.text }]} numberOfLines={1}>
                        {label}
                      </Text>
                    </View>
                  </View>
                );
              }}
            />
            </GHScrollView>

          <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
            <TouchableOpacity 
              style={[styles.cancelButton, { borderColor: theme.colors.border }]} 
              onPress={onClose}
            >
              <Text style={[styles.cancelButtonText, { color: theme.colors.textSecondary, fontFamily: theme.fontFamily?.medium }]}>Anuluj</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveButton, { backgroundColor: theme.colors.primary }]} onPress={handleSave}>
              <Check size={20} color="white" />
              <Text style={[styles.saveButtonText, { fontFamily: theme.fontFamily?.medium }]}>Zapisz</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#64748B',
    marginBottom: 20,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  optionInfo: {
    flex: 1,
    marginRight: 16,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1E293B',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#64748B',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#224A96',
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
  },
  subsectionHeader: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 16,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  helperNote: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.8,
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  dragHandle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  orderRowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  orderRowText: {
    fontSize: 15,
    fontFamily: 'Poppins_Medium',
    flex: 1,
  },
});
