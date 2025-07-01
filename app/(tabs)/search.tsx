import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  ActivityIndicator,
  TouchableOpacity,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { Search as SearchIcon, Mic } from 'lucide-react-native';
import { searchArticles } from '@/services/api';
import { Article } from '@/types/article';
import ArticleCard from '@/components/ArticleCard';
import SearchBar from '@/components/SearchBar';
import EmptyState from '@/components/EmptyState';
import LoadingIndicator from '@/components/LoadingIndicator';
import SkeletonLoader from '@/components/SkeletonLoader';
import { useThemeStore } from '@/store/themeStore';
import { useArticlesStore } from '@/store/articlesStore';
import { filterSponsoredArticles } from '@/utils/contentFilter';
import { useScrollStore } from '@/store/scrollStore';

export default function SearchScreen() {
  const router = useRouter();
  const { theme } = useThemeStore();
  const { addRecentArticle } = useArticlesStore();
  const { setScrollDirection, resetScroll } = useScrollStore();
  
  const [query, setQuery] = useState('');
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);
  
  const handleSearch = async (searchQuery: string) => {
    setQuery(searchQuery);
    
    if (!searchQuery.trim()) {
      setArticles([]);
      return;
    }
    
    try {
      setLoading(true);
      setInitialLoading(true);
      setError(null);
      
      // Start loading time measurement
      const startTime = Date.now();
      const minLoadingTime = 800; // Minimum time to show skeleton for better UX
      
      const { articles: searchResults, totalPages } = await searchArticles(searchQuery, 1);
      
      // Additional client-side filtering to ensure no sponsored content
      const filteredResults = filterSponsoredArticles(searchResults);
      
      // Calculate remaining time to show skeleton loader
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, minLoadingTime - elapsedTime);
      
      // Ensure skeleton loader shows for at least minLoadingTime
      setTimeout(() => {
        setArticles(filteredResults);
        setTotalPages(totalPages);
        setPage(1);
        setInitialLoading(false);
        setLoading(false);
      }, remainingTime);
      
    } catch (err) {
      setError('Nie udało się wyszukać artykułów. Spróbuj ponownie.');
      console.error('Error searching articles:', err);
      setInitialLoading(false);
      setLoading(false);
    }
  };
  
  const handleLoadMore = async () => {
    if (page >= totalPages || loadingMore || !query.trim()) return;
    
    try {
      setLoadingMore(true);
      
      const nextPage = page + 1;
      const { articles: moreResults } = await searchArticles(query, nextPage);
      
      // Additional client-side filtering to ensure no sponsored content
      const filteredResults = filterSponsoredArticles(moreResults);
      
      setArticles((prev) => [...prev, ...filteredResults]);
      setPage(nextPage);
    } catch (err) {
      console.error('Error loading more search results:', err);
    } finally {
      setLoadingMore(false);
    }
  };
  
  const handleArticlePress = (article: Article) => {
    // Add to recent articles (filtering is handled in the store)
    addRecentArticle(article);
    
    // Navigate to article detail page
    router.push(`/article/${article.id}`);
  };

  const renderEmptySearch = () => (
    <View style={styles.emptySearchContainer}>
      <View style={[styles.iconContainer, { backgroundColor: theme.colors.subtle }]}>
        <SearchIcon size={32} color={theme.colors.primary} />
      </View>
      <Text style={[styles.emptySearchTitle, { color: theme.colors.text }]}>
        Wyszukaj artykuły
      </Text>
      <Text style={[styles.emptySearchSubtitle, { color: theme.colors.textSecondary }]}>
        Wpisz słowa kluczowe lub użyj wyszukiwania głosowego
      </Text>
      
      {Platform.OS === 'web' && 'webkitSpeechRecognition' in window && (
        <View style={styles.voiceSearchHint}>
          <Mic size={16} color={theme.colors.primary} />
          <Text style={[styles.voiceSearchText, { color: theme.colors.primary }]}>
            Kliknij mikrofon aby wyszukać głosowo
          </Text>
        </View>
      )}
    </View>
  );
  
  // Add scroll handler for logo visibility
  const handleScroll = useCallback((event: any) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    setScrollDirection(scrollY);
  }, [setScrollDirection]);
  
  // Reset scroll state when component mounts
  useEffect(() => {
    resetScroll();
    return () => {
      resetScroll();
    };
  }, [resetScroll]);
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.searchContainer, { backgroundColor: theme.colors.card }]}>
        <SearchBar 
          onSearch={handleSearch} 
          placeholder="Szukaj wiadomości..." 
          autoFocus={false}
        />
      </View>
      
      {initialLoading ? (
        <SkeletonLoader type="search" count={5} />
      ) : loading && !initialLoading ? (
        <LoadingIndicator fullScreen />
      ) : (
        <FlatList
          data={articles}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <ArticleCard 
              article={item} 
              onPress={() => handleArticlePress(item)}
            />
          )}
          contentContainerStyle={styles.listContent}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          ListHeaderComponent={
            query.trim() ? (
              <View style={styles.resultsHeader}>
                <Text 
                  style={[
                    styles.resultsText, 
                    { 
                      color: theme.colors.text,
                      fontFamily: theme.fontFamily.semibold
                    }
                  ]}
                >
                  {articles.length === 0
                    ? 'Nie znaleziono wyników'
                    : `Znaleziono ${articles.length} wyników dla "${query}"`}
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            query.trim() && !loading ? (
              <EmptyState
                title="Nie znaleziono wyników"
                message={`Nie znaleźliśmy żadnych artykułów pasujących do "${query}". Spróbuj innego hasła.`}
                icon={<SearchIcon size={48} color={theme.colors.primary} />}
              />
            ) : !query.trim() ? renderEmptySearch() : null
          }
          ListFooterComponent={
            loadingMore ? <LoadingIndicator size="small" /> : null
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
          // Performance optimizations
          removeClippedSubviews={Platform.OS === 'android'}
          initialNumToRender={10}
          maxToRenderPerBatch={5}
          updateCellsBatchingPeriod={50}
          windowSize={10}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  listContent: {
    paddingBottom: 120, // Extra padding for tab bar
    flexGrow: 1,
  },
  resultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'rgba(34, 74, 150, 0.03)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  resultsText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  emptySearchContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  emptySearchTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  emptySearchSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.8,
  },
  voiceSearchHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 28,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 24,
    backgroundColor: 'rgba(34, 74, 150, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  voiceSearchText: {
    fontSize: 14,
    marginLeft: 10,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
});