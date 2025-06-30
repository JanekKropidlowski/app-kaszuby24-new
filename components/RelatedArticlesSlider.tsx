import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Dimensions, TouchableOpacity, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Article } from '@/types/article';
import { useThemeStore } from '@/store/themeStore';
import { formatDateTime } from '@/utils/dateFormatter';

interface RelatedArticlesSliderProps {
  articles: Article[];
  title: string;
}

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.7;
const CARD_MARGIN = 16;
const PEEK_AMOUNT = 20; // 20% peek of next card

export const RelatedArticlesSlider: React.FC<RelatedArticlesSliderProps> = ({ articles, title }) => {
  const { theme } = useThemeStore();
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scrollPosition, setScrollPosition] = useState(0);

  // Limit to max 5 articles and duplicate them for infinity scroll
  const limitedArticles = articles.slice(0, 5);
  
  // Create infinite scroll by duplicating articles
  const infiniteArticles = limitedArticles.length > 0 
    ? [...limitedArticles, ...limitedArticles, ...limitedArticles] 
    : [];

  if (limitedArticles.length === 0) return null;

  const handleArticlePress = (article: Article) => {
    router.push(`/article/${article.id}`);
  };

  const handleScroll = (event: any) => {
    const scrollX = event.nativeEvent.contentOffset.x;
    setScrollPosition(scrollX);
    
    const totalWidth = (CARD_WIDTH + CARD_MARGIN) * limitedArticles.length;
    const index = Math.round(scrollX / (CARD_WIDTH + CARD_MARGIN)) % limitedArticles.length;
    setCurrentIndex(Math.max(0, Math.min(index, limitedArticles.length - 1)));
    
    // Handle infinite scroll - reset position when reaching end or beginning
    if (scrollX >= totalWidth * 2) {
      // Reset to middle section
      scrollViewRef.current?.scrollTo({ 
        x: totalWidth, 
        animated: false 
      });
    } else if (scrollX <= 0) {
      // Reset to middle section
      scrollViewRef.current?.scrollTo({ 
        x: totalWidth, 
        animated: false 
      });
    }
  };

  // Initialize scroll position to middle section
  useEffect(() => {
    if (infiniteArticles.length > 0) {
      const initialPosition = (CARD_WIDTH + CARD_MARGIN) * limitedArticles.length;
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ 
          x: initialPosition, 
          animated: false 
        });
      }, 100);
    }
  }, [infiniteArticles.length, limitedArticles.length]);

  const renderArticleCard = (article: Article, index: number) => (
    <TouchableOpacity
      key={`${article.id}-${index}`}
      style={[
        styles.card,
        { 
          backgroundColor: theme.colors.card,
          width: CARD_WIDTH,
          marginRight: CARD_MARGIN,
        },
      ]}
      onPress={() => handleArticlePress(article)}
      activeOpacity={0.8}
    >
      {article.featured_media_url && (
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: article.featured_media_url }}
            style={styles.cardImage}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
          />
        </View>
      )}
      
      <View style={styles.cardContent}>
        <Text 
          style={[
            styles.cardTitle, 
            { 
              color: theme.colors.text,
              fontFamily: Platform.OS === 'android' ? undefined : theme.fontFamily.semibold
            }
          ]}
          numberOfLines={2}
        >
          {article.title.rendered.replace(/&#8211;/g, '-').replace(/&#8217;/g, "'")}
        </Text>
        
        <Text 
          style={[
            styles.cardDate, 
            { 
              color: theme.colors.textSecondary,
              fontFamily: Platform.OS === 'android' ? undefined : theme.fontFamily.regular
            }
          ]}
        >
          {formatDateTime(article.date)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderIndicators = () => (
    <View style={styles.indicatorContainer}>
      {limitedArticles.map((_, index) => (
        <View
          key={`indicator-${index}`}
          style={[
            styles.indicator,
            {
              backgroundColor: index === currentIndex ? theme.colors.primary : theme.colors.textSecondary,
              opacity: index === currentIndex ? 1 : 0.3,
              transform: [{ scale: index === currentIndex ? 1.2 : 1 }],
            },
          ]}
        />
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={[
        styles.title, 
        { 
          color: theme.colors.text,
          fontFamily: Platform.OS === 'android' ? undefined : theme.fontFamily.semibold
        }
      ]}>
        {title}
      </Text>
      
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingRight: PEEK_AMOUNT }
        ]}
        snapToInterval={CARD_WIDTH + CARD_MARGIN}
        snapToAlignment="start"
        decelerationRate="fast"
        onScroll={handleScroll}
        scrollEventThrottle={16}
        pagingEnabled={false}
        onMomentumScrollEnd={handleScroll}
      >
        {infiniteArticles.map((article, index) => renderArticleCard(article, index))}
      </ScrollView>
      
      {limitedArticles.length > 1 && renderIndicators()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    marginHorizontal: 24,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 8, // Add space for shadow
  },
  imageContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: 120,
  },
  cardContent: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 8,
  },
  cardDate: {
    fontSize: 12,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 24,
  },
  indicator: {
    height: 6,
    width: 6,
    borderRadius: 3,
    marginHorizontal: 3,
  },
});