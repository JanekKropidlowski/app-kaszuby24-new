import React, { useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  Switch,
  TouchableOpacity,
  Alert
} from 'react-native';
import { Bell, Settings, MapPin, Tag } from 'lucide-react-native';
import { useNotificationsStore } from '@/store/notificationsStore';
import { notificationService } from '@/services/notificationService';
import { useThemeStore } from '@/store/themeStore';

export default function PreferencesScreen() {
  const { 
    preferences, 
    notificationsEnabled, 
    toggleNotifications, 
    updatePreference,
    initializePreferences 
  } = useNotificationsStore();
  
  const { theme } = useThemeStore();
  
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
  
  const regions = preferences.filter(pref => pref.type === 'region');
  const categories = preferences.filter(pref => pref.type === 'category');
  
  const enabledCount = preferences.filter(pref => pref.enabled).length;
  
  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.colors.background }]} 
      contentContainerStyle={styles.content}
    >
      <View style={[styles.header, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Moje sekcje
        </Text>
        <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
          Wybierz tematy i regiony, które Cię interesują
        </Text>
      </View>
      
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
      
      <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
        <View style={[styles.sectionHeader, { backgroundColor: theme.colors.subtle, borderBottomColor: theme.colors.border }]}>
          <MapPin size={18} color={theme.colors.primary} />
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
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
      
      <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
        <View style={[styles.sectionHeader, { backgroundColor: theme.colors.subtle, borderBottomColor: theme.colors.border }]}>
          <Tag size={18} color={theme.colors.primary} />
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
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
      
      <View style={[styles.infoCard, { backgroundColor: theme.colors.primary + '20' }]}>
        <Text style={[styles.infoTitle, { color: theme.colors.primary }]}>
          Jak to działa?
        </Text>
        <Text style={[styles.infoText, { color: theme.colors.primary }]}>
          • Otrzymasz powiadomienie o nowych artykułach z wybranych sekcji{'\n'}
          • Powiadomienia są wysyłane maksymalnie raz na godzinę{'\n'}
          • Możesz w każdej chwili zmienić swoje preferencje
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
  header: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
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
  section: {
    marginHorizontal: 20,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
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
  infoCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
});