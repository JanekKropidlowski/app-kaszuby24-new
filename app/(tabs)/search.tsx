import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  ScrollView
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Search as SearchIcon, MapPin, Calendar, Heart, TrendingUp, Clock, Filter, Home, Bell, Settings, Bookmark } from 'lucide-react-native';
import { Image } from 'expo-image';
import { searchArticles, fetchArticles } from '@/services/api';
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
import { useNotificationsStore } from '@/store/notificationsStore';

// Header component with logo - positioned lower for notch compatibility
const SearchHeader = () => {
  const { theme } = useThemeStore();

  return (
    <View style={[styles.searchHeader, { backgroundColor: theme.colors.background }]}>
      <Image
        source={{ 
          uri: theme.isDarkMode 
            ? 'http://kaszuby24.pl/wp-content/uploads/2025/07/Bez-nazwy-2-01-1-scaled.png'
            : 'http://kaszuby24.pl/wp-content/uploads/2025/07/Bez-nazwy-2-01-scaled.png'
        }}
        style={styles.headerLogo}
        contentFit="contain"
        transition={200}
      />
    </View>
  );
};

export default function SearchScreen() {
  const router = useRouter();
  const { regionId } = useLocalSearchParams();
  const { theme } = useThemeStore();
  const { addRecentArticle } = useArticlesStore();
  const { setScrollDirection, resetScroll } = useScrollStore();
  const { getUnreadCount } = useNotificationsStore();
  
  const [query, setQuery] = useState('');
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [regionName, setRegionName] = useState<string>('');
  
  // Filter states
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter options with real IDs from your system
  const regions = [
    { id: '2583', name: 'Wejherowo', icon: MapPin },
    { id: '7', name: 'Trójmiasto', icon: MapPin },
    { id: '2128', name: 'Puck', icon: MapPin },
    { id: '76797', name: 'Reda', icon: MapPin },
    { id: '65546', name: 'Kościerzyna', icon: MapPin },
    { id: '65545', name: 'Kartuzy', icon: MapPin },
    { id: '65558', name: 'Lębork', icon: MapPin },
  ];
  
  const categories = [
    { id: '17', name: 'Bezpieczeństwo', icon: Heart, color: '#FF6B6B' },
    { id: '11', name: 'Biznes', icon: TrendingUp, color: '#FFE66D' },
    { id: '24', name: 'Sport i Rekreacja', icon: Calendar, color: '#4ECDC4' },
    { id: '22', name: 'Religia', icon: Clock, color: '#A8E6CF' },
    { id: '2246', name: 'Zdrowie', icon: Heart, color: '#FFB3BA' },
    { id: '49', name: 'Nauka', icon: TrendingUp, color: '#BFDBFE' },
    { id: '16', name: 'Kultura i Rozrywka', icon: Calendar, color: '#DDD6FE' },
  ];

  // Bottom navigation functions
  const handleGoHome = useCallback(() => {
    router.push('/(tabs)/');
  }, [router]);

  const handleGoSearch = useCallback(() => {
    // Already on search
  }, []);

  const handleGoSaved = useCallback(() => {
    router.push('/(tabs)/saved');
  }, [router]);

  const handleGoNotifications = useCallback(() => {
    router.push('/(tabs)/notifications');
  }, [router]);

  const handleGoSettings = useCallback(() => {
    router.push('/(tabs)/preferences');
  }, [router]);

  const unreadCount = getUnreadCount();
  
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
      
      let searchResults, totalPages;
      
      // Check if this is a category filter search
      if (searchQuery.startsWith('categories=')) {
        const categoryId = searchQuery.replace('categories=', '');
        // Use fetchArticles with category filter instead of searchArticles
        const response = await fetchArticles(1, 20, [parseInt(categoryId)]);
        searchResults = response.articles;
        totalPages = response.totalPages;
      } else {
        // Regular text search
        const response = await searchArticles(searchQuery, 1);
        searchResults = response.articles;
        totalPages = response.totalPages;
      }
      
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

  // Filter handlers
  const handleRegionFilter = (regionId: string) => {
    setSelectedRegion(selectedRegion === regionId ? '' : regionId);
    // Perform search with region filter using category ID
    if (selectedRegion !== regionId) {
      handleSearch(`categories=${regionId}`);
    } else {
      handleSearch('');
    }
  };

  const handleCategoryFilter = (categoryId: string) => {
    setSelectedCategory(selectedCategory === categoryId ? '' : categoryId);
    // Perform search with category filter using category ID
    if (selectedCategory !== categoryId) {
      handleSearch(`categories=${categoryId}`);
    } else {
      handleSearch('');
    }
  };

  const clearAllFilters = () => {
    setSelectedRegion('');
    setSelectedCategory('');
    handleSearch('');
  };

  // Render filter sections
  const renderRegionFilters = () => (
    <View style={styles.filterSection}>
      <View style={styles.filterHeader}>
        <MapPin size={18} color={theme.colors.primary} />
        <Text style={[styles.filterTitle, { 
          color: theme.colors.text,
          fontFamily: theme.fontFamily.semibold 
        }]}>
          Regiony
        </Text>
      </View>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScrollContent}
      >
        {regions.map((region) => (
          <TouchableOpacity
            key={region.id}
            style={[
              styles.filterChip,
              { 
                backgroundColor: selectedRegion === region.id 
                  ? theme.colors.primary 
                  : theme.colors.card,
                borderColor: selectedRegion === region.id 
                  ? theme.colors.primary 
                  : theme.colors.border
              }
            ]}
            onPress={() => handleRegionFilter(region.id)}
            activeOpacity={0.8}
          >
            <region.icon 
              size={16} 
              color={selectedRegion === region.id ? '#FFFFFF' : theme.colors.textSecondary} 
            />
            <Text style={[
              styles.filterChipText,
              { 
                color: selectedRegion === region.id ? '#FFFFFF' : theme.colors.text,
                fontFamily: theme.fontFamily.medium
              }
            ]}>
              {region.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderCategoryFilters = () => (
    <View style={styles.filterSection}>
      <View style={styles.filterHeader}>
        <Filter size={18} color={theme.colors.primary} />
        <Text style={[styles.filterTitle, { 
          color: theme.colors.text,
          fontFamily: theme.fontFamily.semibold 
        }]}>
          Działy
        </Text>
      </View>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScrollContent}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.filterChip,
              { 
                backgroundColor: selectedCategory === category.id 
                  ? category.color 
                  : theme.colors.card,
                borderColor: selectedCategory === category.id 
                  ? category.color 
                  : theme.colors.border
              }
            ]}
            onPress={() => handleCategoryFilter(category.id)}
            activeOpacity={0.8}
          >
            <category.icon 
              size={16} 
              color={selectedCategory === category.id ? '#FFFFFF' : category.color} 
            />
            <Text style={[
              styles.filterChipText,
              { 
                color: selectedCategory === category.id ? '#FFFFFF' : theme.colors.text,
                fontFamily: theme.fontFamily.medium
              }
            ]}>
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderEmptySearch = () => (
    <View style={styles.emptySearchContainer}>
      <View style={[styles.iconContainer, { backgroundColor: theme.colors.subtle }]}>
        <SearchIcon size={32} color={theme.colors.primary} />
      </View>
      <Text style={[styles.emptySearchTitle, { color: theme.colors.text }]}>
        Wyszukaj artykuły
      </Text>
      <Text style={[styles.emptySearchSubtitle, { color: theme.colors.textSecondary }]}>
        Wpisz słowa kluczowe lub użyj filtrów poniżej
      </Text>
      
      {/* Filter sections for empty state */}
      <View style={styles.emptyFiltersContainer}>
        {renderRegionFilters()}
        {renderCategoryFilters()}
        
        {(selectedRegion || selectedCategory) && (
          <TouchableOpacity 
            style={[styles.clearFiltersButton, { backgroundColor: theme.colors.subtle }]}
            onPress={clearAllFilters}
          >
            <Text style={[styles.clearFiltersText, { 
              color: theme.colors.primary,
              fontFamily: theme.fontFamily.medium 
            }]}>
              Wyczyść filtry
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
  
  // Add scroll handler for logo visibility
  const handleScroll = useCallback((event: any) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    setScrollDirection(scrollY);
  }, [setScrollDirection]);
  
  // Handle region-based search when regionId is provided
  useEffect(() => {
    const loadRegionArticles = async () => {
      if (regionId && typeof regionId === 'string') {
        try {
          setLoading(true);
          setInitialLoading(true);
          setError(null);
          
          // Load region name
          const regionResponse = await fetch(`https://kaszuby24.pl/wp-json/wp/v2/region/${regionId}`);
          if (regionResponse.ok) {
            const regionData = await regionResponse.json();
            setRegionName(regionData.name);
            setQuery(`Region: ${regionData.name}`);
          }
          
          // Load articles from this region
          const articlesResponse = await fetch(
            `https://kaszuby24.pl/wp-json/wp/v2/posts?_embed&region=${regionId}&per_page=20&categories_exclude=554`
          );
          
          if (articlesResponse.ok) {
            const regionArticles = await articlesResponse.json();
            
            // Process articles to extract featured image URL
            const processedArticles = regionArticles.map((article: Article) => {
              let featured_media_url = undefined;
              
              if (article._embedded && 
                  article._embedded['wp:featuredmedia'] && 
                  article._embedded['wp:featuredmedia'][0]) {
                featured_media_url = article._embedded['wp:featuredmedia'][0].source_url;
              }
              
              return {
                ...article,
                featured_media_url
              };
            });
            
            const filteredResults = filterSponsoredArticles(processedArticles);
            setArticles(filteredResults);
            setTotalPages(1);
            setPage(1);
          }
        } catch (err) {
          setError('Nie udało się załadować artykułów z tego regionu.');
          console.error('Error loading region articles:', err);
        } finally {
          setInitialLoading(false);
          setLoading(false);
        }
      }
    };
    
    loadRegionArticles();
  }, [regionId]);
  
  // Reset scroll state when component mounts
  useEffect(() => {
    resetScroll();
    return () => {
      resetScroll();
    };
  }, [resetScroll]);
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header with logo */}
      <SearchHeader />
      
      <View style={[styles.searchContainer, { backgroundColor: theme.colors.card }]}>
        <SearchBar 
          onSearch={handleSearch} 
          placeholder="Wpisz słowa kluczowe..." 
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
      
      {/* Enhanced Bottom Navigation Menu - Modern & Comfortable */}
      <View style={[styles.modernBottomBar, { backgroundColor: theme.colors.tabBarBackground }]}>
        <TouchableOpacity
          style={[styles.modernBottomItem, { opacity: 0.7 }]}
          onPress={handleGoSearch}
          activeOpacity={0.8}
        >
          <View style={[
            styles.modernBottomIconWrapper, 
            styles.modernBottomIconWrapperActive,
            { backgroundColor: theme.colors.primary }
          ]}>
            <SearchIcon size={26} color="#FFFFFF" strokeWidth={2.5} />
          </View>
          <Text style={[styles.modernBottomText, { color: theme.colors.primary, fontFamily: theme.fontFamily.semibold }]}>
            Szukaj
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.modernBottomItem, { opacity: 0.7 }]}
          onPress={handleGoSaved}
          activeOpacity={0.8}
        >
          <View style={styles.modernBottomIconWrapper}>
            <Bookmark size={24} color={theme.colors.text} strokeWidth={2} />
          </View>
          <Text style={[styles.modernBottomText, { color: theme.colors.text, fontFamily: theme.fontFamily.medium }]}>
            Zapisane
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.modernBottomItem, { opacity: 0.7 }]}
          onPress={handleGoHome}
          activeOpacity={0.8}
        >
          <View style={styles.modernBottomIconWrapper}>
            <Home size={24} color={theme.colors.text} strokeWidth={2} />
          </View>
          <Text style={[styles.modernBottomText, { color: theme.colors.text, fontFamily: theme.fontFamily.medium }]}>
            Główna
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.modernBottomItem, { opacity: 0.7 }]}
          onPress={handleGoNotifications}
          activeOpacity={0.8}
        >
          <View style={styles.modernBottomIconWrapper}>
            <Bell size={24} color={theme.colors.text} strokeWidth={2} />
            {unreadCount > 0 && (
              <View style={[styles.modernBadge, { backgroundColor: theme.colors.notification }]}>
                <Text style={[styles.modernBadgeText, { fontFamily: theme.fontFamily.bold }]}>
                  {unreadCount > 9 ? '9+' : unreadCount.toString()}
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.modernBottomText, { color: theme.colors.text, fontFamily: theme.fontFamily.medium }]}>
            Powiadomienia
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.modernBottomItem, { opacity: 0.7 }]}
          onPress={handleGoSettings}
          activeOpacity={0.8}
        >
          <View style={styles.modernBottomIconWrapper}>
            <Settings size={24} color={theme.colors.text} strokeWidth={2} />
          </View>
          <Text style={[styles.modernBottomText, { color: theme.colors.text, fontFamily: theme.fontFamily.medium }]}>
            Ustawienia
          </Text>
        </TouchableOpacity>
      </View>
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
    paddingBottom: 150, // Extra padding for tab bar
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
  filterSection: {
    padding: 16,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  filterScrollContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
     filterChip: {
     flexDirection: 'row',
     alignItems: 'center',
     paddingHorizontal: 12,
     paddingVertical: 8,
     borderWidth: 1,
     borderRadius: 20,
     marginRight: 8,
     marginBottom: 8,
   },
   filterChipText: {
     fontSize: 14,
     fontWeight: '500',
     marginLeft: 6,
   },
   emptyFiltersContainer: {
     width: '100%',
     marginTop: 24,
   },
   clearFiltersButton: {
     alignSelf: 'center',
     paddingHorizontal: 16,
     paddingVertical: 10,
     borderWidth: 1,
     borderColor: 'rgba(0,0,0,0.1)',
     borderRadius: 20,
     marginTop: 16,
   },
      clearFiltersText: {
     fontSize: 14,
     fontWeight: '600',
   },
     // Header styles - positioned lower for notch compatibility
  searchHeader: {
    paddingTop: Platform.OS === 'ios' ? 60 : 20, // Extra padding for iOS notch
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    backgroundColor: 'rgba(248, 250, 252, 0.8)',
  },
  headerLogo: {
    width: 140,
    height: 38,
  },
   // Enhanced Modern Bottom Bar Styles
   modernBottomBar: {
     position: 'absolute',
     bottom: 0,
     left: 0,
     right: 0,
     flexDirection: 'row',
     paddingHorizontal: 8,
     paddingBottom: Platform.select({
       ios: 28,
       android: 20,
       default: 20,
     }),
     paddingTop: 12,
     borderTopWidth: 0,
     borderTopLeftRadius: 28,
     borderTopRightRadius: 28,
     height: Platform.select({
       ios: 100,
       android: 88,
       default: 88
     }),
     shadowColor: '#000',
     shadowOffset: { width: 0, height: -4 },
     shadowOpacity: 0.15,
     shadowRadius: 12,
     elevation: 12,
   },
   modernBottomItem: {
     flex: 1,
     alignItems: 'center',
     justifyContent: 'center',
     paddingVertical: 6,
   },
   modernBottomItemActive: {
     opacity: 1,
   },
   modernBottomIconWrapper: {
     width: 48,
     height: 48,
     borderRadius: 24,
     alignItems: 'center',
     justifyContent: 'center',
     marginBottom: 4,
     position: 'relative',
   },
   modernBottomIconWrapperActive: {
     shadowColor: '#224996',
     shadowOffset: { width: 0, height: 4 },
     shadowOpacity: 0.3,
     shadowRadius: 8,
     elevation: 6,
   },
   modernBottomText: {
     fontSize: 11,
     fontWeight: '600',
     letterSpacing: 0.1,
   },
   modernBadge: {
     position: 'absolute',
     top: -4,
     right: -4,
     minWidth: 22,
     height: 22,
     borderRadius: 11,
     alignItems: 'center',
     justifyContent: 'center',
     paddingHorizontal: 6,
     borderWidth: 2,
     borderColor: '#FFFFFF',
   },
   modernBadgeText: {
     color: '#FFFFFF',
     fontSize: 11,
     fontWeight: '700',
   },
 });