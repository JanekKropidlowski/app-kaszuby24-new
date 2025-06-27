import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Share,
  Platform,
  Dimensions,
  Linking,
  Animated
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { WebView } from 'react-native-webview';
import { Bookmark, Share2, RefreshCw, ArrowLeft, Clock, Calendar, Eye } from 'lucide-react-native';
import { fetchArticleById } from '@/services/api';
import { Article } from '@/types/article';
import LoadingIndicator from '@/components/LoadingIndicator';
import EmptyState from '@/components/EmptyState';
import VideoPlayer from '@/components/VideoPlayer';
import { useArticlesStore } from '@/store/articlesStore';
import { formatDateTime } from '@/utils/dateFormatter';
import { cleanHtml, extractVideoUrls } from '@/utils/htmlParser';
import { useThemeStore } from '@/store/themeStore';

const MAX_RETRIES = 3;
const { width } = Dimensions.get('window');

export default function ArticleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isArticleSaved, saveArticle, removeArticle, addRecentArticle } = useArticlesStore();
  const { theme, isDarkMode } = useThemeStore();
  
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoUrls, setVideoUrls] = useState<string[]>([]);
  const [webViewHeight, setWebViewHeight] = useState(300);
  
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  
  const articleId = parseInt(id as string, 10);
  const isSaved = isArticleSaved(articleId);
  
  useEffect(() => {
    const loadArticle = async (retry = 0) => {
      try {
        setLoading(true);
        setError(null);
        
        const data = await fetchArticleById(articleId);
        setArticle(data);
        
        // Extract video URLs from content
        if (data.content.rendered) {
          const videos = extractVideoUrls(data.content.rendered);
          setVideoUrls(videos);
        }
        
        // Add to recent articles
        addRecentArticle(data);
      } catch (err) {
        console.error('Error loading article:', err);
        
        // Retry logic
        if (retry < MAX_RETRIES) {
          console.log(`Retrying article load (${retry + 1}/${MAX_RETRIES})...`);
          setTimeout(() => {
            loadArticle(retry + 1);
          }, 1000 * (retry + 1)); // Exponential backoff
          return;
        }
        
        setError('Nie udało się załadować artykułu. Spróbuj ponownie.');
      } finally {
        setLoading(false);
      }
    };
    
    loadArticle();
  }, [articleId, addRecentArticle]);
  
  const toggleSave = () => {
    if (!article) return;
    
    if (isSaved) {
      removeArticle(articleId);
    } else {
      saveArticle(article);
    }
  };
  
  const handleShare = async () => {
    if (!article) return;
    
    try {
      if (Platform.OS === 'web') {
        // Web implementation
        if (navigator.share) {
          await navigator.share({
            title: article.title.rendered,
            text: 'Sprawdź ten artykuł!',
            url: article.link,
          });
        } else {
          // Fallback for browsers that don't support the Web Share API
          alert(`Skopiuj ten link, aby udostępnić: ${article.link}`);
        }
      } else {
        // Native implementation
        await Share.share({
          title: article.title.rendered,
          message: `${article.title.rendered} - ${article.link}`,
          url: article.link,
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };
  
  const handleRetry = () => {
    setError(null);
    setLoading(true);
    
    // Reload the article
    fetchArticleById(articleId)
      .then(data => {
        setArticle(data);
        
        // Extract video URLs from content
        if (data.content.rendered) {
          const videos = extractVideoUrls(data.content.rendered);
          setVideoUrls(videos);
        }
        
        // Add to recent articles
        addRecentArticle(data);
      })
      .catch(err => {
        console.error('Error reloading article:', err);
        setError('Nie udało się załadować artykułu. Spróbuj ponownie.');
      })
      .finally(() => {
        setLoading(false);
      });
  };
  
  const handleGoBack = () => {
    router.back();
  };
  
  if (loading) {
    return <LoadingIndicator fullScreen />;
  }
  
  if (error || !article) {
    return (
      <EmptyState
        title="Coś poszło nie tak"
        message={error || "Nie udało się załadować artykułu."}
        actionLabel="Spróbuj ponownie"
        onAction={handleRetry}
        icon={<RefreshCw size={48} color={theme.colors.primary} />}
      />
    );
  }
  
  // Clean the HTML content
  const cleanedHtml = cleanHtml(article.content.rendered);
  
  // Get category name if available
  let categoryName = "";
  if (article._embedded && article._embedded["wp:term"]) {
    const categories = article._embedded["wp:term"][0];
    if (categories && categories.length > 0) {
      categoryName = categories[0].name;
    }
  }
  
  // Display meta fields if available
  const metaViews = article.meta?.views ? `${article.meta.views}` : '';
  const metaSource = article.meta?.zrudlo || article.meta?.zrodlo || '';
  
  // Render content based on platform
  const renderContent = () => {
    if (Platform.OS === 'web') {
      return (
        <View style={styles.htmlContainer}>
          <div dangerouslySetInnerHTML={{ __html: cleanedHtml }} />
        </View>
      );
    } else {
      return (
        <View style={styles.htmlContainer}>
          <WebView
            originWhitelist={['*']}
            source={{ html: cleanedHtml }}
            style={[
              styles.webview, 
              { height: webViewHeight }
            ]}
            scrollEnabled={false}
            onNavigationStateChange={(event) => {
              // Handle link clicks
              if (event.url !== 'about:blank') {
                Linking.openURL(event.url);
                return false;
              }
              return true;
            }}
            injectedJavaScript={`
              // Adjust the height of the WebView to match the content
              const meta = document.createElement('meta');
              meta.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1');
              meta.setAttribute('name', 'viewport');
              document.getElementsByTagName('head')[0].appendChild(meta);
              
              // Apply theme
              document.body.style.color = '${isDarkMode ? '#F9FAFB' : '#111827'}';
              document.body.style.backgroundColor = '${isDarkMode ? '#1F2937' : '#FFFFFF'}';
              document.body.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
              document.body.style.fontSize = '16px';
              document.body.style.lineHeight = '1.8';
              
              // Make all links open in a new window/tab
              const links = document.getElementsByTagName('a');
              for (let i = 0; i < links.length; i++) {
                links[i].target = '_blank';
                links[i].style.color = '${theme.colors.primary}';
              }
              
              // Style images
              const images = document.getElementsByTagName('img');
              for (let i = 0; i < images.length; i++) {
                images[i].style.maxWidth = '100%';
                images[i].style.height = 'auto';
                images[i].style.borderRadius = '8px';
                images[i].style.marginTop = '16px';
                images[i].style.marginBottom = '16px';
              }
              
              // Adjust the height
              window.ReactNativeWebView.postMessage(document.documentElement.scrollHeight);
              true;
            `}
            onMessage={(event) => {
              // Adjust WebView height based on content
              const height = parseInt(event.nativeEvent.data, 10);
              if (height > 0) {
                setWebViewHeight(height);
              }
            }}
          />
        </View>
      );
    }
  };
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Animated header */}
      <Animated.View 
        style={[
          styles.animatedHeader, 
          { 
            opacity: headerOpacity,
            backgroundColor: theme.colors.card,
            borderBottomColor: theme.colors.border,
          }
        ]}
      >
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text 
          style={[styles.headerTitle, { color: theme.colors.text }]} 
          numberOfLines={1}
        >
          {article.title.rendered.replace(/&#8211;/g, '-').replace(/&#8217;/g, "'")}
        </Text>
        <View style={{ width: 24 }} />
      </Animated.View>
      
      <Animated.ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {article.featured_media_url ? (
          <View style={styles.featuredImageContainer}>
            <Image
              source={{ uri: article.featured_media_url }}
              style={styles.featuredImage}
              contentFit="cover"
              transition={300}
            />
            {categoryName && (
              <View style={[styles.categoryBadge, { backgroundColor: theme.colors.card }]}>
                <Text style={[styles.categoryText, { color: theme.colors.primary }]}>
                  {categoryName}
                </Text>
              </View>
            )}
          </View>
        ) : null}
        
        <View style={[styles.articleContent, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {article.title.rendered.replace(/&#8211;/g, '-').replace(/&#8217;/g, "'")}
          </Text>
          
          <View style={styles.metaContainer}>
            <View style={styles.metaItem}>
              <Calendar size={14} color={theme.colors.textSecondary} />
              <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                {formatDateTime(article.date)}
              </Text>
            </View>
            
            {metaViews && (
              <View style={styles.metaItem}>
                <Eye size={14} color={theme.colors.textSecondary} />
                <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                  {metaViews}
                </Text>
              </View>
            )}
          </View>
          
          {metaSource ? (
            <Text style={[styles.source, { color: theme.colors.textSecondary }]}>
              Źródło: {metaSource}
            </Text>
          ) : null}
          
          <View style={styles.actions}>
            <TouchableOpacity 
              style={[
                styles.actionButton, 
                { 
                  backgroundColor: isSaved ? theme.colors.primary : theme.colors.subtle,
                  borderColor: theme.colors.border
                }
              ]} 
              onPress={toggleSave}
            >
              <Bookmark 
                size={18} 
                color={isSaved ? '#FFFFFF' : theme.colors.text} 
                fill={isSaved ? '#FFFFFF' : 'transparent'} 
              />
              <Text 
                style={[
                  styles.actionText, 
                  { color: isSaved ? '#FFFFFF' : theme.colors.text }
                ]}
              >
                {isSaved ? 'Zapisano' : 'Zapisz'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.actionButton, 
                { 
                  backgroundColor: theme.colors.subtle,
                  borderColor: theme.colors.border
                }
              ]} 
              onPress={handleShare}
            >
              <Share2 size={18} color={theme.colors.text} />
              <Text style={[styles.actionText, { color: theme.colors.text }]}>
                Udostępnij
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Display videos if any */}
          {videoUrls.length > 0 && (
            <View style={styles.videoContainer}>
              {videoUrls.map((url, index) => (
                <VideoPlayer key={`video-${index}`} url={url} />
              ))}
            </View>
          )}
          
          {/* Article content */}
          {renderContent()}
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 32,
  },
  animatedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 1000,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginHorizontal: 8,
  },
  featuredImageContainer: {
    position: 'relative',
  },
  featuredImage: {
    width: '100%',
    height: 280,
  },
  categoryBadge: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
  },
  articleContent: {
    padding: 24,
    marginTop: -20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 16,
    lineHeight: 32,
  },
  metaContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  metaText: {
    fontSize: 14,
    marginLeft: 6,
  },
  source: {
    fontSize: 12,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    marginBottom: 28,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginRight: 12,
    borderWidth: 1,
  },
  actionText: {
    fontSize: 14,
    marginLeft: 6,
    fontWeight: '500',
  },
  videoContainer: {
    marginBottom: 24,
  },
  htmlContainer: {
    width: '100%',
  },
  webview: {
    width: '100%',
    minHeight: 200,
  },
});