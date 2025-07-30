import React, { memo, useCallback, useRef, useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Bookmark, Clock } from 'lucide-react-native';
import { Article } from '@/types/article';
import { getRelativeTime } from '@/utils/dateFormatter';
import { useArticlesStore } from '@/store/articlesStore';
import { useThemeStore } from '@/store/themeStore';
import { isSponsoredContent } from '@/utils/contentFilter';
import { getProgressiveImageProps } from '@/utils/imageOptimizer';
import { Vibration } from 'react-native';

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
  
  if (isSponsored) {
    return null;
  }
  
  const lastTapTime = useRef(0);
  const isPressingRef = useRef(false);
  
  const handlePressIn = useCallback(() => {
    if (Platform.OS !== 'web') {
      import('@/services/api').then(({ prefetchArticleById }) => {
        prefetchArticleById(article.id).catch(() => {
          // Silent fail for prefetch
        });
      });
    }
  }, [article.id]);
  
  const handlePress = useCallback(() => {
    const now = Date.now();
    if (now - lastTapTime.current < 500 || isPressingRef.current) {
      return;
    }
    
    isPressingRef.current = true;
    lastTapTime.current = now;
    
    if (onPress) {
      onPress();
    } else {
      router.push(`/article/${article.id}`);
    }
    
    setTimeout(() => {
      isPressingRef.current = false;
    }, 300);
  }, [onPress, router, article.id]);
  
  const toggleSave = useCallback((e: any) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (isSponsored) {
      return;
    }
    
    if (isSaved) {
      removeArticle(article.id);
    } else {
      saveArticle(article);
    }
  }, [isSponsored, isSaved, removeArticle, saveArticle, article]);

  const cleanExcerpt = article.excerpt.rendered
    .replace(/<\/?[^>]+(>|$)/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#8230;/g, '...');
  
  let categoryName = "";
  if (article._embedded && article._embedded["wp:term"]) {
    const categories = article._embedded["wp:term"][0];
    if (categories && categories.length > 0) {
      categoryName = categories[0].name;
    }
  }
  
  const renderImage = useMemo(() => {
    if (article.featured_media_url) {
      const imageProps = getProgressiveImageProps(
        article.featured_media_url, 
        compact ? 'thumbnail' : 'list'
      );
      
      return (
        <Image
          source={imageProps.source}
          placeholder={imageProps.placeholder}
          style={compact ? styles.compactImage : styles.image}
          contentFit={imageProps.contentFit}
          priority={imageProps.priority}
          cachePolicy={imageProps.cachePolicy as "memory-disk" | "memory"}
          transition={imageProps.transition}
          allowDownscaling={imageProps.allowDownscaling}
          recyclingKey={imageProps.recyclingKey}
        />
      );
    } else {
      return (
        <View 
          style={[
            compact ? styles.compactImagePlaceholder : styles.imagePlaceholder, 
            { backgroundColor: theme.colors.subtle }
          ]} 
        />
      );
    }
  }, [article.featured_media_url, compact, theme.colors.subtle]);
  
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
        onPressIn={handlePressIn}
        activeOpacity={0.7}
        disabled={false}
      >
        {renderImage}
        
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
      onPressIn={handlePressIn}
      activeOpacity={0.7}
      disabled={false}
    >
      {renderImage}
      
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
  return (
    prevProps.article.id === nextProps.article.id &&
    prevProps.compact === nextProps.compact &&
    prevProps.article.title.rendered === nextProps.article.title.rendered &&
    prevProps.article.featured_media_url === nextProps.article.featured_media_url &&
    prevProps.article.date === nextProps.article.date &&
    prevProps.article.modified === nextProps.article.modified
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
    fontSize: Platform.OS === 'android' ? 17 : 16,
    fontWeight: '600',
    lineHeight: Platform.OS === 'android' ? 24 : 22,
    marginBottom: 8,
    letterSpacing: Platform.OS === 'android' ? -0.1 : -0.2,
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
    fontSize: Platform.OS === 'android' ? 13 : 12,
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
    fontSize: Platform.OS === 'android' ? 16 : 15,
    fontWeight: '600',
    marginBottom: 8,
    lineHeight: Platform.OS === 'android' ? 22 : 20,
    letterSpacing: Platform.OS === 'android' ? -0.1 : -0.2,
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
    fontSize: Platform.OS === 'android' ? 12 : 11,
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