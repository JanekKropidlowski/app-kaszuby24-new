import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Search, Plus, ChevronRight, X } from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';
import { getArticles } from '@/services/adminApi';

interface Article {
  id: number;
  title: string;
  status: string;
  published_at: string;
  slug: string;
}

const STATUS_FILTERS = [
  { label: 'Wszystkie', value: '' },
  { label: 'Opublikowane', value: 'publish' },
  { label: 'Szkice', value: 'draft' },
];

export default function AdminArticlesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme } = useThemeStore();
  const c = theme.colors;

  const [articles, setArticles] = useState<Article[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const PER_PAGE = 20;

  const fetchArticles = useCallback(async (p: number, reset = false) => {
    if (p === 1) { reset ? setRefreshing(true) : setLoading(true); }
    else setLoadingMore(true);

    try {
      const res = await getArticles({ page: p, per_page: PER_PAGE, search: search || undefined, status: statusFilter || undefined });
      const { articles: list, total: tot } = res.data;
      setTotal(tot);
      setArticles(prev => (p === 1 ? list : [...prev, ...list]));
      setPage(p);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [search, statusFilter]);

  useEffect(() => { fetchArticles(1); }, [fetchArticles]);

  const onRefresh = () => fetchArticles(1, true);

  const loadMore = () => {
    if (loadingMore || articles.length >= total) return;
    fetchArticles(page + 1);
  };

  const renderItem = ({ item }: { item: Article }) => (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: c.card, borderBottomColor: c.border }]}
      onPress={() => router.push(`/admin/articles/${item.id}`)}
    >
      <View style={styles.rowContent}>
        <Text style={[styles.rowTitle, { color: c.text, fontFamily: 'Poppins_Medium' }]} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.rowMeta}>
          <View style={[styles.badge, { backgroundColor: item.status === 'publish' ? c.success + '22' : c.warning + '22' }]}>
            <Text style={[styles.badgeText, { color: item.status === 'publish' ? c.success : c.warning, fontFamily: 'Poppins_Medium' }]}>
              {item.status === 'publish' ? 'Opublikowany' : 'Szkic'}
            </Text>
          </View>
          <Text style={[styles.rowDate, { color: c.textSecondary, fontFamily: 'Poppins_Regular' }]}>
            {formatDate(item.published_at)}
          </Text>
        </View>
      </View>
      <ChevronRight size={16} color={c.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.flex, { backgroundColor: c.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={c.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.text, fontFamily: 'Poppins_SemiBold' }]}>
          Artykuły
        </Text>
        <TouchableOpacity onPress={() => router.push('/admin/articles/new')} style={styles.addBtn}>
          <Plus size={22} color={c.primary} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={[styles.searchRow, { backgroundColor: c.subtle, borderColor: c.border }]}>
        <Search size={16} color={c.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: c.text, fontFamily: 'Poppins_Regular' }]}
          placeholder="Szukaj artykułu..."
          placeholderTextColor={c.textSecondary}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <X size={16} color={c.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Status filters */}
      <View style={[styles.filters, { borderBottomColor: c.border }]}>
        {STATUS_FILTERS.map(f => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterBtn, statusFilter === f.value && { borderBottomWidth: 2, borderBottomColor: c.primary }]}
            onPress={() => setStatusFilter(f.value)}
          >
            <Text style={[styles.filterLabel, { color: statusFilter === f.value ? c.primary : c.textSecondary, fontFamily: 'Poppins_Medium' }]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
        <Text style={[styles.totalText, { color: c.textSecondary, fontFamily: 'Poppins_Regular' }]}>
          {total} art.
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color={c.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={articles}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={c.primary} style={{ marginVertical: 16 }} /> : null}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: c.textSecondary, fontFamily: 'Poppins_Regular' }]}>
              Brak artykułów
            </Text>
          }
        />
      )}
    </View>
  );
}

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18 },
  addBtn: { padding: 4 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginVertical: 10,
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14 },
  filters: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    borderBottomWidth: 1, gap: 4,
  },
  filterBtn: { paddingVertical: 10, paddingHorizontal: 10 },
  filterLabel: { fontSize: 13 },
  totalText: { marginLeft: 'auto', fontSize: 12 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1,
  },
  rowContent: { flex: 1, gap: 6 },
  rowTitle: { fontSize: 14, lineHeight: 20 },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 11 },
  rowDate: { fontSize: 12 },
  empty: { textAlign: 'center', marginTop: 60, fontSize: 14 },
});
