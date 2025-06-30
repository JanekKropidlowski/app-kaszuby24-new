import React, { memo, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Article } from '@/types/article';
import { useThemeStore } from '@/store/themeStore';
import { useArticlesStore } from '@/store/articlesStore';
import { formatDateTime } from '@/utils/dateFormatter';

interface RelatedArticlesSliderProps {
  articles: Article[];
  title: string;
}

const { width } = Dimensions.get('window');
const ITEM_WIDTH = width * 0.82; // Slightly smaller for better center mode
const ITEM_SPACING = 16;

// Memoized article item component for better performance
const RelatedArticleItem = memo(({ 
  item, 
  index, 
  totalItems, 
  onPress 
}: { 
  item: Article; 
  index: number; 
  totalItems: number;
  onPress: (article: Article) => void;
}) => {
  const { theme } = useThemeStore();
  
  return (
    <TouchableOpacity
      style={[
        styles.articleContainer,
        {
          width: ITEM_WIDTH,
          marginRight: index === totalItems - 1 ? 24 : ITEM_SPACING,
          backgroundColor: theme.colors.card,
          shadowColor: theme.colors.shadow,
        },
      ]}
      onPress={() => onPress(item)}
      activeOpacity={0.8}
    >
      {item.featured_media_url ? (
        <Image
          source={{ uri: item.featured_media_url }}
          style={styles.articleImage}
          contentFit="cover"
          transition={200}
          placeholder="Loading..."
          cachePolicy="memory-disk"
          priority="normal"
        />
      ) : (
        <View style={[styles.imagePlaceholder, { backgroundColor: theme.colors.subtle }]} />
      )}
      
      <View style={styles.articleContent}>
        <Text
          style={[
            styles.articleTitle,
            { 
              color: theme.colors.text,
              fontFamily: theme.fontFamily.semibold
            }
          ]}
          numberOfLines={2}
        >
          {item.title.rendered.replace(/&#8211;/g, '-').replace(/&#8217;/g, "'")}
        </Text>
        
        <Text
          style={[
            styles.articleDate,
            { 
              color: theme.colors.textSecondary,
              fontFamily: theme.fontFamily.regular
            }
          ]}
        >
          {formatDateTime(item.date)}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

export const RelatedArticlesSlider: React.FC<RelatedArticlesSliderProps> = memo(({
  articles,
  title,
}) => {
  const router = useRouter();
  const { theme } = useThemeStore();
  const { addRecentArticle } = useArticlesStore();

  const handleArticlePress = useCallback((article: Article) => {
    addRecentArticle(article);
    router.push(`/article/${article.id}`);
  }, [addRecentArticle, router]);

  const renderArticle = useCallback(({ item, index }: { item: Article; index: number }) => (
    <RelatedArticleItem
      item={item}
      index={index % articles.length}
      totalItems={articles.length}
      onPress={handleArticlePress}
    />
  ), [articles.length, handleArticlePress]);

  const keyExtractor = useCallback((item: Article, index: number) => `related-${item.id}-${index}`, []);

  if (articles.length === 0) {
    return null;
  }

  // Create infinite data by repeating the array 5 times for better infinite scroll
  const infiniteData = articles.length > 1 ? 
    [...articles, ...articles, ...articles, ...articles, ...articles] : 
    articles;

  return (
    <View style={styles.container}>
      <Text
        style={[
          styles.title,
          { 
            color: theme.colors.text,
            fontFamily: theme.fontFamily.bold
          }
        ]}
      >
        {title}
      </Text>
      
      <FlatList
        data={infiniteData}
        renderItem={renderArticle}
        keyExtractor={keyExtractor}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        snapToInterval={ITEM_WIDTH + ITEM_SPACING}
        snapToAlignment="center"
        decelerationRate="fast"
        removeClippedSubviews={false}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={7}
        pagingEnabled={false}
        initialScrollIndex={articles.length > 1 ? articles.length * 2 : 0} // Start at middle set
        getItemLayout={(data, index) => ({
          length: ITEM_WIDTH + ITEM_SPACING,
          offset: (ITEM_WIDTH + ITEM_SPACING) * index,
          index,
        })}
        onScrollToIndexFailed={() => {
          // Handle scroll failure gracefully
        }}
      />
    </View>
  );
});

RelatedArticlesSlider.displayName = 'RelatedArticlesSlider';

const styles = StyleSheet.create({
  container: {
    marginBottom: 36,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 24,
    marginHorizontal: 28,
    letterSpacing: -0.4,
  },
  listContainer: {
    paddingLeft: (width - ITEM_WIDTH) / 2, // Center the items
    paddingRight: (width - ITEM_WIDTH) / 2,
  },
  articleContainer: {
    borderRadius: 28,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  articleImage: {
    width: '100%',
    height: 200,
  },
  imagePlaceholder: {
    width: '100%',
    height: 200,
  },
  articleContent: {
    padding: 28,
  },
  articleTitle: {
    fontSize: 19,
    fontWeight: '700',
    lineHeight: 28,
    marginBottom: 16,
    letterSpacing: -0.2,
  },
  articleDate: {
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.7,
    letterSpacing: 0.2,
  },
});