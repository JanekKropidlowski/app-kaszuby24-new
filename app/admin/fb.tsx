import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Send, ToggleLeft, ToggleRight, CheckCircle, Clock, AlertCircle } from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';
import { getFbPlan, toggleFbPost, publishFbNow } from '@/services/adminApi';

interface FbPost {
  log_id: number;
  wp_post_id: number;
  title: string;
  wp_status: string | null;
  scheduled_for: string | null;
  fb_sent_at: string | null;
  fb_enabled: boolean;
  fb_teaser: string;
  pending: boolean;
}

interface FbStats {
  total: number;
  pending: number;
  ready: number;
  next_slot: string | null;
  fb_token_expired: boolean;
}

const FILTERS = [
  { label: 'Oczekujące', key: 'pending' },
  { label: 'Wysłane', key: 'sent' },
  { label: 'Wszystkie', key: 'all' },
] as const;

type FilterKey = typeof FILTERS[number]['key'];

export default function AdminFbScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme } = useThemeStore();
  const c = theme.colors;

  const [queue, setQueue] = useState<FbPost[]>([]);
  const [stats, setStats] = useState<FbStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterKey>('pending');
  const [toggling, setToggling] = useState<number | null>(null);
  const [publishing, setPublishing] = useState<number | null>(null);

  const fetch = useCallback(async (reset = false) => {
    reset ? setRefreshing(true) : setLoading(true);
    try {
      const res = await getFbPlan(100);
      setQueue(res.data.queue || []);
      setStats(res.data.stats || null);
    } catch { }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetch(); }, []);

  const filtered = queue.filter(p => {
    if (filter === 'pending') return p.pending && p.fb_enabled;
    if (filter === 'sent') return !!p.fb_sent_at;
    return true;
  });

  const handleToggle = async (post: FbPost) => {
    setToggling(post.log_id);
    try {
      await toggleFbPost(post.wp_post_id);
      setQueue(prev => prev.map(p => p.log_id === post.log_id
        ? { ...p, fb_enabled: !p.fb_enabled, pending: !p.fb_enabled && !p.fb_sent_at && !!p.scheduled_for }
        : p
      ));
    } catch {
      Alert.alert('Błąd', 'Nie udało się zmienić statusu');
    } finally {
      setToggling(null);
    }
  };

  const handlePublishNow = (post: FbPost) => {
    Alert.alert('Publikuj teraz na FB', `"${post.title}"`, [
      { text: 'Anuluj', style: 'cancel' },
      {
        text: 'Opublikuj',
        onPress: async () => {
          setPublishing(post.log_id);
          try {
            await publishFbNow(post.wp_post_id);
            Alert.alert('Gotowe', 'Post zostanie opublikowany na Facebooku za chwilę.');
            fetch(true);
          } catch (err: any) {
            Alert.alert('Błąd', err.response?.data?.error || 'Operacja nie powiodła się');
          } finally {
            setPublishing(null);
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: FbPost }) => {
    const isSent = !!item.fb_sent_at;
    const isTogglin = toggling === item.log_id;
    const isPublishing = publishing === item.log_id;

    return (
      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={styles.cardTop}>
          <View style={[styles.statusDot, { backgroundColor: isSent ? c.success : item.fb_enabled ? c.warning : c.border }]} />
          <Text style={[styles.cardTitle, { color: c.text, fontFamily: 'Poppins_Medium' }]} numberOfLines={2}>
            {item.title}
          </Text>
        </View>

        <View style={styles.cardMeta}>
          {item.scheduled_for && (
            <View style={styles.metaItem}>
              <Clock size={12} color={c.textSecondary} />
              <Text style={[styles.metaText, { color: c.textSecondary, fontFamily: 'Poppins_Regular' }]}>
                {formatDateTime(item.scheduled_for)}
              </Text>
            </View>
          )}
          {isSent && item.fb_sent_at && (
            <View style={styles.metaItem}>
              <CheckCircle size={12} color={c.success} />
              <Text style={[styles.metaText, { color: c.success, fontFamily: 'Poppins_Regular' }]}>
                Wysłano {formatDateTime(item.fb_sent_at)}
              </Text>
            </View>
          )}
          {!item.fb_enabled && !isSent && (
            <View style={styles.metaItem}>
              <AlertCircle size={12} color={c.textSecondary} />
              <Text style={[styles.metaText, { color: c.textSecondary, fontFamily: 'Poppins_Regular' }]}>
                Wyłączony
              </Text>
            </View>
          )}
        </View>

        {!isSent && (
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[styles.toggleBtn, { borderColor: item.fb_enabled ? c.warning : c.success, opacity: isTogglin ? 0.5 : 1 }]}
              onPress={() => handleToggle(item)}
              disabled={isTogglin}
            >
              {isTogglin
                ? <ActivityIndicator size="small" color={item.fb_enabled ? c.warning : c.success} />
                : item.fb_enabled
                  ? <><ToggleRight size={15} color={c.warning} /><Text style={[styles.btnText, { color: c.warning, fontFamily: 'Poppins_Medium' }]}>Wyłącz</Text></>
                  : <><ToggleLeft size={15} color={c.success} /><Text style={[styles.btnText, { color: c.success, fontFamily: 'Poppins_Medium' }]}>Włącz</Text></>
              }
            </TouchableOpacity>

            {item.fb_enabled && (
              <TouchableOpacity
                style={[styles.publishNowBtn, { backgroundColor: '#1877F2', opacity: isPublishing ? 0.6 : 1 }]}
                onPress={() => handlePublishNow(item)}
                disabled={isPublishing}
              >
                {isPublishing
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <><Send size={13} color="#fff" /><Text style={[styles.publishNowText, { fontFamily: 'Poppins_Medium' }]}>Teraz</Text></>
                }
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.flex, { backgroundColor: c.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <ArrowLeft size={22} color={c.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.text, fontFamily: 'Poppins_SemiBold' }]}>
          Facebook Planer
        </Text>
        <View style={{ width: 34 }} />
      </View>

      {/* Stats */}
      {stats && (
        <View style={[styles.statsRow, { backgroundColor: c.subtle, borderBottomColor: c.border }]}>
          <StatChip label="Oczekujące" value={stats.pending} color={c.warning} theme={theme} />
          <StatChip label="Wysłane" value={stats.ready} color={c.success} theme={theme} />
          <StatChip label="Razem" value={stats.total} color={c.textSecondary} theme={theme} />
          {stats.fb_token_expired && (
            <View style={[styles.tokenWarn, { backgroundColor: c.error + '15' }]}>
              <AlertCircle size={13} color={c.error} />
              <Text style={[styles.tokenWarnText, { color: c.error, fontFamily: 'Poppins_Medium' }]}>Token wygasł</Text>
            </View>
          )}
        </View>
      )}

      {/* Filters */}
      <View style={[styles.filters, { borderBottomColor: c.border }]}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterBtn, filter === f.key && { borderBottomWidth: 2, borderBottomColor: '#1877F2' }]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterLabel, { color: filter === f.key ? '#1877F2' : c.textSecondary, fontFamily: 'Poppins_Medium' }]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={c.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.log_id)}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetch(true)} tintColor={c.primary} />}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: c.textSecondary, fontFamily: 'Poppins_Regular' }]}>
              Brak wpisów w tej kategorii
            </Text>
          }
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}
    </View>
  );
}

function StatChip({ label, value, color, theme }: { label: string; value: number; color: string; theme: any }) {
  return (
    <View style={styles.statChip}>
      <Text style={[styles.statValue, { color, fontFamily: 'Poppins_SemiBold' }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.colors.textSecondary, fontFamily: 'Poppins_Regular' }]}>{label}</Text>
    </View>
  );
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' })
    + ' ' + d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1,
  },
  iconBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 18 },
  statsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1,
  },
  statChip: { alignItems: 'center' },
  statValue: { fontSize: 18 },
  statLabel: { fontSize: 11 },
  tokenWarn: {
    marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  tokenWarnText: { fontSize: 12 },
  filters: {
    flexDirection: 'row', borderBottomWidth: 1,
  },
  filterBtn: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  filterLabel: { fontSize: 13 },
  list: { padding: 16 },
  card: {
    borderWidth: 1, borderRadius: 12, padding: 14, gap: 8,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5, flexShrink: 0 },
  cardTitle: { flex: 1, fontSize: 14, lineHeight: 20 },
  cardMeta: { gap: 4, paddingLeft: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 12 },
  cardActions: { flexDirection: 'row', gap: 8, paddingLeft: 16 },
  toggleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7,
  },
  btnText: { fontSize: 13 },
  publishNowBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7,
  },
  publishNowText: { color: '#fff', fontSize: 13 },
  empty: { textAlign: 'center', marginTop: 60, fontSize: 14 },
});
