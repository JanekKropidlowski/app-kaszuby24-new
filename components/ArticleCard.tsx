import React, { memo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Bookmark, Clock } from 'lucide-react-native';
import { Article } from '@/types/article';
import { getRelativeTime } from '@/utils/dateFormatter';
import { useArticlesStore } from '@/store/articlesStore';
import { useThemeStore } from '@/store/themeStore';
import { isSponsoredContent } from '@/utils/contentFilter';

interface ArticleCardProps {
  article: Article;
  compact?: boolean;
  onPress?: () => void;
}

const ArticleCard: React.FC<ArticleCardProps> = memo(({ 
  article, 
  compact = false, 
  onPress 
}) => {
  const router = useRouter();
  const { isArticleSaved, saveArticle, removeArticle } = useArticlesStore();
  const { theme } = useThemeStore();
  
  const isSaved = isArticleSaved(article.id);
  const isSponsored = isSponsoredContent(article);
  
  // Don't render sponsored content
  if (isSponsored) {
    return null;
  }
  
  const handlePress = () => {
    if (onPress) {
      onPress();
    }
    router.push(`/article/${article.id}`);
  };
  
  const toggleSave = (e: any) => {
    e.stopPropagation();
    
    // Don't allow saving sponsored content
    if (isSponsored) {
      return;
    }
    
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
      <TouchableOpacity 
        style={[
          styles.compactContainer,
          { 
            backgroundColor: theme.colors.card, 
            borderColor: theme.colors.border,
            shadowColor: Platform.OS === 'android' ? theme.colors.shadow : '#000',
          }
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
            placeholder="Loading..."
            cachePolicy="memory-disk"
            priority="normal"
          />
        ) : (
          <View style={[styles.compactImagePlaceholder, { backgroundColor: theme.colors.subtle }]} />
        )}
        
        <View style={styles.compactContent}>
          <Text style={[
            styles.compactTitle, 
            { 
              color: theme.colors.text, 
              fontFamily: theme.fontFamily.medium
            }
          ]} numberOfLines={2}>
            {article.title.rendered.replace(/&#8211;/g, '-').replace(/&#8217;/g, "'")}
          </Text>
          
          <View style={styles.compactFooter}>
            <View style={styles.compactTimeContainer}>
              <Clock size={12} color={theme.colors.textSecondary} />
              <Text style={[
                styles.compactDate, 
                { 
                  color: theme.colors.textSecondary, 
                  fontFamily: theme.fontFamily.regular
                }
              ]}>
                {getRelativeTime(article.date)}
              </Text>
            </View>
            
            {categoryName && (
              <View style={[styles.compactCategory, { backgroundColor: theme.colors.subtle }]}>
                <Text style={[
                  styles.compactCategoryText, 
                  { 
                    color: theme.colors.textSecondary,
                    fontFamily: theme.fontFamily.medium
                  }
                ]}>
                  {categoryName}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }
  
  return (
    <TouchableOpacity 
      style={[
        styles.container,
        { 
          backgroundColor: theme.colors.card, 
          borderColor: theme.colors.border,
          shadowColor: Platform.OS === 'android' ? theme.colors.shadow : '#000',
        }
      ]} 
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        <View style={styles.textContent}>
          {categoryName && (
            <View style={[styles.categoryBadge, { backgroundColor: theme.colors.primary + '15' }]}>
              <Text style={[
                styles.categoryText, 
                { 
                  color: theme.colors.primary,
                  fontFamily: theme.fontFamily.semibold
                }
              ]}>
                {categoryName}
              </Text>
            </View>
          )}
          
          <Text style={[
            styles.title, 
            { 
              color: theme.colors.text, 
              fontFamily: theme.fontFamily.medium
            }
          ]} numberOfLines={2}>
            {article.title.rendered.replace(/&#8211;/g, '-').replace(/&#8217;/g, "'")}
          </Text>
          
          <View style={styles.footer}>
            <View style={styles.timeContainer}>
              <Clock size={14} color={theme.colors.textSecondary} />
              <Text style={[
                styles.date, 
                { 
                  color: theme.colors.textSecondary, 
                  fontFamily: theme.fontFamily.regular
                }
              ]}>
                {getRelativeTime(article.date)}
              </Text>
            </View>
            
            {/* Only show bookmark button for non-sponsored content */}
            {!isSponsored && (
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
            )}
          </View>
        </View>
        
        {article.featured_media_url && (
          <Image
            source={{ uri: article.featured_media_url }}
            style={styles.image}
            contentFit="cover"
            transition={300}
            placeholder="Loading..."
            cachePolicy="memory-disk"
            priority="normal"
          />
        )}
      </View>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  return (
    prevProps.article.id === nextProps.article.id &&
    prevProps.compact === nextProps.compact &&
    prevProps.article.title.rendered === nextProps.article.title.rendered &&
    prevProps.article.featured_media_url === nextProps.article.featured_media_url
  );
});

ArticleCard.displayName = 'ArticleCard';

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    borderRadius: 32,
    marginBottom: 24,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 0,
  },
  cardContent: {
    flexDirection: 'row',
    padding: 28,
  },
  textContent: {
    flex: 1,
    marginRight: 24,
    justifyContent: 'space-between',
  },
  image: {
    width: 130,
    height: 130,
    borderRadius: 28,
  },
  categoryBadge: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 20,
    lineHeight: 28,
    letterSpacing: -0.3,
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
    fontSize: 13,
    marginLeft: 8,
    opacity: 0.7,
    fontWeight: '600',
  },
  bookmarkButton: {
    padding: 14,
    borderRadius: 24,
  },
  
  // Compact styles - improved
  compactContainer: {
    flexDirection: 'row',
    borderRadius: 28,
    marginBottom: 20,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 0,
  },
  compactImage: {
    width: 110,
    height: 110,
  },
  compactImagePlaceholder: {
    width: 110,
    height: 110,
  },
  compactContent: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  compactTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 16,
    lineHeight: 24,
    letterSpacing: -0.2,
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
    marginLeft: 6,
    opacity: 0.7,
    fontWeight: '600',
  },
  compactCategory: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  compactCategoryText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});

// Add default export for backward compatibility
export { ArticleCard };
export default ArticleCard;