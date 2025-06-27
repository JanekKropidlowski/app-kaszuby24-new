import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Bookmark } from 'lucide-react-native';
import { Article } from '@/types/article';
import { getRelativeTime } from '@/utils/dateFormatter';
import { useArticlesStore } from '@/store/articlesStore';
import { useThemeStore } from '@/store/themeStore';

interface ArticleCardProps {
  article: Article;
  compact?: boolean;
  onPress?: () => void;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({ 
  article, 
  compact = false, 
  onPress 
}) => {
  const router = useRouter();
  const { isArticleSaved, saveArticle, removeArticle } = useArticlesStore();
  const { theme } = useThemeStore();
  
  const isSaved = isArticleSaved(article.id);
  
  const handlePress = () => {
    if (onPress) {
      onPress();
    }
    router.push(`/article/${article.id}`);
  };
  
  const toggleSave = (e: any) => {
    e.stopPropagation();
    if (isSaved) {
      removeArticle(article.id);
    } else {
      saveArticle(article);
    }
  };
  
  // Create a clean excerpt by removing HTML tags
  const cleanExcerpt = article.excerpt.rendered
    .replace(/<\/?[^>]+(>|$)/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#8230;/g, '...');
  
  if (compact) {
    return (
      <TouchableOpacity 
        style={[
          styles.compactContainer,
          { backgroundColor: theme.colors.card, borderColor: theme.colors.border }
        ]} 
        onPress={handlePress}
        activeOpacity={0.7}
      >
        {article.featured_media_url ? (
          <Image
            source={{ uri: article.featured_media_url }}
            style={styles.compactImage}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={[styles.compactImagePlaceholder, { backgroundColor: theme.colors.subtle }]} />
        )}
        
        <View style={styles.compactContent}>
          <Text style={[styles.compactTitle, { color: theme.colors.text }]} numberOfLines={2}>
            {article.title.rendered.replace(/&#8211;/g, '-').replace(/&#8217;/g, "'")}
          </Text>
          
          <Text style={[styles.compactDate, { color: theme.colors.textSecondary }]}>
            {getRelativeTime(article.date)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }
  
  return (
    <TouchableOpacity 
      style={[
        styles.container,
        { backgroundColor: theme.colors.card, borderColor: theme.colors.border }
      ]} 
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        <View style={styles.textContent}>
          <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={2}>
            {article.title.rendered.replace(/&#8211;/g, '-').replace(/&#8217;/g, "'")}
          </Text>
          
          <View style={styles.footer}>
            <Text style={[styles.date, { color: theme.colors.textSecondary }]}>
              {getRelativeTime(article.date)}
            </Text>
            
            <TouchableOpacity 
              onPress={toggleSave} 
              style={styles.bookmarkButton}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
            >
              <Bookmark 
                size={18} 
                color={isSaved ? theme.colors.primary : theme.colors.textSecondary} 
                fill={isSaved ? theme.colors.primary : 'transparent'} 
              />
            </TouchableOpacity>
          </View>
        </View>
        
        {article.featured_media_url && (
          <Image
            source={{ uri: article.featured_media_url }}
            style={styles.image}
            contentFit="cover"
            transition={300}
          />
        )}
      </View>
    </TouchableOpacity>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
  },
  cardContent: {
    flexDirection: 'row',
    padding: 16,
  },
  textContent: {
    flex: 1,
    marginRight: 12,
    justifyContent: 'space-between',
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    lineHeight: 22,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    fontSize: 12,
  },
  bookmarkButton: {
    padding: 4,
  },
  
  // Compact styles
  compactContainer: {
    flexDirection: 'row',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1,
  },
  compactImage: {
    width: 80,
    height: 80,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  compactImagePlaceholder: {
    width: 80,
    height: 80,
  },
  compactContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  compactTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  compactDate: {
    fontSize: 12,
  },
});

// Add default export for backward compatibility
export default ArticleCard;