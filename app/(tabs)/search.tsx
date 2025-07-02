import React, { useState, useEffect, useCallback } from 'react';
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
  SafeAreaView
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { 
  Search as SearchIcon, 
  MapPin, 
  Calendar, 
  Heart, 
  TrendingUp, 
  Clock, 
  Filter, 
  Home, 
  Users,
  Briefcase,
  Star,
  X,
  Zap
} from 'lucide-react-native';
import { Image } from 'expo-image';
import { searchArticles, fetchArticles } from '@/services/api';
import { Article } from '@/types/article';
import ArticleCard from '@/components/ArticleCard';
import EmptyState from '@/components/EmptyState';
import LoadingIndicator from '@/components/LoadingIndicator';
import { useThemeStore } from '@/store/themeStore';
import { useArticlesStore } from '@/store/articlesStore';
import { filterSponsoredArticles } from '@/utils/contentFilter';

// Simplified categories for quick access
const QUICK_CATEGORIES = [
  { id: '', name: 'Wszystkie', icon: Star, color: '#3B82F6' },
  { id: 'sport', name: 'Sport', icon: Zap, color: '#EF4444' },
  { id: 'kultura', name: 'Kultura', icon: Heart, color: '#8B5CF6' },
  { id: 'biznes', name: 'Biznes', icon: Briefcase, color: '#059669' },
  { id: 'wydarzenia', name: 'Wydarzenia', icon: Calendar, color: '#F59E0B' },
  { id: 'spoleczne', name: 'Społeczne', icon: Users, color: '#EC4899' },
];

// Simplified regions
const QUICK_REGIONS = [
  { id: '', name: 'Wszystkie', icon: MapPin },
  { id: 'gdansk', name: 'Gdańsk', icon: MapPin },
  { id: 'sopot', name: 'Sopot', icon: MapPin },
  { id: 'gdynia', name: 'Gdynia', icon: MapPin },
  { id: 'kaszuby', name: 'Kaszuby', icon: MapPin },
];

// Sort options
const SORT_OPTIONS = [
  { id: 'date', name: 'Najnowsze', icon: Clock },
  { id: 'relevance', name: 'Trafność', icon: Star },
  { id: 'popularity', name: 'Popularne', icon: TrendingUp },
];

export default function SearchScreen() {
  const router = useRouter();
  const { regionId } = useLocalSearchParams();
  const { theme } = useThemeStore();
  const { addRecentArticle } = useArticlesStore();
  
  const [query, setQuery] = useState('');
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedSort, setSelectedSort] = useState('date');
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const handleSearch = async (searchQuery: string = query) => {
    if (!searchQuery.trim() && !selectedCategory && !selectedRegion) {
      setArticles([]);
      return;
    }
    
    try {
      setLoading(true);
      
      let searchParams = searchQuery.trim();
      if (selectedCategory) {
        searchParams += ` category:${selectedCategory}`;
      }
      if (selectedRegion) {
        searchParams += ` region:${selectedRegion}`;
      }
      
      const { articles: searchResults, totalPages } = await searchArticles(searchParams || ' ', 1);
      const filteredResults = filterSponsoredArticles(searchResults);
      
      // Apply sorting
      const sortedResults = applySorting(filteredResults, selectedSort);
      
      setArticles(sortedResults);
      setTotalPages(totalPages);
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
        return sorted.sort((a, b) => (b.views || 0) - (a.views || 0));
      case 'relevance':
      default:
        return sorted;
    }
  };
  
  const handleLoadMore = async () => {
    if (page >= totalPages || loadingMore || (!query.trim() && !selectedCategory && !selectedRegion)) return;
    
    try {
      setLoadingMore(true);
      
      const nextPage = page + 1;
      let searchParams = query.trim();
      if (selectedCategory) {
        searchParams += ` category:${selectedCategory}`;
      }
      if (selectedRegion) {
        searchParams += ` region:${selectedRegion}`;
      }
      
      const { articles: moreResults } = await searchArticles(searchParams || ' ', nextPage);
      const filteredResults = filterSponsoredArticles(moreResults);
      const sortedResults = applySorting(filteredResults, selectedSort);
      
      setArticles((prev) => [...prev, ...sortedResults]);
      setPage(nextPage);
    } catch (err) {
      console.error('Error loading more search results:', err);
    } finally {
      setLoadingMore(false);
    }
  };
  
  const handleArticlePress = (article: Article) => {
    addRecentArticle(article);
  };
  
  const handleCategoryPress = (categoryId: string) => {
    setSelectedCategory(categoryId);
    handleSearch();
  };
  
  const handleRegionPress = (regionId: string) => {
    setSelectedRegion(regionId);
    handleSearch();
  };
  
  const handleSortPress = (sortId: string) => {
    setSelectedSort(sortId);
    if (articles.length > 0) {
      const sorted = applySorting(articles, sortId);
      setArticles(sorted);
    }
  };
  
  const clearAllFilters = () => {
    setSelectedCategory('');
    setSelectedRegion('');
    setSelectedSort('date');
    setQuery('');
    setArticles([]);
  };
  
  // Load initial content when filters change
  useEffect(() => {
    if (selectedCategory || selectedRegion) {
      handleSearch();
    }
  }, [selectedCategory, selectedRegion]);
  
  // Handle initial region if provided
  useEffect(() => {
    if (regionId && typeof regionId === 'string') {
      setSelectedRegion(regionId);
    }
  }, [regionId]);
  
  const renderFilterChips = (items: any[], selectedId: string, onPress: (id: string) => void, showIcon = true) => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterScrollContent}
    >
      {items.map((item) => {
        const isSelected = selectedId === item.id;
        return (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.filterChip,
              {
                backgroundColor: isSelected ? theme.colors.primary : theme.colors.card,
                borderColor: isSelected ? theme.colors.primary : theme.colors.border,
              }
            ]}
            onPress={() => onPress(item.id)}
          >
            {showIcon && (
              <item.icon 
                size={16} 
                color={isSelected ? '#FFFFFF' : (item.color || theme.colors.primary)} 
              />
            )}
            <Text style={[
              styles.filterChipText,
              {
                color: isSelected ? '#FFFFFF' : theme.colors.text,
                fontFamily: isSelected ? theme.fontFamily.semibold : theme.fontFamily.medium,
                marginLeft: showIcon ? 6 : 0
              }
            ]}>
              {item.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
  
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconContainer, { backgroundColor: theme.colors.subtle }]}>
        <SearchIcon size={40} color={theme.colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.colors.text, fontFamily: theme.fontFamily.bold }]}>
        Wyszukaj interesujące artykuły
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary, fontFamily: theme.fontFamily.regular }]}>
        Wpisz słowa kluczowe lub wybierz kategorię i region poniżej
      </Text>
    </View>
  );
  
  const hasActiveFilters = selectedCategory || selectedRegion || query.trim();
  const activeFiltersCount = [selectedCategory, selectedRegion, query.trim()].filter(Boolean).length;
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header with Logo */}
      <View style={[styles.header, { backgroundColor: theme.colors.background }]}>
        <View style={styles.logoContainer}>
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
        
        {/* Search Bar */}
        <View style={[
          styles.searchContainer,
          { 
            backgroundColor: theme.colors.card,
            borderColor: showSuggestions ? theme.colors.primary : theme.colors.border,
            shadowColor: theme.colors.shadow
          }
        ]}>
          <SearchIcon size={20} color={theme.colors.primary} />
          <TextInput
            style={[
              styles.searchInput,
              { 
                color: theme.colors.text,
                fontFamily: theme.fontFamily.medium
              }
            ]}
            placeholder="Wyszukaj artykuły, tematy..."
            placeholderTextColor={theme.colors.textSecondary}
            value={query}
            onChangeText={setQuery}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setShowSuggestions(false)}
            onSubmitEditing={() => handleSearch()}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} style={styles.clearButton}>
              <X size={16} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {/* Filters */}
      <View style={[styles.filtersContainer, { backgroundColor: theme.colors.background }]}>
        {/* Categories */}
        <View style={styles.filterSection}>
          <Text style={[styles.filterTitle, { color: theme.colors.text, fontFamily: theme.fontFamily.semibold }]}>
            📂 Kategorie
          </Text>
          {renderFilterChips(QUICK_CATEGORIES, selectedCategory, handleCategoryPress)}
        </View>
        
        {/* Regions */}
        <View style={styles.filterSection}>
          <Text style={[styles.filterTitle, { color: theme.colors.text, fontFamily: theme.fontFamily.semibold }]}>
            📍 Regiony
          </Text>
          {renderFilterChips(QUICK_REGIONS, selectedRegion, handleRegionPress)}
        </View>
        
        {/* Sort + Clear */}
        <View style={styles.filterSection}>
          <View style={styles.sortAndClearContainer}>
            <View style={styles.sortContainer}>
              <Text style={[styles.filterTitle, { color: theme.colors.text, fontFamily: theme.fontFamily.semibold }]}>
                🔥 Sortuj
              </Text>
              {renderFilterChips(SORT_OPTIONS, selectedSort, handleSortPress, false)}
            </View>
            
            {activeFiltersCount > 0 && (
              <TouchableOpacity
                style={[styles.clearFiltersButton, { backgroundColor: theme.colors.primary }]}
                onPress={clearAllFilters}
              >
                <X size={16} color="#FFFFFF" />
                <Text style={[styles.clearFiltersText, { fontFamily: theme.fontFamily.medium }]}>
                  Wyczyść ({activeFiltersCount})
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
      
      {/* Results */}
      {loading ? (
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
          ListHeaderComponent={
            hasActiveFilters && articles.length > 0 ? (
              <View style={[styles.resultsHeader, { backgroundColor: theme.colors.subtle }]}>
                <Text style={[
                  styles.resultsText, 
                  { 
                    color: theme.colors.text,
                    fontFamily: theme.fontFamily.semibold
                  }
                ]}>
                  Znaleziono {articles.length} wyników
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            hasActiveFilters ? (
              <EmptyState
                title="Nie znaleziono wyników"
                message="Spróbuj zmienić filtry lub wyszukiwaną frazę."
                icon={<SearchIcon size={48} color={theme.colors.primary} />}
              />
            ) : renderEmptyState()
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  // Header Styles
  header: {
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLogo: {
    width: 120,
    height: 32,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 50,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    marginLeft: 12,
    fontSize: 16,
  },
  clearButton: {
    padding: 8,
  },
  
  // Filters Styles
  filtersContainer: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  filterSection: {
    marginBottom: 16,
  },
  filterTitle: {
    fontSize: 16,
    marginBottom: 12,
    marginLeft: 20,
  },
  filterScrollContent: {
    paddingHorizontal: 20,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    marginRight: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  filterChipText: {
    fontSize: 14,
  },
  sortAndClearContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  sortContainer: {
    flex: 1,
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginLeft: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  clearFiltersText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginLeft: 6,
  },
  
  // Results Styles
  resultsHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  resultsText: {
    fontSize: 16,
  },
  
  // Empty State Styles
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    textAlign: 'center',
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.8,
  },
  
  // List Styles
  listContent: {
    paddingBottom: 20,
  },
});