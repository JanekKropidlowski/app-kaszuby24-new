import React from 'react';
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
const ITEM_WIDTH = width * 0.8; // Increased width for full width
const ITEM_SPACING = 16;

const RelatedArticlesSlider: React.FC<RelatedArticlesSliderProps> = ({
  articles,
  title,
}) => {
  const router = useRouter();
  const { theme } = useThemeStore();
  const { addRecentArticle } = useArticlesStore();

  const handleArticlePress = (article: Article) => {
    addRecentArticle(article);
    router.push(`/article/${article.id}`);
  };

  const renderArticle = ({ item, index }: { item: Article; index: number }) => (
    <TouchableOpacity
      style={[
        styles.articleContainer,
        {
          width: ITEM_WIDTH,
          marginRight: index === articles.length - 1 ? 24 : ITEM_SPACING,
          backgroundColor: theme.colors.card,
          shadowColor: theme.colors.shadow,
        },
      ]}
      onPress={() => handleArticlePress(item)}
      activeOpacity={0.8}
    >
      {item.featured_media_url ? (
        <Image
          source={{ uri: item.featured_media_url }}
          style={styles.articleImage}
          contentFit="cover"
          transition={200}
          placeholder="Loading..."
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

  if (articles.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text
        style={[
          styles.title,
          { 
            color: theme.colors.text,
            fontFamily: theme.fontFamily.semibold
          }
        ]}
      >
        {title}
      </Text>
      
      <FlatList
        data={articles}
        renderItem={renderArticle}
        keyExtractor={(item) => `related-${item.id}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        snapToInterval={ITEM_WIDTH + ITEM_SPACING}
        decelerationRate="fast"
        removeClippedSubviews={false}
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        windowSize={5}
        pagingEnabled={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    marginHorizontal: 24,
  },
  listContainer: {
    paddingLeft: 24,
    paddingRight: 8, // Small padding at the end
  },
  articleContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  articleImage: {
    width: '100%',
    height: 140,
  },
  imagePlaceholder: {
    width: '100%',
    height: 140,
  },
  articleContent: {
    padding: 16,
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: 8,
  },
  articleDate: {
    fontSize: 12,
    fontWeight: '400',
  },
});

export default React.memo(RelatedArticlesSlider);