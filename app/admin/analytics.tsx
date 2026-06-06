import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Users, Eye, TrendingUp, Smartphone, MousePointer, Search } from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';
import { getAnalyticsRealtime, getAnalyticsGa4, getAnalyticsGsc, getAnalyticsPageviews } from '@/services/adminApi';

const PERIOD_OPTIONS = [
  { label: '7 dni', value: 7 },
  { label: '28 dni', value: 28 },
];

export default function AdminAnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme } = useThemeStore();
  const c = theme.colors;

  const [period, setPeriod] = useState(7);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [activeUsers, setActiveUsers] = useState<number | null>(null);
  const [ga4, setGa4] = useState<Record<string, any> | null>(null);
  const [gsc, setGsc] = useState<Record<string, any> | null>(null);
  const [topArticles, setTopArticles] = useState<{ slug: string; views: number }[]>([]);

  const fetchAll = useCallback(async (p = period) => {
    try {
      const [rtRes, gaRes, gscRes, pvRes] = await Promise.allSettled([
        getAnalyticsRealtime(),
        getAnalyticsGa4(p),
        getAnalyticsGsc(p),
        getAnalyticsPageviews(p),
      ]);

      if (rtRes.status === 'fulfilled') setActiveUsers(rtRes.value.data?.activeUsers ?? null);
      if (gaRes.status === 'fulfilled' && gaRes.value.data?.configured) setGa4(gaRes.value.data);
      else setGa4(null);
      if (gscRes.status === 'fulfilled' && gscRes.value.data?.configured) setGsc(gscRes.value.data);
      else setGsc(null);
      if (pvRes.status === 'fulfilled' && pvRes.value.data?.configured) {
        const map: Record<string, number> = pvRes.value.data.map || {};
        const sorted = Object.entries(map)
          .map(([slug, views]) => ({ slug, views: Number(views) }))
          .sort((a, b) => b.views - a.views)
          .slice(0, 10);
        setTopArticles(sorted);
      }
    } catch { }
    finally { setLoading(false); setRefreshing(false); }
  }, [period]);

  useEffect(() => { setLoading(true); fetchAll(period); }, [period]);

  const onRefresh = () => { setRefreshing(true); fetchAll(period); };

  return (
    <View style={[styles.flex, { backgroundColor: c.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <ArrowLeft size={22} color={c.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.text, fontFamily: 'Poppins_SemiBold' }]}>Statystyki</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
      >
        {/* Realtime */}
        <View style={[styles.realtimeCard, { backgroundColor: c.primary }]}>
          <Users size={24} color="#fff" />
          <View>
            <Text style={[styles.realtimeValue, { fontFamily: 'Poppins_SemiBold' }]}>{activeUsers ?? '—'}</Text>
            <Text style={[styles.realtimeLabel, { fontFamily: 'Poppins_Regular' }]}>aktywnych teraz</Text>
          </View>
        </View>

        {/* Period selector */}
        <View style={[styles.periodRow, { backgroundColor: c.subtle, borderColor: c.border }]}>
          {PERIOD_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.periodBtn, period === opt.value && { backgroundColor: c.primary }]}
              onPress={() => setPeriod(opt.value)}
            >
              <Text style={[styles.periodLabel, { color: period === opt.value ? '#fff' : c.textSecondary, fontFamily: 'Poppins_Medium' }]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? <ActivityIndicator color={c.primary} style={{ marginTop: 32 }} /> : (
          <>
            {/* GA4 */}
            {ga4 ? (
              <>
                <SectionLabel label={`Google Analytics — ${period} dni`} color={c.textSecondary} />
                <View style={styles.metricsGrid}>
                  <MetricCard icon={<Users size={18} color={c.primary} />} label="Użytkownicy" value={ga4.totalUsers} theme={theme} />
                  <MetricCard icon={<TrendingUp size={18} color={c.primary} />} label="Sesje" value={ga4.sessions} theme={theme} />
                  <MetricCard icon={<Eye size={18} color={c.success} />} label="Odsłony" value={ga4.screenPageViews} theme={theme} />
                  <MetricCard icon={<Smartphone size={18} color={c.success} />} label="Nowi" value={ga4.newUsers} theme={theme} />
                </View>
              </>
            ) : (
              <Text style={[styles.noData, { color: c.textSecondary, fontFamily: 'Poppins_Regular' }]}>GA4 nie skonfigurowane</Text>
            )}

            {/* GSC */}
            {gsc ? (
              <>
                <SectionLabel label={`Google Search Console — ${period} dni`} color={c.textSecondary} />
                <View style={styles.metricsGrid}>
                  <MetricCard icon={<MousePointer size={18} color='#4285F4' />} label="Kliknięcia" value={gsc.clicks} theme={theme} />
                  <MetricCard icon={<Eye size={18} color='#4285F4' />} label="Wyświetlenia" value={gsc.impressions} theme={theme} />
                  <MetricCard
                    icon={<TrendingUp size={18} color='#34A853' />}
                    label="CTR"
                    value={gsc.ctr != null ? `${(gsc.ctr * 100).toFixed(1)}%` : null}
                    theme={theme}
                    raw
                  />
                  <MetricCard
                    icon={<Search size={18} color='#34A853' />}
                    label="Śr. pozycja"
                    value={gsc.position != null ? gsc.position.toFixed(1) : null}
                    theme={theme}
                    raw
                  />
                </View>
              </>
            ) : null}

            {/* Top articles */}
            {topArticles.length > 0 && (
              <>
                <SectionLabel label={`Top artykuły — ${period} dni`} color={c.textSecondary} />
                <View style={[styles.topList, { borderColor: c.border }]}>
                  {topArticles.map((a, i) => (
                    <View
                      key={a.slug}
                      style={[styles.topRow, { borderBottomColor: c.border, borderBottomWidth: i < topArticles.length - 1 ? 1 : 0 }]}
                    >
                      <Text style={[styles.topRank, { color: c.textSecondary, fontFamily: 'Poppins_SemiBold' }]}>{i + 1}</Text>
                      <Text style={[styles.topSlug, { color: c.text, fontFamily: 'Poppins_Regular' }]} numberOfLines={1}>
                        /{a.slug}
                      </Text>
                      <Text style={[styles.topViews, { color: c.primary, fontFamily: 'Poppins_SemiBold' }]}>
                        {formatNum(a.views)}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function SectionLabel({ label, color }: { label: string; color: string }) {
  return <Text style={[styles.sectionLabel, { color, fontFamily: 'Poppins_Medium' }]}>{label}</Text>;
}

function MetricCard({ icon, label, value, theme, raw }: {
  icon: React.ReactNode; label: string; value: any; theme: any; raw?: boolean;
}) {
  const c = theme.colors;
  const display = raw ? (value ?? '—') : (value != null ? formatNum(Number(value)) : '—');
  return (
    <View style={[styles.metricCard, { backgroundColor: c.card, borderColor: c.border }]}>
      {icon}
      <Text style={[styles.metricValue, { color: c.text, fontFamily: 'Poppins_SemiBold' }]}>{display}</Text>
      <Text style={[styles.metricLabel, { color: c.textSecondary, fontFamily: 'Poppins_Regular' }]}>{label}</Text>
    </View>
  );
}

function formatNum(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1,
  },
  iconBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 18 },
  content: { padding: 20 },
  realtimeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    borderRadius: 14, padding: 18, marginBottom: 16,
  },
  realtimeValue: { color: '#fff', fontSize: 32 },
  realtimeLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 },
  periodRow: {
    flexDirection: 'row', borderWidth: 1, borderRadius: 10,
    overflow: 'hidden', marginBottom: 20,
  },
  periodBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  periodLabel: { fontSize: 14 },
  sectionLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12, marginTop: 20 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCard: {
    flex: 1, minWidth: '45%', borderRadius: 12, padding: 14,
    borderWidth: 1, gap: 4,
  },
  metricValue: { fontSize: 22, marginTop: 4 },
  metricLabel: { fontSize: 12 },
  noData: { textAlign: 'center', marginTop: 32, fontSize: 14 },
  topList: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  topRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  topRank: { width: 22, fontSize: 14 },
  topSlug: { flex: 1, fontSize: 13 },
  topViews: { fontSize: 14 },
});
