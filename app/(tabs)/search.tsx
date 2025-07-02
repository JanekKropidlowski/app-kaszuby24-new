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
  Heart, 
  TrendingUp, 
  Clock, 
  Star,
  X,
  Zap,
  Shield,
  Briefcase,
  Trophy,
  Church,
  HeartPulse,
  GraduationCap,
  Palette,
  ChevronDown
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

// Real categories from your system
const CATEGORIES = [
  { id: '', name: 'Wszystkie', icon: Star },
  { id: '17', name: 'Bezpieczeństwo', icon: Shield },
  { id: '11', name: 'Biznes', icon: Briefcase },
  { id: '24', name: 'Sport', icon: Trophy },
  { id: '22', name: 'Religia', icon: Church },
  { id: '2246', name: 'Zdrowie', icon: HeartPulse },
  { id: '49', name: 'Nauka', icon: GraduationCap },
  { id: '16', name: 'Kultura', icon: Palette },
];

// Real regions from your system
const REGIONS = [
  { id: '', name: 'Wszystkie regiony' },
  { id: '2583', name: 'Wejherowo' },
  { id: '7', name: 'Trójmiasto' },
  { id: '2128', name: 'Puck' },
  { id: '76797', name: 'Reda' },
  { id: '65546', name: 'Kościerzyna' },
  { id: '65545', name: 'Kartuzy' },
  { id: '65558', name: 'Lębork' },
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
  const [showRegionSelect, setShowRegionSelect] = useState(false);
  const [showSortSelect, setShowSortSelect] = useState(false);
  
  const handleSearch = async (searchQuery: string = query) => {
    const trimmedQuery = searchQuery.trim();
    
    if (!trimmedQuery && !selectedCategory && !selectedRegion) {
      setArticles([]);
      return;
    }
    
    try {
      setLoading(true);
      
      let results;
      
      if (selectedCategory && selectedCategory !== '') {
        // Use category-based search
        results = await fetchArticles(1, 20, [parseInt(selectedCategory)]);
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
      
      if (selectedCategory && selectedCategory !== '') {
        results = await fetchArticles(nextPage, 20, [parseInt(selectedCategory)]);
      } else if (query.trim()) {
        results = await searchArticles(query.trim(), nextPage);
      } else {
        results = await fetchArticles(nextPage, 20);
      }
      
      let filteredResults = filterSponsoredArticles(results.articles || []);
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
  };
  
  const handleCategoryPress = (categoryId: string) => {
    setSelectedCategory(categoryId);
    if (categoryId) {
      handleSearch('');
    } else {
      setArticles([]);
    }
  };
  
  const handleRegionPress = (regionId: string) => {
    setSelectedRegion(regionId);
    setShowRegionSelect(false);
    if (selectedCategory || query.trim()) {
      handleSearch();
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
  };
  
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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Compact Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.background }]}>
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
            onChangeText={setQuery}
            onSubmitEditing={() => handleSearch()}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <X size={16} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {/* Filters */}
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
              onPress={clearFilters}
            >
              <X size={14} color="#FFFFFF" />
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
              onPress={() => setShowRegionSelect(!showRegionSelect)}
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
              <ChevronDown size={16} color={theme.colors.textSecondary} />
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
                {REGIONS.map((region) => (
                  <TouchableOpacity
                    key={region.id}
                    style={[
                      styles.dropdownItem,
                      { backgroundColor: selectedRegion === region.id ? theme.colors.subtle : 'transparent' }
                    ]}
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
              onPress={() => setShowSortSelect(!showSortSelect)}
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
              <ChevronDown size={16} color={theme.colors.textSecondary} />
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
                {SORT_OPTIONS.map((sort) => (
                  <TouchableOpacity
                    key={sort.id}
                    style={[
                      styles.dropdownItem,
                      { backgroundColor: selectedSort === sort.id ? theme.colors.subtle : 'transparent' }
                    ]}
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
              </View>
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
          onScrollBeginDrag={() => {
            setShowRegionSelect(false);
            setShowSortSelect(false);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  // Compact Header
  header: {
    paddingTop: Platform.OS === 'ios' ? 10 : 15,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  logo: {
    width: 100,
    height: 28,
    alignSelf: 'center',
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
  },
  
  // Filters
  filtersContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  filtersContent: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 13,
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
  },
  selectColumn: {
    flex: 1,
    position: 'relative',
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  selectButtonText: {
    flex: 1,
    fontSize: 14,
    marginLeft: 8,
  },
  dropdown: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    borderRadius: 12,
    borderWidth: 1,
    maxHeight: 200,
    zIndex: 1000,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
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