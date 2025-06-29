import React, { useEffect } from 'react';
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
  User
} from 'lucide-react-native';
import { useNotificationsStore } from '@/store/notificationsStore';
import { notificationService } from '@/services/notificationService';
import { useThemeStore } from '@/store/themeStore';
import { useArticlesStore } from '@/store/articlesStore';
import { Image } from 'expo-image';

export default function PreferencesScreen() {
  const { 
    preferences, 
    notificationsEnabled, 
    toggleNotifications, 
    updatePreference,
    initializePreferences 
  } = useNotificationsStore();
  
  const { isDarkMode, toggleTheme, theme } = useThemeStore();
  const { clearRecentArticles } = useArticlesStore();
  
  useEffect(() => {
    initializePreferences();
  }, [initializePreferences]);
  
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
    }
    toggleNotifications();
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
  
  const regions = preferences.filter(pref => pref.type === 'region');
  const categories = preferences.filter(pref => pref.type === 'category');
  const enabledCount = preferences.filter(pref => pref.enabled).length;
  
  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.colors.background }]} 
      contentContainerStyle={styles.content}
    >
      {/* Profile Section */}
      <View style={[styles.profileSection, { backgroundColor: theme.colors.card }]}>
        <View style={[styles.profileImageContainer, { backgroundColor: theme.colors.subtle }]}>
          <Image 
            source={{ uri: 'https://kaszuby24.pl/wp-content/uploads/2023/05/ikony_Obszar-roboczy-1.png' }}
            style={styles.profileImage}
          />
        </View>
        <Text style={[styles.profileName, { color: theme.colors.text }]}>Kaszuby24</Text>
        <Text style={[styles.profileEmail, { color: theme.colors.textSecondary }]}>
          Twoje źródło wiadomości z Kaszub
        </Text>
      </View>
      
      {/* App Settings */}
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
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
            <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
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
            <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
              Wyczyść historię
            </Text>
          </View>
          <ChevronRight size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>
      
      {/* Notification Settings */}
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
        Powiadomienia
      </Text>
      
      <View style={[styles.summaryCard, { backgroundColor: theme.colors.card }]}>
        <View style={styles.summaryRow}>
          <Bell size={20} color={theme.colors.primary} />
          <Text style={[styles.summaryText, { color: theme.colors.text }]}>
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
          <Text style={[styles.statsText, { color: theme.colors.textSecondary }]}>
            Wybrano {enabledCount} z {preferences.length} sekcji
          </Text>
        </View>
      </View>
      
      {/* Regions */}
      {regions.length > 0 && (
        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          <View style={[styles.sectionHeader, { backgroundColor: theme.colors.subtle, borderBottomColor: theme.colors.border }]}>
            <MapPin size={18} color={theme.colors.primary} />
            <Text style={[styles.sectionHeaderTitle, { color: theme.colors.text }]}>
              Regiony
            </Text>
          </View>
          
          {regions.map((region) => (
            <View 
              key={region.id} 
              style={[styles.preferenceRow, { borderBottomColor: theme.colors.border }]}
            >
              <Text style={[styles.preferenceName, { color: theme.colors.text }]}>
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
            <Text style={[styles.sectionHeaderTitle, { color: theme.colors.text }]}>
              Działy tematyczne
            </Text>
          </View>
          
          {categories.map((category) => (
            <View 
              key={category.id} 
              style={[styles.preferenceRow, { borderBottomColor: theme.colors.border }]}
            >
              <Text style={[styles.preferenceName, { color: theme.colors.text }]}>
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
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
        Informacje
      </Text>
      
      <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
        <TouchableOpacity 
          style={[styles.settingRow, { borderBottomColor: theme.colors.border }]}
          onPress={handleOpenWebsite}
        >
          <View style={styles.settingLabelContainer}>
            <Globe size={20} color={theme.colors.primary} />
            <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
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
            <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
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
            <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
              Udostępnij aplikację
            </Text>
          </View>
          <ChevronRight size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
          Kaszuby24 App v1.0.0
        </Text>
        <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
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
    marginBottom: 20,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginHorizontal: 20,
    marginBottom: 12,
    marginTop: 8,
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
  settingLabel: {
    fontSize: 16,
    marginLeft: 12,
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