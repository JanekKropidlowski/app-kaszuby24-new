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
// Improved carousel sizing for center mode with peek - better balanced spacing
const CAROUSEL_PEEK_WIDTH = 25; // Reduced for better balance
const CAROUSEL_ITEM_SPACING = 12; // Reduced spacing
const CAROUSEL_ITEM_WIDTH = width - (CAROUSEL_PEEK_WIDTH * 2) - 40; // Wider cards, 40px total side margin

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
  const [infiniteArticles, setInfiniteArticles] = useState<Article[]>([]);
  const [realActiveIndex, setRealActiveIndex] = useState(0);
  
  const flatListRef = useRef<FlatList>(null);
  const carouselIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isScreenFocused = useRef(true);
  const isMountedRef = useRef(true);
  
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
  
  // Optimized load articles function with instant filtering
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
        15, // Increased to get more articles for better slider selection
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
          // Always take the 5 most recent articles for featured carousel
          const sortedArticles = [...newArticles].sort((a, b) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
          );
          
          setFeaturedArticles(sortedArticles.slice(0, 5));
          setArticles(sortedArticles.slice(5)); // Skip first 5 for regular list
        } else {
          setArticles([]);
          setFeaturedArticles([]);
        }
      } else {
        // For pagination, sort new articles and append
        const sortedNewArticles = [...newArticles].sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setArticles((prev) => [...prev, ...sortedNewArticles]);
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
  
  // Instant category filter handler for responsive filtering
  const handleCategoryChange = useCallback((categoryId: number | null) => {
    // Don't allow selection of sponsored category or "Wiadomości" category
    if (categoryId === 554 || categoryId === 3) {
      return;
    }
    
    // Instant UI update for responsiveness
    setSelectedCategory(categoryId);
    setLoading(true);
    setError(null);
    
    // Reset pagination
    setPage(1);
    setArticles([]);
    setFeaturedArticles([]);
    
    // Load articles with new filter - this will trigger the useEffect
  }, []);
  
  // Updated useEffect for category changes with instant response
  useEffect(() => {
    if (!isMountedRef.current) return;
    
    // Debounce the actual API call slightly for better performance
    const timeoutId = setTimeout(() => {
      if (isMountedRef.current) {
        loadArticles(1, true);
      }
    }, 100); // Very short delay for instant feel but prevents rapid API calls
    
    return () => clearTimeout(timeoutId);
  }, [selectedCategory, loadArticles]);
  
  // Create infinite scroll data by duplicating articles
  useEffect(() => {
    if (featuredArticles.length > 0) {
      // Create infinite scroll by adding duplicates at start and end
      const duplicateCount = Math.min(2, featuredArticles.length);
      const startDuplicates = featuredArticles.slice(-duplicateCount);
      const endDuplicates = featuredArticles.slice(0, duplicateCount);
      
      setInfiniteArticles([...startDuplicates, ...featuredArticles, ...endDuplicates]);
      
      // Set initial position to first real item (after start duplicates)
      setTimeout(() => {
        if (flatListRef.current && featuredArticles.length > 0) {
          const initialIndex = duplicateCount;
          flatListRef.current.scrollToIndex({
            index: initialIndex,
            animated: false,
            viewPosition: 0.5,
          });
          setActiveCarouselIndex(initialIndex);
          setRealActiveIndex(0);
        }
      }, 100);
    }
  }, [featuredArticles]);
  
  // Optimized carousel auto-scroll with infinite loop
  useEffect(() => {
    const startCarouselAutoScroll = () => {
      if (carouselIntervalRef.current) {
        clearInterval(carouselIntervalRef.current);
      }
      
      if (infiniteArticles.length > 1 && isScreenFocused.current) {
        carouselIntervalRef.current = setInterval(() => {
          if (!isScreenFocused.current) return;
          
          setActiveCarouselIndex(prevIndex => {
            const nextIndex = prevIndex + 1;
            
            // Scroll to next index
            if (flatListRef.current && infiniteArticles.length > 0) {
              try {
                flatListRef.current.scrollToIndex({
                  index: nextIndex,
                  animated: true,
                  viewPosition: 0.5,
                });
              } catch (error) {
                console.warn('Auto scroll failed:', error);
              }
            }
            
            return nextIndex;
          });
        }, 4000);
      }
    };
    
    startCarouselAutoScroll();
    
    return () => {
      if (carouselIntervalRef.current) {
        clearInterval(carouselIntervalRef.current);
      }
    };
  }, [infiniteArticles.length]);
  
  // Handle screen focus/blur for performance
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      isScreenFocused.current = nextAppState === 'active';
      
      if (nextAppState === 'active') {
        // Restart carousel when app becomes active
        if (infiniteArticles.length > 1) {
          const startCarouselAutoScroll = () => {
            if (carouselIntervalRef.current) {
              clearInterval(carouselIntervalRef.current);
            }
            
            carouselIntervalRef.current = setInterval(() => {
              if (!isScreenFocused.current) return;
              
              setActiveCarouselIndex(prevIndex => {
                const nextIndex = prevIndex + 1;
                
                if (flatListRef.current && infiniteArticles.length > 0) {
                  try {
                    flatListRef.current.scrollToIndex({
                      index: nextIndex,
                      animated: true,
                      viewPosition: 0.5,
                    });
                  } catch (error) {
                    console.warn('Auto scroll failed:', error);
                  }
                }
                
                return nextIndex;
              });
            }, 4000);
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
  }, [infiniteArticles.length]);
  
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
    // Navigate to article detail
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
  
  // Updated handleDotPress to work with infinite scroll
  const handleDotPress = useCallback((dotIndex: number) => {
    if (flatListRef.current && dotIndex < featuredArticles.length) {
      const duplicateCount = Math.min(2, featuredArticles.length);
      const actualIndex = duplicateCount + dotIndex;
      
      try {
        flatListRef.current.scrollToIndex({
          index: actualIndex,
          animated: true,
          viewPosition: 0.5,
        });
        setActiveCarouselIndex(actualIndex);
        setRealActiveIndex(dotIndex);
        
        // Restart auto-scroll timer after manual interaction
        if (carouselIntervalRef.current) {
          clearInterval(carouselIntervalRef.current);
        }
        
        // Restart auto-scroll after a delay
        setTimeout(() => {
          if (infiniteArticles.length > 1 && isScreenFocused.current) {
            carouselIntervalRef.current = setInterval(() => {
              if (!isScreenFocused.current) return;
              
              setActiveCarouselIndex(prevIndex => {
                const nextIndex = prevIndex + 1;
                
                if (flatListRef.current && infiniteArticles.length > 0) {
                  try {
                    flatListRef.current.scrollToIndex({
                      index: nextIndex,
                      animated: true,
                      viewPosition: 0.5,
                    });
                  } catch (error) {
                    console.warn('Auto scroll failed:', error);
                  }
                }
                
                return nextIndex;
              });
            }, 4000);
          }
        }, 2000);
      } catch (error) {
        console.warn('Manual dot navigation failed:', error);
      }
    }
  }, [featuredArticles.length, infiniteArticles.length]);

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
    <View style={styles.carouselItemWrapper}>
      <CarouselItem
        item={item}
        index={index}
        totalItems={infiniteArticles.length}
        onPress={handleArticlePress}
      />
    </View>
  ), [infiniteArticles.length, handleArticlePress]);
  
  // Memoized carousel indicator with clickable dots
  const renderCarouselIndicator = useMemo(() => {
    if (featuredArticles.length <= 1) return null;
    
    return (
      <View style={styles.indicatorContainer}>
        {featuredArticles.map((_, index) => (
          <TouchableOpacity
            key={`indicator-${index}`}
            style={[
              styles.indicator,
              {
                backgroundColor: index === realActiveIndex ? theme.colors.primary : theme.colors.textSecondary,
                opacity: index === realActiveIndex ? 1 : 0.4,
                transform: [{ scale: index === realActiveIndex ? 1.2 : 1 }],
              },
            ]}
            onPress={() => handleDotPress(index)}
            activeOpacity={0.7}
          />
        ))}
      </View>
    );
  }, [featuredArticles.length, realActiveIndex, theme.colors.primary, theme.colors.textSecondary, handleDotPress]);
  
  // Memoized article render function with proper onPress handling
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
  
  // Memoized category pills render function
  const renderCategoryPills = useMemo(() => {
    if (categories.length === 0) return null;
    
    return (
      <View style={styles.categoriesContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContent}
        >
          <CategoryPill
            name="Wszystkie"
            isSelected={selectedCategory === null}
            onPress={() => handleCategoryChange(null)}
          />
          {categories.map((category) => (
            <CategoryPill
              key={category.id}
              name={category.name}
              isSelected={selectedCategory === category.id}
              onPress={() => handleCategoryChange(category.id)}
            />
          ))}
        </ScrollView>
      </View>
    );
  }, [categories, selectedCategory, handleCategoryChange]);
  
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
        keyExtractor={keyExtractor}
        renderItem={renderArticle}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            {/* Notifications Banner */}
            {shouldShowBanner() && (
              <NotificationsBanner
                onPress={handleBannerPress}
                onDismiss={handleBannerDismiss}
              />
            )}
            
            {/* Latest Articles Carousel - Always shows newest articles */}
            {infiniteArticles.length > 0 && (
              <View style={styles.carouselContainer}>
                <FlatList
                  ref={flatListRef}
                  data={infiniteArticles}
                  keyExtractor={(item, index) => `carousel-${item.id}-${index}`}
                  renderItem={renderCarouselItem}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  snapToInterval={CAROUSEL_ITEM_WIDTH + CAROUSEL_ITEM_SPACING}
                  snapToAlignment="center"
                  decelerationRate="fast"
                  contentContainerStyle={styles.carouselListContent}
                  pagingEnabled={false}
                  scrollEventThrottle={16}
                  onMomentumScrollEnd={(event) => {
                    const contentOffsetX = event.nativeEvent.contentOffset.x;
                    const newIndex = Math.round(
                      (contentOffsetX + CAROUSEL_PEEK_WIDTH) / (CAROUSEL_ITEM_WIDTH + CAROUSEL_ITEM_SPACING)
                    );
                    
                    const duplicateCount = Math.min(2, featuredArticles.length);
                    
                    // Handle infinite scroll logic
                    if (newIndex <= 0) {
                      const jumpToIndex = infiniteArticles.length - duplicateCount - 1;
                      setTimeout(() => {
                        if (flatListRef.current) {
                          flatListRef.current.scrollToIndex({
                            index: jumpToIndex,
                            animated: false,
                            viewPosition: 0.5,
                          });
                          setActiveCarouselIndex(jumpToIndex);
                          setRealActiveIndex(featuredArticles.length - 1);
                        }
                      }, 50);
                    } else if (newIndex >= infiniteArticles.length - duplicateCount) {
                      setTimeout(() => {
                        if (flatListRef.current) {
                          flatListRef.current.scrollToIndex({
                            index: duplicateCount,
                            animated: false,
                            viewPosition: 0.5,
                          });
                          setActiveCarouselIndex(duplicateCount);
                          setRealActiveIndex(0);
                        }
                      }, 50);
                    } else {
                      const clampedIndex = Math.max(0, Math.min(newIndex, infiniteArticles.length - 1));
                      setActiveCarouselIndex(clampedIndex);
                      
                      const realIndex = clampedIndex - duplicateCount;
                      setRealActiveIndex(Math.max(0, Math.min(realIndex, featuredArticles.length - 1)));
                    }
                  }}
                  onScrollToIndexFailed={handleScrollToIndexFailed}
                  removeClippedSubviews={Platform.OS === 'android'}
                  initialNumToRender={5}
                  maxToRenderPerBatch={5}
                  windowSize={7}
                  bounces={false}
                  bouncesZoom={false}
                />
                {renderCarouselIndicator}
              </View>
            )}
            
            {/* Responsive Category Filters */}
            {renderCategoryPills}
            
            <View style={styles.sectionHeader}>
              <Text style={[
                styles.sectionTitle, 
                { 
                  color: theme.colors.text,
                  fontFamily: theme.fontFamily.bold
                }
              ]}>
                {selectedCategory ? 'Filtrowane artykuły' : 'Najnowsze artykuły'}
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
          !loading ? (
            <EmptyState
              title={selectedCategory ? "Brak artykułów w tej kategorii" : "Nie znaleziono artykułów"}
              message={selectedCategory ? "Spróbuj wybrać inną kategorię." : "Spróbuj odświeżyć stronę."}
              actionLabel="Odśwież"
              onAction={handleRefresh}
            />
          ) : null
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
    width: '100%',
  },
  carouselListContent: {
    paddingHorizontal: CAROUSEL_PEEK_WIDTH + 20, // Better balanced padding
    paddingVertical: 6,
  },
  carouselItemWrapper: {
    width: CAROUSEL_ITEM_WIDTH,
    marginRight: CAROUSEL_ITEM_SPACING,
  },
  carouselItemContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  carouselItem: {
    borderRadius: 20,
    overflow: 'hidden',
    height: 240,
    width: '100%',
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
  articleContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
});