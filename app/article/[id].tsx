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
  StatusBar
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
          <div 
            dangerouslySetInnerHTML={{ __html: cleanedHtml }}
            style={{
              color: isDarkMode ? '#F9FAFB' : '#111827',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
              fontSize: '16px',
              lineHeight: '1.8',
            }}
          />
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
              document.body.style.backgroundColor = 'transparent';
              document.body.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
              document.body.style.fontSize = '16px';
              document.body.style.lineHeight = '1.8';
              document.body.style.padding = '0';
              document.body.style.margin = '0';
              
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
              setTimeout(() => {
                window.ReactNativeWebView.postMessage(document.documentElement.scrollHeight);
              }, 500);
              true;
            `}
            onMessage={(event) => {
              // Adjust WebView height based on content
              const height = parseInt(event.nativeEvent.data, 10);
              if (height > 0 && height !== webViewHeight) {
                setWebViewHeight(Math.max(height, 300));
              }
            }}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.warn('WebView error: ', nativeEvent);
            }}
            onHttpError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.warn('WebView HTTP error: ', nativeEvent);
            }}
            androidLayerType="hardware"
            mixedContentMode="compatibility"
          />
        </View>
      );
    }
  };
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar 
        translucent 
        backgroundColor="transparent" 
        barStyle="light-content" 
      />
      
      {/* Floating back button */}
      <TouchableOpacity 
        style={styles.floatingBackButton} 
        onPress={handleGoBack}
        activeOpacity={0.8}
      >
        <ArrowLeft size={20} color="#FFFFFF" />
      </TouchableOpacity>
      
      {/* Floating share button */}
      <TouchableOpacity 
        style={styles.floatingShareButton} 
        onPress={handleShare}
        activeOpacity={0.8}
      >
        <Share2 size={20} color="#FFFFFF" />
      </TouchableOpacity>
      
      {/* Floating bookmark button */}
      <TouchableOpacity 
        style={[
          styles.floatingBookmarkButton,
          isSaved && { backgroundColor: theme.colors.primary }
        ]} 
        onPress={toggleSave}
        activeOpacity={0.8}
      >
        <Bookmark 
          size={20} 
          color="#FFFFFF" 
          fill={isSaved ? "#FFFFFF" : "transparent"} 
        />
      </TouchableOpacity>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Featured image */}
        {article.featured_media_url ? (
          <View style={styles.featuredImageContainer}>
            <Image
              source={{ uri: article.featured_media_url }}
              style={styles.featuredImage}
              contentFit="cover"
              transition={300}
              placeholder="Loading..."
            />
            <View style={styles.imageDarkOverlay} />
            
            {/* Category badge */}
            {categoryName && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>
                  {categoryName}
                </Text>
              </View>
            )}
          </View>
        ) : null}
        
        {/* Article content card */}
        <View style={[styles.articleContent, { backgroundColor: theme.colors.card }]}>
          {/* Title and metadata */}
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
      </ScrollView>
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
  featuredImageContainer: {
    position: 'relative',
    height: Platform.select({
      ios: 380,
      android: 350,
      default: 380
    }),
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  imageDarkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  categoryBadge: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  floatingBackButton: {
    position: 'absolute',
    top: Platform.select({
      ios: 50,
      android: 40,
      default: 50
    }),
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    elevation: 5,
  },
  floatingShareButton: {
    position: 'absolute',
    top: Platform.select({
      ios: 50,
      android: 40,
      default: 50
    }),
    right: 70,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    elevation: 5,
  },
  floatingBookmarkButton: {
    position: 'absolute',
    top: Platform.select({
      ios: 50,
      android: 40,
      default: 50
    }),
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    elevation: 5,
  },
  articleContent: {
    padding: 24,
    marginTop: -50,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: 400,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
    lineHeight: 30,
  },
  metaContainer: {
    flexDirection: 'row',
    marginBottom: 12,
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
    marginBottom: 20,
    fontStyle: 'italic',
  },
  videoContainer: {
    marginBottom: 24,
  },
  htmlContainer: {
    width: '100%',
    minHeight: 200,
  },
  webview: {
    width: '100%',
    minHeight: 300,
    backgroundColor: 'transparent',
  },
});