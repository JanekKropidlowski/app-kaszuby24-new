import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { fetchArticles, fetchCategories, MAX_RETRIES, cancelAllRequests, cancelRequest } from '@/services/api';
import { Article, Category } from '@/types/article';
import { ArticleCard } from '@/components/ArticleCard';
import LoadingIndicator from '@/components/LoadingIndicator';
import EmptyState from '@/components/EmptyState';
import WelcomeNotifications from '@/components/WelcomeNotifications';
import NotificationsBanner from '@/components/NotificationsBanner';
import { useArticlesStore } from '@/store/articlesStore';
import { useThemeStore } from '@/store/themeStore';
import { useNotificationsStore } from '@/store/notificationsStore';
import CategoryPill from '@/components/CategoryPill';
import { filterSponsoredArticles, filterSponsoredCategories } from '@/utils/contentFilter';

const { width } = Dimensions.get('window');
const CAROUSEL_ITEM_WIDTH = width * 0.8; // Better centering
const CAROUSEL_ITEM_SPACING = 16;

// Logo component with proper sizing and theme support
const LogoHeader = React.memo(() => {
  const { isDarkMode } = useThemeStore();
  
  return (
    <View style={styles.logoContainer}>
      <Image
        source={{ 
          uri: isDarkMode 
            ? 'https://kaszuby24.pl/wp-content/uploads/2023/05/Bez-nazwy-1_Obszar-roboczy-1.png'
            : 'https://kaszuby24.pl/wp-content/uploads/2020/03/logo-e1584093147599.png'
        }}
        style={styles.logo}
        contentFit="contain"
        transition={200}
        placeholder="Loading..."
        cachePolicy="memory-disk"
        priority="high"
      />
    </View>
  );
});

// Memoized carousel item component for better performance
const CarouselItem = React.memo(({ 
  item, 
  index, 
  totalItems, 
  onPress 
}: { 
  item: Article; 
  index: number; 
  totalItems: number;
  onPress: (article: Article) => void;
}) => {
  const { theme } = useThemeStore();
  
  return (
    <View
      style={[
        styles.carouselItemContainer,
        { 
          width: CAROUSEL_ITEM_WIDTH,
          marginRight: index === totalItems - 1 ? 0 : CAROUSEL_ITEM_SPACING,
        }
      ]}
    >
      <TouchableOpacity 
        style={styles.carouselItem}
        onPress={() => onPress(item)}
        activeOpacity={0.9}
      >
        <View style={styles.carouselImageContainer}>
          {item.featured_media_url ? (
            <Image
              source={{ uri: item.featured_media_url }}
              style={styles.carouselImage}
              contentFit="cover"
              transition={200}
              placeholder="Loading..."
              cachePolicy="memory-disk"
              priority="high"
            />
          ) : (
            <View style={[styles.carouselImagePlaceholder, { backgroundColor: theme.colors.subtle }]} />
          )}
          <LinearGradient
            colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.5)']}
            locations={[0, 0.4, 1]}
            style={styles.carouselGradient}
          />
          <View style={styles.carouselItemContent}>
            <View style={styles.carouselLabelContainer}>
              <Text style={[
                styles.carouselLabel,
                { fontFamily: theme.fontFamily.semibold }
              ]}>
                Polecane
              </Text>
            </View>
            <Text style={[
              styles.carouselTitle,
              { fontFamily: theme.fontFamily.bold }
            ]} numberOfLines={2}>
              {item.title.rendered.replace(/&#8211;/g, '-').replace(/&#8217;/g, "'")}
            </Text>
            <View style={styles.carouselFooter}>
              <Text style={[
                styles.carouselReadMore,
                { fontFamily: theme.fontFamily.semibold }
              ]}>
                Czytaj więcej
              </Text>
              <ArrowRight size={16} color="#FFFFFF" />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
});

export default function HomeScreen() {
  const router = useRouter();
  const { addRecentArticle } = useArticlesStore();
  const { theme } = useThemeStore();
  const { 
    shouldShowWelcome, 
    shouldShowBanner, 
    dismissBanner,
    initializePreferences 
  } = useNotificationsStore();
  
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
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);
  const carouselIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isScreenFocused = useRef(true);
  const isMountedRef = useRef(true); // Track if component is mounted
  
  // Initialize and check for first time user
  useEffect(() => {
    console.log('HomeScreen: Initializing...');
    initializePreferences();
    
    // Show welcome modal for first time users after a short delay
    const timer = setTimeout(() => {
      if (shouldShowWelcome()) {
        setShowWelcomeModal(true);
      }
    }, 1500);
    
    return () => clearTimeout(timer);
  }, [initializePreferences, shouldShowWelcome]);
  
  // Optimized load articles function with better error handling and cleanup
  const loadArticles = useCallback(async (pageNum = 1, refresh = false, retry = 0) => {
    // Don't proceed if component is unmounted
    if (!isMountedRef.current) {
      console.log('Component unmounted, cancelling request');
      return;
    }
    
    try {
      console.log(`Loading articles: page=${pageNum}, refresh=${refresh}, retry=${retry}`);
      setError(null);
      setIsOffline(false);
      
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      
      // Don't include sponsored category (554) in filter
      const categoryFilter = selectedCategory && selectedCategory !== 554 ? [selectedCategory] : undefined;
      
      console.log('Calling fetchArticles with:', { pageNum, categoryFilter });
      
      const { articles: newArticles, totalPages: total } = await fetchArticles(
        pageNum,
        12,
        categoryFilter
      );
      
      // Check if component is still mounted before updating state
      if (!isMountedRef.current) {
        console.log('Component unmounted during request, ignoring response');
        return;
      }
      
      console.log(`Received ${newArticles.length} articles`);
      
      if (refresh || pageNum === 1) {
        if (newArticles.length > 0) {
          // Take first 5 articles for featured carousel
          setFeaturedArticles(newArticles.slice(0, 5));
          setArticles(newArticles.slice(5)); // Skip first 5 for regular list
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
      
      console.log('Articles loaded successfully');
    } catch (err: any) {
      // Don't update state if component is unmounted
      if (!isMountedRef.current) {
        console.log('Component unmounted during error handling, ignoring error');
        return;
      }
      
      console.error('Error loading articles:', err);
      
      // Use the error message from the API service if available
      const errorMessage = err.message || 'Nie udało się załadować artykułów. Sprawdź połączenie internetowe i spróbuj ponownie.';
      
      // Check if it's a network error
      if (errorMessage.includes('Brak połączenia z internetem') || 
          errorMessage.includes('Nie można połączyć się z serwerem') ||
          errorMessage.includes('Network request failed') ||
          errorMessage.includes('zostało przerwane')) {
        setIsOffline(true);
      }
      
      // Retry logic - but don't retry if request was aborted due to component unmount
      if (retry < MAX_RETRIES && !errorMessage.includes('zostało przerwane')) {
        console.log(`Retrying (${retry + 1}/${MAX_RETRIES})...`);
        const delay = 1000 * (retry + 1);
        setTimeout(() => {
          if (isMountedRef.current) {
            loadArticles(pageNum, refresh, retry + 1);
          }
        }, delay);
        return;
      }
      
      setRetryCount(retry);
      setError(errorMessage);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    }
  }, [selectedCategory]);
  
  const loadCategories = useCallback(async (retry = 0) => {
    if (!isMountedRef.current) return;
    
    try {
      console.log('Loading categories...');
      const data = await fetchCategories();
      
      if (!isMountedRef.current) return;
      
      // Filter out sponsored categories, "Wiadomości" category (ID: 3), and categories with no posts, then sort by count
      const filteredCategories = data
        .filter(cat => cat.count > 0 && cat.id !== 3 && cat.id !== 554)
        .sort((a, b) => b.count - a.count);
      
      setCategories(filteredCategories);
      console.log(`Loaded ${filteredCategories.length} categories`);
    } catch (err) {
      if (!isMountedRef.current) return;
      
      console.error('Error loading categories:', err);
      
      // Retry logic for categories
      if (retry < MAX_RETRIES) {
        const delay = 1000 * (retry + 1);
        setTimeout(() => {
          if (isMountedRef.current) {
            loadCategories(retry + 1);
          }
        }, delay);
      }
    }
  }, []);
  
  // Component mount/unmount tracking
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      console.log('HomeScreen unmounting, cancelling all requests');
      isMountedRef.current = false;
      cancelAllRequests();
      
      // Clear carousel interval
      if (carouselIntervalRef.current) {
        clearInterval(carouselIntervalRef.current);
      }
    };
  }, []);
  
  // Initial load
  useEffect(() => {
    if (isMountedRef.current) {
      console.log('HomeScreen: Starting initial load...');
      loadArticles();
      loadCategories();
    }
  }, [loadArticles, loadCategories]);
  
  // Refresh when category changes
  useEffect(() => {
    if (!isMountedRef.current) return;
    
    // Don't allow selection of sponsored category or "Wiadomości" category
    if (selectedCategory === 554 || selectedCategory === 3) {
      setSelectedCategory(null);
      return;
    }
    loadArticles(1, true);
  }, [selectedCategory, loadArticles]);
  
  // Optimized carousel auto-scroll with proper cleanup
  useEffect(() => {
    const startCarouselAutoScroll = () => {
      if (carouselIntervalRef.current) {
        clearInterval(carouselIntervalRef.current);
      }
      
      if (featuredArticles.length > 1 && isScreenFocused.current) {
        carouselIntervalRef.current = setInterval(() => {
          if (!isScreenFocused.current) return;
          
          setActiveCarouselIndex(prevIndex => {
            const newIndex = prevIndex < featuredArticles.length - 1 ? prevIndex + 1 : 0;
            
            // Scroll to new index with error handling
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
            
            return newIndex;
          });
        }, 5000);
      }
    };
    
    startCarouselAutoScroll();
    
    return () => {
      if (carouselIntervalRef.current) {
        clearInterval(carouselIntervalRef.current);
      }
    };
  }, [featuredArticles.length]);
  
  // Handle screen focus/blur for performance
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      isScreenFocused.current = nextAppState === 'active';
      
      if (nextAppState === 'active') {
        // Restart carousel when app becomes active
        if (featuredArticles.length > 1) {
          const startCarouselAutoScroll = () => {
            if (carouselIntervalRef.current) {
              clearInterval(carouselIntervalRef.current);
            }
            
            carouselIntervalRef.current = setInterval(() => {
              if (!isScreenFocused.current) return;
              
              setActiveCarouselIndex(prevIndex => {
                const newIndex = prevIndex < featuredArticles.length - 1 ? prevIndex + 1 : 0;
                
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
                
                return newIndex;
              });
            }, 5000);
          };
          startCarouselAutoScroll();
        }
      } else {
        // Stop carousel when app goes to background
        if (carouselIntervalRef.current) {
          clearInterval(carouselIntervalRef.current);
        }
      }
    };
    
    // Note: In a real app, you'd use AppState.addEventListener
    // For now, we'll just handle component unmount
    return () => {
      isScreenFocused.current = false;
      if (carouselIntervalRef.current) {
        clearInterval(carouselIntervalRef.current);
      }
    };
  }, [featuredArticles.length]);
  
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadArticles(1, true);
  }, [loadArticles]);
  
  const handleLoadMore = useCallback(() => {
    if (!isMountedRef.current) return;
    
    if (page < totalPages && !loadingMore && !loading) {
      console.log(`Loading more articles: page ${page + 1}`);
      loadArticles(page + 1);
    }
  }, [page, totalPages, loadingMore, loading, loadArticles]);
  
  const handleArticlePress = useCallback((article: Article) => {
    // Add to recent articles (filtering is handled in the store)
    addRecentArticle(article);
    router.push(`/article/${article.id}`);
  }, [addRecentArticle, router]);
  
  const navigateToSearch = useCallback(() => {
    router.push('/search');
  }, [router]);
  
  const handleRetry = useCallback(() => {
    setError(null);
    setIsOffline(false);
    loadArticles(1, true);
  }, [loadArticles]);
  
  const handleWelcomeClose = useCallback(() => {
    setShowWelcomeModal(false);
  }, []);
  
  const handleBannerPress = useCallback(() => {
    setShowWelcomeModal(true);
  }, []);
  
  const handleBannerDismiss = useCallback(() => {
    dismissBanner();
  }, [dismissBanner]);
  
  // Optimized item layout for FlatList
  const getItemLayout = useCallback((data: any, index: number) => {
    const length = CAROUSEL_ITEM_WIDTH + CAROUSEL_ITEM_SPACING;
    const offset = index * length;
    return { length, offset, index };
  }, []);
  
  // Handle scroll to index failure with better error handling
  const handleScrollToIndexFailed = useCallback((info: {
    index: number;
    highestMeasuredFrameIndex: number;
    averageItemLength: number;
  }) => {
    const wait = new Promise(resolve => setTimeout(resolve, 500));
    wait.then(() => {
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
  }, [featuredArticles.length]);
  
  // Memoized carousel render function
  const renderCarouselItem = useCallback(({ item, index }: { item: Article; index: number }) => (
    <CarouselItem
      item={item}
      index={index}
      totalItems={featuredArticles.length}
      onPress={handleArticlePress}
    />
  ), [featuredArticles.length, handleArticlePress]);
  
  // Memoized carousel indicator
  const renderCarouselIndicator = useMemo(() => {
    if (featuredArticles.length <= 1) return null;
    
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
  }, [featuredArticles.length, activeCarouselIndex, theme.colors.primary, theme.colors.textSecondary]);
  
  // Memoized article render function
  const renderArticle = useCallback(({ item }: { item: Article }) => (
    <View style={styles.articleContainer}>
      <ArticleCard 
        article={item} 
        onPress={() => handleArticlePress(item)}
      />
    </View>
  ), [handleArticlePress]);
  
  // Memoized key extractor
  const keyExtractor = useCallback((item: Article) => item.id.toString(), []);
  
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
      <LogoHeader />
      <FlatList
        data={articles}
        keyExtractor={keyExtractor}
        renderItem={renderArticle}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            {/* Notifications Banner for users who haven't set up notifications */}
            {shouldShowBanner() && (
              <NotificationsBanner
                onPress={handleBannerPress}
                onDismiss={handleBannerDismiss}
              />
            )}
            
            {/* Featured Articles Carousel */}
            {featuredArticles.length > 0 && (
              <View style={styles.carouselContainer}>
                <FlatList
                  ref={flatListRef}
                  data={[...featuredArticles, ...featuredArticles, ...featuredArticles]}
                  keyExtractor={(item, index) => `carousel-${item.id}-${index}`}
                  renderItem={({ item, index }) => (
                    <CarouselItem
                      item={item}
                      index={index % featuredArticles.length}
                      totalItems={featuredArticles.length}
                      onPress={handleArticlePress}
                    />
                  )}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  snapToInterval={CAROUSEL_ITEM_WIDTH + CAROUSEL_ITEM_SPACING}
                  snapToAlignment="center"
                  decelerationRate="fast"
                  contentContainerStyle={styles.carouselListContent}
                  initialScrollIndex={featuredArticles.length}
                  getItemLayout={(data, index) => ({
                    length: CAROUSEL_ITEM_WIDTH + CAROUSEL_ITEM_SPACING,
                    offset: (CAROUSEL_ITEM_WIDTH + CAROUSEL_ITEM_SPACING) * index,
                    index,
                  })}
                  onMomentumScrollEnd={(event) => {
                    const newIndex = Math.round(
                      event.nativeEvent.contentOffset.x / 
                      (CAROUSEL_ITEM_WIDTH + CAROUSEL_ITEM_SPACING)
                    );
                    setActiveCarouselIndex(newIndex % featuredArticles.length);
                  }}
                  onScrollToIndexFailed={handleScrollToIndexFailed}
                  removeClippedSubviews={Platform.OS === 'android'}
                  initialNumToRender={5}
                  maxToRenderPerBatch={5}
                  windowSize={7}
                />
                {renderCarouselIndicator}
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
            
            <View style={styles.sectionHeader}>
              <Text style={[
                styles.sectionTitle, 
                { 
                  color: theme.colors.text,
                  fontFamily: theme.fontFamily.bold
                }
              ]}>
                Najnowsze artykuły
              </Text>
              <TouchableOpacity 
                onPress={navigateToSearch}
                style={styles.sectionMoreButton}
              >
                <Text style={[
                  styles.sectionMoreText, 
                  { 
                    color: theme.colors.primary,
                    fontFamily: theme.fontFamily.semibold
                  }
                ]}>
                  Zobacz wszystkie
                </Text>
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
        getItemLayout={undefined}
        updateCellsBatchingPeriod={50}
        legacyImplementation={false}
      />
      
      {/* Welcome Modal */}
      <WelcomeNotifications
        visible={showWelcomeModal}
        onClose={handleWelcomeClose}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 80,
  },
  carouselContainer: {
    marginTop: 12,
    marginBottom: 28,
  },
  carouselListContent: {
    paddingHorizontal: (width - CAROUSEL_ITEM_WIDTH) / 2, // Perfect centering
    paddingVertical: 6,
  },
  carouselItemContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  carouselItem: {
    borderRadius: 24,
    overflow: 'hidden',
    height: 240,
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
    height: '75%',
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
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  carouselLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  carouselTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    marginBottom: 14,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
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
    marginRight: 6,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  indicator: {
    height: 8,
    width: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  categoriesContainer: {
    marginBottom: 24,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  sectionMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(34, 74, 150, 0.06)',
    borderRadius: 16,
  },
  sectionMoreText: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 4,
  },
  logoContainer: {
    alignItems: 'center',
    padding: 16,
  },
  logo: {
    width: 100,
    height: 100,
  },
  articleContainer: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  logoContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  logo: {
    width: 120,
    height: 40,
  },
});