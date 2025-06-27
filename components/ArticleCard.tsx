import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, Animated } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Bookmark, Clock } from 'lucide-react-native';
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
  const animatedScale = new Animated.Value(1);
  
  const handlePress = () => {
    // Animate the card press
    Animated.sequence([
      Animated.timing(animatedScale, {
        toValue: 0.98,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(animatedScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    
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
  
  // Get category name if available
  let categoryName = "";
  if (article._embedded && article._embedded["wp:term"]) {
    const categories = article._embedded["wp:term"][0];
    if (categories && categories.length > 0) {
      categoryName = categories[0].name;
    }
  }
  
  if (compact) {
    return (
      <Animated.View style={{ transform: [{ scale: animatedScale }] }}>
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
            <Text style={[styles.compactTitle, { color: theme.colors.text, fontFamily: theme.fontFamily?.medium || 'Poppins-Medium' }]} numberOfLines={2}>
              {article.title.rendered.replace(/&#8211;/g, '-').replace(/&#8217;/g, "'")}
            </Text>
            
            <View style={styles.compactFooter}>
              <View style={styles.compactTimeContainer}>
                <Clock size={12} color={theme.colors.textSecondary} />
                <Text style={[styles.compactDate, { color: theme.colors.textSecondary, fontFamily: theme.fontFamily?.regular || 'Poppins-Regular' }]}>
                  {getRelativeTime(article.date)}
                </Text>
              </View>
              
              {categoryName && (
                <View style={[styles.compactCategory, { backgroundColor: theme.colors.subtle }]}>
                  <Text style={[styles.compactCategoryText, { color: theme.colors.textSecondary }]}>
                    {categoryName}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }
  
  return (
    <Animated.View style={{ transform: [{ scale: animatedScale }] }}>
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
            {categoryName && (
              <View style={[styles.categoryBadge, { backgroundColor: theme.colors.subtle }]}>
                <Text style={[styles.categoryText, { color: theme.colors.primary }]}>
                  {categoryName}
                </Text>
              </View>
            )}
            
            <Text style={[styles.title, { color: theme.colors.text, fontFamily: theme.fontFamily?.medium || 'Poppins-Medium' }]} numberOfLines={2}>
              {article.title.rendered.replace(/&#8211;/g, '-').replace(/&#8217;/g, "'")}
            </Text>
            
            <View style={styles.footer}>
              <View style={styles.timeContainer}>
                <Clock size={14} color={theme.colors.textSecondary} />
                <Text style={[styles.date, { color: theme.colors.textSecondary, fontFamily: theme.fontFamily?.regular || 'Poppins-Regular' }]}>
                  {getRelativeTime(article.date)}
                </Text>
              </View>
              
              <TouchableOpacity 
                onPress={toggleSave} 
                style={[
                  styles.bookmarkButton,
                  isSaved && { backgroundColor: theme.colors.primary + '20' }
                ]}
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
    </Animated.View>
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
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600',
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
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  date: {
    fontSize: 12,
    marginLeft: 4,
  },
  bookmarkButton: {
    padding: 8,
    borderRadius: 8,
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
  compactFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactDate: {
    fontSize: 12,
    marginLeft: 4,
  },
  compactCategory: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  compactCategoryText: {
    fontSize: 10,
    fontWeight: '500',
  },
});

// Add default export for backward compatibility
export default ArticleCard;