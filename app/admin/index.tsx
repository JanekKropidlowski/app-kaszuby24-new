import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Users, Eye, BarChart2, LogOut, Plus, List,
  Calendar, Facebook, Bell,
} from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';
import { useAdminStore } from '@/store/adminStore';
import { getAnalyticsRealtime, getAnalyticsGa4, getFbPlan, getPushStats } from '@/services/adminApi';

export default function AdminHomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme } = useThemeStore();
  const { user, clearAuth } = useAdminStore();
  const c = theme.colors;

  const [realtime, setRealtime] = useState<number | null>(null);
  const [ga4, setGa4] = useState<Record<string, any> | null>(null);
  const [fbPending, setFbPending] = useState<number | null>(null);
  const [pushActive, setPushActive] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const [rtRes, gaRes, fbRes, pushRes] = await Promise.allSettled([
        getAnalyticsRealtime(),
        getAnalyticsGa4(7),
        getFbPlan(5),
        getPushStats(),
      ]);
      if (rtRes.status === 'fulfilled') setRealtime(rtRes.value.data?.activeUsers ?? null);
      if (gaRes.status === 'fulfilled' && gaRes.value.data?.configured) setGa4(gaRes.value.data);
      if (fbRes.status === 'fulfilled') setFbPending(fbRes.value.data?.stats?.pending ?? null);
      if (pushRes.status === 'fulfilled') setPushActive(pushRes.value.data?.tokens?.active ?? null);
    } catch { }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleLogout = () => {
    Alert.alert('Wylogowanie', 'Na pewno chcesz się wylogować?', [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Wyloguj', style: 'destructive', onPress: () => { clearAuth(); router.replace('/settings'); } },
    ]);
  };

  return (
    <View style={[styles.flex, { backgroundColor: c.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: c.background, borderBottomColor: c.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: c.text, fontFamily: 'Poppins_SemiBold' }]}>Panel admina</Text>
          {user && (
            <Text style={[styles.headerSub, { color: c.textSecondary, fontFamily: 'Poppins_Regular' }]}>
              {user.display_name || user.email}
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <LogOut size={20} color={c.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStats(); }} tintColor={c.primary} />}
      >
        {/* Quick stats */}
        {loading ? (
          <ActivityIndicator color={c.primary} style={{ marginVertical: 24 }} />
        ) : (
          <View style={styles.statsRow}>
            <StatCard label="Aktywni teraz" value={realtime ?? '—'} icon={<Users size={18} color={c.primary} />} theme={theme} />
            <StatCard label="Sesje (7 dni)" value={ga4?.sessions != null ? fmt(ga4.sessions) : '—'} icon={<BarChart2 size={18} color={c.primary} />} theme={theme} />
            <StatCard label="Odsłony (7 dni)" value={ga4?.screenPageViews != null ? fmt(ga4.screenPageViews) : '—'} icon={<Eye size={18} color={c.success} />} theme={theme} />
            <StatCard label="Push urządzenia" value={pushActive ?? '—'} icon={<Bell size={18} color={c.info} />} theme={theme} />
          </View>
        )}

        {/* Articles */}
        <SectionLabel label="Artykuły" color={c.textSecondary} />
        <View style={styles.actionsRow}>
          <ActionBtn icon={<Plus size={20} color="#fff" />} label="Nowy artykuł" bg={c.primary} onPress={() => router.push('/admin/articles/new')} />
          <ActionBtn icon={<List size={20} color={c.primary} />} label="Lista" bg={c.subtle} textColor={c.primary} onPress={() => router.push('/admin/articles')} />
        </View>

        {/* Tools */}
        <SectionLabel label="Narzędzia" color={c.textSecondary} />
        <View style={styles.toolsGrid}>
          <ToolBtn icon={<Calendar size={20} color={c.primary} />} label="Kalendarz" onPress={() => router.push('/admin/calendar')} theme={theme} />
          <ToolBtn
            icon={<Facebook size={20} color="#1877F2" />}
            label={`Facebook${fbPending ? ` (${fbPending})` : ''}`}
            onPress={() => router.push('/admin/fb')}
            theme={theme}
            badge={fbPending ?? undefined}
          />
          <ToolBtn icon={<Bell size={20} color={c.warning} />} label="Push" onPress={() => router.push('/admin/push')} theme={theme} />
          <ToolBtn icon={<BarChart2 size={20} color={c.success} />} label="Statystyki" onPress={() => router.push('/admin/analytics')} theme={theme} />
        </View>
      </ScrollView>
    </View>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────────

function SectionLabel({ label, color }: { label: string; color: string }) {
  return <Text style={[styles.sectionLabel, { color, fontFamily: 'Poppins_Medium' }]}>{label}</Text>;
}

function StatCard({ label, value, icon, theme }: { label: string; value: any; icon: React.ReactNode; theme: any }) {
  const c = theme.colors;
  return (
    <View style={[styles.statCard, { backgroundColor: c.card, borderColor: c.border }]}>
      {icon}
      <Text style={[styles.statValue, { color: c.text, fontFamily: 'Poppins_SemiBold' }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: c.textSecondary, fontFamily: 'Poppins_Regular' }]}>{label}</Text>
    </View>
  );
}

function ActionBtn({ icon, label, bg, textColor, onPress }: {
  icon: React.ReactNode; label: string; bg: string; textColor?: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: bg }]} onPress={onPress}>
      {icon}
      <Text style={[styles.actionBtnText, { color: textColor || '#fff', fontFamily: 'Poppins_SemiBold' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function ToolBtn({ icon, label, onPress, theme, badge }: {
  icon: React.ReactNode; label: string; onPress: () => void; theme: any; badge?: number;
}) {
  const c = theme.colors;
  return (
    <TouchableOpacity style={[styles.toolBtn, { backgroundColor: c.card, borderColor: c.border }]} onPress={onPress}>
      <View style={styles.toolBtnIcon}>
        {icon}
        {badge != null && badge > 0 && (
          <View style={[styles.toolBadge, { backgroundColor: c.error }]}>
            <Text style={styles.toolBadgeText}>{badge}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.toolBtnLabel, { color: c.text, fontFamily: 'Poppins_Medium' }]} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
}

function fmt(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 20 },
  headerSub: { fontSize: 13, marginTop: 2 },
  logoutBtn: { padding: 8 },
  content: { padding: 20, gap: 10 },
  sectionLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    flex: 1, minWidth: '45%', borderRadius: 12, padding: 14,
    borderWidth: 1, gap: 4,
  },
  statValue: { fontSize: 20 },
  statLabel: { fontSize: 11 },
  actionsRow: { flexDirection: 'row', gap: 12 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 12, paddingVertical: 15,
  },
  actionBtnText: { fontSize: 14 },
  toolsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  toolBtn: {
    flex: 1, minWidth: '45%', borderRadius: 12, padding: 16,
    borderWidth: 1, alignItems: 'center', gap: 8,
  },
  toolBtnIcon: { position: 'relative' },
  toolBtnLabel: { fontSize: 13 },
  toolBadge: {
    position: 'absolute', top: -4, right: -8,
    minWidth: 16, height: 16, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  toolBadgeText: { color: '#fff', fontSize: 10, fontFamily: 'Poppins_SemiBold' },
});
