import React, { memo, useCallback, useRef } from 'react';
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
  
  // Add ref to prevent double taps
  const lastTapTime = useRef(0);
  
  const handlePress = useCallback(() => {
    const now = Date.now();
    if (now - lastTapTime.current < 500) {
      // Prevent double tap within 500ms
      return;
    }
    lastTapTime.current = now;
    
    if (onPress) {
      onPress();
    } else {
      // Only navigate if no custom onPress is provided
      router.push(`/article/${article.id}`);
    }
  }, [onPress, router, article.id]);
  
  const toggleSave = useCallback((e: any) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Don't allow saving sponsored content
    if (isSponsored) {
      return;
    }
    
    if (isSaved) {
      removeArticle(article.id);
    } else {
      saveArticle(article);
    }
  }, [isSponsored, isSaved, removeArticle, saveArticle, article]);

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
            borderBottomColor: theme.colors.border,
          }
        ]} 
        onPress={handlePress}
        activeOpacity={0.7}
        disabled={false}
      >
        {/* Image on the left */}
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
        
        {/* Text content on the right */}
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
          borderBottomColor: theme.colors.border,
        }
      ]} 
      onPress={handlePress}
      activeOpacity={0.7}
      disabled={false}
    >
      {/* Image on the left */}
      {article.featured_media_url ? (
        <Image
          source={{ uri: article.featured_media_url }}
          style={styles.image}
          contentFit="cover"
          transition={200}
          placeholder="Loading..."
          cachePolicy="memory-disk"
          priority="normal"
        />
      ) : (
        <View style={[styles.imagePlaceholder, { backgroundColor: theme.colors.subtle }]} />
      )}
      
      {/* Text content on the right */}
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
              activeOpacity={0.7}
            >
              <Bookmark 
                size={16} 
                color={isSaved ? theme.colors.primary : theme.colors.textSecondary} 
                fill={isSaved ? theme.colors.primary : 'transparent'} 
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  // Improved comparison function for better performance
  return (
    prevProps.article.id === nextProps.article.id &&
    prevProps.compact === nextProps.compact &&
    prevProps.article.title.rendered === nextProps.article.title.rendered &&
    prevProps.article.featured_media_url === nextProps.article.featured_media_url &&
    prevProps.article.date === nextProps.article.date
  );
});

ArticleCard.displayName = 'ArticleCard';

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 16,
  },
  imagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 16,
  },
  textContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  date: {
    fontSize: 12,
    marginLeft: 6,
    opacity: 0.7,
    fontWeight: '500',
  },
  bookmarkButton: {
    padding: 8,
    borderRadius: 12,
  },
  
  // Compact styles - improved
  compactContainer: {
    flexDirection: 'row',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  compactImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 16,
  },
  compactImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 16,
  },
  compactContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  compactTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  compactFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  compactTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactDate: {
    fontSize: 11,
    marginLeft: 6,
    opacity: 0.7,
    fontWeight: '500',
  },
  compactCategory: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  compactCategoryText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});

// Add default export for backward compatibility
export { ArticleCard };
export default ArticleCard;