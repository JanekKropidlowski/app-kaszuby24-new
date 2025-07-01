import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';

export default function WeatherScreen() {
  const router = useRouter();
  const { theme } = useThemeStore();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.card }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { 
          color: theme.colors.text,
          fontFamily: theme.fontFamily.semibold 
        }]}>
          Pogoda
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={[styles.weatherCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.location, { 
            color: theme.colors.text,
            fontFamily: theme.fontFamily.bold 
          }]}>
            Gdańsk
          </Text>
          <Text style={[styles.temperature, { 
            color: theme.colors.primary,
            fontFamily: theme.fontFamily.bold 
          }]}>
            22°C
          </Text>
          <Text style={[styles.condition, { 
            color: theme.colors.textSecondary,
            fontFamily: theme.fontFamily.medium 
          }]}>
            Słonecznie
          </Text>
        </View>

        <View style={[styles.infoCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.infoText, { 
            color: theme.colors.textSecondary,
            fontFamily: theme.fontFamily.regular 
          }]}>
            Szczegółowa prognoza pogody będzie dostępna wkrótce
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  weatherCard: {
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  location: {
    fontSize: 24,
    marginBottom: 10,
  },
  temperature: {
    fontSize: 48,
    marginBottom: 10,
  },
  condition: {
    fontSize: 18,
  },
  infoCard: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  infoText: {
    fontSize: 16,
    textAlign: 'center',
  },
}); 