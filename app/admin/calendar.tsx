import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ChevronLeft, ChevronRight, Calendar as CalIcon, Clock } from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';
import { getCalendar } from '@/services/adminApi';

interface CalPost {
  id: number;
  title: string;
  date: string;
  status: 'publish' | 'future';
  fb: boolean;
}

interface DayGroup {
  day: number;
  label: string;
  posts: CalPost[];
}

const PL_MONTHS = ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień'];
const PL_DAYS = ['Nd','Pn','Wt','Śr','Cz','Pt','Sb'];

export default function AdminCalendarScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme } = useThemeStore();
  const c = theme.colors;

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [posts, setPosts] = useState<CalPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCalendar = useCallback(async (y: number, m: number, reset = false) => {
    reset ? setRefreshing(true) : setLoading(true);
    try {
      const res = await getCalendar(y, m);
      setPosts(res.data.posts || []);
    } catch { setPosts([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchCalendar(year, month); }, [year, month]);

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

  // Group by day
  const groups: DayGroup[] = [];
  const dayMap = new Map<number, CalPost[]>();
  for (const p of posts) {
    const d = new Date(p.date);
    const day = d.getDate();
    if (!dayMap.has(day)) dayMap.set(day, []);
    dayMap.get(day)!.push(p);
  }
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const dayPosts = dayMap.get(d) || [];
    if (dayPosts.length > 0) {
      const dt = new Date(year, month - 1, d);
      groups.push({
        day: d,
        label: `${d} ${PL_MONTHS[month - 1]} (${PL_DAYS[dt.getDay()]})`,
        posts: dayPosts,
      });
    }
  }

  const today = now.getDate();
  const isCurrentMonth = now.getFullYear() === year && (now.getMonth() + 1) === month;

  return (
    <View style={[styles.flex, { backgroundColor: c.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <ArrowLeft size={22} color={c.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.text, fontFamily: 'Poppins_SemiBold' }]}>
          Kalendarz
        </Text>
        <View style={{ width: 34 }} />
      </View>

      {/* Month nav */}
      <View style={[styles.monthNav, { borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
          <ChevronLeft size={22} color={c.text} />
        </TouchableOpacity>
        <Text style={[styles.monthLabel, { color: c.text, fontFamily: 'Poppins_SemiBold' }]}>
          {PL_MONTHS[month - 1]} {year}
        </Text>
        <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
          <ChevronRight size={22} color={c.text} />
        </TouchableOpacity>
      </View>

      {/* Summary bar */}
      <View style={[styles.summaryBar, { backgroundColor: c.subtle, borderBottomColor: c.border }]}>
        <Text style={[styles.summaryText, { color: c.textSecondary, fontFamily: 'Poppins_Regular' }]}>
          {posts.length} artykułów · {posts.filter(p => p.fb).length} zaplanowanych na FB
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color={c.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchCalendar(year, month, true)} tintColor={c.primary} />}
        >
          {groups.length === 0 ? (
            <View style={styles.empty}>
              <CalIcon size={40} color={c.border} />
              <Text style={[styles.emptyText, { color: c.textSecondary, fontFamily: 'Poppins_Regular' }]}>
                Brak artykułów w tym miesiącu
              </Text>
            </View>
          ) : (
            groups.map(group => (
              <View key={group.day} style={styles.dayGroup}>
                <View style={[styles.dayHeader, isCurrentMonth && group.day === today && { backgroundColor: c.primary + '15' }]}>
                  <Text style={[styles.dayLabel, { color: isCurrentMonth && group.day === today ? c.primary : c.textSecondary, fontFamily: 'Poppins_SemiBold' }]}>
                    {group.label}
                  </Text>
                  <Text style={[styles.dayCount, { color: c.textSecondary, fontFamily: 'Poppins_Regular' }]}>
                    {group.posts.length} art.
                  </Text>
                </View>
                {group.posts.map(post => (
                  <TouchableOpacity
                    key={post.id}
                    style={[styles.postRow, { backgroundColor: c.card, borderLeftColor: post.status === 'future' ? c.warning : c.success }]}
                    onPress={() => router.push(`/admin/articles/${post.id}`)}
                  >
                    <View style={styles.postInfo}>
                      <Text style={[styles.postTitle, { color: c.text, fontFamily: 'Poppins_Medium' }]} numberOfLines={2}>
                        {post.title}
                      </Text>
                      <View style={styles.postMeta}>
                        <Clock size={11} color={c.textSecondary} />
                        <Text style={[styles.postTime, { color: c.textSecondary, fontFamily: 'Poppins_Regular' }]}>
                          {formatTime(post.date)}
                        </Text>
                        {post.status === 'future' && (
                          <View style={[styles.futureBadge, { backgroundColor: c.warning + '20' }]}>
                            <Text style={[styles.futureBadgeText, { color: c.warning, fontFamily: 'Poppins_Medium' }]}>zaplanowany</Text>
                          </View>
                        )}
                        {post.fb && (
                          <View style={[styles.fbBadge, { backgroundColor: '#1877F2' + '20' }]}>
                            <Text style={[styles.fbBadgeText, { color: '#1877F2', fontFamily: 'Poppins_Medium' }]}>FB</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1,
  },
  iconBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 18 },
  monthNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, paddingVertical: 10, borderBottomWidth: 1,
  },
  navBtn: { padding: 8 },
  monthLabel: { fontSize: 17 },
  summaryBar: {
    paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1,
  },
  summaryText: { fontSize: 12 },
  content: { padding: 16, gap: 16 },
  dayGroup: { gap: 8 },
  dayHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
  },
  dayLabel: { fontSize: 13 },
  dayCount: { fontSize: 12 },
  postRow: {
    borderLeftWidth: 3, borderRadius: 8, padding: 12,
    marginLeft: 4,
  },
  postInfo: { gap: 5 },
  postTitle: { fontSize: 13, lineHeight: 18 },
  postMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  postTime: { fontSize: 12 },
  futureBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  futureBadgeText: { fontSize: 10 },
  fbBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  fbBadgeText: { fontSize: 10 },
  empty: { alignItems: 'center', gap: 12, marginTop: 60 },
  emptyText: { fontSize: 14 },
});
