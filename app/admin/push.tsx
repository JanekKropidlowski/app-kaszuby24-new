import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, ActivityIndicator, RefreshControl, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Bell, Smartphone, Send, Clock } from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';
import { getPushStats, getPushHistory, sendPushNotification } from '@/services/adminApi';

interface PushStats {
  tokens: { total: number; active: number; platforms: Record<string, number> };
  notifications: { sent: number; scheduled: number };
  analytics: { clicks_30d: number };
}

interface PushLog {
  id: number;
  title: string;
  body: string;
  status: string;
  created_at: string;
  sent_count?: number;
}

export default function AdminPushScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme } = useThemeStore();
  const c = theme.colors;

  const [stats, setStats] = useState<PushStats | null>(null);
  const [history, setHistory] = useState<PushLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('');

  const fetchAll = useCallback(async (reset = false) => {
    reset ? setRefreshing(true) : setLoading(true);
    try {
      const [statsRes, histRes] = await Promise.allSettled([
        getPushStats(),
        getPushHistory(20),
      ]);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
      if (histRes.status === 'fulfilled') setHistory(histRes.value.data || []);
    } catch { }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchAll(); }, []);

  const handleSend = () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert('Błąd', 'Tytuł i treść są wymagane');
      return;
    }
    Alert.alert(
      'Wyślij powiadomienie',
      `Do ${stats?.tokens.active ?? '?'} urządzeń:\n\n"${title}"\n${body}`,
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Wyślij',
          onPress: async () => {
            setSending(true);
            try {
              await sendPushNotification({ title, body, url: url || undefined });
              Alert.alert('Wysłano!', 'Powiadomienie zostało dodane do kolejki.');
              setTitle(''); setBody(''); setUrl('');
              fetchAll(true);
            } catch (err: any) {
              Alert.alert('Błąd', err.response?.data?.error || 'Wysyłanie nie powiodło się');
            } finally {
              setSending(false);
            }
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: c.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <ArrowLeft size={22} color={c.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.text, fontFamily: 'Poppins_SemiBold' }]}>
          Push powiadomienia
        </Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchAll(true)} tintColor={c.primary} />}
        keyboardShouldPersistTaps="handled"
      >
        {/* Stats */}
        {loading ? <ActivityIndicator color={c.primary} style={{ marginVertical: 24 }} /> : stats && (
          <View style={styles.statsGrid}>
            <StatCard icon={<Smartphone size={18} color={c.primary} />} label="Aktywne urządzenia" value={stats.tokens.active} theme={theme} />
            <StatCard icon={<Bell size={18} color={c.success} />} label="Wysłane łącznie" value={stats.notifications.sent} theme={theme} />
            <StatCard icon={<Clock size={18} color={c.warning} />} label="W kolejce" value={stats.notifications.scheduled} theme={theme} />
            <StatCard icon={<Bell size={18} color={c.info} />} label="Kliknięcia 30 dni" value={stats.analytics.clicks_30d} theme={theme} />
          </View>
        )}

        {/* Platform breakdown */}
        {stats?.tokens.platforms && Object.keys(stats.tokens.platforms).length > 0 && (
          <View style={[styles.platformRow, { backgroundColor: c.subtle, borderColor: c.border }]}>
            {Object.entries(stats.tokens.platforms).map(([platform, count]) => (
              <View key={platform} style={styles.platformItem}>
                <Text style={[styles.platformCount, { color: c.text, fontFamily: 'Poppins_SemiBold' }]}>{count}</Text>
                <Text style={[styles.platformLabel, { color: c.textSecondary, fontFamily: 'Poppins_Regular' }]}>
                  {platform === 'android' ? 'Android' : platform === 'ios' ? 'iOS' : platform}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Send form */}
        <Text style={[styles.sectionLabel, { color: c.textSecondary, fontFamily: 'Poppins_Medium', marginTop: 20 }]}>
          Wyślij powiadomienie
        </Text>

        <TextInput
          style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.subtle, fontFamily: 'Poppins_Medium' }]}
          value={title}
          onChangeText={setTitle}
          placeholder="Tytuł powiadomienia"
          placeholderTextColor={c.textSecondary}
        />
        <TextInput
          style={[styles.inputMulti, { color: c.text, borderColor: c.border, backgroundColor: c.subtle, fontFamily: 'Poppins_Regular' }]}
          value={body}
          onChangeText={setBody}
          placeholder="Treść powiadomienia..."
          placeholderTextColor={c.textSecondary}
          multiline
          textAlignVertical="top"
        />
        <TextInput
          style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.subtle, fontFamily: 'Poppins_Regular' }]}
          value={url}
          onChangeText={setUrl}
          placeholder="URL (opcjonalnie, np. /artykul/slug)"
          placeholderTextColor={c.textSecondary}
          autoCapitalize="none"
          keyboardType="url"
        />

        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: c.primary, opacity: sending ? 0.7 : 1 }]}
          onPress={handleSend}
          disabled={sending}
        >
          {sending
            ? <ActivityIndicator color="#fff" />
            : <><Send size={16} color="#fff" /><Text style={[styles.sendBtnText, { fontFamily: 'Poppins_SemiBold' }]}>Wyślij do {stats?.tokens.active ?? '?'} urządzeń</Text></>
          }
        </TouchableOpacity>

        {/* History */}
        {history.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: c.textSecondary, fontFamily: 'Poppins_Medium', marginTop: 24 }]}>
              Historia
            </Text>
            {history.map(log => (
              <View key={log.id} style={[styles.logRow, { backgroundColor: c.card, borderColor: c.border }]}>
                <View style={styles.logContent}>
                  <Text style={[styles.logTitle, { color: c.text, fontFamily: 'Poppins_Medium' }]} numberOfLines={1}>
                    {log.title}
                  </Text>
                  <Text style={[styles.logBody, { color: c.textSecondary, fontFamily: 'Poppins_Regular' }]} numberOfLines={1}>
                    {log.body}
                  </Text>
                </View>
                <View style={styles.logMeta}>
                  <View style={[styles.statusBadge, { backgroundColor: log.status === 'sent' ? c.success + '20' : c.warning + '20' }]}>
                    <Text style={[styles.statusText, { color: log.status === 'sent' ? c.success : c.warning, fontFamily: 'Poppins_Medium' }]}>
                      {log.status === 'sent' ? 'Wysłane' : log.status}
                    </Text>
                  </View>
                  <Text style={[styles.logDate, { color: c.textSecondary, fontFamily: 'Poppins_Regular' }]}>
                    {formatDate(log.created_at)}
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function StatCard({ icon, label, value, theme }: { icon: React.ReactNode; label: string; value: number; theme: any }) {
  const c = theme.colors;
  return (
    <View style={[styles.statCard, { backgroundColor: c.card, borderColor: c.border }]}>
      {icon}
      <Text style={[styles.statValue, { color: c.text, fontFamily: 'Poppins_SemiBold' }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: c.textSecondary, fontFamily: 'Poppins_Regular' }]}>{label}</Text>
    </View>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1,
  },
  iconBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 18 },
  content: { padding: 16, gap: 8 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    flex: 1, minWidth: '45%', borderRadius: 12, padding: 14,
    borderWidth: 1, gap: 4,
  },
  statValue: { fontSize: 22, marginTop: 4 },
  statLabel: { fontSize: 12 },
  platformRow: {
    flexDirection: 'row', borderWidth: 1, borderRadius: 10, marginTop: 8,
    padding: 12, gap: 16,
  },
  platformItem: { alignItems: 'center' },
  platformCount: { fontSize: 18 },
  platformLabel: { fontSize: 12 },
  sectionLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  inputMulti: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 14,
    paddingTop: 12, paddingBottom: 12, fontSize: 14, minHeight: 80,
  },
  sendBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 12, paddingVertical: 14, marginTop: 4,
  },
  sendBtnText: { color: '#fff', fontSize: 15 },
  logRow: {
    borderWidth: 1, borderRadius: 10, padding: 12,
    flexDirection: 'row', gap: 10, alignItems: 'center',
  },
  logContent: { flex: 1 },
  logTitle: { fontSize: 13 },
  logBody: { fontSize: 12, marginTop: 2 },
  logMeta: { alignItems: 'flex-end', gap: 4 },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  statusText: { fontSize: 11 },
  logDate: { fontSize: 11 },
});
