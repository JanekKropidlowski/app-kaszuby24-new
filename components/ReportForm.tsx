import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { X, Send, MapPin, Image as ImageIcon, Calendar, FileText } from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';
import { useCommunityStore } from '@/store/communityStore';

import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';

interface ReportFormProps {
  type: 'quick' | 'article' | 'event';
  onClose: () => void;
}

export const ReportForm: React.FC<ReportFormProps> = ({ type, onClose }) => {
  const { theme } = useThemeStore();
  const { 
    addCommunityReport
  } = useCommunityStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    address?: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getFormConfig = () => {
    switch (type) {
      case 'quick':
        return {
          title: 'Szybkie zgłoszenie',
          icon: '🚨',
          fields: ['title', 'description', 'category'],
          categories: ['traffic', 'accident', 'wildlife', 'infrastructure', 'weather', 'general'],
          categoryLabels: {
            traffic: 'Korek',
            accident: 'Wypadek',
            wildlife: 'Dzikie zwierzę',
            infrastructure: 'Awarie',
            weather: 'Pogoda',
            general: 'Inne',
          },
        };
      case 'article':
        return {
          title: 'Zgłoś artykuł',
          icon: '📰',
          fields: ['title', 'description', 'category'],
          categories: ['news', 'culture', 'sport', 'business', 'politics', 'other'],
          categoryLabels: {
            news: 'Aktualności',
            culture: 'Kultura',
            sport: 'Sport',
            business: 'Biznes',
            politics: 'Polityka',
            other: 'Inne',
          },
        };
      case 'event':
        return {
          title: 'Zgłoś wydarzenie',
          icon: '🎉',
          fields: ['title', 'description', 'category', 'date'],
          categories: ['culture', 'sport', 'business', 'education', 'entertainment', 'other'],
          categoryLabels: {
            culture: 'Kultura',
            sport: 'Sport',
            business: 'Biznes',
            education: 'Edukacja',
            entertainment: 'Rozrywka',
            other: 'Inne',
          },
        };
    }
  };

  const config = getFormConfig();

  const handleGetLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Błąd', 'Potrzebujemy dostępu do lokalizacji');
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      const address = await Location.reverseGeocodeAsync({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });

      const locationData = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        address: address[0] 
          ? `${address[0].street}, ${address[0].city}`
          : `${currentLocation.coords.latitude.toFixed(4)}, ${currentLocation.coords.longitude.toFixed(4)}`,
      };

      setLocation(locationData);
      Alert.alert('Sukces', 'Lokalizacja została dodana');
    } catch (error) {
      Alert.alert('Błąd', 'Nie udało się pobrać lokalizacji');
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Błąd', 'Wypełnij wszystkie wymagane pola');
      return;
    }

    try {
      setIsSubmitting(true);

      const baseData = {
        id: Date.now().toString(),
        title: title.trim(),
        description: description.trim(),
        created_at: new Date().toISOString(),
        author: {
          name: 'Mieszkaniec',
        },
      };

      // Simplified report submission
      const reportData = {
        ...baseData,
        type,
        category,
        location: location || {
          latitude: 54.3520,
          longitude: 18.6466,
        },
        status: 'pending',
        timestamp: new Date().toISOString(),
      };
      
      addCommunityReport(reportData);

      Alert.alert('Sukces', 'Zgłoszenie zostało wysłane!');
      onClose();
    } catch (error) {
      Alert.alert('Błąd', 'Nie udało się wysłać zgłoszenia');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.card }]}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <X size={24} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {config.icon} {config.title}
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Title */}
        <View style={styles.fieldContainer}>
          <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>
            Tytuł *
          </Text>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: theme.colors.background,
                color: theme.colors.text,
                borderColor: theme.colors.border,
              }
            ]}
            placeholder="Wprowadź tytuł..."
            placeholderTextColor={theme.colors.textSecondary}
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />
        </View>

        {/* Description */}
        <View style={styles.fieldContainer}>
          <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>
            Opis *
          </Text>
          <TextInput
            style={[
              styles.textArea,
              {
                backgroundColor: theme.colors.background,
                color: theme.colors.text,
                borderColor: theme.colors.border,
              }
            ]}
            placeholder="Opisz szczegóły..."
            placeholderTextColor={theme.colors.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            maxLength={500}
          />
        </View>

        {/* Category */}
        <View style={styles.fieldContainer}>
          <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>
            Kategoria
          </Text>
          <View style={styles.categoryGrid}>
            {config.categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryButton,
                  {
                    backgroundColor: category === cat ? theme.colors.primary : theme.colors.background,
                    borderColor: theme.colors.border,
                  }
                ]}
                onPress={() => setCategory(cat)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.categoryButtonText,
                  { 
                    color: category === cat ? '#FFFFFF' : theme.colors.text,
                    fontFamily: category === cat ? theme.fontFamily.medium : theme.fontFamily.regular
                  }
                ]}>
                  {config.categoryLabels[cat as keyof typeof config.categoryLabels]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Location */}
        <View style={styles.fieldContainer}>
          <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>
            Lokalizacja
          </Text>
          <TouchableOpacity
            style={[
              styles.locationButton,
              {
                backgroundColor: location ? theme.colors.primary : theme.colors.background,
                borderColor: theme.colors.border,
              }
            ]}
            onPress={handleGetLocation}
            activeOpacity={0.7}
          >
            <MapPin size={20} color={location ? '#FFFFFF' : theme.colors.textSecondary} />
            <Text style={[
              styles.locationButtonText,
              { 
                color: location ? '#FFFFFF' : theme.colors.textSecondary,
                fontFamily: location ? theme.fontFamily.medium : theme.fontFamily.regular
              }
            ]}>
              {location ? location.address : 'Dodaj lokalizację'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            {
              backgroundColor: title.trim() && description.trim() 
                ? theme.colors.primary 
                : theme.colors.subtle,
            }
          ]}
          onPress={handleSubmit}
          disabled={!title.trim() || !description.trim() || isSubmitting}
          activeOpacity={0.8}
        >
          <Send size={20} color={title.trim() && description.trim() ? '#FFFFFF' : theme.colors.textSecondary} />
          <Text style={[
            styles.submitButtonText,
            { 
              color: title.trim() && description.trim() ? '#FFFFFF' : theme.colors.textSecondary,
              fontFamily: theme.fontFamily.medium
            }
          ]}>
            {isSubmitting ? 'Wysyłanie...' : 'Wyślij zgłoszenie'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
  },
  textArea: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryButtonText: {
    fontSize: 14,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  locationButtonText: {
    fontSize: 16,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    gap: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
}); 