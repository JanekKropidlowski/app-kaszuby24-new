import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  SafeAreaView
} from 'react-native';
import { Bookmark, ChevronRight, Home, Settings, Search, MapPin, Calendar } from 'lucide-react-native';
import { Image } from 'expo-image';
import ArticleCard from '@/components/ArticleCard';
import EmptyState from '@/components/EmptyState';
import SkeletonLoader from '@/components/SkeletonLoader';
import { useArticlesStore } from '@/store/articlesStore';
import { useEventsStore } from '@/store/eventsStore';
import { useRouter } from 'expo-router';
import { useThemeStore } from '@/store/themeStore';
import { filterSponsoredArticles } from '@/utils/contentFilter';
import { useScrollStore } from '@/store/scrollStore';
import GlobalTabBar from '@/components/GlobalTabBar';

const { width } = Dimensions.get('window');
const ANIMATION_DURATION = 300;

// Header component with logo - matching other tabs
const SavedHeader = () => {
  const { theme } = useThemeStore();

  return (
    <View style={[styles.header, { backgroundColor: theme.colors.background }]}>
      <Image
        source={{ 
          uri: theme.isDarkMode 
            ? 'http://kaszuby24.pl/wp-content/uploads/2025/07/Bez-nazwy-2-01-1-scaled.png'
            : 'http://kaszuby24.pl/wp-content/uploads/2025/07/Bez-nazwy-2-01-scaled.png'
        }}
        style={styles.logo}
        contentFit="contain"
        transition={200}
      />
    </View>
  );
};

// Event Card Component - improved styling
const EventCard = ({ event, onPress }: { event: any, onPress: () => void }) => {
  const { theme } = useThemeStore();
  
  return (
    <TouchableOpacity 
      style={[
        styles.eventCard, 
        { 
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border
        }
      ]} 
      onPress={onPress} 
      activeOpacity={0.7}
    >
      <View style={styles.eventCardContent}>
        {event.image && (
          <Image
            source={{ uri: event.image }}
            style={styles.eventImage}
            contentFit="cover"
            transition={200}
          />
        )}
        <View style={styles.eventInfo}>
          <Text style={[
            styles.eventTitle, 
            { 
              color: theme.colors.text,
              fontFamily: theme.fontFamily.semibold
            }
          ]} numberOfLines={2}>
            {event.title.rendered
              .replace(/&#8222;|&#8221;|&#8211;/g, '')
              .replace(/&#038;/g, '&')
              .replace(/&nbsp;/g, ' ')
              .trim()}
          </Text>
          <View style={styles.eventMeta}>
            <Calendar size={12} color={theme.colors.textSecondary} />
            <Text style={[
              styles.eventDate, 
              { 
                color: theme.colors.textSecondary,
                fontFamily: theme.fontFamily.regular
              }
            ]}>
              {new Date(event.date).toLocaleDateString('pl-PL', { 
                day: 'numeric', 
                month: 'long',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
            {event.meta?.miasto && (
              <>
                <MapPin size={12} color={theme.colors.textSecondary} />
                <Text style={[
                  styles.eventLocation, 
                  { 
                    color: theme.colors.textSecondary,
                    fontFamily: theme.fontFamily.regular
                  }
                ]}>
                  {event.meta.miasto}
                </Text>
              </>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function SavedScreen() {
  const router = useRouter();
  const { savedArticles, recentArticles, clearRecentArticles } = useArticlesStore();
  const { savedEvents } = useEventsStore();
  const { theme } = useThemeStore();
  const { setScrollDirection, resetScroll } = useScrollStore();

  const [showRecent, setShowRecent] = useState(true);
  const recentHeight = useState(new Animated.Value(recentArticles.length > 0 ? 1 : 0))[0];
  const [activeTab, setActiveTab] = useState<'articles' | 'events'>('articles');
  
  // Filter out any sponsored content that might exist (optimized with useMemo)
  // Note: Store already filters on add, but this is extra safety - only runs when data changes
  const filteredSavedArticles = useMemo(() => filterSponsoredArticles(savedArticles), [savedArticles]);
  const filteredRecentArticles = useMemo(() => filterSponsoredArticles(recentArticles), [recentArticles]);
  
  const navigateToHome = useCallback(() => {
    router.push('/(tabs)/');
  }, [router]);

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

  const handleGoSettings = useCallback(() => {
    router.push('/(tabs)/preferences');
  }, [router]);

  const toggleRecentSection = () => {
    const targetValue = showRecent ? 0 : 1;
    
    Animated.timing(recentHeight, {
      toValue: targetValue,
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

  // Synchronize recent section animation with data changes
  useEffect(() => {
    if (filteredRecentArticles.length === 0) {
      Animated.timing(recentHeight, {
        toValue: 0,
        duration: ANIMATION_DURATION,
        useNativeDriver: false,
      }).start();
      setShowRecent(false);
    }
  }, [filteredRecentArticles.length, recentHeight]);
  
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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header with logo */}
      <SavedHeader />
      
      {/* Tab Selector - improved styling */}
      <View style={[
        styles.tabSelector, 
        { 
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border
        }
      ]}>
        <TouchableOpacity 
          style={[
            styles.tabButton, 
            activeTab === 'articles' && { 
              backgroundColor: theme.colors.primary,
              shadowColor: theme.colors.primary,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 4,
            }
          ]} 
          onPress={() => setActiveTab('articles')}
          activeOpacity={0.8}
        >
          <Bookmark size={16} color={activeTab === 'articles' ? '#ffffff' : theme.colors.primary} />
          <Text style={[
            styles.tabButtonText, 
            { 
              color: activeTab === 'articles' ? '#ffffff' : theme.colors.text,
              fontFamily: activeTab === 'articles' ? theme.fontFamily.semibold : theme.fontFamily.medium
            }
          ]}>
            Artykuły ({filteredSavedArticles.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[
            styles.tabButton, 
            activeTab === 'events' && { 
              backgroundColor: theme.colors.primary,
              shadowColor: theme.colors.primary,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 4,
            }
          ]} 
          onPress={() => setActiveTab('events')}
          activeOpacity={0.8}
        >
          <Calendar size={16} color={activeTab === 'events' ? '#ffffff' : theme.colors.primary} />
          <Text style={[
            styles.tabButtonText, 
            { 
              color: activeTab === 'events' ? '#ffffff' : theme.colors.text,
              fontFamily: activeTab === 'events' ? theme.fontFamily.semibold : theme.fontFamily.medium
            }
          ]}>
            Wydarzenia ({savedEvents.length})
          </Text>
        </TouchableOpacity>
      </View>
      
      {activeTab === 'articles' ? (
        <FlatList
          data={filteredSavedArticles}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <ArticleCard 
              article={item} 
              onPress={() => router.push(`/article/${item.id}`)}
            />
          )}
          contentContainerStyle={styles.listContent}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          ListHeaderComponent={null}
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
                    borderColor: theme.colors.border,
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
                    <Text style={[
                      styles.sectionTitle, 
                      { 
                        color: theme.colors.text,
                        fontFamily: theme.fontFamily.semibold
                      }
                    ]}>
                      Ostatnio przeglądane
                    </Text>
                    <Text style={[
                      styles.recentCount, 
                      { 
                        color: theme.colors.textSecondary,
                        fontFamily: theme.fontFamily.medium
                      }
                    ]}>
                      {filteredRecentArticles.length}
                    </Text>
                  </View>
                  
                  <View style={styles.recentActions}>
                    {showRecent && (
                      <TouchableOpacity 
                        onPress={handleClearRecent}
                        style={[
                          styles.clearButton,
                          { 
                            borderColor: theme.colors.border,
                            backgroundColor: theme.colors.subtle
                          }
                        ]}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.clearText, 
                          { 
                            color: theme.colors.textSecondary,
                            fontFamily: theme.fontFamily.medium
                          }
                        ]}>
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
                      <ArticleCard 
                        article={item} 
                        compact 
                        onPress={() => router.push(`/article/${item.id}`)}
                      />
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
      ) : (
        <FlatList
          data={savedEvents}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <EventCard 
              event={item} 
              onPress={() => router.push(`/event/${item.id}`)}
            />
          )}
          contentContainerStyle={styles.listContent}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          ListEmptyComponent={
            <EmptyState
              title="Brak zapisanych wydarzeń"
              message="Wydarzenia, które zapiszesz, pojawią się tutaj."
              actionLabel="Przeglądaj kalendarz"
              onAction={() => router.push('/(tabs)/kalendarz')}
              icon={<Calendar size={48} color={theme.colors.primary} />}
            />
          }
          ListFooterComponent={<View style={{ height: 120 }} />}
        />
      )}
      
      {/* Global TabBar */}
      <GlobalTabBar activeTab="saved" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  logo: {
    width: Platform.OS === 'ios' ? 100 : 110,
    height: Platform.OS === 'ios' ? 28 : 32,
    alignSelf: 'center',
    marginBottom: 12,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: Platform.select({
      ios: 120,
      android: 108,
      default: 108
    }),
    paddingHorizontal: 0,
  },
  recentSection: {
    marginTop: 24,
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
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
  },
  recentList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  separator: {
    height: 12,
  },
  // Event Card styles - improved
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  eventCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  eventImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 16,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    marginBottom: 8,
    lineHeight: 22,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eventDate: {
    fontSize: 12,
    marginRight: 8,
  },
  eventLocation: {
    fontSize: 12,
  },
  // Tab Selector - improved styling
  tabSelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  tabButtonText: {
    fontSize: 14,
  },
});