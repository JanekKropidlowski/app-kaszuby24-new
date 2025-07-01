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
  Platform,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, RefreshCw, WifiOff, ArrowRight, Heart } from 'lucide-react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { fetchArticles, fetchCategories, MAX_RETRIES, cancelAllRequests, cancelRequest, fetchNekrologi } from '@/services/api';
import { Article, Category, Nekrolog } from '@/types/article';
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
import { useScrollStore } from '@/store/scrollStore';
import SkeletonLoader from '@/components/SkeletonLoader';
import { MemoryOptimizer } from '@/utils/memoryOptimizer';

const { width } = Dimensions.get('window');
// Improved carousel sizing for center mode with peek - better balanced spacing
const CAROUSEL_PEEK_WIDTH = 25; // Reduced for better balance
const CAROUSEL_ITEM_SPACING = 12; // Reduced spacing
const CAROUSEL_ITEM_WIDTH = width - (CAROUSEL_PEEK_WIDTH * 2) - 40; // Wider cards, 40px total side margin

// Memoized carousel item component for better performance
const CarouselItemEnhanced = React.memo(({ 
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
  
  // Prefetch on press start
  const handlePressIn = useCallback(() => {
    if (Platform.OS !== 'web') {
      import('@/services/api').then(({ prefetchArticleById }) => {
        prefetchArticleById(item.id).catch(() => {
          // Silent fail for prefetch
        });
      });
    }
  }, [item.id]);
  
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
        onPressIn={handlePressIn}
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
                Najchętniej czytane
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
  const { setScrollDirection } = useScrollStore();
  const { 
    shouldShowWelcome, 
    shouldShowBanner, 
    dismissBanner,
    initializePreferences 
  } = useNotificationsStore();
  
  // Simplified state management for reliable infinite scroll
  const [articles, setArticles] = useState<Article[]>([]);
  const [featuredArticles, setFeaturedArticles] = useState<Article[]>([]);
  const [nekrologi, setNekrologi] = useState<Nekrolog[]>([]);
  const [mixedContent, setMixedContent] = useState<(Article | Nekrolog)[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  
  // Loading states
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMoreArticles, setHasMoreArticles] = useState(true);
  
  // Carousel and modal states
  const [activeCarouselIndex, setActiveCarouselIndex] = useState(0);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [infiniteArticles, setInfiniteArticles] = useState<Article[]>([]);
  const [realActiveIndex, setRealActiveIndex] = useState(0);
  const [isOffline, setIsOffline] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);
  const isMountedRef = useRef(true);
  const carouselIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isScreenFocused = useRef(true);
  const loadingRef = useRef(false); // Prevent duplicate requests

  // Initialize and check for first time user
  useEffect(() => {
    console.log('HomeScreen: Initializing...');
    initializePreferences();
    
    // Show welcome modal for first time users - reduced delay
    const timer = setTimeout(() => {
      if (shouldShowWelcome()) {
        setShowWelcomeModal(true);
      }
    }, 800); // Reduced from 1500ms to 800ms
    
    return () => clearTimeout(timer);
  }, [initializePreferences, shouldShowWelcome]);
  
  // Main function to load articles with proper pagination
  const loadArticles = useCallback(async (pageNum: number = 1, isRefresh: boolean = false) => {
    // Prevent multiple simultaneous requests
    if (loadingRef.current) {
      console.log('Already loading, skipping request');
      return;
    }
    
    if (!isMountedRef.current) {
      console.log('Component unmounted, cancelling request');
      return;
    }

    try {
      loadingRef.current = true;
      setError(null);
      setIsOffline(false);
      
      // Set appropriate loading state
      if (pageNum === 1) {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setInitialLoading(true);
        }
      } else {
        setLoadingMore(true);
      }
      
      console.log(`Loading articles: page=${pageNum}, refresh=${isRefresh}, category=${selectedCategory}`);
      
      const categoryFilter = selectedCategory && selectedCategory !== 554 ? [selectedCategory] : undefined;
      
      const { articles: newArticles, totalPages: total } = await fetchArticles(
        pageNum,
        20, // Articles per page
        categoryFilter
      );
      
      if (!isMountedRef.current) {
        console.log('Component unmounted during request, ignoring response');
        return;
      }
      
      console.log(`Received ${newArticles.length} articles for page ${pageNum}`);
      
      if (pageNum === 1) {
        // First page or refresh - replace all articles
        if (newArticles.length > 0) {
          const sortedArticles = [...newArticles].sort((a, b) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
          );
          
          // Take most popular articles for featured carousel based on views
          const articlesWithViews = sortedArticles
            .filter(article => article.meta?.views && parseInt(article.meta.views) > 0)
            .sort((a, b) => {
              const viewsA = parseInt(a.meta?.views || '0');
              const viewsB = parseInt(b.meta?.views || '0');
              return viewsB - viewsA; // Sort by highest views first
            });
          
          // If we have articles with views, use them; otherwise fall back to latest
          const featuredSelection = articlesWithViews.length >= 5 
            ? articlesWithViews.slice(0, 5)
            : [...articlesWithViews, ...sortedArticles.filter(a => !a.meta?.views || parseInt(a.meta.views) === 0)].slice(0, 5);
          
          setFeaturedArticles(featuredSelection);
          // Rest go to main list (excluding featured ones)
          const featuredIds = new Set(featuredSelection.map(a => a.id));
          setArticles(sortedArticles.filter(a => !featuredIds.has(a.id)));
          
          // Start prefetching first few articles immediately
          if (Platform.OS !== 'web') {
            setTimeout(() => {
              featuredSelection.slice(0, 3).forEach(article => {
                import('@/services/api').then(({ prefetchArticleById }) => {
                  prefetchArticleById(article.id).catch(() => {});
                });
              });
            }, 100);
          }
        } else {
          setArticles([]);
          setFeaturedArticles([]);
        }
        setCurrentPage(1);
      } else {
        // Append to existing articles
        if (newArticles.length > 0) {
          const sortedNewArticles = [...newArticles].sort((a, b) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
          );
          setArticles(prev => [...prev, ...sortedNewArticles]);
          setCurrentPage(pageNum);
        }
      }
      
      setTotalPages(total);
      
      // Update pagination state
      const hasMore = pageNum < total && newArticles.length > 0;
      setHasMoreArticles(hasMore);
      
      console.log(`Load complete. Page: ${pageNum}/${total}, Has more: ${hasMore}, Articles: ${newArticles.length}`);
      
    } catch (err: any) {
      if (!isMountedRef.current) return;
      
      console.error('Error loading articles:', err);
      
      const errorMessage = err.message || 'Nie udało się załadować artykułów. Sprawdź połączenie internetowe i spróbuj ponownie.';
      
      if (errorMessage.includes('Brak połączenia z internetem') || 
          errorMessage.includes('Nie można połączyć się z serwerem') ||
          errorMessage.includes('Network request failed')) {
        setIsOffline(true);
      }
      
      setError(errorMessage);
    } finally {
      if (isMountedRef.current) {
        loadingRef.current = false;
        setInitialLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    }
  }, [selectedCategory]);
  
  // Load categories - optimized with faster loading
  const loadCategories = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    try {
      console.log('Loading categories...');
      const data = await fetchCategories();
      
      if (!isMountedRef.current) return;
      
      // Filter to show only specific categories by ID
      const allowedCategoryIds = [
        2583, // Wejherowo
        7,    // Trójmiasto
        2128, // Puck
        66165, // Kraj
        65546, // Kościerzyna
        65545, // Kartuzy
        65556, // Chojnice
        76797, // Reda
        65558  // Lębork
      ];
      
      const filteredCategories = data
        .filter(cat => {
          // Include only categories with specific IDs and count > 0, exclude specific IDs (3, 554)
          return allowedCategoryIds.includes(cat.id) && cat.count > 0 && cat.id !== 3 && cat.id !== 554;
        })
        .sort((a, b) => b.count - a.count);
      
      setCategories(filteredCategories);
      console.log(`Loaded ${filteredCategories.length} filtered categories (specific IDs)`);
    } catch (err) {
      if (!isMountedRef.current) return;
      console.error('Error loading categories:', err);
    }
  }, []);
  
  // Load nekrologi - sorted by date
  const loadNekrologi = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    try {
      console.log('Loading nekrologi...');
      const { nekrologi: loadedNekrologi } = await fetchNekrologi(1, 20);
      
      if (!isMountedRef.current) return;
      
      // Sort nekrologi by date (newest first)
      const sortedNekrologi = loadedNekrologi.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      setNekrologi(sortedNekrologi);
      console.log(`Loaded ${sortedNekrologi.length} nekrologi`);
    } catch (err) {
      if (!isMountedRef.current) return;
      console.error('Error loading nekrologi:', err);
    }
  }, []);

  // Mix articles with nekrologi (insert nekrolog every 5th position)
  const mixContentWithNekrologi = useCallback((articlesList: Article[], nekrologiList: Nekrolog[]) => {
    const mixed: (Article | Nekrolog)[] = [];
    let nekrologIndex = 0;
    
    articlesList.forEach((article, index) => {
      mixed.push(article);
      
      // Insert nekrolog every 5th position (after 4th, 9th, 14th, etc.)
      if ((index + 1) % 5 === 0 && nekrologIndex < nekrologiList.length) {
        mixed.push(nekrologiList[nekrologIndex]);
        nekrologIndex++;
      }
    });
    
    return mixed;
  }, []);
  
  // Update mixed content when articles or nekrologi change
  useEffect(() => {
    if (articles.length > 0 || nekrologi.length > 0) {
      const mixed = mixContentWithNekrologi(articles, nekrologi);
      setMixedContent(mixed);
      console.log(`Mixed content updated: ${mixed.length} items (${articles.length} articles + ${nekrologi.length} nekrologi)`);
    }
  }, [articles, nekrologi, mixContentWithNekrologi]);
  
  // Component mount/unmount tracking
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      console.log('HomeScreen unmounting, cancelling all requests');
      isMountedRef.current = false;
      loadingRef.current = false;
      cancelAllRequests();
      
      if (carouselIntervalRef.current) {
        clearInterval(carouselIntervalRef.current);
      }
    };
  }, []);
  
  // Initial load - optimized for faster startup
  useEffect(() => {
    if (isMountedRef.current) {
      console.log('HomeScreen: Starting initial load...');
      
      // Start both loads simultaneously for faster initial render
      const loadData = async () => {
        try {
          await Promise.allSettled([
            loadArticles(1, false),
            loadCategories(),
            loadNekrologi()
          ]);
        } catch (error) {
          console.warn('Error during initial load:', error);
        }
      };
      
      loadData();
    }
  }, [loadArticles, loadCategories, loadNekrologi]);
  
  // Handle category changes
  useEffect(() => {
    if (!isMountedRef.current) return;
    
    console.log('Category changed to:', selectedCategory);
    
    // Reset pagination state
    setCurrentPage(1);
    setHasMoreArticles(true);
    
    // Load first page with new category
    const timeoutId = setTimeout(() => {
      if (isMountedRef.current) {
        loadArticles(1, false);
      }
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [selectedCategory, loadArticles]);
  
  // Create infinite scroll data for carousel
  useEffect(() => {
    if (featuredArticles.length > 0) {
      const duplicateCount = Math.min(2, featuredArticles.length);
      const startDuplicates = featuredArticles.slice(-duplicateCount);
      const endDuplicates = featuredArticles.slice(0, duplicateCount);
      
      setInfiniteArticles([...startDuplicates, ...featuredArticles, ...endDuplicates]);
      
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
      }, 50); // Reduced from 100ms to 50ms
    }
  }, [featuredArticles]);
  
  // Carousel auto-scroll - optimized for better performance
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
        }, 3000); // Reduced from 4000ms to 3000ms for faster scrolling
      }
    };
    
    startCarouselAutoScroll();
    
    return () => {
      if (carouselIntervalRef.current) {
        clearInterval(carouselIntervalRef.current);
      }
    };
  }, [infiniteArticles.length]);
  
  // Handle screen focus/blur - optimized
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      isScreenFocused.current = nextAppState === 'active';
      
      if (nextAppState === 'active') {
        // Restart carousel when app becomes active - simplified
        if (infiniteArticles.length > 1) {
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
          }, 3000); // Consistent timing with main carousel
        }
      } else {
        if (carouselIntervalRef.current) {
          clearInterval(carouselIntervalRef.current);
        }
      }
    };
    
    return () => {
      isScreenFocused.current = false;
      if (carouselIntervalRef.current) {
        clearInterval(carouselIntervalRef.current);
      }
    };
  }, [infiniteArticles.length]);
  
  // Refresh handler
  const handleRefresh = useCallback(() => {
    console.log('Refresh triggered');
    setCurrentPage(1);
    setHasMoreArticles(true);
    loadArticles(1, true);
  }, [loadArticles]);
  
  // Robust infinite scroll handler
  const handleLoadMore = useCallback(() => {
    // Don't load if already loading, no more articles, or at end
    if (loadingMore || !hasMoreArticles || currentPage >= totalPages || loadingRef.current) {
      console.log('Skipping load more:', { loadingMore, hasMoreArticles, currentPage, totalPages, loadingRef: loadingRef.current });
      return;
    }
    
    const nextPage = currentPage + 1;
    console.log(`Loading more articles: page ${nextPage}`);
    loadArticles(nextPage, false);
  }, [loadingMore, hasMoreArticles, currentPage, totalPages, loadArticles]);

  // Enhanced article press handler
  const handleArticlePress = useCallback((article: Article) => {
    const perfMeasure = MemoryOptimizer.measureArticleLoadTime(article.id);
    addRecentArticle(article);
    router.push(`/article/${article.id}`);
    
    setTimeout(() => {
      perfMeasure.end();
    }, 100);
  }, [addRecentArticle, router]);

  // Carousel render function
  const renderCarouselItem = useCallback(({ item, index }: { item: Article; index: number }) => (
    <View style={styles.carouselItemWrapper}>
      <CarouselItemEnhanced
        item={item}
        index={index}
        totalItems={infiniteArticles.length}
        onPress={handleArticlePress}
      />
    </View>
  ), [infiniteArticles.length, handleArticlePress]);

  // Article render function
  const renderArticle = useCallback(({ item }: { item: Article }) => (
    <ArticleCard 
      article={item} 
      onPress={() => handleArticlePress(item)}
    />
  ), [handleArticlePress]);

  // Nekrolog render function with navigation
  const renderNekrolog = useCallback(({ item }: { item: Nekrolog }) => (
    <TouchableOpacity 
      style={[styles.nekrologCard, { 
        backgroundColor: theme.colors.card,
        borderColor: theme.colors.border 
      }]}
      onPress={() => router.push(`/nekrolog/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.nekrologHeader}>
        <View style={styles.blackRibbon} />
        <Heart size={14} color="#000" style={styles.nekrologIcon} />
        <Text style={[styles.nekrologBadge, { 
          backgroundColor: '#000',
          color: '#FFFFFF'
        }]}>
          Nekrolog
        </Text>
      </View>
      <Text style={[styles.nekrologTitle, { 
        color: theme.colors.text,
        fontFamily: theme.fontFamily.semibold 
      }]}>
        {item.title.rendered}
      </Text>
      <Text style={[styles.nekrologDate, { 
        color: theme.colors.textSecondary,
        fontFamily: theme.fontFamily.regular 
      }]}>
        {new Date(item.date).toLocaleDateString('pl-PL')}
      </Text>
    </TouchableOpacity>
  ), [theme, router]);

  // Mixed content render function
  const renderMixedItem = useCallback(({ item }: { item: Article | Nekrolog }) => {
    if (item.type === 'nekrolog') {
      return renderNekrolog({ item: item as Nekrolog });
    } else {
      return renderArticle({ item: item as Article });
    }
  }, [renderArticle, renderNekrolog]);

  // Key extractor for mixed content
  const keyExtractor = useCallback((item: Article | Nekrolog) => `${item.type}-${item.id}`, []);

  // Handler functions that need to be defined within component scope
  const handleCategoryChange = useCallback((categoryId: number | null) => {
    setSelectedCategory(categoryId);
  }, []);

  const handleRetry = useCallback(() => {
    setError(null);
    setCurrentPage(1);
    setHasMoreArticles(true);
    loadArticles(1, false);
  }, [loadArticles]);

  const handleBannerPress = useCallback(() => {
    router.push('/(tabs)/notifications');
  }, [router]);

  const handleBannerDismiss = useCallback(() => {
    dismissBanner();
  }, [dismissBanner]);

  const handleScrollToIndexFailed = useCallback((info: any) => {
    console.warn('Scroll to index failed:', info);
    setTimeout(() => {
      if (flatListRef.current && infiniteArticles.length > 0) {
        try {
          const safeIndex = Math.min(info.index, infiniteArticles.length - 1);
          flatListRef.current.scrollToIndex({
            index: safeIndex,
            animated: false,
            viewPosition: 0.5,
          });
        } catch (error) {
          console.warn('Fallback scroll failed:', error);
        }
      }
    }, 100);
  }, [infiniteArticles.length]);

  const renderCarouselIndicator = useMemo(() => {
    if (featuredArticles.length <= 1) return null;
    
    return (
      <View style={styles.indicatorContainer}>
        {featuredArticles.map((_, index) => (
          <View
            key={index}
            style={[
              styles.indicator,
              {
                backgroundColor: index === realActiveIndex 
                  ? theme.colors.primary 
                  : 'rgba(0, 0, 0, 0.2)'
              }
            ]}
          />
        ))}
      </View>
    );
  }, [featuredArticles.length, realActiveIndex, theme.colors.primary]);

  const navigateToSearch = useCallback(() => {
    router.push('/(tabs)/search');
  }, [router]);

  const getItemLayout = useCallback((data: any, index: number) => ({
    length: 200,
    offset: 200 * index,
    index,
  }), []);

  const handleWelcomeClose = useCallback(() => {
    setShowWelcomeModal(false);
  }, []);

  // Category pills render function
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

  const handleScroll = useCallback(
    MemoryOptimizer.throttle((event: any) => {
      const scrollY = event.nativeEvent.contentOffset.y;
      setScrollDirection(scrollY);
    }, 16),
    [setScrollDirection]
  );

  const listConfig = useMemo(() => MemoryOptimizer.getOptimalListConfig(), []);

  // Loading footer component with clear feedback
  const renderFooter = useCallback(() => {
    if (loadingMore) {
      return (
        <View style={[styles.loadingFooter, { backgroundColor: theme.colors.background }]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { 
            color: theme.colors.text,
            fontFamily: theme.fontFamily.medium 
          }]}>
            Ładowanie artykułów...
          </Text>
        </View>
      );
    }
    
    if (!hasMoreArticles && mixedContent.length > 0) {
      return (
        <View style={[styles.endFooter, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.endDivider, { backgroundColor: theme.colors.border }]} />
          <Text style={[styles.endText, { 
            color: theme.colors.text,
            fontFamily: theme.fontFamily.semibold 
          }]}>
            To wszystkie artykuły
          </Text>
          <Text style={[styles.endSubtext, { 
            color: theme.colors.textSecondary,
            fontFamily: theme.fontFamily.regular 
          }]}>
            Sprawdź później czy są nowe artykuły
          </Text>
        </View>
      );
    }
    
    return null;
  }, [loadingMore, hasMoreArticles, mixedContent.length, theme]);

  if (initialLoading) {
    return <SkeletonLoader type="home" count={5} />;
  }

  if (error && mixedContent.length === 0) {
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
        data={mixedContent}
        keyExtractor={keyExtractor}
        renderItem={renderMixedItem}
        contentContainerStyle={styles.listContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        ListHeaderComponent={
          <View>
            {/* Notifications Banner */}
            {shouldShowBanner() && (
              <NotificationsBanner
                onPress={handleBannerPress}
                onDismiss={handleBannerDismiss}
              />
            )}
            
            {/* Latest Articles Carousel */}
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
                  removeClippedSubviews={listConfig.removeClippedSubviews}
                  initialNumToRender={listConfig.initialNumToRender}
                  maxToRenderPerBatch={listConfig.maxToRenderPerBatch}
                  windowSize={listConfig.windowSize}
                  updateCellsBatchingPeriod={listConfig.updateCellsBatchingPeriod}
                  legacyImplementation={false}
                  disableIntervalMomentum={true}
                  maintainVisibleContentPosition={{
                    minIndexForVisible: 0,
                    autoscrollToTopThreshold: 10,
                  }}
                />
                {renderCarouselIndicator}
              </View>
            )}
            
            {/* Category Filters */}
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
          !initialLoading ? (
            <EmptyState
              title={selectedCategory ? "Brak artykułów w tej kategorii" : "Nie znaleziono artykułów"}
              message={selectedCategory ? "Spróbuj wybrać inną kategorię." : "Spróbuj odświeżyć stronę."}
              actionLabel="Odśwież"
              onAction={handleRefresh}
            />
          ) : null
        }
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3} // Trigger when 30% from bottom
        removeClippedSubviews={listConfig.removeClippedSubviews}
        initialNumToRender={listConfig.initialNumToRender}
        maxToRenderPerBatch={listConfig.maxToRenderPerBatch}
        windowSize={listConfig.windowSize}
        getItemLayout={getItemLayout}
        updateCellsBatchingPeriod={listConfig.updateCellsBatchingPeriod}
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
    paddingHorizontal: CAROUSEL_PEEK_WIDTH + 20,
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
    marginBottom: 8,
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
  // New improved footer styles
  loadingFooter: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  endFooter: {
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 24,
  },
  endDivider: {
    width: 60,
    height: 2,
    borderRadius: 1,
    marginBottom: 16,
    opacity: 0.3,
  },
  endText: {
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 8,
  },
  endSubtext: {
    fontSize: 13,
    textAlign: 'center',
    opacity: 0.7,
  },
  nekrologCard: {
    padding: 16,
    margin: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  nekrologHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  blackRibbon: {
    width: 24,
    height: 4,
    backgroundColor: '#000',
    borderRadius: 2,
    marginRight: 6,
  },
  nekrologIcon: {
    marginRight: 6,
    opacity: 0.8,
  },
  nekrologBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '600',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  nekrologTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  nekrologDate: {
    fontSize: 12,
    fontWeight: '400',
  },
});