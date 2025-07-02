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
  ActivityIndicator,
  StatusBar
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  ChevronRight, 
  RefreshCw, 
  WifiOff, 
  ArrowRight, 
  Heart, 
  Home, 
  Bell, 
  Search, 
  Bookmark, 
  Settings,
  Eye,
  TrendingUp,
  Clock,
  Calendar,
  MapPin
} from 'lucide-react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
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
import { WelcomeGreeting } from '@/components/WelcomeGreeting';
import { WeatherWidget } from '@/components/WeatherWidget';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

// New center mode carousel dimensions - fixed for proper edge visibility
const CAROUSEL_ITEM_WIDTH = width * 0.85; // 85% of screen width for main card
const CAROUSEL_ITEM_SPACING = 12; // Reduced spacing between cards
const CAROUSEL_SIDE_PEEK = (width - CAROUSEL_ITEM_WIDTH) / 2 - 8; // Extra margin for edge visibility

// Modern header component with enhanced UI
const ModernHeader = () => {
  const { theme } = useThemeStore();
  const router = useRouter();

  return (
    <View style={[styles.modernHeaderWrapper, { backgroundColor: theme.colors.background }]}>
      {/* Background gradient */}
      <LinearGradient
        colors={theme.isDarkMode 
          ? ['rgba(34,73,150,0.08)', 'rgba(34,73,150,0)', 'transparent'] 
          : ['rgba(34,73,150,0.06)', 'rgba(34,73,150,0)', 'transparent']}
        style={styles.modernHeaderGradient}
      />
      
      <View style={styles.modernHeaderContent}>
        {/* Left side - Greeting with waving hand icon */}
        <View style={styles.headerLeftSection}>
          <View style={styles.greetingWithIcon}>
            <Text style={[styles.wavingHandIcon, { fontSize: 28 }]}>👋</Text>
            <View style={styles.greetingSection}>
              <WelcomeGreeting compact={false} enlarged={true} />
            </View>
          </View>
        </View>
        
        {/* Right side - Weather Widget */}
        <WeatherWidget enhanced />
      </View>
    </View>
  );
};

// New center mode carousel component with weekly most popular filtering
const WeeklyPopularCarousel = React.memo(({ 
  item, 
  index, 
  totalItems, 
  onPress,
  isActive
}: { 
  item: Article; 
  index: number; 
  totalItems: number;
  onPress: (article: Article) => void;
  isActive: boolean;
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

  // Get article region from categories using real category IDs
  const getArticleRegion = (article: Article) => {
    if (!article.categories || article.categories.length === 0) return null;
    
    // Real region category IDs and names
    const regionCategories = [
      { id: 2583, name: 'Wejherowo' },
      { id: 7, name: 'Trójmiasto' },
      { id: 2128, name: 'Puck' },
      { id: 76797, name: 'Reda' },
      { id: 65546, name: 'Kościerzyna' },
      { id: 65545, name: 'Kartuzy' },
      { id: 65558, name: 'Lębork' },
    ];
    
    // Find region category by ID
    const regionCategory = article.categories.find(cat => 
      cat && regionCategories.some(region => region.id === cat.id)
    );
    
    if (regionCategory) {
      const region = regionCategories.find(r => r.id === regionCategory.id);
      return region ? region.name : null;
    }
    
    return null;
  };

  // Get view count for display - multiply by 3 as requested
  const getViewCount = (article: Article) => {
    const views = parseInt(article.meta?.views || '0') * 3;
    if (views > 1000) {
      return `${(views / 1000).toFixed(1)}k`;
    }
    return views.toString();
  };
  
  return (
    <View
      style={[
        styles.newCarouselItemContainer,
        { 
          width: CAROUSEL_ITEM_WIDTH,
          transform: [
            { scale: isActive ? 1.0 : 0.9 }
          ],
          opacity: isActive ? 1.0 : 0.7,
        }
      ]}
    >
      <TouchableOpacity 
        style={styles.newCarouselItem}
        onPress={() => onPress(item)}
        onPressIn={handlePressIn}
        activeOpacity={0.9}
      >
        <View style={styles.newCarouselImageContainer}>
          {item.featured_media_url ? (
            <Image
              source={{ uri: item.featured_media_url }}
              style={styles.newCarouselImage}
              contentFit="cover"
              transition={200}
              placeholder="Loading..."
              cachePolicy="memory-disk"
              priority="high"
            />
          ) : (
            <View style={[styles.newCarouselImagePlaceholder, { backgroundColor: theme.colors.subtle }]} />
          )}
          
          {/* Weekly Popular Badge */}
          <View style={styles.weeklyBadge}>
            <TrendingUp size={12} color="#FFFFFF" />
            <Text style={[styles.weeklyBadgeText, { fontFamily: theme.fontFamily.semibold }]}>
              Najpopularniejsze w tym tygodniu
            </Text>
          </View>

          {/* View Counter */}
          <View style={styles.viewCounter}>
            <Eye size={12} color="#FFFFFF" />
            <Text style={[styles.viewCountText, { fontFamily: theme.fontFamily.medium }]}>
              {getViewCount(item)}
            </Text>
          </View>
          
          {/* Improved gradient */}
          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.8)']}
            locations={[0, 0.4, 0.7, 1]}
            style={styles.newCarouselGradient}
          />
          
          <View style={styles.newCarouselItemContent}>
            {getArticleRegion(item) && (
              <View style={styles.newCarouselLabelContainer}>
                <MapPin size={12} color="#FFFFFF" />
                <Text style={[
                  styles.newCarouselLabel,
                  { fontFamily: theme.fontFamily.semibold }
                ]}>
                  {getArticleRegion(item)}
                </Text>
              </View>
            )}
            <Text style={[
              styles.newCarouselTitle,
              { fontFamily: theme.fontFamily.bold }
            ]} numberOfLines={3}>
              {item.title.rendered.replace(/&#8211;/g, '-').replace(/&#8217;/g, "'")}
            </Text>
            <View style={styles.newCarouselFooter}>
              <Text style={[
                styles.newCarouselReadMore,
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
    initializePreferences,
    getUnreadCount
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

  // Enhanced carousel state with user interaction tracking
  const [userInteracting, setUserInteracting] = useState(false);
  const [lastInteractionTime, setLastInteractionTime] = useState(0);
  const autoScrollPausedRef = useRef(false);

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
  
  // Improved carousel auto-scroll with user interaction awareness
  useEffect(() => {
    const startCarouselAutoScroll = () => {
      if (carouselIntervalRef.current) {
        clearInterval(carouselIntervalRef.current);
      }
      
      if (infiniteArticles.length > 1 && isScreenFocused.current && !autoScrollPausedRef.current) {
        carouselIntervalRef.current = setInterval(() => {
          if (!isScreenFocused.current || autoScrollPausedRef.current || userInteracting) return;
          
          // Check if user interacted recently (pause for 10 seconds after interaction)
          const timeSinceInteraction = Date.now() - lastInteractionTime;
          if (timeSinceInteraction < 10000) return; // 10 seconds pause
          
          setActiveCarouselIndex(prevIndex => {
            const nextIndex = prevIndex + 1;
            
            if (flatListRef.current && infiniteArticles.length > 0) {
              try {
                // Add haptic feedback for auto-scroll
                if (Platform.OS !== 'web') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                
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
        }, 5000); // Increased from 3000ms to 5000ms for less aggressive scrolling
      }
    };
    
    startCarouselAutoScroll();
    
    return () => {
      if (carouselIntervalRef.current) {
        clearInterval(carouselIntervalRef.current);
      }
    };
  }, [infiniteArticles.length, userInteracting, lastInteractionTime]);
  
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

  // New carousel render function with center mode
  const renderCarouselItem = useCallback(({ item, index }: { item: Article; index: number }) => {
    // Calculate if this item is active (centered)
    const duplicateCount = Math.min(2, featuredArticles.length);
    const isActive = Math.abs(index - activeCarouselIndex) <= 0.5;
    
    return (
      <WeeklyPopularCarousel
        item={item}
        index={index}
        totalItems={infiniteArticles.length}
        onPress={handleArticlePress}
        isActive={isActive}
      />
    );
  }, [infiniteArticles.length, handleArticlePress, activeCarouselIndex, featuredArticles.length]);

  // Article render function
  const renderArticle = useCallback(({ item }: { item: Article }) => (
    <ArticleCard 
      article={item} 
      onPress={() => handleArticlePress(item)}
    />
  ), [handleArticlePress]);

  // Nekrolog render function with navigation and memorial ribbon
  const renderNekrolog = useCallback(({ item }: { item: Nekrolog }) => (
    <TouchableOpacity 
      style={[styles.nekrologCard, { 
        backgroundColor: theme.colors.card,
        borderColor: theme.colors.border
      }]}
      onPress={() => router.push(`/nekrolog/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.nekrologContent}>
        <View style={styles.nekrologImageContainer}>
          <Image
            source={{ uri: 'http://kaszuby24.pl/wp-content/uploads/2023/05/514697-PIHZZ2-291-01.png' }}
            style={styles.memorialRibbonList}
            contentFit="cover"
            transition={200}
          />
        </View>
        <View style={styles.nekrologTextContainer}>
          <View style={styles.nekrologHeader}>
            <Text style={[styles.nekrologBadge, { 
              backgroundColor: '#000',
              color: '#FFFFFF',
              fontFamily: theme.fontFamily.semibold
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
        </View>
      </View>
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
    // Handle "Wszystkie" category (ID: 3) as null for showing all articles
    const actualCategoryId = categoryId === 3 ? null : categoryId;
    
    setSelectedCategory(actualCategoryId);
    setCurrentPage(1);
    setHasMoreArticles(true);
    setLoadingMore(false);
    
    // Reset to show all content when changing category
    setMixedContent([]);
    setInitialLoading(true);
    
    // Force reload with new category
    setTimeout(() => {
      setInitialLoading(false);
    }, 100);
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

  // Enhanced carousel indicator with clickable dots
  const renderCarouselIndicator = useMemo(() => {
    if (featuredArticles.length <= 1) return null;
    
    const handleIndicatorPress = (targetIndex: number) => {
      if (flatListRef.current && !userInteracting) {
        setUserInteracting(true);
        setLastInteractionTime(Date.now());
        
        // Add haptic feedback
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        
        const duplicateCount = Math.min(2, featuredArticles.length);
        const scrollToIndex = duplicateCount + targetIndex;
        
        try {
          flatListRef.current.scrollToIndex({
            index: scrollToIndex,
            animated: true,
            viewPosition: 0.5,
          });
          setActiveCarouselIndex(scrollToIndex);
          setRealActiveIndex(targetIndex);
        } catch (error) {
          console.warn('Indicator navigation failed:', error);
        }
        
        // Reset interaction state after animation
        setTimeout(() => setUserInteracting(false), 1000);
      }
    };
    
    return (
      <View style={styles.indicatorContainer}>
        {featuredArticles.map((_, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.indicator,
              {
                backgroundColor: index === realActiveIndex 
                  ? theme.colors.primary 
                  : theme.colors.textSecondary + '30',
                width: index === realActiveIndex ? 24 : 8,
              }
            ]}
            onPress={() => handleIndicatorPress(index)}
            activeOpacity={0.8}
          />
        ))}
      </View>
    );
  }, [featuredArticles.length, realActiveIndex, theme.colors.primary, theme.isDarkMode, userInteracting]);

  // Enhanced scroll handling with user interaction detection
  const handleCarouselScrollBegin = useCallback(() => {
    setUserInteracting(true);
    setLastInteractionTime(Date.now());
  }, []);

  const handleCarouselScrollEnd = useCallback(() => {
    setTimeout(() => setUserInteracting(false), 500);
  }, []);

  // Enhanced momentum scroll end with better index calculation
  const handleCarouselMomentumScrollEnd = useCallback((event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(
      (contentOffsetX + CAROUSEL_SIDE_PEEK) / (CAROUSEL_ITEM_WIDTH + CAROUSEL_ITEM_SPACING)
    );
    
    const duplicateCount = Math.min(2, featuredArticles.length);
    
    // Add haptic feedback on manual scroll
    if (Platform.OS !== 'web' && userInteracting) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
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
  }, [featuredArticles.length, infiniteArticles.length, userInteracting]);

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

  // Render category pills with real categories
  const renderCategoryPills = () => {
    // Real category data from your system - using your blue-green theme
    const realCategories = [
      { id: 3, name: 'Wszystkie', slug: 'wszystkie', icon: '🏠', color: '#224996' },
      { id: 17, name: 'Bezpieczeństwo', slug: 'bezpieczenstwo', icon: '🛡️', color: '#224996' },
      { id: 11, name: 'Biznes', slug: 'biznes', icon: '💼', color: '#224996' },
      { id: 24, name: 'Sport', slug: 'sport', icon: '⚽', color: '#224996' },
      { id: 22, name: 'Religia', slug: 'religia', icon: '⛪', color: '#224996' },
      { id: 2246, name: 'Zdrowie', slug: 'zdrowie', icon: '🏥', color: '#224996' },
      { id: 49, name: 'Nauka', slug: 'nauka', icon: '🔬', color: '#224996' },
      { id: 16, name: 'Kultura', slug: 'kultura', icon: '🎭', color: '#224996' },
    ];

    return (
      <View style={styles.categoriesContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContent}
        >
          {realCategories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryPill,
                { 
                  backgroundColor: (selectedCategory === category.id || (category.id === 3 && selectedCategory === null)) 
                    ? category.color 
                    : theme.colors.card,
                  borderColor: (selectedCategory === category.id || (category.id === 3 && selectedCategory === null)) 
                    ? category.color 
                    : theme.colors.border,
                }
              ]}
              onPress={() => handleCategoryChange(category.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.categoryEmoji}>{category.icon}</Text>
              <Text 
                style={[
                  styles.categoryText, 
                  { 
                    color: (selectedCategory === category.id || (category.id === 3 && selectedCategory === null)) 
                      ? '#FFFFFF' 
                      : theme.colors.text,
                    fontFamily: (selectedCategory === category.id || (category.id === 3 && selectedCategory === null)) 
                      ? theme.fontFamily.semibold 
                      : theme.fontFamily.medium
                  }
                ]}
              >
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

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
            {/* Modern Header */}
            <ModernHeader />
            
            {/* Notifications Banner */}
            {shouldShowBanner() && (
              <NotificationsBanner
                onPress={handleBannerPress}
                onDismiss={handleBannerDismiss}
              />
            )}
            
            {/* Enhanced Latest Articles Carousel */}
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
                  onScrollBeginDrag={handleCarouselScrollBegin}
                  onScrollEndDrag={handleCarouselScrollEnd}
                  onMomentumScrollEnd={handleCarouselMomentumScrollEnd}
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
            
            {/* Category Filters - Updated with better UI */}
            {renderCategoryPills()}
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
    paddingBottom: 150, // Increased to accommodate bigger modern bottom menu
    paddingTop: Platform.OS === 'ios' ? 54 : 34, // Add padding for status bar
  },
  carouselContainer: {
    marginTop: 12,
    marginBottom: 28,
    width: '100%',
  },
  carouselListContent: {
    paddingHorizontal: CAROUSEL_SIDE_PEEK,
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  carouselLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
    marginLeft: 4,
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
  
  // New carousel styles for weekly popular
  newCarouselItemContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
    marginHorizontal: CAROUSEL_ITEM_SPACING / 2,
  },
  newCarouselItem: {
    borderRadius: 24,
    overflow: 'hidden',
    height: 300,
    width: '100%',
  },
  newCarouselImageContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  newCarouselImage: {
    width: '100%',
    height: '100%',
  },
  newCarouselImagePlaceholder: {
    width: '100%',
    height: '100%',
  },
  weeklyBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: '#224996',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  weeklyBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
    letterSpacing: 0.3,
  },
  viewCounter: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewCountText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 4,
  },
  newCarouselGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '70%',
  },
  newCarouselItemContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
  },
  newCarouselLabelContainer: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    alignSelf: 'flex-start',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  newCarouselLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
    marginLeft: 4,
  },
  newCarouselTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
    marginBottom: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  newCarouselFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  newCarouselReadMore: {
    color: '#FFFFFF',
    fontSize: 14,
    marginRight: 8,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16, // Reduced back to 16
    paddingHorizontal: 20,
  },
  indicator: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
    transition: 'all 0.3s ease',
  },
  categoriesContainer: {
    marginBottom: 24,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 12,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryEmoji: {
    fontSize: 16,
    marginRight: 8,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
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
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  nekrologContent: {
    flexDirection: 'row',
    padding: 16,
  },
  nekrologImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 16,
  },
  memorialRibbonList: {
    width: '100%',
    height: '100%',
  },
  nekrologTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  nekrologHeader: {
    marginBottom: 8,
  },
  nekrologBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '600',
    fontSize: 10,
    letterSpacing: 0.5,
    alignSelf: 'flex-start',
  },
  nekrologTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  nekrologDate: {
    fontSize: 12,
    fontWeight: '400',
  },

  // Modern header styles
  modernHeaderWrapper: {
    paddingVertical: 20, // Increased from 16
    paddingHorizontal: 0, // Full width
    width: '100%',
    minHeight: 100, // Added minimum height
  },
  modernHeaderGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.5,
  },
  modernHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1,
    paddingHorizontal: 20, // Move padding here
    width: '100%',
    minHeight: 60, // Added minimum height for content
  },
  headerLeftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoContainer: {
    width: 60, // Increased from 50
    height: 60, // Increased from 50
    borderRadius: 30, // Adjusted for new size
    overflow: 'hidden',
    marginRight: 20, // Increased from 16
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 3, // Increased from 2
  },
  headerLogo: {
    width: '100%',
    height: '100%',
    borderRadius: 27, // Adjusted for new padding
  },
  greetingSection: {
    flexDirection: 'column',
    flex: 1,
  },
  greetingWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  wavingHandIcon: {
    marginRight: 12,
    transform: [{ rotate: '15deg' }],
  },
  // Region Filter Header Styles
  regionFilterHeader: {
    paddingHorizontal: 24,
    marginBottom: 16,
    marginTop: 8,
  },
  regionFilterTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  regionFilterTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginLeft: 8,
  },

});