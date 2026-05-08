import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  XCircle,
  BookOpen
} from 'lucide-react-native';
import { Image } from 'expo-image';
import { searchArticles, fetchArticles, fetchFilteredArticles, searchNekrologi, fetchNekrologi } from '@/services/api';
import { Article, Nekrolog } from '@/types/article';
import { cleanArticleTitle } from '@/utils/htmlEntityCleaner';
import ArticleCard from '@/components/ArticleCard';
import EmptyState from '@/components/EmptyState';
import LoadingIndicator from '@/components/LoadingIndicator';
import SkeletonLoader from '@/components/SkeletonLoader';
import { useThemeStore } from '@/store/themeStore';
import { useArticlesStore } from '@/store/articlesStore';
import { filterSponsoredArticles } from '@/utils/contentFilter';

// Real categories from your system. The `nekrologi` pin is a sentinel — its
// id is not a numeric WP category, so handleCategoryPress detects it and
// flips contentType instead of forwarding it to fetchFilteredArticles.
const NEKROLOGI_PIN_ID = 'nekrologi';
const CATEGORIES = [
  { id: '', name: 'Wszystkie', icon: Heart },
  { id: NEKROLOGI_PIN_ID, name: 'Nekrologi', icon: BookOpen },
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
  { id: '', name: 'Regiony' },
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
  { id: 'date', name: 'Sortowanie', icon: Clock },
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
  const [nekrologi, setNekrologi] = useState<Nekrolog[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedSort, setSelectedSort] = useState('date');
  // Content type filter: 'all' = mix nekrologi every 5th, 'articles' = only
  // articles, 'nekrologi' = only obituaries. Default 'all' so users see
  // both without flipping a setting.
  const [contentType, setContentType] = useState<'all' | 'articles' | 'nekrologi'>('all');
  const [showRegionSelect, setShowRegionSelect] = useState(false);
  const [showSortSelect, setShowSortSelect] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Close all dropdowns
  const closeAllDropdowns = useCallback(() => {
    setShowRegionSelect(false);
    setShowSortSelect(false);
  }, []);

  // Debounced search function
  const debouncedSearch = useCallback((searchQuery: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(searchQuery);
    }, 500);
  }, []);

  const handleSearch = async (searchQuery: string = query) => {
    const trimmedQuery = searchQuery.trim();

    if (!trimmedQuery && !selectedCategory && !selectedRegion) {
      // If no filters, load all articles instead of clearing
      await loadAllArticles();
      return;
    }

    try {
      // Only set main loading if we don't have articles yet or if it's a major filter change
      if (articles.length === 0 && nekrologi.length === 0) {
        setLoading(true);
      } else {
        setLoadingMore(true); // Re-use loadingMore for "fetching updates" state to keep list visible
      }

      closeAllDropdowns(); // Close dropdowns when searching

      // Articles fetch — same as before, but skipped when user filters to "Nekrologi only".
      const articlesPromise: Promise<{ articles: Article[]; totalPages: number }> =
        contentType === 'nekrologi'
          ? Promise.resolve({ articles: [], totalPages: 0 })
          : (selectedCategory || selectedRegion)
            ? fetchFilteredArticles(
                1, 20,
                selectedRegion || undefined,
                selectedCategory || undefined
              )
            : trimmedQuery
              ? searchArticles(trimmedQuery, 1)
              : fetchArticles(1, 20);

      // Nekrologi fetch — only when there's a free-text query (server endpoint
      // doesn't filter by category/region for nekrologi) AND user hasn't
      // restricted to articles only. Falls back gracefully on error.
      const nekrologiPromise: Promise<Nekrolog[]> =
        contentType === 'articles' || !trimmedQuery
          ? Promise.resolve([])
          : searchNekrologi(trimmedQuery, 1, 10).then((r) => r.nekrologi);

      const [articleResults, nekrologiResults] = await Promise.all([
        articlesPromise,
        nekrologiPromise,
      ]);

      let filteredResults = filterSponsoredArticles(articleResults.articles || []);
      filteredResults = applySorting(filteredResults, selectedSort);

      setArticles(filteredResults);
      setNekrologi(nekrologiResults);
      setTotalPages(articleResults.totalPages || 1);
      setPage(1);
    } catch (err) {
      console.error('Error searching articles:', err);
      setArticles([]);
      setNekrologi([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // New function to load all articles + a slice of recent nekrologi for the
  // mixed default view (no active query/filters).
  const loadAllArticles = async () => {
    try {
      setLoading(true);
      const articlesPromise =
        contentType === 'nekrologi'
          ? Promise.resolve({ articles: [], totalPages: 0 })
          : fetchArticles(1, 20);
      const nekrologiPromise =
        contentType === 'articles'
          ? Promise.resolve({ nekrologi: [] as Nekrolog[], totalPages: 0 })
          : fetchNekrologi(1, 8);

      const [results, nekrologiRes] = await Promise.all([articlesPromise, nekrologiPromise]);

      let filteredResults = filterSponsoredArticles(results.articles || []);
      filteredResults = applySorting(filteredResults, selectedSort);

      setArticles(filteredResults);
      setNekrologi(nekrologiRes.nekrologi || []);
      setTotalPages(results.totalPages || 1);
      setPage(1);
    } catch (err) {
      console.error('Error loading all articles:', err);
      setArticles([]);
      setNekrologi([]);
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

    // Special "Nekrologi" pin — switch to obituary-only mode. We don't pass
    // it as a category filter (it isn't a real WP category id); instead we
    // flip contentType so the list re-renders with nekrologi only.
    if (categoryId === NEKROLOGI_PIN_ID) {
      setSelectedCategory(NEKROLOGI_PIN_ID);
      setContentType('nekrologi');
      setArticles([]);
      setLoading(true);
      try {
        // Pull a generous slice — nekrolog endpoint already orders newest-first.
        const { nekrologi: list } = await fetchNekrologi(1, 40);
        setNekrologi(list);
        setTotalPages(1);
        setPage(1);
      } catch (err) {
        console.error('Error loading nekrologi:', err);
        setNekrologi([]);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Any other category exits nekrolog-only mode and resumes the mixed view.
    if (contentType === 'nekrologi') setContentType('all');

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
      // If "Wszystkie" is selected, load all articles
      await loadAllArticles();
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
      // If no filters, load all articles
      await loadAllArticles();
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
    setContentType('all');
    closeAllDropdowns();

    // Clear any pending search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }

    // Load all articles when filters are cleared
    loadAllArticles();
  };

  // Handle query changes with debounce
  const handleQueryChange = useCallback((text: string) => {
    setQuery(text);
    if (text.trim()) {
      debouncedSearch(text);
    } else {
      // If query is cleared, load all articles
      loadAllArticles();
    }
  }, [debouncedSearch]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Handle initial region if provided
  useEffect(() => {
    if (regionId && typeof regionId === 'string') {
      setSelectedRegion(regionId);
    }
  }, [regionId]);

  // Load all articles on initial mount
  useEffect(() => {
    if (!initialLoadComplete) {
      loadAllArticles();
      setInitialLoadComplete(true);
    }
  }, [initialLoadComplete]);

  const hasActiveFilters = selectedCategory || selectedRegion || query.trim();
  const selectedRegionName = REGIONS.find(r => r.id === selectedRegion)?.name || 'Regiony';
  const selectedSortName = SORT_OPTIONS.find(s => s.id === selectedSort)?.name || 'Sortowanie';

  // Mixed feed: insert one nekrolog every 5 articles so the list still feels
  // article-driven but obituaries are discoverable. When contentType is locked
  // to one type the pure list is shown.
  const mixedItems = useMemo<Array<Article | Nekrolog>>(() => {
    if (contentType === 'nekrologi') return nekrologi as Nekrolog[];
    if (contentType === 'articles' || nekrologi.length === 0) return articles as Article[];
    const out: Array<Article | Nekrolog> = [];
    let nekIdx = 0;
    articles.forEach((a, i) => {
      out.push(a);
      if ((i + 1) % 5 === 0 && nekIdx < nekrologi.length) {
        out.push(nekrologi[nekIdx++]);
      }
    });
    // Append leftover obituaries the search returned but didn't fit into the
    // every-5th slots — better than dropping matches the user might want.
    while (nekIdx < nekrologi.length) out.push(nekrologi[nekIdx++]);
    return out;
  }, [articles, nekrologi, contentType]);

  const renderNekrologItem = (item: Nekrolog) => (
    <TouchableOpacity
      style={[styles.nekrologCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
      onPress={() => router.push(`/nekrolog/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.nekrologRow}>
        <View style={styles.nekrologRibbonBox}>
          <Image
            source={{ uri: 'https://kaszuby24.pl/wp-content/uploads/2023/05/514697-PIHZZ2-291-01.png' }}
            style={styles.nekrologRibbon}
            contentFit="cover"
            transition={200}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.nekrologBadge, { fontFamily: theme.fontFamily.semibold }]}>Nekrolog</Text>
          <Text
            style={[styles.nekrologTitle, { color: theme.colors.text, fontFamily: theme.fontFamily.semibold }]}
            numberOfLines={2}
          >
            {cleanArticleTitle(item.title?.rendered ?? '')}
          </Text>
          <Text style={[styles.nekrologDate, { color: theme.colors.textSecondary, fontFamily: theme.fontFamily.regular }]}>
            {new Date(item.date).toLocaleDateString('pl-PL')}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

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
              ? 'https://kaszuby24.pl/wp-content/uploads/2025/07/Bez-nazwy-2-01-1-scaled.png'
              : 'https://kaszuby24.pl/wp-content/uploads/2025/07/Bez-nazwy-2-01-scaled.png'
          }}
          style={styles.logo}
          contentFit="contain"
          transition={200}
          placeholder="Kaszuby24"
          onError={() => {
            // Fallback do tekstu jeśli grafika się nie załaduje
            console.warn('Search logo image failed to load');
          }}
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
                {/* XCircle icon removed */}
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
                    borderColor: selectedRegion && selectedRegion !== '' ? theme.colors.primary : theme.colors.border,
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
                <MapPin size={16} color={selectedRegion && selectedRegion !== '' ? theme.colors.primary : theme.colors.textSecondary} />
                <Text style={[
                  styles.selectButtonText,
                  {
                    color: selectedRegion && selectedRegion !== '' ? theme.colors.primary : theme.colors.text,
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
      {loading && mixedItems.length === 0 ? (
        <SkeletonLoader type="search" count={5} immediate={true} />
      ) : (
        <FlatList
          data={mixedItems}
          keyExtractor={(item) => `${item.type === 'nekrolog' ? 'n' : 'a'}_${item.id}`}
          renderItem={({ item }) =>
            item.type === 'nekrolog' ? (
              renderNekrologItem(item as Nekrolog)
            ) : (
              <ArticleCard
                article={item as Article}
                onPress={() => handleArticlePress(item as Article)}
              />
            )
          }
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            mixedItems.length > 0 ? (
              <View style={[styles.resultsHeader, { backgroundColor: theme.colors.subtle }]}>
                <Text style={[
                  styles.resultsText,
                  {
                    color: theme.colors.text,
                    fontFamily: theme.fontFamily.medium
                  }
                ]}>
                  {mixedItems.length} {nekrologi.length > 0 && contentType !== 'articles' ? `wyników (w tym ${nekrologi.length} nekrologów)` : 'wyników'}
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

  // Content type filter (Wszystko / Artykuły / Nekrologi)
  contentTypeRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
    gap: 8,
  },
  contentTypeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  contentTypeChipText: {
    fontSize: 13,
  },

  // Nekrolog row (search results)
  nekrologCard: {
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  nekrologRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  nekrologRibbonBox: {
    width: 56,
    height: 72,
    borderRadius: 8,
    overflow: 'hidden',
  },
  nekrologRibbon: {
    width: '100%',
    height: '100%',
  },
  nekrologBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#000',
    color: '#FFF',
    fontSize: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 6,
    overflow: 'hidden',
  },
  nekrologTitle: {
    fontSize: 15,
    lineHeight: 19,
    marginBottom: 4,
  },
  nekrologDate: {
    fontSize: 12,
  },
});