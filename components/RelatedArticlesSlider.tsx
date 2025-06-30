import React, { useRef } from 'react';
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
const CARD_WIDTH = width * 0.75;
const CARD_MARGIN = 12;

export const RelatedArticlesSlider: React.FC<RelatedArticlesSliderProps> = ({ articles, title }) => {
  const { theme } = useThemeStore();
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);

  if (articles.length === 0) return null;

  const handleArticlePress = (article: Article) => {
    router.push(`/article/${article.id}`);
  };

  const renderArticleCard = (article: Article, index: number) => (
    <TouchableOpacity
      key={article.id}
      style={[
        styles.card,
        { backgroundColor: theme.colors.card },
        index === 0 && styles.firstCard,
        index === articles.length - 1 && styles.lastCard,
      ]}
      onPress={() => handleArticlePress(article)}
      activeOpacity={0.8}
    >
      {article.featured_media_url && (
        <Image
          source={{ uri: article.featured_media_url }}
          style={styles.cardImage}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
        />
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
          numberOfLines={3}
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
        contentContainerStyle={styles.scrollContent}
        snapToInterval={CARD_WIDTH + CARD_MARGIN * 2}
        snapToAlignment="center"
        decelerationRate="fast"
        pagingEnabled={false}
      >
        {articles.map((article, index) => renderArticleCard(article, index))}
      </ScrollView>
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
    paddingHorizontal: 12,
  },
  card: {
    width: CARD_WIDTH,
    marginHorizontal: CARD_MARGIN,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  firstCard: {
    marginLeft: 24,
  },
  lastCard: {
    marginRight: 24,
  },
  cardImage: {
    width: '100%',
    height: 140,
  },
  cardContent: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: 8,
  },
  cardDate: {
    fontSize: 12,
  },
});