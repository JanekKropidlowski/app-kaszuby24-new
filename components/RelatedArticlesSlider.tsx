import React from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Clock } from 'lucide-react-native';
import { Article } from '@/types/article';
import { getRelativeTime } from '@/utils/dateFormatter';
import { useThemeStore } from '@/store/themeStore';
import { useArticlesStore } from '@/store/articlesStore';

interface RelatedArticlesSliderProps {
  articles: Article[];
  title: string;
}

const { width } = Dimensions.get('window');
const ITEM_WIDTH = width * 0.75;
const ITEM_SPACING = 16;

export const RelatedArticlesSlider: React.FC<RelatedArticlesSliderProps> = ({ 
  articles, 
  title 
}) => {
  const router = useRouter();
  const { theme } = useThemeStore();
  const { addRecentArticle } = useArticlesStore();
  
  const handleArticlePress = (article: Article) => {
    addRecentArticle(article);
    router.push(`/article/${article.id}`);
  };
  
  const renderArticle = ({ item }: { item: Article }) => (
    <TouchableOpacity
      style={[
        styles.articleItem,
        { 
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
          width: ITEM_WIDTH
        }
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
        <View style={[styles.articleImagePlaceholder, { backgroundColor: theme.colors.subtle }]} />
      )}
      
      <View style={styles.articleContent}>
        <Text 
          style={[
            styles.articleTitle, 
            { 
              color: theme.colors.text,
              fontFamily: theme.fontFamily.medium
            }
          ]} 
          numberOfLines={2}
        >
          {item.title.rendered.replace(/&#8211;/g, '-').replace(/&#8217;/g, "'")}
        </Text>
        
        <View style={styles.articleFooter}>
          <Clock size={12} color={theme.colors.textSecondary} />
          <Text style={[
            styles.articleDate, 
            { 
              color: theme.colors.textSecondary,
              fontFamily: theme.fontFamily.regular
            }
          ]}>
            {getRelativeTime(item.date)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
  
  if (articles.length === 0) {
    return null;
  }
  
  return (
    <View style={styles.container}>
      <Text style={[
        styles.title, 
        { 
          color: theme.colors.text,
          fontFamily: theme.fontFamily.semibold
        }
      ]}>
        {title}
      </Text>
      
      <FlatList
        data={articles}
        keyExtractor={(item) => `related-${item.id}`}
        renderItem={renderArticle}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        snapToInterval={ITEM_WIDTH + ITEM_SPACING}
        decelerationRate="fast"
        ItemSeparatorComponent={() => <View style={{ width: ITEM_SPACING }} />}
        getItemLayout={(data, index) => ({
          length: ITEM_WIDTH + ITEM_SPACING,
          offset: (ITEM_WIDTH + ITEM_SPACING) * index,
          index,
        })}
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
    marginBottom: 16,
    marginHorizontal: 24,
  },
  listContent: {
    paddingHorizontal: 24,
  },
  articleItem: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
  },
  articleImage: {
    width: '100%',
    height: 140,
  },
  articleImagePlaceholder: {
    width: '100%',
    height: 140,
  },
  articleContent: {
    padding: 16,
  },
  articleTitle: {
    fontSize: 16,
    marginBottom: 12,
    lineHeight: 22,
  },
  articleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  articleDate: {
    fontSize: 12,
    marginLeft: 4,
  },
});