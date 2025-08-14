import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { X, Filter, Calendar, MapPin, AlertTriangle, Thermometer, Droplets, Wind } from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';

export interface SortOption {
  id: string;
  label: string;
  icon: React.ReactNode;
  category: 'weather' | 'forecast' | 'alerts' | 'stations';
  time?: 'current' | 'today' | 'tomorrow' | 'week';
  location?: 'my-location' | 'nearest-stations';
  priority?: 'important' | 'normal' | 'info';
}

interface WeatherSortModalProps {
  visible: boolean;
  onClose: () => void;
  onSort: (options: SortOption[]) => void;
  currentSort?: SortOption[];
}

export const WeatherSortModal: React.FC<WeatherSortModalProps> = ({
  visible,
  onClose,
  onSort,
  currentSort = []
}) => {
  const { theme, isDarkMode } = useThemeStore();
  const [selectedOptions, setSelectedOptions] = useState<SortOption[]>(currentSort);

  const sortOptions: SortOption[] = [
    // Kategoria - pogoda
    { id: 'temp-asc', label: 'Temperatura (rosnąco)', icon: <Thermometer size={20} color={theme.colors.primary} />, category: 'weather' },
    { id: 'temp-desc', label: 'Temperatura (malejąco)', icon: <Thermometer size={20} color={theme.colors.primary} />, category: 'weather' },
    { id: 'humidity', label: 'Wilgotność', icon: <Droplets size={20} color={theme.colors.primary} />, category: 'weather' },
    { id: 'wind', label: 'Wiatr', icon: <Wind size={20} color={theme.colors.primary} />, category: 'weather' },
    
    // Kategoria - prognoza
    { id: 'forecast-today', label: 'Dzisiaj', icon: <Calendar size={20} color={theme.colors.primary} />, category: 'forecast', time: 'today' },
    { id: 'forecast-tomorrow', label: 'Jutro', icon: <Calendar size={20} color={theme.colors.primary} />, category: 'forecast', time: 'tomorrow' },
    { id: 'forecast-week', label: 'Tydzień', icon: <Calendar size={20} color={theme.colors.primary} />, category: 'forecast', time: 'week' },
    { id: 'forecast-weekend', label: 'Weekend', icon: <Calendar size={20} color={theme.colors.primary} />, category: 'forecast', time: 'week' },
    
    // Kategoria - ostrzeżenia
    { id: 'alerts-important', label: 'Ważne', icon: <AlertTriangle size={20} color={theme.colors.primary} />, category: 'alerts', priority: 'important' },
    { id: 'alerts-normal', label: 'Normalne', icon: <AlertTriangle size={20} color={theme.colors.primary} />, category: 'alerts', priority: 'normal' },
    { id: 'alerts-info', label: 'Informacyjne', icon: <AlertTriangle size={20} color={theme.colors.primary} />, category: 'alerts', priority: 'info' },
    
    // Kategoria - stacje
    { id: 'stations-nearest', label: 'Najbliższe', icon: <MapPin size={20} color={theme.colors.primary} />, category: 'stations', location: 'nearest-stations' },
    { id: 'stations-my-location', label: 'Moja lokalizacja', icon: <MapPin size={20} color={theme.colors.primary} />, category: 'stations', location: 'my-location' },
  ];

  const handleOptionToggle = (option: SortOption) => {
    const isSelected = selectedOptions.some(opt => opt.id === option.id);
    
    if (isSelected) {
      setSelectedOptions(selectedOptions.filter(opt => opt.id !== option.id));
    } else {
      // Usuń inne opcje z tej samej kategorii
      const filtered = selectedOptions.filter(opt => opt.category !== option.category);
      setSelectedOptions([...filtered, option]);
    }
  };

  const handleApplySort = () => {
    onSort(selectedOptions);
    onClose();
  };

  const handleReset = () => {
    setSelectedOptions([]);
  };

  const isOptionSelected = (optionId: string) => {
    return selectedOptions.some(opt => opt.id === optionId);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
        <View style={[styles.modal, { backgroundColor: theme.colors.background }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Filter size={24} color={theme.colors.primary} />
              <Text style={[styles.title, { color: theme.colors.text }]}>
                Sortuj dane
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
              Wybierz kryteria sortowania
            </Text>
            
            {sortOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionItem,
                  { 
                    backgroundColor: theme.colors.card,
                    borderColor: isOptionSelected(option.id) ? theme.colors.primary : theme.colors.border,
                  }
                ]}
                onPress={() => handleOptionToggle(option)}
                activeOpacity={0.7}
              >
                <View style={styles.optionContent}>
                  {option.icon}
                  <Text style={[styles.optionLabel, { color: theme.colors.text }]}>
                    {option.label}
                  </Text>
                </View>
                
                <View style={[
                  styles.checkbox,
                  { 
                    backgroundColor: isOptionSelected(option.id) ? theme.colors.primary : 'transparent',
                    borderColor: isOptionSelected(option.id) ? theme.colors.primary : theme.colors.border,
                  }
                ]}>
                  {isOptionSelected(option.id) && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity 
              style={[styles.button, styles.resetButton, { borderColor: theme.colors.border }]} 
              onPress={handleReset}
            >
              <Text style={[styles.buttonText, { color: theme.colors.textSecondary }]}>
                Resetuj
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.applyButton, { backgroundColor: theme.colors.primary }]} 
              onPress={handleApplySort}
            >
              <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
                Zastosuj
              </Text>
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
    justifyContent: 'flex-end',
  },
  modal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: '60%',
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Poppins_SemiBold',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_Medium',
    marginBottom: 16,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontFamily: 'Poppins_Medium',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Poppins_Bold',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  resetButton: {
    backgroundColor: 'transparent',
  },
  applyButton: {
    borderColor: 'transparent',
  },
  buttonText: {
    fontSize: 16,
    fontFamily: 'Poppins_SemiBold',
  },
});
