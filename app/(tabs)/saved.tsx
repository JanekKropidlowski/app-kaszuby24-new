import React, { useState, useCallback, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity,
  Animated,
  Dimensions
} from 'react-native';
import { Bookmark, ChevronRight } from 'lucide-react-native';
import ArticleCard from '@/components/ArticleCard';
import EmptyState from '@/components/EmptyState';
import { useArticlesStore } from '@/store/articlesStore';
import { useRouter } from 'expo-router';
import { useThemeStore } from '@/store/themeStore';
import { filterSponsoredArticles } from '@/utils/contentFilter';
import { useScrollStore } from '@/store/scrollStore';

const { width } = Dimensions.get('window');
const ANIMATION_DURATION = 300;

export default function SavedScreen() {
  const router = useRouter();
  const { savedArticles, recentArticles, clearRecentArticles } = useArticlesStore();
  const { theme } = useThemeStore();
  const { setScrollDirection, resetScroll } = useScrollStore();
  
  const [showRecent, setShowRecent] = useState(true);
  const recentHeight = useState(new Animated.Value(recentArticles.length > 0 ? 1 : 0))[0];
  
  // Filter out any sponsored content that might exist
  const filteredSavedArticles = filterSponsoredArticles(savedArticles);
  const filteredRecentArticles = filterSponsoredArticles(recentArticles);
  
  const navigateToHome = () => {
    router.push('/');
  };
  
  const toggleRecentSection = () => {
    Animated.timing(recentHeight, {
      toValue: showRecent ? 0 : 1,
      duration: ANIMATION_DURATION,
      useNativeDriver: false,
    }).start();
    
    setShowRecent(!showRecent);
  };
  
  const handleClearRecent = () => {
    Animated.timing(recentHeight, {
      toValue: 0,
      duration: ANIMATION_DURATION,
      useNativeDriver: false,
    }).start(() => {
      clearRecentArticles();
      setShowRecent(false);
    });
  };
  
  const handleScroll = useCallback((event: any) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    setScrollDirection(scrollY);
  }, [setScrollDirection]);
  
  useEffect(() => {
    resetScroll();
    return () => {
      resetScroll();
    };
  }, [resetScroll]);
  
  const maxRecentHeight = filteredRecentArticles.length * 92 + 80; // Approximate height based on items
  const recentSectionHeight = recentHeight.interpolate({
    inputRange: [0, 1],
    outputRange: [80, maxRecentHeight], // Header height to full height
  });
  
  const chevronRotation = recentHeight.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={filteredSavedArticles}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <ArticleCard article={item} />
        )}
        contentContainerStyle={styles.listContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        ListHeaderComponent={
          <View style={[styles.header, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
              Zapisane artykuły
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
              {filteredSavedArticles.length > 0 
                ? `Masz ${filteredSavedArticles.length} zapisanych artykułów`
                : 'Zapisz artykuły, aby czytać je później'}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title="Brak zapisanych artykułów"
            message="Artykuły, które zapiszesz, pojawią się tutaj do czytania offline."
            actionLabel="Przeglądaj artykuły"
            onAction={navigateToHome}
            icon={<Bookmark size={48} color={theme.colors.primary} />}
          />
        }
        ListFooterComponent={
          filteredRecentArticles.length > 0 ? (
            <Animated.View 
              style={[
                styles.recentSection, 
                { 
                  backgroundColor: theme.colors.card,
                  height: recentSectionHeight,
                  overflow: 'hidden',
                }
              ]}
            >
              <TouchableOpacity 
                style={styles.recentHeader} 
                onPress={toggleRecentSection}
                activeOpacity={0.7}
              >
                <View style={styles.recentTitleContainer}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                    Ostatnio przeglądane
                  </Text>
                  <Text style={[styles.recentCount, { color: theme.colors.textSecondary }]}>
                    {filteredRecentArticles.length}
                  </Text>
                </View>
                
                <View style={styles.recentActions}>
                  {showRecent && (
                    <TouchableOpacity 
                      onPress={handleClearRecent}
                      style={[
                        styles.clearButton,
                        { borderColor: theme.colors.border }
                      ]}
                    >
                      <Text style={[styles.clearText, { color: theme.colors.textSecondary }]}>
                        Wyczyść
                      </Text>
                    </TouchableOpacity>
                  )}
                  
                  <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}>
                    <ChevronRight size={20} color={theme.colors.textSecondary} />
                  </Animated.View>
                </View>
              </TouchableOpacity>
              
              {showRecent && (
                <FlatList
                  data={filteredRecentArticles.slice(0, 5)}
                  keyExtractor={(item) => `recent-${item.id}`}
                  renderItem={({ item }) => (
                    <ArticleCard article={item} compact />
                  )}
                  ItemSeparatorComponent={() => <View style={styles.separator} />}
                  scrollEnabled={false}
                  contentContainerStyle={styles.recentList}
                />
              )}
            </Animated.View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  recentSection: {
    marginTop: 24,
    marginHorizontal: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  recentTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  recentCount: {
    fontSize: 14,
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  recentActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 12,
  },
  clearText: {
    fontSize: 12,
    fontWeight: '500',
  },
  recentList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  separator: {
    height: 12,
  },
});