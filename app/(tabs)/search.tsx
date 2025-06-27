import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity,
  TextInput
} from 'react-native';
import { useRouter } from 'expo-router';
import { Search as SearchIcon, X } from 'lucide-react-native';
import { searchArticles } from '@/services/api';
import { Article } from '@/types/article';
import ArticleCard from '@/components/ArticleCard';
import EmptyState from '@/components/EmptyState';
import LoadingIndicator from '@/components/LoadingIndicator';
import { useArticlesStore } from '@/store/articlesStore';

export default function SearchScreen() {
  const router = useRouter();
  const { addRecentArticle } = useArticlesStore();
  
  const [query, setQuery] = useState('');
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);
  
  const handleSearch = async (searchQuery: string) => {
    setQuery(searchQuery);
    
    if (!searchQuery.trim()) {
      setArticles([]);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const { articles: searchResults, totalPages } = await searchArticles(searchQuery, 1);
      
      setArticles(searchResults);
      setTotalPages(totalPages);
      setPage(1);
    } catch (err) {
      setError('Could not search for articles. Please try again.');
      console.error('Error searching articles:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleLoadMore = async () => {
    if (page >= totalPages || loadingMore || !query.trim()) return;
    
    try {
      setLoadingMore(true);
      
      const nextPage = page + 1;
      const { articles: moreResults } = await searchArticles(query, nextPage);
      
      setArticles((prev) => [...prev, ...moreResults]);
      setPage(nextPage);
    } catch (err) {
      console.error('Error loading more search results:', err);
    } finally {
      setLoadingMore(false);
    }
  };
  
  const handleArticlePress = (article: Article) => {
    // Add to recent articles
    addRecentArticle(article);
  };
  
  const handleClear = () => {
    setQuery('');
    setArticles([]);
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Search</Text>
      </View>
      
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <SearchIcon size={20} color="#888888" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for news..."
            placeholderTextColor="#888888"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => handleSearch(query)}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={handleClear}>
              <X size={20} color="#888888" />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {loading ? (
        <LoadingIndicator fullScreen />
      ) : (
        <FlatList
          data={articles}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.articleContainer}>
              <ArticleCard 
                article={item} 
                onPress={() => handleArticlePress(item)}
              />
            </View>
          )}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            query.trim() ? (
              <Text style={styles.resultsText}>
                {articles.length === 0
                  ? 'No results found'
                  : `Found ${articles.length} results for "${query}"`}
              </Text>
            ) : (
              <View style={styles.emptySearchContainer}>
                <SearchIcon size={48} color="#000000" opacity={0.7} />
                <Text style={styles.emptySearchText}>
                  Search for articles
                </Text>
              </View>
            )
          }
          ListEmptyComponent={
            query.trim() && !loading ? (
              <EmptyState
                title="No results found"
                message={`We couldn't find any articles matching "${query}". Try a different search term.`}
                icon={<SearchIcon size={48} color="#000000" />}
              />
            ) : null
          }
          ListFooterComponent={
            loadingMore ? <LoadingIndicator size="small" /> : null
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
  },
  searchContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    marginLeft: 12,
    fontSize: 16,
    color: '#000000',
  },
  listContent: {
    paddingBottom: 16,
    flexGrow: 1,
  },
  articleContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  resultsText: {
    fontSize: 16,
    marginHorizontal: 20,
    marginVertical: 16,
    color: '#000000',
  },
  emptySearchContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  emptySearchText: {
    fontSize: 16,
    marginTop: 16,
    color: '#888888',
  },
});