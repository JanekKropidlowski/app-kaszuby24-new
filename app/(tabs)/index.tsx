import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  RefreshControl, 
  TouchableOpacity, 
  ScrollView,
  Dimensions,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, RefreshCw, WifiOff } from 'lucide-react-native';
import { Image } from 'expo-image';
import { fetchArticles, fetchCategories } from '@/services/api';
import { Article, Category } from '@/types/article';
import { ArticleCard } from '@/components/ArticleCard';
import LoadingIndicator from '@/components/LoadingIndicator';
import EmptyState from '@/components/EmptyState';
import { useArticlesStore } from '@/store/articlesStore';
import { useThemeStore } from '@/store/themeStore';

const { width } = Dimensions.get('window');

const MAX_RETRIES = 5;

export default function HomeScreen() {
  const router = useRouter();
  const { addRecentArticle } = useArticlesStore();
  const { theme } = useThemeStore();
  
  const [articles, setArticles] = useState<Article[]>([]);
  const [featuredArticle, setFeaturedArticle] = useState<Article | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isOffline, setIsOffline] = useState(false);
  
  // Load articles and categories
  const loadArticles = useCallback(async (pageNum = 1, refresh = false, retry = 0) => {
    try {
      setError(null);
      setIsOffline(false);
      
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      
      const categoryFilter = selectedCategory ? [selectedCategory] : undefined;
      const { articles: newArticles, totalPages: total } = await fetchArticles(
        pageNum,
        10,
        categoryFilter
      );
      
      if (refresh || pageNum === 1) {
        if (newArticles.length > 0) {
          setArticles(newArticles.slice(1)); // Skip first for featured
          setFeaturedArticle(newArticles[0]);
        } else {
          setArticles([]);
          setFeaturedArticle(null);
        }
      } else {
        setArticles((prev) => [...prev, ...newArticles]);
      }
      
      setTotalPages(total);
      setPage(pageNum);
      setRetryCount(0); // Reset retry count on success
    } catch (err: any) {
      console.error('Error loading articles:', err);
      
      // Use the error message from the API service if available
      const errorMessage = err.message || 'Nie udało się załadować artykułów. Spróbuj ponownie.';
      
      // Check if it's a network error
      if (errorMessage.includes('Brak połączenia z internetem') || errorMessage.includes('Nie można połączyć się z serwerem')) {
        setIsOffline(true);
      }
      
      // Retry logic
      if (retry < MAX_RETRIES) {
        console.log(`Retrying (${retry + 1}/${MAX_RETRIES})...`);
        setTimeout(() => {
          loadArticles(pageNum, refresh, retry + 1);
        }, 2000 * Math.pow(2, retry)); // Exponential backoff with increased delay
        return;
      }
      
      setRetryCount(retry);
      setError(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [selectedCategory]);
  
  const loadCategories = useCallback(async (retry = 0) => {
    try {
      const data = await fetchCategories();
      // Filter out categories with no posts and sort by count
      const filteredCategories = data
        .filter(cat => cat.count > 0)
        .sort((a, b) => b.count - a.count);
      
      setCategories(filteredCategories);
    } catch (err) {
      console.error('Error loading categories:', err);
      
      // Retry logic for categories
      if (retry < MAX_RETRIES) {
        setTimeout(() => {
          loadCategories(retry + 1);
        }, 2000 * Math.pow(2, retry)); // Exponential backoff
      }
    }
  }, []);
  
  // Initial load
  useEffect(() => {
    loadArticles();
    loadCategories();
  }, [loadArticles, loadCategories]);
  
  // Refresh when category changes
  useEffect(() => {
    loadArticles(1, true);
  }, [selectedCategory, loadArticles]);
  
  const handleRefresh = () => {
    setRefreshing(true);
    loadArticles(1, true);
  };
  
  const handleLoadMore = () => {
    if (page < totalPages && !loadingMore) {
      loadArticles(page + 1);
    }
  };
  
  const handleArticlePress = (article: Article) => {
    // Add to recent articles
    addRecentArticle(article);
  };
  
  const navigateToSearch = () => {
    router.push('/search');
  };
  
  const handleRetry = () => {
    setError(null);
    setIsOffline(false);
    loadArticles(1, true);
  };
  
  if (loading && !refreshing) {
    return <LoadingIndicator fullScreen />;
  }
  
  if (error) {
    return (
      <EmptyState
        title={isOffline ? "Brak połączenia z internetem" : "Coś poszło nie tak"}
        message={error}
        actionLabel="Spróbuj ponownie"
        onAction={handleRetry}
        icon={isOffline ? <WifiOff size={48} color={theme.colors.primary} /> : <RefreshCw size={48} color={theme.colors.primary} />}
      />
    );
  }
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
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
        ListHeaderComponent={
          <View>
            {/* Featured Article */}
            {featuredArticle ? (
              <TouchableOpacity 
                style={styles.featuredContainer}
                onPress={() => {
                  handleArticlePress(featuredArticle);
                  router.push(`/article/${featuredArticle.id}`);
                }}
                activeOpacity={0.9}
              >
                <View style={styles.featuredImageContainer}>
                  {featuredArticle.featured_media_url ? (
                    <Image
                      source={{ uri: featuredArticle.featured_media_url }}
                      style={styles.featuredImage}
                      contentFit="cover"
                      transition={300}
                    />
                  ) : (
                    <View style={[styles.featuredImagePlaceholder, { backgroundColor: theme.colors.subtle }]} />
                  )}
                  <View style={styles.featuredOverlay}>
                    <Text style={styles.featuredLabel}>Wiadomość dnia</Text>
                    <Text style={styles.featuredTitle} numberOfLines={3}>
                      {featuredArticle.title.rendered.replace(/&#8211;/g, '-').replace(/&#8217;/g, "'")}
                    </Text>
                    <View style={styles.learnMoreContainer}>
                      <Text style={styles.learnMoreText}>Czytaj więcej</Text>
                      <ChevronRight size={16} color="#FFFFFF" />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ) : null}
            
            <View style={styles.breakingNewsHeader}>
              <Text style={[styles.breakingNewsTitle, { color: theme.colors.text }]}>
                Najnowsze wiadomości
              </Text>
              <TouchableOpacity onPress={navigateToSearch}>
                <Text style={[styles.moreText, { color: theme.colors.primary }]}>Więcej</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title="Nie znaleziono artykułów"
            message="Spróbuj wybrać inną kategorię lub sprawdź ponownie później."
            actionLabel="Odśwież"
            onAction={handleRefresh}
          />
        }
        ListFooterComponent={
          loadingMore ? <LoadingIndicator size="small" /> : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
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
  listContent: {
    paddingBottom: 16,
  },
  featuredContainer: {
    marginBottom: 24,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  featuredImageContainer: {
    position: 'relative',
    width: '100%',
    height: 240,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  featuredImagePlaceholder: {
    width: '100%',
    height: '100%',
  },
  featuredOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  featuredLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    marginBottom: 8,
    fontWeight: '500',
  },
  featuredTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
    marginBottom: 12,
  },
  learnMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  learnMoreText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginRight: 4,
    fontWeight: '500',
  },
  breakingNewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  breakingNewsTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  moreText: {
    fontSize: 14,
    fontWeight: '500',
  },
  articleContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
});