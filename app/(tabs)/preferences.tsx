import React, { useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  Switch,
  TouchableOpacity,
  Alert,
  Linking,
  Platform
} from 'react-native';
import { 
  Bell, 
  Settings, 
  MapPin, 
  Tag, 
  Moon, 
  Sun, 
  Info, 
  Mail, 
  Globe, 
  Share2, 
  ChevronRight,
  Trash2,
  User,
  Zap,
  CheckCircle,
  Navigation,
  BellRing
} from 'lucide-react-native';
import { useNotificationsStore, availableLocations } from '@/store/notificationsStore';
import { notificationService } from '@/services/notificationService';
import { useThemeStore } from '@/store/themeStore';
import { useArticlesStore } from '@/store/articlesStore';
import { Image } from 'expo-image';
import { useScrollStore } from '@/store/scrollStore';

export default function PreferencesScreen() {
  const { 
    preferences, 
    notificationsEnabled, 
    toggleNotifications, 
    updatePreference,
    initializePreferences,
    isFirstTimeUser,
    userLocation,
    setUserLocation,
    expoPushToken
  } = useNotificationsStore();
  
  const { isDarkMode, toggleTheme, theme } = useThemeStore();
  const { clearRecentArticles } = useArticlesStore();
  const { setScrollDirection, resetScroll } = useScrollStore();
  
  // Add scroll handler for logo visibility
  const handleScroll = useCallback((event: any) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    setScrollDirection(scrollY);
  }, [setScrollDirection]);
  
  // Reset scroll state when component mounts
  useEffect(() => {
    resetScroll();
    return () => {
      resetScroll();
    };
  }, [resetScroll]);
  
  useEffect(() => {
    initializePreferences();
  }, [initializePreferences]);
  
  // Update Expo Push preferences when they change
  useEffect(() => {
    if (notificationsEnabled && expoPushToken) {
      notificationService.updatePreferences();
    }
  }, [preferences, notificationsEnabled, expoPushToken, userLocation]);
  
  const handleToggleNotifications = async () => {
    if (!notificationsEnabled) {
      const hasPermission = await notificationService.requestPermissions();
      if (!hasPermission) {
        Alert.alert(
          'Brak uprawnień',
          'Aby otrzymywać powiadomienia, musisz zezwolić na nie w ustawieniach urządzenia.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      // Register for push notifications
      await notificationService.registerForPushNotifications();
    }
    toggleNotifications();
  };
  
  const handleQuickSetup = async () => {
    try {
      // Request permissions first
      const hasPermission = await notificationService.requestPermissions();
      if (!hasPermission) {
        Alert.alert(
          'Brak uprawnień',
          'Aby otrzymywać powiadomienia, musisz zezwolić na nie w ustawieniach urządzenia.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      // Enable notifications
      if (!notificationsEnabled) {
        toggleNotifications();
      }
      
      // Register for push notifications
      await notificationService.registerForPushNotifications();
      
      // Enable popular regions
      const popularRegions = ['Trójmiasto', 'Kraj', 'Kartuzy'];
      preferences.forEach(pref => {
        if (pref.type === 'region' && popularRegions.includes(pref.name)) {
          updatePreference(pref.id, true);
        }
      });
      
      // Enable popular categories
      const popularCategories = ['Wiadomości', 'Kultura i Rozrywka'];
      preferences.forEach(pref => {
        if (pref.type === 'category' && popularCategories.includes(pref.name)) {
          updatePreference(pref.id, true);
        }
      });
      
      Alert.alert(
        'Gotowe!',
        'Powiadomienia zostały skonfigurowane. Będziesz otrzymywać najważniejsze wiadomości z wybranych regionów.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error in quick setup:', error);
      Alert.alert(
        'Błąd',
        'Nie udało się skonfigurować powiadomień. Spróbuj ponownie.',
        [{ text: 'OK' }]
      );
    }
  };
  
  const handleLocationChange = () => {
    Alert.alert(
      'Zmień lokalizację',
      'Wybierz swoją główną lokalizację:',
      [
        ...availableLocations.map(location => ({
          text: location.name,
          onPress: async () => {
            setUserLocation(location);
            // Re-register with new location
            await notificationService.updateLocationAndReregister();
            Alert.alert(
              'Lokalizacja zmieniona',
              `Twoja główna lokalizacja została zmieniona na ${location.name}.`,
              [{ text: 'OK' }]
            );
          }
        })),
        { text: 'Anuluj', style: 'cancel' }
      ]
    );
  };
  
  const handleOpenWebsite = () => {
    Linking.openURL('https://kaszuby24.pl');
  };
  
  const handleContact = () => {
    Linking.openURL('mailto:redakcja@kaszuby24.pl');
  };
  
  const handleShare = async () => {
    try {
      if (Platform.OS === 'web') {
        if (navigator.share) {
          await navigator.share({
            title: 'Kaszuby24 - Aplikacja',
            text: 'Sprawdź najnowsze wiadomości z Kaszub!',
            url: 'https://kaszuby24.pl',
          });
        } else {
          alert('Skopiuj ten link aby udostępnić: https://kaszuby24.pl');
        }
      } else {
        await Linking.openURL('https://kaszuby24.pl');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };
  
  const handleTestNotification = async () => {
    try {
      if (!notificationsEnabled) {
        Alert.alert(
          'Powiadomienia wyłączone',
          'Aby przetestować powiadomienia, musisz najpierw włączyć je w ustawieniach.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      await notificationService.scheduleLocalNotification(
        'Test powiadomienia',
        'To jest testowe powiadomienie z aplikacji Kaszuby24. Jeśli widzisz to powiadomienie, oznacza to, że system powiadomień działa prawidłowo.',
        { test: true }
      );
      
      Alert.alert(
        'Powiadomienie wysłane',
        'Testowe powiadomienie zostało wysłane. Sprawdź centrum powiadomień na swoim urządzeniu.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error sending test notification:', error);
      Alert.alert(
        'Błąd',
        'Nie udało się wysłać testowego powiadomienia. Sprawdź uprawnienia aplikacji.',
        [{ text: 'OK' }]
      );
    }
  };
  
  const regions = preferences.filter(pref => pref.type === 'region');
  const categories = preferences.filter(pref => pref.type === 'category');
  const enabledCount = preferences.filter(pref => pref.enabled).length;
  
  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.colors.background }]} 
      contentContainerStyle={styles.content}
      onScroll={handleScroll}
      scrollEventThrottle={16}
    >
      {/* Profile Section */}
      <View style={[styles.profileSection, { backgroundColor: theme.colors.card }]}>
        <View style={[styles.profileImageContainer, { backgroundColor: theme.colors.subtle }]}>
          <Image 
            source={{ uri: 'https://kaszuby24.pl/wp-content/uploads/2023/05/ikony_Obszar-roboczy-1.png' }}
            style={styles.profileImage}
          />
        </View>
        <Text style={[
          styles.profileName, 
          { 
            color: theme.colors.text,
            fontFamily: theme.fontFamily.semibold
          }
        ]}>
          Kaszuby24
        </Text>
        <Text style={[
          styles.profileEmail, 
          { 
            color: theme.colors.textSecondary,
            fontFamily: theme.fontFamily.regular
          }
        ]}>
          Twoje źródło wiadomości z Kaszub
        </Text>
        
        {/* Location info */}
        {userLocation && (
          <View style={[styles.locationBadge, { backgroundColor: theme.colors.subtle }]}>
            <MapPin size={14} color={theme.colors.primary} />
            <Text style={[
              styles.locationText,
              { 
                color: theme.colors.text,
                fontFamily: theme.fontFamily.medium
              }
            ]}>
              {userLocation.name}
            </Text>
          </View>
        )}
      </View>
      
      {/* Location Settings */}
      <Text style={[
        styles.sectionTitle, 
        { 
          color: theme.colors.text,
          fontFamily: theme.fontFamily.semibold
        }
      ]}>
        Lokalizacja
      </Text>
      
      <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
        <TouchableOpacity 
          style={[styles.settingRow, { borderBottomColor: theme.colors.border }]}
          onPress={handleLocationChange}
        >
          <View style={styles.settingLabelContainer}>
            <Navigation size={20} color={theme.colors.primary} />
            <View style={styles.settingTextContainer}>
              <Text style={[
                styles.settingLabel, 
                { 
                  color: theme.colors.text,
                  fontFamily: theme.fontFamily.medium
                }
              ]}>
                Główna lokalizacja
              </Text>
              <Text style={[
                styles.settingSubtitle,
                { 
                  color: theme.colors.textSecondary,
                  fontFamily: theme.fontFamily.regular
                }
              ]}>
                {userLocation ? userLocation.name : 'Nie wybrano'}
              </Text>
            </View>
          </View>
          <ChevronRight size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>
      
      {/* Quick Setup for new users */}
      {(isFirstTimeUser || !notificationsEnabled) && (
        <>
          <Text style={[
            styles.sectionTitle, 
            { 
              color: theme.colors.text,
              fontFamily: theme.fontFamily.semibold
            }
          ]}>
            Szybka konfiguracja
          </Text>
          
          <View style={[styles.quickSetupCard, { backgroundColor: theme.colors.card }]}>
            <View style={styles.quickSetupHeader}>
              <View style={[styles.quickSetupIcon, { backgroundColor: theme.colors.subtle }]}>
                <Zap size={24} color={theme.colors.primary} />
              </View>
              <View style={styles.quickSetupText}>
                <Text style={[
                  styles.quickSetupTitle,
                  { 
                    color: theme.colors.text,
                    fontFamily: theme.fontFamily.semibold
                  }
                ]}>
                  Skonfiguruj w 30 sekund
                </Text>
                <Text style={[
                  styles.quickSetupSubtitle,
                  { 
                    color: theme.colors.textSecondary,
                    fontFamily: theme.fontFamily.regular
                  }
                ]}>
                  Włącz powiadomienia dla popularnych regionów
                </Text>
              </View>
            </View>
            
            <View style={styles.quickSetupFeatures}>
              <View style={styles.quickSetupFeature}>
                <CheckCircle size={16} color={theme.colors.success} />
                <Text style={[
                  styles.quickSetupFeatureText,
                  { 
                    color: theme.colors.text,
                    fontFamily: theme.fontFamily.regular
                  }
                ]}>
                  Trójmiasto, Kraj, Kartuzy
                </Text>
              </View>
              <View style={styles.quickSetupFeature}>
                <CheckCircle size={16} color={theme.colors.success} />
                <Text style={[
                  styles.quickSetupFeatureText,
                  { 
                    color: theme.colors.text,
                    fontFamily: theme.fontFamily.regular
                  }
                ]}>
                  Wiadomości i Kultura
                </Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={[styles.quickSetupButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleQuickSetup}
            >
              <Text style={[
                styles.quickSetupButtonText,
                { fontFamily: theme.fontFamily.semibold }
              ]}>
                Skonfiguruj automatycznie
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
      
      {/* App Settings */}
      <Text style={[
        styles.sectionTitle, 
        { 
          color: theme.colors.text,
          fontFamily: theme.fontFamily.semibold
        }
      ]}>
        Ustawienia aplikacji
      </Text>
      
      <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
        <View style={[styles.settingRow, { borderBottomColor: theme.colors.border }]}>
          <View style={styles.settingLabelContainer}>
            {isDarkMode ? (
              <Moon size={20} color={theme.colors.primary} />
            ) : (
              <Sun size={20} color={theme.colors.primary} />
            )}
            <Text style={[
              styles.settingLabel, 
              { 
                color: theme.colors.text,
                fontFamily: theme.fontFamily.medium
              }
            ]}>
              Tryb ciemny
            </Text>
          </View>
          <Switch
            value={isDarkMode}
            onValueChange={toggleTheme}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={theme.colors.card}
          />
        </View>
        
        <TouchableOpacity 
          style={[styles.settingRow, { borderBottomColor: theme.colors.border }]}
          onPress={clearRecentArticles}
        >
          <View style={styles.settingLabelContainer}>
            <Trash2 size={20} color={theme.colors.primary} />
            <Text style={[
              styles.settingLabel, 
              { 
                color: theme.colors.text,
                fontFamily: theme.fontFamily.medium
              }
            ]}>
              Wyczyść historię
            </Text>
          </View>
          <ChevronRight size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>
      
      {/* Notification Settings */}
      <Text style={[
        styles.sectionTitle, 
        { 
          color: theme.colors.text,
          fontFamily: theme.fontFamily.semibold
        }
      ]}>
        Powiadomienia
      </Text>
      
      <View style={[styles.summaryCard, { backgroundColor: theme.colors.card }]}>
        <View style={styles.summaryRow}>
          <Bell size={20} color={theme.colors.primary} />
          <Text style={[
            styles.summaryText, 
            { 
              color: theme.colors.text,
              fontFamily: theme.fontFamily.medium
            }
          ]}>
            Powiadomienia {notificationsEnabled ? 'włączone' : 'wyłączone'}
          </Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={handleToggleNotifications}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={theme.colors.card}
          />
        </View>
        
        <View style={[styles.summaryStats, { borderTopColor: theme.colors.border }]}>
          <Text style={[
            styles.statsText, 
            { 
              color: theme.colors.textSecondary,
              fontFamily: theme.fontFamily.regular
            }
          ]}>
            Wybrano {enabledCount} z {preferences.length} sekcji
          </Text>
          {expoPushToken && (
            <Text style={[
              styles.statsText, 
              { 
                color: theme.colors.textSecondary,
                fontFamily: theme.fontFamily.regular
              }
            ]}>
              Expo Push zarejestrowany ✓
            </Text>
          )}
        </View>
      </View>
      
      {/* Regions */}
      {regions.length > 0 && (
        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          <View style={[styles.sectionHeader, { backgroundColor: theme.colors.subtle, borderBottomColor: theme.colors.border }]}>
            <MapPin size={18} color={theme.colors.primary} />
            <Text style={[
              styles.sectionHeaderTitle, 
              { 
                color: theme.colors.text,
                fontFamily: theme.fontFamily.semibold
              }
            ]}>
              Regiony
            </Text>
          </View>
          
          {regions.map((region) => (
            <View 
              key={region.id} 
              style={[styles.preferenceRow, { borderBottomColor: theme.colors.border }]}
            >
              <Text style={[
                styles.preferenceName, 
                { 
                  color: theme.colors.text,
                  fontFamily: theme.fontFamily.medium
                }
              ]}>
                {region.name}
              </Text>
              <Switch
                value={region.enabled}
                onValueChange={(enabled) => updatePreference(region.id, enabled)}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor={theme.colors.card}
                disabled={!notificationsEnabled}
              />
            </View>
          ))}
        </View>
      )}
      
      {/* Categories */}
      {categories.length > 0 && (
        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          <View style={[styles.sectionHeader, { backgroundColor: theme.colors.subtle, borderBottomColor: theme.colors.border }]}>
            <Tag size={18} color={theme.colors.primary} />
            <Text style={[
              styles.sectionHeaderTitle, 
              { 
                color: theme.colors.text,
                fontFamily: theme.fontFamily.semibold
              }
            ]}>
              Działy tematyczne
            </Text>
          </View>
          
          {categories.map((category) => (
            <View 
              key={category.id} 
              style={[styles.preferenceRow, { borderBottomColor: theme.colors.border }]}
            >
              <Text style={[
                styles.preferenceName, 
                { 
                  color: theme.colors.text,
                  fontFamily: theme.fontFamily.medium
                }
              ]}>
                {category.name}
              </Text>
              <Switch
                value={category.enabled}
                onValueChange={(enabled) => updatePreference(category.id, enabled)}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor={theme.colors.card}
                disabled={!notificationsEnabled}
              />
            </View>
          ))}
        </View>
      )}
      
      {/* About & Contact */}
      <Text style={[
        styles.sectionTitle, 
        { 
          color: theme.colors.text,
          fontFamily: theme.fontFamily.semibold
        }
      ]}>
        Informacje
      </Text>
      
      <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
        <TouchableOpacity 
          style={[styles.settingRow, { borderBottomColor: theme.colors.border }]}
          onPress={handleOpenWebsite}
        >
          <View style={styles.settingLabelContainer}>
            <Globe size={20} color={theme.colors.primary} />
            <Text style={[
              styles.settingLabel, 
              { 
                color: theme.colors.text,
                fontFamily: theme.fontFamily.medium
              }
            ]}>
              Odwiedź stronę internetową
            </Text>
          </View>
          <ChevronRight size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.settingRow, { borderBottomColor: theme.colors.border }]}
          onPress={handleContact}
        >
          <View style={styles.settingLabelContainer}>
            <Mail size={20} color={theme.colors.primary} />
            <Text style={[
              styles.settingLabel, 
              { 
                color: theme.colors.text,
                fontFamily: theme.fontFamily.medium
              }
            ]}>
              Kontakt z redakcją
            </Text>
          </View>
          <ChevronRight size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.settingRow, { borderBottomColor: theme.colors.border }]}
          onPress={handleShare}
        >
          <View style={styles.settingLabelContainer}>
            <Share2 size={20} color={theme.colors.primary} />
            <Text style={[
              styles.settingLabel, 
              { 
                color: theme.colors.text,
                fontFamily: theme.fontFamily.medium
              }
            ]}>
              Udostępnij aplikację
            </Text>
          </View>
          <ChevronRight size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>
      
      {/* Test Notifications Section */}
      <Text style={[
        styles.sectionTitle, 
        { 
          color: theme.colors.text,
          fontFamily: theme.fontFamily.semibold
        }
      ]}>
        Narzędzia testowe
      </Text>
      
      <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
        <TouchableOpacity 
          style={[styles.settingRow, { borderBottomColor: theme.colors.border }]}
          onPress={handleTestNotification}
        >
          <View style={styles.settingLabelContainer}>
            <BellRing size={20} color={theme.colors.primary} />
            <View style={styles.settingTextContainer}>
              <Text style={[
                styles.settingLabel, 
                { 
                  color: theme.colors.text,
                  fontFamily: theme.fontFamily.medium
                }
              ]}>
                Testowe powiadomienie
              </Text>
              <Text style={[
                styles.settingSubtitle,
                { 
                  color: theme.colors.textSecondary,
                  fontFamily: theme.fontFamily.regular
                }
              ]}>
                Wyślij testowe powiadomienie push
              </Text>
            </View>
          </View>
          <ChevronRight size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.footer}>
        <Text style={[
          styles.footerText, 
          { 
            color: theme.colors.textSecondary,
            fontFamily: theme.fontFamily.regular
          }
        ]}>
          Kaszuby24 App v1.0.0
        </Text>
        <Text style={[
          styles.footerText, 
          { 
            color: theme.colors.textSecondary,
            fontFamily: theme.fontFamily.regular
          }
        ]}>
          © 2025 Kaszuby24.pl
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 32,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 20,
  },
  profileImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileImage: {
    width: 60,
    height: 60,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  locationText: {
    fontSize: 14,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginHorizontal: 20,
    marginBottom: 12,
    marginTop: 8,
  },
  quickSetupCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  quickSetupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  quickSetupIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  quickSetupText: {
    flex: 1,
  },
  quickSetupTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  quickSetupSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  quickSetupFeatures: {
    gap: 8,
    marginBottom: 16,
  },
  quickSetupFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickSetupFeatureText: {
    fontSize: 14,
  },
  quickSetupButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  quickSetupButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  summaryCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  summaryStats: {
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 4,
  },
  statsText: {
    fontSize: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  settingLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    marginLeft: 12,
  },
  settingSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  preferenceName: {
    fontSize: 16,
  },
  footer: {
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    marginBottom: 4,
  },
});