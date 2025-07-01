import React, { memo, useCallback, useMemo } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Dimensions, Platform } from 'react-native';
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
const ITEM_WIDTH = width * 0.8; // Adjusted for better centering
const ITEM_SPACING = 16;

// Enhanced memoized article item component
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
  
  // Prefetch on press start for better performance
  const handlePressIn = useCallback(() => {
    if (Platform.OS !== 'web') {
      import('@/services/api').then(({ prefetchArticleById }) => {
        prefetchArticleById(item.id).catch(() => {
          // Silent fail for prefetch
        });
      });
    }
  }, [item.id]);
  
  // Memoized image rendering with progressive loading
  const renderImage = useMemo(() => {
    if (item.featured_media_url) {
      return (
        <Image
          source={{ uri: item.featured_media_url }}
          style={styles.articleImage}
          contentFit="cover"
          transition={200}
          placeholder="Loading..."
          cachePolicy="memory-disk"
          priority="normal"
        />
      );
    } else {
      return (
        <View style={[styles.imagePlaceholder, { backgroundColor: theme.colors.subtle }]} />
      );
    }
  }, [item.featured_media_url, theme.colors.subtle]);
  
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
      onPressIn={handlePressIn}
      activeOpacity={0.8}
    >
      {renderImage}
      
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
}, (prevProps, nextProps) => {
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.index === nextProps.index &&
    prevProps.totalItems === nextProps.totalItems &&
    prevProps.item.title.rendered === nextProps.item.title.rendered &&
    prevProps.item.featured_media_url === nextProps.item.featured_media_url
  );
});

RelatedArticleItem.displayName = 'RelatedArticleItem';

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

  // Memoized list configuration for better performance
  const listConfig = useMemo(() => ({
    initialNumToRender: 3,
    maxToRenderPerBatch: 2,
    windowSize: 5,
    removeClippedSubviews: Platform.OS === 'android',
    updateCellsBatchingPeriod: 50,
  }), []);

  if (articles.length === 0) {
    return null;
  }

  const infiniteData = articles.length > 1 ? 
    [...articles, ...articles, ...articles] : 
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
        removeClippedSubviews={listConfig.removeClippedSubviews}
        initialNumToRender={listConfig.initialNumToRender}
        maxToRenderPerBatch={listConfig.maxToRenderPerBatch}
        windowSize={listConfig.windowSize}
        pagingEnabled={false}
        initialScrollIndex={articles.length > 1 ? articles.length : 0}
        getItemLayout={(data, index) => ({
          length: ITEM_WIDTH + ITEM_SPACING,
          offset: (ITEM_WIDTH + ITEM_SPACING) * index,
          index,
        })}
        onScrollToIndexFailed={() => {
          // Handle scroll failure gracefully
        }}
        updateCellsBatchingPeriod={listConfig.updateCellsBatchingPeriod}
        disableVirtualization={false}
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
          autoscrollToTopThreshold: 10,
        }}
      />
    </View>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.title === nextProps.title &&
    prevProps.articles.length === nextProps.articles.length &&
    prevProps.articles.every((article, index) => 
      article.id === nextProps.articles[index]?.id &&
      article.title.rendered === nextProps.articles[index]?.title.rendered
    )
  );
});

RelatedArticlesSlider.displayName = 'RelatedArticlesSlider';

const styles = StyleSheet.create({
  container: {
    marginBottom: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 20,
    marginHorizontal: 28,
    letterSpacing: -0.3,
  },
  listContainer: {
    paddingHorizontal: (width - ITEM_WIDTH) / 2, // Perfect centering
  },
  articleContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  articleImage: {
    width: '100%',
    height: 180,
  },
  imagePlaceholder: {
    width: '100%',
    height: 180,
  },
  articleContent: {
    padding: 20,
  },
  articleTitle: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 24,
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  articleDate: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.7,
    letterSpacing: 0.2,
  },
});