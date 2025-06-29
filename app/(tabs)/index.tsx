import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  RefreshControl, 
  TouchableOpacity, 
  ScrollView,
  Dimensions,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, RefreshCw, WifiOff, ArrowRight } from 'lucide-react-native';
import { Image } from 'expo-image';
import { fetchArticles, fetchCategories } from '@/services/api';
import { Article, Category } from '@/types/article';
import { ArticleCard } from '@/components/ArticleCard';
import LoadingIndicator from '@/components/LoadingIndicator';
import EmptyState from '@/components/EmptyState';
import { useArticlesStore } from '@/store/articlesStore';
import { useThemeStore } from '@/store/themeStore';
import CategoryPill from '@/components/CategoryPill';

const { width } = Dimensions.get('window');
const CAROUSEL_ITEM_WIDTH = width * 0.85;
const CAROUSEL_ITEM_SPACING = 16;

const MAX_RETRIES = Platform.OS === 'android' ? 3 : 5;

export default function HomeScreen() {
  const router = useRouter();
  const { addRecentArticle } = useArticlesStore();
  const { theme } = useThemeStore();
  
  const [articles, setArticles] = useState<Article[]>([]);
  const [featuredArticles, setFeaturedArticles] = useState<Article[]>([]);
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
  const [activeCarouselIndex, setActiveCarouselIndex] = useState(0);
  
  const flatListRef = useRef<FlatList>(null);
  
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
        12,
        categoryFilter
      );
      
      if (refresh || pageNum === 1) {
        if (newArticles.length > 0) {
          // Take first 3 articles for featured carousel
          setFeaturedArticles(newArticles.slice(0, 3));
          setArticles(newArticles.slice(3)); // Skip first 3 for regular list
        } else {
          setArticles([]);
          setFeaturedArticles([]);
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
      
      // Retry logic - shorter delays for Android
      if (retry < MAX_RETRIES) {
        console.log(`Retrying (${retry + 1}/${MAX_RETRIES})...`);
        const delay = Platform.OS === 'android' ? 1000 * (retry + 1) : 2000 * Math.pow(2, retry);
        setTimeout(() => {
          loadArticles(pageNum, refresh, retry + 1);
        }, delay);
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
      
      // Retry logic for categories - shorter delays for Android
      if (retry < MAX_RETRIES) {
        const delay = Platform.OS === 'android' ? 1000 * (retry + 1) : 2000 * Math.pow(2, retry);
        setTimeout(() => {
          loadCategories(retry + 1);
        }, delay);
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
  
  // Get item layout for FlatList to optimize scrollToIndex
  const getItemLayout = (data: any, index: number) => {
    const length = CAROUSEL_ITEM_WIDTH + CAROUSEL_ITEM_SPACING;
    const offset = index * length;
    return { length, offset, index };
  };
  
  // Handle scroll to index failure
  const handleScrollToIndexFailed = (info: {
    index: number;
    highestMeasuredFrameIndex: number;
    averageItemLength: number;
  }) => {
    const wait = new Promise(resolve => setTimeout(resolve, 500));
    wait.then(() => {
      // Try to scroll to the item with a delay
      if (flatListRef.current && info.index < featuredArticles.length) {
        try {
          flatListRef.current.scrollToIndex({
            index: info.index,
            animated: true,
            viewPosition: 0.5,
          });
        } catch (error) {
          console.warn('ScrollToIndex failed:', error);
        }
      }
    });
  };
  
  // Auto scroll carousel - disabled on Android to prevent performance issues
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (featuredArticles.length > 1 && Platform.OS !== 'android') {
      interval = setInterval(() => {
        let newIndex = activeCarouselIndex;
        if (activeCarouselIndex < featuredArticles.length - 1) {
          newIndex = activeCarouselIndex + 1;
        } else {
          newIndex = 0;
        }
        
        setActiveCarouselIndex(newIndex);
        
        if (flatListRef.current && newIndex < featuredArticles.length) {
          try {
            flatListRef.current.scrollToIndex({
              index: newIndex,
              animated: true,
              viewPosition: 0.5,
            });
          } catch (error) {
            console.warn('Auto scroll failed:', error);
          }
        }
      }, 5000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeCarouselIndex, featuredArticles.length]);
  
  const renderCarouselItem = ({ item, index }: { item: Article; index: number }) => {
    return (
      <View
        style={[
          styles.carouselItemContainer,
          { 
            width: CAROUSEL_ITEM_WIDTH,
            marginRight: index === featuredArticles.length - 1 ? 0 : CAROUSEL_ITEM_SPACING,
          }
        ]}
      >
        <TouchableOpacity 
          style={styles.carouselItem}
          onPress={() => {
            handleArticlePress(item);
            router.push(`/article/${item.id}`);
          }}
          activeOpacity={0.9}
        >
          <View style={styles.carouselImageContainer}>
            {item.featured_media_url ? (
              <Image
                source={{ uri: item.featured_media_url }}
                style={styles.carouselImage}
                contentFit="cover"
                transition={300}
                placeholder="Loading..."
              />
            ) : (
              <View style={[styles.carouselImagePlaceholder, { backgroundColor: theme.colors.subtle }]} />
            )}
            <View style={styles.carouselGradient} />
            <View style={styles.carouselItemContent}>
              <View style={styles.carouselLabelContainer}>
                <Text style={styles.carouselLabel}>Polecane</Text>
              </View>
              <Text style={styles.carouselTitle} numberOfLines={2}>
                {item.title.rendered.replace(/&#8211;/g, '-').replace(/&#8217;/g, "'")}
              </Text>
              <View style={styles.carouselFooter}>
                <Text style={styles.carouselReadMore}>Czytaj więcej</Text>
                <ArrowRight size={16} color="#FFFFFF" />
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };
  
  const renderCarouselIndicator = () => {
    return (
      <View style={styles.indicatorContainer}>
        {featuredArticles.map((_, index) => (
          <View
            key={`indicator-${index}`}
            style={[
              styles.indicator,
              {
                backgroundColor: index === activeCarouselIndex ? theme.colors.primary : theme.colors.textSecondary,
                opacity: index === activeCarouselIndex ? 1 : 0.5,
                transform: [{ scale: index === activeCarouselIndex ? 1.2 : 1 }],
              },
            ]}
          />
        ))}
      </View>
    );
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
            {/* Featured Articles Carousel */}
            {featuredArticles.length > 0 && (
              <View style={styles.carouselContainer}>
                <FlatList
                  ref={flatListRef}
                  data={featuredArticles}
                  keyExtractor={(item) => `carousel-${item.id}`}
                  renderItem={renderCarouselItem}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  pagingEnabled={Platform.OS === 'ios'}
                  snapToInterval={CAROUSEL_ITEM_WIDTH + CAROUSEL_ITEM_SPACING}
                  decelerationRate="fast"
                  contentContainerStyle={styles.carouselListContent}
                  onMomentumScrollEnd={(event) => {
                    const newIndex = Math.round(
                      event.nativeEvent.contentOffset.x / 
                      (CAROUSEL_ITEM_WIDTH + CAROUSEL_ITEM_SPACING)
                    );
                    if (newIndex >= 0 && newIndex < featuredArticles.length) {
                      setActiveCarouselIndex(newIndex);
                    }
                  }}
                  getItemLayout={getItemLayout}
                  onScrollToIndexFailed={handleScrollToIndexFailed}
                  removeClippedSubviews={Platform.OS === 'android'}
                  initialNumToRender={3}
                  maxToRenderPerBatch={3}
                  windowSize={5}
                />
                {renderCarouselIndicator()}
              </View>
            )}
            
            {/* Categories */}
            {categories.length > 0 && (
              <View style={styles.categoriesContainer}>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoriesContent}
                >
                  <CategoryPill
                    name="Wszystkie"
                    isSelected={selectedCategory === null}
                    onPress={() => setSelectedCategory(null)}
                  />
                  {categories.map((category) => (
                    <CategoryPill
                      key={`category-${category.id}`}
                      name={category.name}
                      isSelected={selectedCategory === category.id}
                      onPress={() => setSelectedCategory(category.id)}
                    />
                  ))}
                </ScrollView>
              </View>
            )}
            
            <View style={styles.breakingNewsHeader}>
              <Text style={[styles.breakingNewsTitle, { color: theme.colors.text }]}>
                Najnowsze wiadomości
              </Text>
              <TouchableOpacity 
                onPress={navigateToSearch}
                style={styles.moreButton}
              >
                <Text style={[styles.moreText, { color: theme.colors.primary }]}>Więcej</Text>
                <ChevronRight size={16} color={theme.colors.primary} />
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
        removeClippedSubviews={Platform.OS === 'android'}
        initialNumToRender={Platform.OS === 'android' ? 5 : 10}
        maxToRenderPerBatch={Platform.OS === 'android' ? 5 : 10}
        windowSize={Platform.OS === 'android' ? 5 : 10}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 100, // Space for bottom tab bar
  },
  carouselContainer: {
    marginTop: 20,
    marginBottom: 24,
  },
  carouselListContent: {
    paddingHorizontal: 16,
  },
  carouselItemContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  carouselItem: {
    borderRadius: 20,
    overflow: 'hidden',
    height: 220,
  },
  carouselImageContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  carouselImage: {
    width: '100%',
    height: '100%',
  },
  carouselImagePlaceholder: {
    width: '100%',
    height: '100%',
  },
  carouselGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  carouselItemContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  carouselLabelContainer: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  carouselLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  carouselTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  carouselFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  carouselReadMore: {
    color: '#FFFFFF',
    fontSize: 13,
    marginRight: 4,
    fontWeight: '600',
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  indicator: {
    height: 6,
    width: 6,
    borderRadius: 3,
    marginHorizontal: 3,
  },
  categoriesContainer: {
    marginBottom: 24,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  breakingNewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  breakingNewsTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  moreButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  articleContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
});