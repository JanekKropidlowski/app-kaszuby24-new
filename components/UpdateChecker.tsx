import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import * as Updates from 'expo-updates';
import { useThemeStore } from '@/store/themeStore';

export default function UpdateChecker() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const { theme } = useThemeStore();

  useEffect(() => {
    checkForUpdates();
  }, []);

  const checkForUpdates = async () => {
    if (!Updates.isEnabled) return;

    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        setUpdateAvailable(true);
      }
    } catch (error) {
      console.warn('Error checking for updates:', error);
    }
  };

  const downloadUpdate = async () => {
    if (!Updates.isEnabled) return;

    setDownloading(true);
    try {
      await Updates.fetchUpdateAsync();
      Alert.alert(
        'Aktualizacja pobrana',
        'Aktualizacja została pobrana. Aplikacja zostanie zrestartowana przy następnym uruchomieniu.',
        [
          {
            text: 'OK',
            onPress: () => setUpdateAvailable(false)
          }
        ]
      );
    } catch (error) {
      console.error('Error downloading update:', error);
      Alert.alert(
        'Błąd aktualizacji',
        'Wystąpił błąd podczas pobierania aktualizacji. Spróbuj ponownie później.'
      );
    } finally {
      setDownloading(false);
    }
  };

  const reloadApp = async () => {
    if (Updates.isEnabled) {
      await Updates.reloadAsync();
    }
  };

  if (!updateAvailable) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.primary }]}>
      <Text style={[styles.text, { color: '#ffffff' }]}>
        Dostępna jest nowa wersja aplikacji
      </Text>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#ffffff' }]}
          onPress={downloadUpdate}
          disabled={downloading}
        >
          <Text style={[styles.buttonText, { color: theme.colors.primary }]}>
            {downloading ? 'Pobieranie...' : 'Pobierz aktualizację'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#ffffff' }]}
          onPress={reloadApp}
        >
          <Text style={[styles.buttonText, { color: '#ffffff' }]}>
            Zrestartuj teraz
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    margin: 16,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
