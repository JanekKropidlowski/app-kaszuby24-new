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
  Alert,
  Animated,
  Modal
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
  Bell, 
  Settings, 
  Bookmark,
  SlidersHorizontal,
  History,
  X,
  ChevronDown,
  Star,
  Eye,
  ArrowUpDown,
  Zap
} from 'lucide-react-native';
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
import AsyncStorage from '@react-native-async-storage/async-storage';

// Search history storage key
const SEARCH_HISTORY_KEY = '@search_history';

// Sort options
const SORT_OPTIONS = [
  { id: 'relevance', name: 'Trafność', icon: Star },
  { id: 'date', name: 'Najnowsze', icon: Clock },
  { id: 'popularity', name: 'Popularne', icon: TrendingUp },
];

// Enhanced Header component with search functionality
const EnhancedSearchHeader = ({ 
  onSearch, 
  searchHistory, 
  onClearHistory,
  theme 
}: {
  onSearch: (query: string) => void;
  searchHistory: string[];
  onClearHistory: () => void;
  theme: any;
}) => {
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const handleSearch = () => {
    if (query.trim()) {
      onSearch(query.trim());
      setShowSuggestions(false);
    }
  };

  const handleSuggestionPress = (suggestion: string) => {
    setQuery(suggestion);
    onSearch(suggestion);
    setShowSuggestions(false);
  };

  return (
    <View style={[styles.enhancedHeader, { backgroundColor: theme.colors.background }]}>
      {/* Logo */}
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

      {/* Enhanced Search Bar */}
      <View style={styles.searchBarContainer}>
        <View style={[
          styles.searchInputContainer,
          { 
            backgroundColor: theme.colors.card,
            borderColor: isFocused ? theme.colors.primary : theme.colors.border,
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
            placeholder="Wyszukaj artykuły, tematy, regiony..."
            placeholderTextColor={theme.colors.textSecondary}
            value={query}
            onChangeText={setQuery}
            onFocus={() => {
              setIsFocused(true);
              setShowSuggestions(true);
            }}
            onBlur={() => {
              setIsFocused(false);
              setTimeout(() => setShowSuggestions(false), 200);
            }}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} style={styles.clearButton}>
              <X size={16} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Search Suggestions */}
        {showSuggestions && searchHistory.length > 0 && (
          <View style={[
            styles.suggestionsContainer,
            { 
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
              shadowColor: theme.colors.shadow
            }
          ]}>
            <View style={styles.suggestionsHeader}>
              <View style={styles.suggestionsHeaderLeft}>
                <History size={16} color={theme.colors.primary} />
                <Text style={[
                  styles.suggestionsTitle,
                  { 
                    color: theme.colors.text,
                    fontFamily: theme.fontFamily.semibold
                  }
                ]}>
                  Ostatnie wyszukiwania
                </Text>
              </View>
              <TouchableOpacity onPress={onClearHistory}>
                <Text style={[
                  styles.clearHistoryText,
                  { 
                    color: theme.colors.primary,
                    fontFamily: theme.fontFamily.medium
                  }
                ]}>
                  Wyczyść
                </Text>
              </TouchableOpacity>
            </View>
            {searchHistory.slice(0, 5).map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.suggestionItem}
                onPress={() => handleSuggestionPress(item)}
              >
                <Clock size={14} color={theme.colors.textSecondary} />
                <Text style={[
                  styles.suggestionText,
                  { 
                    color: theme.colors.text,
                    fontFamily: theme.fontFamily.regular
                  }
                ]}>
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

// Filter Modal Component
const FilterModal = ({ 
  visible, 
  onClose, 
  selectedRegion,
  selectedCategory,
  selectedSort,
  onRegionChange,
  onCategoryChange,
  onSortChange,
  theme,
  regions,
  categories,
  nekrologiRegions
}: {
  visible: boolean;
  onClose: () => void;
  selectedRegion: string;
  selectedCategory: string;
  selectedSort: string;
  onRegionChange: (region: string) => void;
  onCategoryChange: (category: string) => void;
  onSortChange: (sort: string) => void;
  theme: any;
  regions: any[];
  categories: any[];
  nekrologiRegions: any[];
}) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
          <Text style={[
            styles.modalTitle,
            { 
              color: theme.colors.text,
              fontFamily: theme.fontFamily.bold
            }
          ]}>
            Filtry wyszukiwania
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
            <X size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          {/* Sort Section */}
          <View style={styles.filterModalSection}>
            <Text style={[
              styles.filterModalSectionTitle,
              { 
                color: theme.colors.text,
                fontFamily: theme.fontFamily.semibold
              }
            ]}>
              🔥 Sortowanie
            </Text>
            <View style={styles.filterModalGrid}>
              {SORT_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.filterModalCard,
                    { 
                      backgroundColor: selectedSort === option.id 
                        ? theme.colors.primary 
                        : theme.colors.card,
                      borderColor: selectedSort === option.id 
                        ? theme.colors.primary 
                        : theme.colors.border,
                    }
                  ]}
                  onPress={() => onSortChange(option.id)}
                >
                  <option.icon 
                    size={20} 
                    color={selectedSort === option.id ? '#FFFFFF' : theme.colors.primary} 
                  />
                  <Text style={[
                    styles.filterModalCardText,
                    { 
                      color: selectedSort === option.id ? '#FFFFFF' : theme.colors.text,
                      fontFamily: selectedSort === option.id 
                        ? theme.fontFamily.semibold 
                        : theme.fontFamily.medium
                    }
                  ]}>
                    {option.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Categories Section */}
          <View style={styles.filterModalSection}>
            <Text style={[
              styles.filterModalSectionTitle,
              { 
                color: theme.colors.text,
                fontFamily: theme.fontFamily.semibold
              }
            ]}>
              📂 Kategorie tematyczne
            </Text>
            <View style={styles.filterModalGrid}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.filterModalCard,
                    { 
                      backgroundColor: selectedCategory === category.id 
                        ? theme.colors.primary 
                        : theme.colors.card,
                      borderColor: selectedCategory === category.id 
                        ? theme.colors.primary 
                        : theme.colors.border,
                    }
                  ]}
                  onPress={() => onCategoryChange(category.id)}
                >
                  <category.icon 
                    size={20} 
                    color={selectedCategory === category.id ? '#FFFFFF' : theme.colors.primary} 
                  />
                  <Text style={[
                    styles.filterModalCardText,
                    { 
                      color: selectedCategory === category.id ? '#FFFFFF' : theme.colors.text,
                      fontFamily: selectedCategory === category.id 
                        ? theme.fontFamily.semibold 
                        : theme.fontFamily.medium
                    }
                  ]}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Regions Section */}
          <View style={styles.filterModalSection}>
            <Text style={[
              styles.filterModalSectionTitle,
              { 
                color: theme.colors.text,
                fontFamily: theme.fontFamily.semibold
              }
            ]}>
              🌍 Regiony – ogólne
            </Text>
            <View style={styles.filterModalGrid}>
              {regions.map((region) => (
                <TouchableOpacity
                  key={region.id}
                  style={[
                    styles.filterModalCard,
                    { 
                      backgroundColor: selectedRegion === region.id 
                        ? theme.colors.primary 
                        : theme.colors.card,
                      borderColor: selectedRegion === region.id 
                        ? theme.colors.primary 
                        : theme.colors.border,
                    }
                  ]}
                  onPress={() => onRegionChange(region.id)}
                >
                  <region.icon 
                    size={20} 
                    color={selectedRegion === region.id ? '#FFFFFF' : theme.colors.primary} 
                  />
                  <Text style={[
                    styles.filterModalCardText,
                    { 
                      color: selectedRegion === region.id ? '#FFFFFF' : theme.colors.text,
                      fontFamily: selectedRegion === region.id 
                        ? theme.fontFamily.semibold 
                        : theme.fontFamily.medium
                    }
                  ]}>
                    {region.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Nekrologi Regions Section */}
          <View style={styles.filterModalSection}>
            <Text style={[
              styles.filterModalSectionTitle,
              { 
                color: theme.colors.text,
                fontFamily: theme.fontFamily.semibold
              }
            ]}>
              ⚰️ Regiony – dla nekrologów
            </Text>
            <View style={styles.filterModalGrid}>
              {nekrologiRegions.map((region) => (
                <TouchableOpacity
                  key={region.id}
                  style={[
                    styles.filterModalCard,
                    { 
                      backgroundColor: selectedRegion === region.id 
                        ? theme.colors.primary 
                        : theme.colors.card,
                      borderColor: selectedRegion === region.id 
                        ? theme.colors.primary 
                        : theme.colors.border,
                    }
                  ]}
                  onPress={() => onRegionChange(region.id)}
                >
                  <region.icon 
                    size={20} 
                    color={selectedRegion === region.id ? '#FFFFFF' : theme.colors.primary} 
                  />
                  <Text style={[
                    styles.filterModalCardText,
                    { 
                      color: selectedRegion === region.id ? '#FFFFFF' : theme.colors.text,
                      fontFamily: selectedRegion === region.id 
                        ? theme.fontFamily.semibold 
                        : theme.fontFamily.medium
                    }
                  ]}>
                    {region.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Modal Footer */}
        <View style={[styles.modalFooter, { borderTopColor: theme.colors.border }]}>
          <TouchableOpacity
            style={[styles.modalButton, { backgroundColor: theme.colors.subtle }]}
            onPress={() => {
              onRegionChange('');
              onCategoryChange('');
              onSortChange('relevance');
            }}
          >
            <Text style={[
              styles.modalButtonText,
              { 
                color: theme.colors.text,
                fontFamily: theme.fontFamily.medium
              }
            ]}>
              Wyczyść filtry
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
            onPress={onClose}
          >
            <Text style={[
              styles.modalButtonText,
              { 
                color: '#FFFFFF',
                fontFamily: theme.fontFamily.semibold
              }
            ]}>
              Zastosuj filtry
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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
  
  // Enhanced filter states
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSort, setSelectedSort] = useState<string>('relevance');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  
  // Filter options with real IDs from your system
  const regions = [
    { id: '2583', name: 'Wejherowo', icon: MapPin, count: 2066 },
    { id: '7', name: 'Trójmiasto', icon: MapPin, count: 2827 },
    { id: '2128', name: 'Puck', icon: MapPin, count: 5444 },
    { id: '76797', name: 'Reda', icon: MapPin, count: 0 },
    { id: '65546', name: 'Kościerzyna', icon: MapPin, count: 236 },
    { id: '65545', name: 'Kartuzy', icon: MapPin, count: 342 },
    { id: '65558', name: 'Lębork', icon: MapPin, count: 212 },
  ];

  const nekrologiRegions = [
    { id: '74867', name: 'Gm. Kosakowo', icon: MapPin },
    { id: '74868', name: 'Gm. Krokowa', icon: MapPin },
    { id: '74869', name: 'Gm. Puck', icon: MapPin },
    { id: '74866', name: 'Miasto Puck', icon: MapPin },
    { id: '74872', name: 'Półwysep', icon: MapPin },
    { id: '74870', name: 'Powiat Wejherowski', icon: MapPin },
    { id: '74871', name: 'Trójmiasto', icon: MapPin },
    { id: '74865', name: 'Władysławowo', icon: MapPin },
  ];
  
  const categories = [
    { id: '17', name: 'Bezpieczeństwo', icon: Heart, color: '#224996', count: 3590 },
    { id: '11', name: 'Biznes', icon: TrendingUp, color: '#224996', count: 1575 },
    { id: '24', name: 'Sport i Rekreacja', icon: Calendar, color: '#224996', count: 1754 },
    { id: '22', name: 'Religia', icon: Clock, color: '#224996', count: 518 },
    { id: '2246', name: 'Zdrowie', icon: Heart, color: '#224996', count: 561 },
    { id: '49', name: 'Nauka', icon: TrendingUp, color: '#224996', count: 1246 },
    { id: '16', name: 'Kultura i Rozrywka', icon: Calendar, color: '#224996', count: 2700 },
  ];

  // Load search history on component mount
  useEffect(() => {
    loadSearchHistory();
  }, []);

  const loadSearchHistory = async () => {
    try {
      const history = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
      if (history) {
        setSearchHistory(JSON.parse(history));
      }
    } catch (error) {
      console.error('Error loading search history:', error);
    }
  };

  const saveSearchHistory = async (newQuery: string) => {
    try {
      const updatedHistory = [
        newQuery,
        ...searchHistory.filter(item => item !== newQuery)
      ].slice(0, 10); // Keep only last 10 searches
      
      setSearchHistory(updatedHistory);
      await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updatedHistory));
    } catch (error) {
      console.error('Error saving search history:', error);
    }
  };

  const clearSearchHistory = async () => {
    try {
      setSearchHistory([]);
      await AsyncStorage.removeItem(SEARCH_HISTORY_KEY);
    } catch (error) {
      console.error('Error clearing search history:', error);
    }
  };

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

    // Save to search history
    await saveSearchHistory(searchQuery.trim());
    
    try {
      setLoading(true);
      setInitialLoading(true);
      setError(null);
      
      // Start loading time measurement
      const startTime = Date.now();
      const minLoadingTime = 600; // Minimum time to show skeleton for better UX
      
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
      
      // Apply sorting
      const sortedResults = applySorting(filteredResults, selectedSort);
      
      // Calculate remaining time to show skeleton loader
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, minLoadingTime - elapsedTime);
      
      // Ensure skeleton loader shows for at least minLoadingTime
      setTimeout(() => {
        setArticles(sortedResults);
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

  const applySorting = (articles: Article[], sortType: string): Article[] => {
    switch (sortType) {
      case 'date':
        return [...articles].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      case 'popularity':
        // Sort by views or engagement if available, fallback to date
        return [...articles].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      case 'relevance':
      default:
        return articles; // Keep original order for relevance
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
    // Add to recent articles (filtering is handled in the store)
    addRecentArticle(article);
    
    // Navigate to article detail page
    router.push(`/article/${article.id}`);
  };

  // Enhanced filter handlers
  const handleRegionFilter = (regionId: string) => {
    const newRegion = selectedRegion === regionId ? '' : regionId;
    setSelectedRegion(newRegion);
    
    if (newRegion) {
      handleSearch(`categories=${newRegion}`);
    } else if (query) {
      handleSearch(query);
    }
  };

  const handleCategoryFilter = (categoryId: string) => {
    const newCategory = selectedCategory === categoryId ? '' : categoryId;
    setSelectedCategory(newCategory);
    
    if (newCategory) {
      handleSearch(`categories=${newCategory}`);
    } else if (query) {
      handleSearch(query);
    }
  };

  const handleSortChange = (sortType: string) => {
    setSelectedSort(sortType);
    if (articles.length > 0) {
      const sortedResults = applySorting(articles, sortType);
      setArticles(sortedResults);
    }
  };

  const clearAllFilters = () => {
    setSelectedRegion('');
    setSelectedCategory('');
    setSelectedSort('relevance');
    if (query) {
      handleSearch(query);
    }
  };

  // Get active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedRegion) count++;
    if (selectedCategory) count++;
    if (selectedSort !== 'relevance') count++;
    return count;
  }, [selectedRegion, selectedCategory, selectedSort]);

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
            const sortedResults = applySorting(filteredResults, selectedSort);
            setArticles(sortedResults);
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
  }, [regionId, selectedSort]);
  
  // Reset scroll state when component mounts
  useEffect(() => {
    resetScroll();
    return () => {
      resetScroll();
    };
  }, [resetScroll]);

  // Enhanced empty search component
  const renderEnhancedEmptySearch = () => (
    <View style={styles.enhancedEmptyContainer}>
      <View style={[styles.emptyIconContainer, { backgroundColor: theme.colors.subtle }]}>
        <SearchIcon size={40} color={theme.colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.colors.text, fontFamily: theme.fontFamily.bold }]}>
        Odkryj interesujące artykuły
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary, fontFamily: theme.fontFamily.regular }]}>
        Wyszukaj tematy, które Cię interesują lub przeglądaj kategorie poniżej
      </Text>
      
      {/* Quick access categories */}
      <View style={styles.quickAccessContainer}>
        <Text style={[styles.quickAccessTitle, { color: theme.colors.text, fontFamily: theme.fontFamily.semibold }]}>
          🔥 Popularne kategorie
        </Text>
        <View style={styles.quickAccessGrid}>
          {categories.slice(0, 4).map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.quickAccessCard,
                { 
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                  shadowColor: theme.colors.shadow
                }
              ]}
              onPress={() => handleCategoryFilter(category.id)}
            >
              <category.icon size={24} color={theme.colors.primary} />
              <Text style={[
                styles.quickAccessCardTitle,
                { 
                  color: theme.colors.text,
                  fontFamily: theme.fontFamily.semibold
                }
              ]}>
                {category.name}
              </Text>
              <Text style={[
                styles.quickAccessCardCount,
                { 
                  color: theme.colors.textSecondary,
                  fontFamily: theme.fontFamily.regular
                }
              ]}>
                {category.count} artykułów
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Popular regions */}
      <View style={styles.quickAccessContainer}>
        <Text style={[styles.quickAccessTitle, { color: theme.colors.text, fontFamily: theme.fontFamily.semibold }]}>
          📍 Popularne regiony
        </Text>
        <View style={styles.quickAccessGrid}>
          {regions.filter(r => r.count > 0).slice(0, 4).map((region) => (
            <TouchableOpacity
              key={region.id}
              style={[
                styles.quickAccessCard,
                { 
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                  shadowColor: theme.colors.shadow
                }
              ]}
              onPress={() => handleRegionFilter(region.id)}
            >
              <region.icon size={24} color={theme.colors.primary} />
              <Text style={[
                styles.quickAccessCardTitle,
                { 
                  color: theme.colors.text,
                  fontFamily: theme.fontFamily.semibold
                }
              ]}>
                {region.name}
              </Text>
              <Text style={[
                styles.quickAccessCardCount,
                { 
                  color: theme.colors.textSecondary,
                  fontFamily: theme.fontFamily.regular
                }
              ]}>
                {region.count} artykułów
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Enhanced Header with search functionality */}
      <EnhancedSearchHeader 
        onSearch={handleSearch}
        searchHistory={searchHistory}
        onClearHistory={clearSearchHistory}
        theme={theme}
      />

      {/* Filter Bar */}
      {(query.trim() || activeFiltersCount > 0) && (
        <View style={[styles.filterBar, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterBarContent}>
            {/* Sort Filter */}
            <TouchableOpacity
              style={[
                styles.filterChip,
                { 
                  backgroundColor: selectedSort !== 'relevance' ? theme.colors.primary : theme.colors.subtle,
                  borderColor: selectedSort !== 'relevance' ? theme.colors.primary : theme.colors.border
                }
              ]}
              onPress={() => setShowFilterModal(true)}
            >
              <ArrowUpDown 
                size={16} 
                color={selectedSort !== 'relevance' ? '#FFFFFF' : theme.colors.primary} 
              />
              <Text style={[
                styles.filterChipText,
                { 
                  color: selectedSort !== 'relevance' ? '#FFFFFF' : theme.colors.text,
                  fontFamily: theme.fontFamily.medium
                }
              ]}>
                {SORT_OPTIONS.find(opt => opt.id === selectedSort)?.name || 'Sortuj'}
              </Text>
            </TouchableOpacity>

            {/* Category Filter */}
            {selectedCategory && (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  { 
                    backgroundColor: theme.colors.primary,
                    borderColor: theme.colors.primary
                  }
                ]}
                onPress={() => setSelectedCategory('')}
              >
                <Filter size={16} color="#FFFFFF" />
                <Text style={[
                  styles.filterChipText,
                  { 
                    color: '#FFFFFF',
                    fontFamily: theme.fontFamily.medium
                  }
                ]}>
                  {categories.find(cat => cat.id === selectedCategory)?.name}
                </Text>
                <X size={14} color="#FFFFFF" />
              </TouchableOpacity>
            )}

            {/* Region Filter */}
            {selectedRegion && (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  { 
                    backgroundColor: theme.colors.primary,
                    borderColor: theme.colors.primary
                  }
                ]}
                onPress={() => setSelectedRegion('')}
              >
                <MapPin size={16} color="#FFFFFF" />
                <Text style={[
                  styles.filterChipText,
                  { 
                    color: '#FFFFFF',
                    fontFamily: theme.fontFamily.medium
                  }
                ]}>
                  {[...regions, ...nekrologiRegions].find(reg => reg.id === selectedRegion)?.name}
                </Text>
                <X size={14} color="#FFFFFF" />
              </TouchableOpacity>
            )}

            {/* Advanced Filters Button */}
            <TouchableOpacity
              style={[
                styles.filterChip,
                styles.advancedFilterButton,
                { 
                  backgroundColor: activeFiltersCount > 0 ? theme.colors.primary : theme.colors.subtle,
                  borderColor: activeFiltersCount > 0 ? theme.colors.primary : theme.colors.border
                }
              ]}
              onPress={() => setShowFilterModal(true)}
            >
              <SlidersHorizontal 
                size={16} 
                color={activeFiltersCount > 0 ? '#FFFFFF' : theme.colors.primary} 
              />
              <Text style={[
                styles.filterChipText,
                { 
                  color: activeFiltersCount > 0 ? '#FFFFFF' : theme.colors.text,
                  fontFamily: theme.fontFamily.medium
                }
              ]}>
                Filtry
              </Text>
              {activeFiltersCount > 0 && (
                <View style={[styles.filterBadge, { backgroundColor: '#FFFFFF' }]}>
                  <Text style={[styles.filterBadgeText, { color: theme.colors.primary }]}>
                    {activeFiltersCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}
      
      {/* Main Content */}
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
              <View style={[styles.resultsHeader, { backgroundColor: theme.colors.subtle }]}>
                <View style={styles.resultsHeaderContent}>
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
                      : `Znaleziono ${articles.length} wyników`}
                  </Text>
                  {query.trim() && (
                    <Text 
                      style={[
                        styles.resultsQuery, 
                        { 
                          color: theme.colors.textSecondary,
                          fontFamily: theme.fontFamily.regular
                        }
                      ]}
                    >
                      dla "{query}"
                    </Text>
                  )}
                </View>
                {activeFiltersCount > 0 && (
                  <TouchableOpacity
                    style={[styles.clearFiltersButton, { backgroundColor: theme.colors.primary }]}
                    onPress={clearAllFilters}
                  >
                    <Text style={[
                      styles.clearFiltersButtonText,
                      { 
                        color: '#FFFFFF',
                        fontFamily: theme.fontFamily.medium
                      }
                    ]}>
                      Wyczyść filtry
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : null
          }
          ListEmptyComponent={
            query.trim() ? (
              <EmptyState
                title="Nie znaleziono wyników"
                message={`Nie znaleźliśmy żadnych artykułów pasujących do "${query}". Spróbuj innego hasła lub zmień filtry.`}
                icon={<SearchIcon size={48} color={theme.colors.primary} />}
              />
            ) : !query.trim() ? renderEnhancedEmptySearch() : null
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

      {/* Filter Modal */}
      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        selectedRegion={selectedRegion}
        selectedCategory={selectedCategory}
        selectedSort={selectedSort}
        onRegionChange={(region) => {
          setSelectedRegion(region);
          if (region && query.trim()) {
            handleSearch(`categories=${region}`);
          }
        }}
        onCategoryChange={(category) => {
          setSelectedCategory(category);
          if (category && query.trim()) {
            handleSearch(`categories=${category}`);
          }
        }}
        onSortChange={handleSortChange}
        theme={theme}
        regions={regions}
        categories={categories}
        nekrologiRegions={nekrologiRegions}
      />
      
      {/* Enhanced Bottom Navigation Menu */}
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
  
  // Enhanced Header Styles
  enhancedHeader: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
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
    width: 140,
    height: 38,
  },
  searchBarContainer: {
    position: 'relative',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 54,
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
  suggestionsContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    borderRadius: 12,
    borderWidth: 1,
    maxHeight: 200,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1000,
  },
  suggestionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  suggestionsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  suggestionsTitle: {
    fontSize: 14,
    marginLeft: 8,
  },
  clearHistoryText: {
    fontSize: 14,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.03)',
  },
  suggestionText: {
    fontSize: 15,
    marginLeft: 12,
  },

  // Filter Bar Styles
  filterBar: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  filterBarContent: {
    paddingHorizontal: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  filterChipText: {
    fontSize: 14,
    marginLeft: 6,
  },
  advancedFilterButton: {
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Results Header Styles
  resultsHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  resultsHeaderContent: {
    marginBottom: 8,
  },
  resultsText: {
    fontSize: 16,
    marginBottom: 4,
  },
  resultsQuery: {
    fontSize: 14,
  },
  clearFiltersButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  clearFiltersButtonText: {
    fontSize: 14,
  },

  // Enhanced Empty Search Styles
  enhancedEmptyContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  quickAccessContainer: {
    width: '100%',
    marginBottom: 32,
  },
  quickAccessTitle: {
    fontSize: 18,
    marginBottom: 16,
    textAlign: 'center',
  },
  quickAccessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  quickAccessCard: {
    width: '48%',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  quickAccessCardTitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  quickAccessCardCount: {
    fontSize: 12,
    textAlign: 'center',
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
  },
  modalCloseButton: {
    padding: 8,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  filterModalSection: {
    marginVertical: 20,
  },
  filterModalSectionTitle: {
    fontSize: 18,
    marginBottom: 16,
  },
  filterModalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  filterModalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    minWidth: '48%',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  filterModalCardText: {
    fontSize: 14,
    marginLeft: 8,
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
  },

  // List Styles
  listContent: {
    paddingBottom: 100,
  },

  // Modern Bottom Navigation
  modernBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    paddingBottom: Platform.OS === 'ios' ? 34 : 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  modernBottomItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  modernBottomIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    position: 'relative',
  },
  modernBottomIconWrapperActive: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modernBottomText: {
    fontSize: 12,
    textAlign: 'center',
  },
  modernBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modernBadgeText: {
    fontSize: 12,
    color: '#FFFFFF',
  },
});