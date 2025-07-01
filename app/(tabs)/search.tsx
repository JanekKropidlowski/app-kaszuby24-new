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
import { Search as SearchIcon, MapPin, Calendar, Heart, TrendingUp, Clock, Filter } from 'lucide-react-native';
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
  const { regionId } = useLocalSearchParams();
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
  const [regionName, setRegionName] = useState<string>('');
  
  // Filter states
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter options
  const regions = [
    { id: 'wejherowo', name: 'Wejherowo', icon: MapPin },
    { id: 'trojmiasto', name: 'Trójmiasto', icon: MapPin },
    { id: 'puck', name: 'Puck', icon: MapPin },
    { id: 'koscierzyna', name: 'Kościerzyna', icon: MapPin },
    { id: 'kartuzy', name: 'Kartuzy', icon: MapPin },
    { id: 'chojnice', name: 'Chojnice', icon: MapPin },
    { id: 'reda', name: 'Reda', icon: MapPin },
    { id: 'lebork', name: 'Lębork', icon: MapPin },
  ];
  
  const categories = [
    { id: 'sport', name: 'Sport', icon: Heart, color: '#FF6B6B' },
    { id: 'kultura', name: 'Kultura', icon: Calendar, color: '#4ECDC4' },
    { id: 'biznes', name: 'Biznes', icon: TrendingUp, color: '#FFE66D' },
    { id: 'wydarzenia', name: 'Wydarzenia', icon: Clock, color: '#A8E6CF' },
  ];
  
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

  // Filter handlers
  const handleRegionFilter = (regionId: string) => {
    setSelectedRegion(selectedRegion === regionId ? '' : regionId);
    // Perform search with region filter
    const regionName = regions.find(r => r.id === regionId)?.name || '';
    if (regionName && selectedRegion !== regionId) {
      handleSearch(`region:${regionName}`);
    } else if (selectedRegion === regionId) {
      handleSearch('');
    }
  };

  const handleCategoryFilter = (categoryId: string) => {
    setSelectedCategory(selectedCategory === categoryId ? '' : categoryId);
    // Perform search with category filter
    const categoryName = categories.find(c => c.id === categoryId)?.name || '';
    if (categoryName && selectedCategory !== categoryId) {
      handleSearch(`category:${categoryName}`);
    } else if (selectedCategory === categoryId) {
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
    paddingBottom: 140, // Extra padding for tab bar
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
});