import React, { useState, useEffect } from 'react';
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
import { useThemeStore } from '@/store/themeStore';
import { useArticlesStore } from '@/store/articlesStore';
import { filterSponsoredArticles } from '@/utils/contentFilter';
import SkeletonLoader from '@/components/SkeletonLoader';

export default function SearchScreen() {
  const router = useRouter();
  const { theme } = useThemeStore();
  const { addRecentArticle } = useArticlesStore();
  
  const [query, setQuery] = useState('');
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
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
      setError(null);
      
      const { articles: searchResults, totalPages } = await searchArticles(searchQuery, 1);
      
      // Additional client-side filtering to ensure no sponsored content
      const filteredResults = filterSponsoredArticles(searchResults);
      
      setArticles(filteredResults);
      setTotalPages(totalPages);
      setPage(1);
    } catch (err) {
      setError('Nie udało się wyszukać artykułów. Spróbuj ponownie.');
      console.error('Error searching articles:', err);
    } finally {
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
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <SearchBar 
        onSearch={handleSearch} 
        placeholder="Szukaj wiadomości..." 
        autoFocus={false}
      />
      
      {loading ? (
        <SkeletonLoader fullScreen />
      ) : (
        <FlatList
          data={articles}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.articleContainer}>
              <ArticleCard 
                article={item} 
                onPress={() => handleArticlePress(item)}
              />
            </View>
          )}
          contentContainerStyle={styles.listContent}
          removeClippedSubviews={Platform.OS === 'android'}
          initialNumToRender={Platform.OS === 'android' ? 5 : 10}
          maxToRenderPerBatch={Platform.OS === 'android' ? 5 : 10}
          windowSize={Platform.OS === 'android' ? 5 : 10}
          ListHeaderComponent={
            query.trim() ? (
              <Text 
                style={[
                  styles.resultsText, 
                  { color: theme.colors.text }
                ]}
              >
                {articles.length === 0
                  ? 'Nie znaleziono wyników'
                  : `Znaleziono ${articles.length} wyników dla "${query}"`}
              </Text>
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
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 16,
    flexGrow: 1,
  },
  articleContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  resultsText: {
    fontSize: 16,
    marginHorizontal: 16,
    marginVertical: 16,
    fontWeight: '500',
  },
  emptySearchContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptySearchTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySearchSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  voiceSearchHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  voiceSearchText: {
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },
});