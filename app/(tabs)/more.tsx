import React from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Switch,
  Linking,
  Platform,
  Image
} from 'react-native';
import { 
  Moon, 
  Sun, 
  Info, 
  Mail, 
  Globe, 
  Share2, 
  ChevronRight,
  Bell,
  Settings,
  HelpCircle
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useThemeStore } from '@/store/themeStore';
import { useArticlesStore } from '@/store/articlesStore';
import { useNotificationsStore } from '@/store/notificationsStore';

export default function MoreScreen() {
  const router = useRouter();
  const { isDarkMode, toggleTheme, theme } = useThemeStore();
  const { clearRecentArticles } = useArticlesStore();
  const { notificationsEnabled, getUnreadCount } = useNotificationsStore();
  
  const unreadCount = getUnreadCount();
  
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
        const shareOptions = {
          message: 'Sprawdź najnowsze wiadomości z Kaszub! https://kaszuby24.pl',
          url: 'https://kaszuby24.pl',
        };
        
        await Linking.openURL('https://kaszuby24.pl');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };
  
  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
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
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: theme.colors.primary }]}>
              {notificationsEnabled ? 'Włączone' : 'Wyłączone'}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Powiadomienia
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: theme.colors.primary }]}>
              {unreadCount}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Nieprzeczytane
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: theme.colors.primary }]}>
              24/7
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Aktualności
            </Text>
          </View>
        </View>
      </View>
      
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
        Ustawienia powiadomień
      </Text>
      
      <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
        <TouchableOpacity 
          style={[styles.settingRow, { borderBottomColor: theme.colors.border }]}
          onPress={() => router.push('/(tabs)/preferences')}
        >
          <View style={styles.settingLabelContainer}>
            <Settings size={20} color={theme.colors.primary} />
            <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
              Moje sekcje
            </Text>
          </View>
          <ChevronRight size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.settingRow, { borderBottomColor: theme.colors.border }]}
          onPress={() => router.push('/(tabs)/notifications')}
        >
          <View style={styles.settingLabelContainer}>
            <Bell size={20} color={theme.colors.primary} />
            <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
              Centrum powiadomień
            </Text>
            {unreadCount > 0 && (
              <View style={[styles.notificationBadge, { backgroundColor: theme.colors.notification }]}>
                <Text style={styles.notificationBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>
          <ChevronRight size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>
      
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
            <Info size={20} color={theme.colors.primary} />
            <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
              Wyczyść historię
            </Text>
          </View>
          <ChevronRight size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>
      
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
  statsContainer: {
    flexDirection: 'row',
    width: '100%',
    paddingHorizontal: 20,
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginHorizontal: 20,
    marginBottom: 12,
  },
  section: {
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
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
  notificationBadge: {
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
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