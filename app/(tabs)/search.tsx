import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  ScrollView,
  TextInput,
  TouchableWithoutFeedback,
  Pressable
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { 
  ChevronRight, 
  RefreshCw, 
  WifiOff, 
  ArrowRight, 
  Heart, 
  Home, 
  Bell, 
  Search as SearchIcon, 
  Bookmark, 
  Settings,
  Eye,
  TrendingUp,
  Clock,
  Calendar,
  MapPin,
  XCircle
} from 'lucide-react-native';
import { Image } from 'expo-image';
import { searchArticles, fetchArticles, fetchFilteredArticles } from '@/services/api';
import { Article } from '@/types/article';
import ArticleCard from '@/components/ArticleCard';
import EmptyState from '@/components/EmptyState';
import LoadingIndicator from '@/components/LoadingIndicator';
import SkeletonLoader from '@/components/SkeletonLoader';
import { useThemeStore } from '@/store/themeStore';
import { useArticlesStore } from '@/store/articlesStore';
import { filterSponsoredArticles } from '@/utils/contentFilter';

// Real categories from your system
const CATEGORIES = [
  { id: '', name: 'Wszystkie', icon: Heart },
  { id: '17', name: 'Bezpieczeństwo', icon: Eye },
  { id: '11', name: 'Biznes', icon: Home },
  { id: '24', name: 'Sport', icon: TrendingUp },
  { id: '22', name: 'Religia', icon: Bell },
  { id: '2246', name: 'Zdrowie', icon: RefreshCw },
  { id: '49', name: 'Nauka', icon: Calendar },
  { id: '16', name: 'Kultura', icon: ArrowRight },
];

// Real regions from your system
const REGIONS = [
  { id: '', name: 'Wszystkie regiony' },
  { id: '65556', name: 'Chojnice' },
  { id: '626', name: 'Gmina Puck' },
  { id: '65545', name: 'Kartuzy' },
  { id: '65546', name: 'Kościerzyna' },
  { id: '66165', name: 'Kraj' },
  { id: '65558', name: 'Lębork' },
  { id: '2128', name: 'Puck' },
  { id: '7', name: 'Trójmiasto' },
  { id: '2583', name: 'Wejherowo' },
  { id: '76797', name: 'Reda' },
];

// Sort options
const SORT_OPTIONS = [
  { id: 'date', name: 'Najnowsze', icon: Clock },
  { id: 'relevance', name: 'Trafność', icon: Heart },
  { id: 'popularity', name: 'Popularne', icon: TrendingUp },
];

export default function SearchScreen() {
  const router = useRouter();
  const { regionId } = useLocalSearchParams();
  const { theme } = useThemeStore();
  const { addRecentArticle } = useArticlesStore();
  const insets = useSafeAreaInsets();
  
  const [query, setQuery] = useState('');
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedSort, setSelectedSort] = useState('date');
  const [showRegionSelect, setShowRegionSelect] = useState(false);
  const [showSortSelect, setShowSortSelect] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // Close all dropdowns
  const closeAllDropdowns = useCallback(() => {
    setShowRegionSelect(false);
    setShowSortSelect(false);
  }, []);
  
  // Debounced search function
  const debouncedSearch = useCallback((searchQuery: string) => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    const timeout = setTimeout(() => {
      handleSearch(searchQuery);
    }, 500); // 500ms delay
    
    setSearchTimeout(timeout);
  }, [searchTimeout]);
  
  const handleSearch = async (searchQuery: string = query) => {
    const trimmedQuery = searchQuery.trim();
    
    if (!trimmedQuery && !selectedCategory && !selectedRegion) {
      setArticles([]);
      return;
    }
    
    try {
      setLoading(true);
      closeAllDropdowns(); // Close dropdowns when searching
      
      let results;
      
      // Use new API if region or category selected
      if ((selectedCategory && selectedCategory !== '') || (selectedRegion && selectedRegion !== '')) {
        // Ensure we have at least one valid filter
        const regionFilter = selectedRegion && selectedRegion !== '' ? selectedRegion : undefined;
        const categoryFilter = selectedCategory && selectedCategory !== '' ? selectedCategory : undefined;
        
        if (regionFilter || categoryFilter) {
          results = await fetchFilteredArticles(1, 20, regionFilter, categoryFilter);
        } else {
          // Fallback to general articles if no valid filters
          results = await fetchArticles(1, 20);
        }
      } else if (trimmedQuery) {
        // Use text search
        results = await searchArticles(trimmedQuery, 1);
      } else {
        // Fallback to general articles
        results = await fetchArticles(1, 20);
      }
      
      let filteredResults = filterSponsoredArticles(results.articles || []);
      
      // Apply sorting
      filteredResults = applySorting(filteredResults, selectedSort);
      
      setArticles(filteredResults);
      setTotalPages(results.totalPages || 1);
      setPage(1);
    } catch (err) {
      console.error('Error searching articles:', err);
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };
  
  const applySorting = (articles: Article[], sortType: string): Article[] => {
    const sorted = [...articles];
    switch (sortType) {
      case 'date':
        return sorted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      case 'popularity':
        return sorted.sort((a, b) => {
          const aViews = parseInt(a.meta?.views || '0');
          const bViews = parseInt(b.meta?.views || '0');
          return bViews - aViews;
        });
      case 'relevance':
      default:
        return sorted;
    }
  };
  
  const handleLoadMore = async () => {
    if (page >= totalPages || loadingMore) return;
    
    try {
      setLoadingMore(true);
      
      const nextPage = page + 1;
      let results;
      
      // Use new API if region or category selected
      if ((selectedCategory && selectedCategory !== '') || (selectedRegion && selectedRegion !== '')) {
        // Ensure we have at least one valid filter
        const regionFilter = selectedRegion && selectedRegion !== '' ? selectedRegion : undefined;
        const categoryFilter = selectedCategory && selectedCategory !== '' ? selectedCategory : undefined;
        
        if (regionFilter || categoryFilter) {
          results = await fetchFilteredArticles(nextPage, 20, regionFilter, categoryFilter);
        } else {
          // Fallback to general articles if no valid filters
          results = await fetchArticles(nextPage, 20);
        }
      } else if (query.trim()) {
        results = await searchArticles(query.trim(), nextPage);
      } else {
        results = await fetchArticles(nextPage, 20);
      }
      
      let filteredResults = filterSponsoredArticles(results.articles || []);
      
      // Apply sorting
      filteredResults = applySorting(filteredResults, selectedSort);
      setArticles((prev) => [...prev, ...filteredResults]);
      setPage(nextPage);
    } catch (err) {
      console.error('Error loading more search results:', err);
    } finally {
      setLoadingMore(false);
    }
  };
  
  const handleArticlePress = (article: Article) => {
    addRecentArticle(article);
    router.push(`/article/${article.id}`);
  };
  
  const handleCategoryPress = async (categoryId: string) => {
    console.log('Category pressed:', categoryId);
    
    // Close dropdowns first
    closeAllDropdowns();
    
    // Update state
    setSelectedCategory(categoryId);
    
    // Force immediate search for the category
    if (categoryId) {
      // Clear current results first
      setArticles([]);
      setLoading(true);
      
      try {
        // Ensure we have at least one valid filter
        const regionFilter = selectedRegion && selectedRegion !== '' ? selectedRegion : undefined;
        const categoryFilter = categoryId && categoryId !== '' ? categoryId : undefined;
        
        if (regionFilter || categoryFilter) {
          const results = await fetchFilteredArticles(1, 20, regionFilter, categoryFilter);
          let filteredResults = filterSponsoredArticles(results.articles || []);
          
          // Apply sorting
          filteredResults = applySorting(filteredResults, selectedSort);
          
          setArticles(filteredResults);
          setTotalPages(results.totalPages || 1);
          setPage(1);
        } else {
          setArticles([]);
        }
      } catch (err) {
        console.error('Error searching by category:', err);
        setArticles([]);
      } finally {
        setLoading(false);
      }
    } else {
      setArticles([]);
    }
  };
  
  const handleRegionPress = async (regionId: string) => {
    console.log('Region pressed:', regionId);
    
    // Close dropdowns first
    closeAllDropdowns();
    
    // Update state
    setSelectedRegion(regionId);
    
    // Force immediate search if we have active filters
    if (regionId || selectedCategory || query.trim()) {
      // Clear current results first
      setArticles([]);
      setLoading(true);
      
      try {
        // Ensure we have at least one valid filter
        const regionFilter = regionId && regionId !== '' ? regionId : undefined;
        const categoryFilter = selectedCategory && selectedCategory !== '' ? selectedCategory : undefined;
        
        if (regionFilter || categoryFilter) {
          const results = await fetchFilteredArticles(1, 20, regionFilter, categoryFilter);
          let filteredResults = filterSponsoredArticles(results.articles || []);
          
          // Apply sorting
          filteredResults = applySorting(filteredResults, selectedSort);
          
          setArticles(filteredResults);
          setTotalPages(results.totalPages || 1);
          setPage(1);
        } else {
          setArticles([]);
        }
      } catch (err) {
        console.error('Error searching by region:', err);
        setArticles([]);
      } finally {
        setLoading(false);
      }
    } else {
      setArticles([]);
    }
  };
  
  const handleSortPress = (sortId: string) => {
    setSelectedSort(sortId);
    setShowSortSelect(false);
    if (articles.length > 0) {
      const sorted = applySorting(articles, sortId);
      setArticles(sorted);
    }
  };
  
  const clearFilters = () => {
    setSelectedCategory('');
    setSelectedRegion('');
    setSelectedSort('date');
    setQuery('');
    setArticles([]);
    closeAllDropdowns();
    
    // Clear any pending search
    if (searchTimeout) {
      clearTimeout(searchTimeout);
      setSearchTimeout(null);
    }
  };
  
  // Handle query changes with debounce
  const handleQueryChange = useCallback((text: string) => {
    setQuery(text);
    if (text.trim()) {
      debouncedSearch(text);
    } else {
      setArticles([]);
    }
  }, [debouncedSearch]);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);
  
  // Handle initial region if provided
  useEffect(() => {
    if (regionId && typeof regionId === 'string') {
      setSelectedRegion(regionId);
    }
  }, [regionId]);
  
  const hasActiveFilters = selectedCategory || selectedRegion || query.trim();
  const selectedRegionName = REGIONS.find(r => r.id === selectedRegion)?.name || 'Wszystkie regiony';
  const selectedSortName = SORT_OPTIONS.find(s => s.id === selectedSort)?.name || 'Najnowsze';
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Compact Header */}
      <View style={[styles.header, { 
        backgroundColor: theme.colors.background,
        paddingTop: insets.top // Dodany bezpieczny margines od góry
      }]}>
        <Image
          source={{ 
            uri: theme.isDarkMode 
              ? 'http://kaszuby24.pl/wp-content/uploads/2025/07/Bez-nazwy-2-01-1-scaled.png'
              : 'http://kaszuby24.pl/wp-content/uploads/2025/07/Bez-nazwy-2-01-scaled.png'
          }}
          style={styles.logo}
          contentFit="contain"
        />
        
        {/* Search Bar */}
        <View style={[
          styles.searchContainer,
          { 
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border
          }
        ]}>
          <SearchIcon size={18} color={theme.colors.textSecondary} />
          <TextInput
            style={[
              styles.searchInput,
              { 
                color: theme.colors.text,
                fontFamily: theme.fontFamily.regular
              }
            ]}
            placeholder="Wyszukaj artykuły..."
            placeholderTextColor={theme.colors.textSecondary}
            value={query}
            onChangeText={handleQueryChange}
            onSubmitEditing={() => handleSearch()}
            returnKeyType="search"
          />
          {/* Usunięto przycisk X - użytkownik może wyczyścić pole przez usunięcie tekstu */}
        </View>
      </View>
      
      {/* Filters */}
      <TouchableWithoutFeedback onPress={closeAllDropdowns}>
        <View style={[styles.filtersContainer, { backgroundColor: theme.colors.background }]}>
          {/* Categories Row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersContent}>
          {CATEGORIES.map((category) => {
            const isSelected = selectedCategory === category.id;
            return (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isSelected ? theme.colors.primary : theme.colors.card,
                    borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                  }
                ]}
                activeOpacity={0.8}
                onPress={() => handleCategoryPress(category.id)}
              >
                <category.icon 
                  size={14} 
                  color={isSelected ? '#FFFFFF' : theme.colors.primary} 
                />
                <Text style={[
                  styles.filterChipText,
                  {
                    color: isSelected ? '#FFFFFF' : theme.colors.text,
                    fontFamily: theme.fontFamily.medium,
                  }
                ]}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            );
          })}
          
          {hasActiveFilters && (
            <TouchableOpacity
              style={[styles.clearButton, { backgroundColor: theme.colors.notification }]}
              activeOpacity={0.8}
              onPress={clearFilters}
            >
              <XCircle size={14} color="#FFFFFF" />
              <Text style={[styles.clearButtonText, { fontFamily: theme.fontFamily.medium }]}>
                Wyczyść
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
        
        {/* Region & Sort Row */}
        <View style={styles.selectsRow}>
          {/* Region Select */}
          <View style={styles.selectColumn}>
            <TouchableOpacity
              style={[
                styles.selectButton,
                { 
                  backgroundColor: theme.colors.card,
                  borderColor: selectedRegion ? theme.colors.primary : theme.colors.border,
                }
              ]}
              activeOpacity={0.7}
              onPress={() => {
                // Close other dropdowns first
                setShowSortSelect(false);
                // Toggle this dropdown
                setShowRegionSelect(prev => !prev);
              }}
            >
              <MapPin size={16} color={selectedRegion ? theme.colors.primary : theme.colors.textSecondary} />
              <Text style={[
                styles.selectButtonText,
                { 
                  color: selectedRegion ? theme.colors.primary : theme.colors.text,
                  fontFamily: theme.fontFamily.medium,
                }
              ]}>
                {selectedRegionName}
              </Text>
              <ChevronRight size={16} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            
            {showRegionSelect && (
              <View style={[
                styles.dropdown,
                { 
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                  shadowColor: theme.colors.shadow
                }
              ]}>
                <ScrollView 
                  style={styles.dropdownScrollView}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                  onTouchStart={(e) => e.stopPropagation()}
                >
                  {REGIONS.map((region) => (
                    <TouchableOpacity
                      key={region.id}
                      style={[
                        styles.dropdownItem,
                        { backgroundColor: selectedRegion === region.id ? theme.colors.subtle : 'transparent' }
                      ]}
                      activeOpacity={0.8}
                      onPress={() => handleRegionPress(region.id)}
                    >
                      <MapPin size={14} color={theme.colors.primary} />
                      <Text style={[
                        styles.dropdownItemText,
                        { 
                          color: theme.colors.text,
                          fontFamily: selectedRegion === region.id ? theme.fontFamily.semibold : theme.fontFamily.regular
                        }
                      ]}>
                        {region.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
          
          {/* Sort Select */}
          <View style={styles.selectColumn}>
            <TouchableOpacity
              style={[
                styles.selectButton,
                { 
                  backgroundColor: theme.colors.card,
                  borderColor: selectedSort !== 'date' ? theme.colors.primary : theme.colors.border,
                }
              ]}
              activeOpacity={0.7}
              onPress={() => {
                // Close other dropdowns first
                setShowRegionSelect(false);
                // Toggle this dropdown
                setShowSortSelect(prev => !prev);
              }}
            >
              <Clock size={16} color={selectedSort !== 'date' ? theme.colors.primary : theme.colors.textSecondary} />
              <Text style={[
                styles.selectButtonText,
                { 
                  color: selectedSort !== 'date' ? theme.colors.primary : theme.colors.text,
                  fontFamily: theme.fontFamily.medium,
                }
              ]}>
                {selectedSortName}
              </Text>
              <ChevronRight size={16} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            
            {showSortSelect && (
              <View style={[
                styles.dropdown,
                { 
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                  shadowColor: theme.colors.shadow
                }
              ]}>
                <ScrollView 
                  style={styles.dropdownScrollView}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                  onTouchStart={(e) => e.stopPropagation()}
                >
                  {SORT_OPTIONS.map((sort) => (
                    <TouchableOpacity
                      key={sort.id}
                      style={[
                        styles.dropdownItem,
                        { backgroundColor: selectedSort === sort.id ? theme.colors.subtle : 'transparent' }
                      ]}
                      activeOpacity={0.8}
                      onPress={() => handleSortPress(sort.id)}
                    >
                      <sort.icon size={14} color={theme.colors.primary} />
                      <Text style={[
                        styles.dropdownItemText,
                        { 
                          color: theme.colors.text,
                          fontFamily: selectedSort === sort.id ? theme.fontFamily.semibold : theme.fontFamily.regular
                        }
                      ]}>
                        {sort.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        </View>
        </View>
      </TouchableWithoutFeedback>
      
      {/* Results */}
      {loading ? (
        <SkeletonLoader type="search" count={5} immediate={true} />
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
          ListHeaderComponent={
            articles.length > 0 ? (
              <View style={[styles.resultsHeader, { backgroundColor: theme.colors.subtle }]}>
                <Text style={[
                  styles.resultsText, 
                  { 
                    color: theme.colors.text,
                    fontFamily: theme.fontFamily.medium
                  }
                ]}>
                  {articles.length} wyników
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            hasActiveFilters ? (
              <EmptyState
                title="Nie znaleziono wyników"
                message="Spróbuj innej kategorii lub frazy"
                icon={<SearchIcon size={48} color={theme.colors.primary} />}
              />
            ) : (
              <View style={styles.emptyContainer}>
                <SearchIcon size={64} color={theme.colors.primary} />
                <Text style={[styles.emptyTitle, { color: theme.colors.text, fontFamily: theme.fontFamily.semibold }]}>
                  Wyszukaj artykuły
                </Text>
                <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary, fontFamily: theme.fontFamily.regular }]}>
                  Wybierz kategorię lub wpisz frazę
                </Text>
              </View>
            )
          }
          ListFooterComponent={
            loadingMore ? <LoadingIndicator size="small" /> : null
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={Platform.OS === 'android'}
          initialNumToRender={10}
          maxToRenderPerBatch={5}
          updateCellsBatchingPeriod={50}
          windowSize={10}
          // Close dropdowns when scrolling
          onScrollBeginDrag={closeAllDropdowns}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  // Compact Header
  header: {
    paddingTop: 0, // Usunięty niepotrzebny padding dla status bara
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  logo: {
    width: Platform.OS === 'ios' ? 100 : 110, // Slightly larger on Android
    height: Platform.OS === 'ios' ? 28 : 32, // Slightly taller on Android
    alignSelf: 'center',
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: Platform.OS === 'ios' ? 44 : 48, // Slightly taller on Android for better touch target
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: Platform.OS === 'android' ? 15 : 15,
  },
  
  // Filters
  filtersContainer: {
    paddingTop: Platform.OS === 'android' ? 16 : 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    zIndex: 1000,
  },
  filtersContent: {
    paddingHorizontal: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Platform.OS === 'ios' ? 12 : 14, // Slightly more padding on Android
    paddingVertical: Platform.OS === 'ios' ? 10 : 12, // Slightly more padding on Android
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    minHeight: Platform.OS === 'ios' ? 36 : 40, // Better touch target on Android
  },
  filterChipText: {
    fontSize: Platform.OS === 'android' ? 13 : 13,
    marginLeft: 4,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 4,
  },
  clearButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    marginLeft: 4,
  },
  
  // Selects Row
  selectsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    zIndex: 999,
  },
  selectColumn: {
    flex: 1,
    position: 'relative',
    zIndex: 1000,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Platform.OS === 'ios' ? 12 : 14, // More padding on Android
    paddingVertical: Platform.OS === 'ios' ? 12 : 14, // More padding on Android
    borderRadius: 12,
    borderWidth: 1,
    minHeight: Platform.OS === 'ios' ? 48 : 52, // Better touch target on Android
  },
  selectButtonText: {
    flex: 1,
    fontSize: Platform.OS === 'android' ? 14 : 14,
    marginLeft: 8,
  },
  dropdown: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 54,
    left: 0,
    right: 0,
    borderRadius: 12,
    borderWidth: 1,
    maxHeight: 200,
    zIndex: 99999,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
    overflow: 'hidden',
  },
  dropdownScrollView: {
    maxHeight: 200,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    minHeight: 44, // Better touch target
  },
  dropdownItemText: {
    fontSize: 14,
    marginLeft: 8,
  },
  
  // Results
  resultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  resultsText: {
    fontSize: 14,
  },
  
  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 20,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    opacity: 0.7,
  },
  
  // List
  listContent: {
    paddingBottom: 20,
  },
});