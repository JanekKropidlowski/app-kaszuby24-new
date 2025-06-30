import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  RefreshControl,
  TouchableOpacity,
  Platform
} from 'react-native';
import { Calendar as CalendarIcon } from 'lucide-react-native';
import { fetchArticles } from '@/services/api';
import { Article } from '@/types/article';
import ArticleCard from '@/components/ArticleCard';
import LoadingIndicator from '@/components/LoadingIndicator';
import EmptyState from '@/components/EmptyState';
import { useThemeStore } from '@/store/themeStore';
import { formatDate } from '@/utils/dateFormatter';

// Find the events category ID - this would normally be fetched from the API
// For now, we'll use a placeholder ID that you should replace with the actual events category ID
const EVENTS_CATEGORY_ID = 5; // Replace with actual events category ID

export default function CalendarScreen() {
  const { theme } = useThemeStore();
  
  const [events, setEvents] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Group events by date
  const groupedEvents = events.reduce((groups: Record<string, Article[]>, event) => {
    const date = formatDate(event.date);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(event);
    return groups;
  }, {});
  
  // Convert grouped events to array for FlatList
  const eventsByDate = Object.entries(groupedEvents).map(([date, events]) => ({
    date,
    events,
  }));
  
  // Load events
  const loadEvents = useCallback(async (pageNum = 1, refresh = false) => {
    try {
      setError(null);
      
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      
      const { articles: newEvents, totalPages: total } = await fetchArticles(
        pageNum,
        20,
        [EVENTS_CATEGORY_ID]
      );
      
      if (refresh || pageNum === 1) {
        setEvents(newEvents);
      } else {
        setEvents((prev) => [...prev, ...newEvents]);
      }
      
      setTotalPages(total);
      setPage(pageNum);
    } catch (err) {
      setError('Nie udało się załadować wydarzeń. Spróbuj ponownie.');
      console.error('Error loading events:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);
  
  // Initial load
  useEffect(() => {
    loadEvents();
  }, [loadEvents]);
  
  const handleRefresh = () => {
    setRefreshing(true);
    loadEvents(1, true);
  };
  
  const handleLoadMore = () => {
    if (page < totalPages && !loadingMore) {
      loadEvents(page + 1);
    }
  };
  
  if (loading && !refreshing) {
    return <LoadingIndicator fullScreen />;
  }
  
  if (error) {
    return (
      <EmptyState
        title="Coś poszło nie tak"
        message={error}
        actionLabel="Spróbuj ponownie"
        onAction={() => loadEvents(1, true)}
      />
    );
  }
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={eventsByDate}
        keyExtractor={(item) => item.date}
        renderItem={({ item }) => (
          <View style={styles.dateGroup}>
            <View style={[styles.dateHeader, { backgroundColor: theme.colors.card }]}>
              <CalendarIcon size={18} color={theme.colors.primary} />
              <Text style={[styles.dateText, { color: theme.colors.text }]}>
                {item.date}
              </Text>
            </View>
            
            {item.events.map((event) => (
              <View key={event.id} style={styles.eventItem}>
                <ArticleCard article={event} compact />
              </View>
            ))}
          </View>
        )}
        contentContainerStyle={styles.listContent}
        removeClippedSubviews={Platform.OS === 'android'}
        initialNumToRender={Platform.OS === 'android' ? 5 : 10}
        maxToRenderPerBatch={Platform.OS === 'android' ? 5 : 10}
        windowSize={Platform.OS === 'android' ? 5 : 10}
        ListHeaderComponent={
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Nadchodzące wydarzenia
          </Text>
        }
        ListEmptyComponent={
          <EmptyState
            title="Nie znaleziono wydarzeń"
            message="Sprawdź ponownie później, aby zobaczyć nadchodzące wydarzenia w regionie Kaszub."
            actionLabel="Odśwież"
            onAction={handleRefresh}
            icon={<CalendarIcon size={48} color={theme.colors.primary} />}
          />
        }
        ListFooterComponent={
          loadingMore ? <LoadingIndicator size="small" /> : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 24,
  },
  listContent: {
    paddingBottom: 16,
  },
  dateGroup: {
    marginBottom: 24,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 12,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  eventItem: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
});