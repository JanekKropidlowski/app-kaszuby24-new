import React, { useState, useCallback, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform
} from 'react-native';
import { Bookmark, ChevronRight, Home, Bell, Settings, Search } from 'lucide-react-native';
import { Image } from 'expo-image';
import ArticleCard from '@/components/ArticleCard';
import EmptyState from '@/components/EmptyState';
import { useArticlesStore } from '@/store/articlesStore';
import { useRouter } from 'expo-router';
import { useThemeStore } from '@/store/themeStore';
import { filterSponsoredArticles } from '@/utils/contentFilter';
import { useScrollStore } from '@/store/scrollStore';
import { useNotificationsStore } from '@/store/notificationsStore';

const { width } = Dimensions.get('window');
const ANIMATION_DURATION = 300;

// Header component with logo
const SavedHeader = () => {
  const { theme } = useThemeStore();

  return (
    <View style={[styles.savedHeader, { backgroundColor: theme.colors.background }]}>
      <Image
        source={{ 
          uri: theme.isDarkMode 
            ? 'http://kaszuby24.pl/wp-content/uploads/2025/07/Bez-nazwy-2-01-1-scaled.png'
            : 'https://kaszuby24.pl/wp-content/uploads/2023/05/ikony_Obszar-roboczy-1.png'
        }}
        style={styles.headerLogo}
        contentFit="contain"
        transition={200}
      />
    </View>
  );
};

export default function SavedScreen() {
  const router = useRouter();
  const { savedArticles, recentArticles, clearRecentArticles } = useArticlesStore();
  const { theme } = useThemeStore();
  const { setScrollDirection, resetScroll } = useScrollStore();
  const { getUnreadCount } = useNotificationsStore();
  
  const [showRecent, setShowRecent] = useState(true);
  const recentHeight = useState(new Animated.Value(recentArticles.length > 0 ? 1 : 0))[0];
  
  // Filter out any sponsored content that might exist
  const filteredSavedArticles = filterSponsoredArticles(savedArticles);
  const filteredRecentArticles = filterSponsoredArticles(recentArticles);
  
  const navigateToHome = () => {
    router.push('/');
  };

  // Bottom navigation functions
  const handleGoHome = useCallback(() => {
    router.push('/(tabs)/');
  }, [router]);

  const handleGoSearch = useCallback(() => {
    router.push('/(tabs)/search');
  }, [router]);

  const handleGoSaved = useCallback(() => {
    // Already on saved
  }, []);

  const handleGoNotifications = useCallback(() => {
    router.push('/(tabs)/notifications');
  }, [router]);

  const handleGoSettings = useCallback(() => {
    router.push('/(tabs)/preferences');
  }, [router]);

  const unreadCount = getUnreadCount();
  
  const toggleRecentSection = () => {
    Animated.timing(recentHeight, {
      toValue: showRecent ? 0 : 1,
      duration: ANIMATION_DURATION,
      useNativeDriver: false, // Height is not supported by native driver
    }).start();
    
    setShowRecent(!showRecent);
  };
  
  const handleClearRecent = () => {
    Animated.timing(recentHeight, {
      toValue: 0,
      duration: ANIMATION_DURATION,
      useNativeDriver: false, // Height is not supported by native driver
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
      {/* Header with logo */}
      <SavedHeader />
      
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
      
      {/* Enhanced Bottom Navigation Menu - Modern & Comfortable */}
      <View style={[styles.modernBottomBar, { backgroundColor: theme.colors.tabBarBackground }]}>
        <TouchableOpacity
          style={[styles.modernBottomItem, { opacity: 0.7 }]}
          onPress={handleGoSearch}
          activeOpacity={0.8}
        >
          <View style={styles.modernBottomIconWrapper}>
            <Search size={24} color={theme.colors.text} strokeWidth={2} />
          </View>
          <Text style={[styles.modernBottomText, { color: theme.colors.text, fontFamily: theme.fontFamily.medium }]}>
            Szukaj
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.modernBottomItem, styles.modernBottomItemActive]}
          onPress={handleGoSaved}
          activeOpacity={0.8}
        >
          <View style={[
            styles.modernBottomIconWrapper, 
            styles.modernBottomIconWrapperActive,
            { backgroundColor: theme.colors.primary }
          ]}>
            <Bookmark size={26} color="#FFFFFF" strokeWidth={2.5} />
          </View>
          <Text style={[styles.modernBottomText, { color: theme.colors.primary, fontFamily: theme.fontFamily.semibold }]}>
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
  savedHeader: {
    paddingTop: Platform.OS === 'ios' ? 60 : 20, // Extra padding for iOS notch
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    backgroundColor: 'rgba(248, 250, 252, 0.8)',
  },
  headerLogo: {
    width: 140, // Increased
    height: 38, // Increased
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