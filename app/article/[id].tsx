import React, { useState, useEffect, useRef, Suspense } from 'react';
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
  StatusBar,
  BackHandler,
  Modal,
  Animated,
  Alert
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { WebView } from 'react-native-webview';
import { Bookmark, Share2, RefreshCw, ArrowLeft, Calendar, X, ChevronLeft, ChevronRight, Home, Bell, Settings } from 'lucide-react-native';
import { fetchArticleById, fetchMediaByIds, fetchRelatedArticles } from '@/services/api';
import { Article, MediaItem } from '@/types/article';
import LoadingIndicator from '@/components/LoadingIndicator';
import EmptyState from '@/components/EmptyState';
import { ArticleCard } from '@/components/ArticleCard';
import { useArticlesStore } from '@/store/articlesStore';
import { useNotificationsStore } from '@/store/notificationsStore';
import { formatDateTime } from '@/utils/dateFormatter';
import { cleanHtml, extractVideoUrls, processGalleryIds, extractYouTubeUrl } from '@/utils/htmlParser';
import { useThemeStore } from '@/store/themeStore';
import { isSponsoredContent } from '@/utils/contentFilter';

const MAX_RETRIES = 3;
const { width, height } = Dimensions.get('window');

const VideoPlayer = React.lazy(() => import('@/components/VideoPlayer'));
const RelatedArticlesSlider = React.lazy(() => import('@/components/RelatedArticlesSlider'));

export default function ArticleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isArticleSaved, saveArticle, removeArticle, addRecentArticle } = useArticlesStore();
  const { getUnreadCount } = useNotificationsStore();
  const { theme, isDarkMode } = useThemeStore();
  
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoUrls, setVideoUrls] = useState<string[]>([]);
  const [youtubeUrl, setYoutubeUrl] = useState<string | null>(null);
  const [webViewHeight, setWebViewHeight] = useState(300);
  const [webViewError, setWebViewError] = useState(false);
  const [galleryImages, setGalleryImages] = useState<MediaItem[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [relatedSliderArticles, setRelatedSliderArticles] = useState<Article[]>([]);
  const [relatedListArticles, setRelatedListArticles] = useState<Article[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [contentLoaded, setContentLoaded] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const [showFinishMessage, setShowFinishMessage] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(false);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const progressOpacity = useRef(new Animated.Value(0)).current;
  const finishMessageOpacity = useRef(new Animated.Value(0)).current;
  const redirectTimeout = useRef<NodeJS.Timeout | null>(null);
  const hasShownFinishMessage = useRef(false);
  
  const articleId = parseInt(id as string, 10);
  const isSaved = isArticleSaved(articleId);
  const unreadCount = getUnreadCount();
  
  // Handle Android back button
  useEffect(() => {
    if (Platform.OS === 'android') {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        if (selectedImageIndex !== null) {
          setSelectedImageIndex(null);
          return true;
        }
        router.back();
        return true;
      });
      
      return () => backHandler.remove();
    }
  }, [router, selectedImageIndex]);
  
  useEffect(() => {
    const loadArticle = async (retry = 0) => {
      try {
        setLoading(true);
        setError(null);
        
        const data = await fetchArticleById(articleId);
        
        // Check if this is sponsored content
        if (isSponsoredContent(data)) {
          setError('Artykuł nie został znaleziony.');
          return;
        }
        
        setArticle(data);
        setContentLoaded(true);
        
        // Extract video URLs from content
        if (data.content.rendered) {
          const videos = extractVideoUrls(data.content.rendered);
          setVideoUrls(videos);
        }
        
        // Extract YouTube URL from meta field
        if (data.meta?.youtube) {
          const youtubeVideoUrl = extractYouTubeUrl(data.meta.youtube);
          setYoutubeUrl(youtubeVideoUrl);
        }
        
        // Add to recent articles (filtering is handled in the store)
        addRecentArticle(data);
        
        // Load related articles
        loadRelatedArticles(data);
        
        // Load gallery images with delay for better performance
        if (data.meta?.galeria && Array.isArray(data.meta.galeria) && data.meta.galeria.length > 0) {
          setTimeout(() => {
            const processedGalleryIds = processGalleryIds(data.meta?.galeria || []);
            if (processedGalleryIds.length > 0) {
              loadGalleryImages(processedGalleryIds);
            }
          }, 500);
        }
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
  
  const loadGalleryImages = async (galleryIds: string[]) => {
    if (!galleryIds || galleryIds.length === 0) {
      return;
    }
    
    setGalleryLoading(true);
    try {
      const mediaItems = await fetchMediaByIds(galleryIds);
      setGalleryImages(mediaItems);
    } catch (galleryError) {
      console.warn('Failed to load gallery images:', galleryError);
    } finally {
      setGalleryLoading(false);
    }
  };
  
  const loadRelatedArticles = async (currentArticle: Article) => {
    setRelatedLoading(true);
    try {
      const { sliderArticles, listArticles } = await fetchRelatedArticles(currentArticle.id, currentArticle.categories);
      setRelatedSliderArticles(sliderArticles);
      setRelatedListArticles(listArticles);
    } catch (error) {
      console.warn('Failed to load related articles:', error);
    } finally {
      setRelatedLoading(false);
    }
  };
  
  const toggleSave = () => {
    if (!article) return;
    
    // Don't allow saving sponsored content
    if (isSponsoredContent(article)) {
      return;
    }
    
    if (isSaved) {
      removeArticle(articleId);
    } else {
      saveArticle(article);
    }
  };
  
  const handleShare = async () => {
    if (!article) return;
    
    try {
      // Clean title for sharing
      const cleanTitle = article.title.rendered
        .replace(/&#8211;/g, '-')
        .replace(/&#8217;/g, "'")
        .replace(/&#8220;/g, '"')
        .replace(/&#8221;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
      
      const shareContent = {
        title: cleanTitle,
        message: Platform.select({
          android: `${cleanTitle}\n\n${article.link}`,
          ios: cleanTitle,
          default: `${cleanTitle}\n\n${article.link}`,
        }),
        url: Platform.select({
          ios: article.link,
          default: undefined,
        }),
      };
      
      if (Platform.OS === 'web') {
        // Web Share API implementation
        if (navigator.share && navigator.canShare && navigator.canShare({ title: shareContent.title, url: article.link })) {
          await navigator.share({
            title: shareContent.title,
            text: 'Sprawdź ten artykuł z Kaszuby24!',
            url: article.link,
          });
        } else {
          // Fallback for browsers that don't support Web Share API
          try {
            await navigator.clipboard.writeText(`${shareContent.title}\n\n${article.link}`);
            Alert.alert(
              'Link skopiowany!',
              'Link do artykułu został skopiowany do schowka.',
              [{ text: 'OK' }]
            );
          } catch (clipboardError) {
            // Final fallback - show the link in an alert
            Alert.alert(
              'Udostępnij artykuł',
              `Skopiuj ten link aby udostępnić:\n\n${article.link}`,
              [{ text: 'OK' }]
            );
          }
        }
      } else {
        // Native implementation for iOS and Android
        const result = await Share.share(shareContent, {
          dialogTitle: 'Udostępnij artykuł',
          subject: cleanTitle,
          excludedActivityTypes: Platform.select({
            ios: [
              'com.apple.UIKit.activity.AirDrop', // Remove if you want AirDrop
            ],
            default: undefined,
          }),
        });
        
        if (result.action === Share.sharedAction) {
          console.log('Article shared successfully');
          if (result.activityType) {
            console.log('Shared via:', result.activityType);
          }
        } else if (result.action === Share.dismissedAction) {
          console.log('Share dialog dismissed');
        }
      }
    } catch (error: any) {
      console.error('Error sharing article:', error);
      
      // Show user-friendly error message
      Alert.alert(
        'Błąd udostępniania',
        'Nie udało się udostępnić artykułu. Spróbuj ponownie.',
        [{ text: 'OK' }]
      );
    }
  };
  
  const handleRetry = () => {
    setError(null);
    setLoading(true);
    setWebViewError(false);
    
    // Reload the article
    fetchArticleById(articleId)
      .then(data => {
        // Check if this is sponsored content
        if (isSponsoredContent(data)) {
          setError('Artykuł nie został znaleziony.');
          return;
        }
        
        setArticle(data);
        setContentLoaded(true);
        
        // Extract video URLs from content
        if (data.content.rendered) {
          const videos = extractVideoUrls(data.content.rendered);
          setVideoUrls(videos);
        }
        
        // Extract YouTube URL from meta field
        if (data.meta?.youtube) {
          const youtubeVideoUrl = extractYouTubeUrl(data.meta.youtube);
          setYoutubeUrl(youtubeVideoUrl);
        }
        
        // Load gallery images if available
        if (data.meta?.galeria && Array.isArray(data.meta.galeria) && data.meta.galeria.length > 0) {
          setTimeout(() => {
            const processedGalleryIds = processGalleryIds(data.meta?.galeria || []);
            if (processedGalleryIds.length > 0) {
              loadGalleryImages(processedGalleryIds);
            }
          }, 500);
        }
        
        // Add to recent articles (filtering is handled in the store)
        addRecentArticle(data);
        
        // Load related articles
        loadRelatedArticles(data);
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
  
  const handleGoHome = () => {
    router.replace('/(tabs)');
  };
  
  const handleGoNotifications = () => {
    router.replace('/(tabs)/notifications');
  };
  
  const handleGoSaved = () => {
    router.replace('/(tabs)/saved');
  };
  
  const handleGoSettings = () => {
    router.replace('/(tabs)/preferences');
  };
  
  const openImageModal = (index: number) => {
    setSelectedImageIndex(index);
  };
  
  const closeImageModal = () => {
    setSelectedImageIndex(null);
  };
  
  const navigateImage = (direction: 'prev' | 'next') => {
    if (selectedImageIndex === null) return;
    
    if (direction === 'prev' && selectedImageIndex > 0) {
      setSelectedImageIndex(selectedImageIndex - 1);
    } else if (direction === 'next' && selectedImageIndex < galleryImages.length - 1) {
      setSelectedImageIndex(selectedImageIndex + 1);
    }
  };
  
  // Handle scroll for reading progress and auto-redirect
  const handleScroll = (event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const scrollPosition = contentOffset.y;
    const scrollViewHeight = layoutMeasurement.height;
    const contentHeight = contentSize.height;
    
    // Calculate if user is at the very bottom (with small buffer)
    const bottomBuffer = 50; // 50px buffer from actual bottom
    const isNearBottom = scrollPosition + scrollViewHeight >= contentHeight - bottomBuffer;
    const isAtActualBottom = scrollPosition + scrollViewHeight >= contentHeight - 10;
    
    setIsAtBottom(isAtActualBottom);
    
    // Only start calculating progress when user is near the bottom
    if (isNearBottom) {
      // Calculate reading progress percentage only when near bottom
      const maxScrollDistance = contentHeight - scrollViewHeight;
      const progress = Math.min(Math.max((scrollPosition / maxScrollDistance) * 100, 0), 100);
      setReadingProgress(Math.round(progress));
      
      // Show progress indicator only when at bottom and progress is 100%
      if (progress >= 100) {
        Animated.timing(progressOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      } else {
        Animated.timing(progressOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
      
      // Check if user has finished reading (reached actual bottom)
      if (isAtActualBottom && progress >= 100 && !hasShownFinishMessage.current) {
        hasShownFinishMessage.current = true;
        setShowFinishMessage(true);
        
        // Show finish message with animation
        Animated.timing(finishMessageOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
        
        // Clear any existing timeout
        if (redirectTimeout.current) {
          clearTimeout(redirectTimeout.current);
        }
        
        // Set timeout for auto-redirect (longer delay)
        redirectTimeout.current = setTimeout(() => {
          // Fade out message and redirect
          Animated.timing(finishMessageOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            router.replace('/(tabs)');
          });
        }, 5000); // 5 seconds instead of 3
      }
    } else {
      // Reset progress when not at bottom
      setReadingProgress(0);
      Animated.timing(progressOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };
  
  // Clear redirect timeout when component unmounts
  useEffect(() => {
    return () => {
      if (redirectTimeout.current) {
        clearTimeout(redirectTimeout.current);
      }
    };
  }, []);
  
  // Handle manual return to home
  const handleReturnToHome = () => {
    if (redirectTimeout.current) {
      clearTimeout(redirectTimeout.current);
    }
    
    Animated.timing(finishMessageOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      router.replace('/(tabs)');
    });
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
  
  // Display meta fields if available (removed views)
  const metaSource = article.meta?.zrudlo || article.meta?.zrodlo || '';
  
  // Enhanced HTML for Android WebView
  const enhancedHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
        
        body {
          font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          font-size: 16px;
          line-height: 1.8;
          color: ${isDarkMode ? '#F9FAFB' : '#111827'};
          background-color: transparent;
          margin: 0;
          padding: 16px;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        
        p {
          margin-bottom: 16px;
          font-family: 'Poppins', sans-serif;
        }
        
        img {
          max-width: 100% !important;
          height: auto !important;
          border-radius: 8px;
          margin: 16px 0;
          display: block;
        }
        
        a {
          color: ${theme.colors.primary};
          text-decoration: none;
        }
        
        a:hover {
          text-decoration: underline;
        }
        
        h1, h2, h3, h4, h5, h6 {
          color: ${isDarkMode ? '#F9FAFB' : '#111827'};
          margin: 24px 0 16px 0;
          line-height: 1.4;
          font-family: 'Poppins', sans-serif;
          font-weight: 600;
        }
        
        blockquote {
          position: relative;
          margin: 24px 0;
          padding: 20px 24px 20px 60px;
          background: ${isDarkMode ? 'linear-gradient(135deg, rgba(74, 123, 200, 0.1) 0%, rgba(254, 204, 0, 0.05) 100%)' : 'linear-gradient(135deg, rgba(34, 74, 150, 0.08) 0%, rgba(254, 204, 0, 0.08) 100%)'};
          border-radius: 16px;
          border-left: 4px solid ${theme.colors.primary};
          font-style: italic;
          font-size: 17px;
          line-height: 1.6;
          color: ${isDarkMode ? '#E2E8F0' : '#475569'};
          box-shadow: ${isDarkMode ? '0 4px 20px rgba(0, 0, 0, 0.3)' : '0 4px 20px rgba(34, 74, 150, 0.1)'};
          font-family: 'Poppins', sans-serif;
        }
        
        blockquote::before {
          content: '"';
          position: absolute;
          left: 20px;
          top: 12px;
          font-size: 48px;
          font-weight: bold;
          color: ${theme.colors.primary};
          opacity: 0.3;
          line-height: 1;
          font-family: 'Poppins', sans-serif;
        }
        
        blockquote p {
          margin: 0;
          position: relative;
          z-index: 1;
          font-family: 'Poppins', sans-serif;
        }
        
        ul, ol {
          padding-left: 20px;
          margin: 16px 0;
        }
        
        li {
          margin-bottom: 8px;
          font-family: 'Poppins', sans-serif;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 16px 0;
        }
        
        th, td {
          border: 1px solid ${isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'};
          padding: 8px;
          text-align: left;
          font-family: 'Poppins', sans-serif;
        }
        
        th {
          background-color: ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'};
          font-weight: 600;
          font-family: 'Poppins', sans-serif;
        }
        
        /* Remove any video/iframe elements to prevent conflicts */
        iframe, video, embed, object {
          display: none !important;
        }
      </style>
    </head>
    <body>
      ${cleanedHtml}
      <script>
        // Send height to React Native
        function sendHeight() {
          const height = Math.max(
            document.body.scrollHeight,
            document.body.offsetHeight,
            document.documentElement.clientHeight,
            document.documentElement.scrollHeight,
            document.documentElement.offsetHeight
          );
          
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(height.toString());
          }
        }
        
        // Send height when content is loaded
        document.addEventListener('DOMContentLoaded', sendHeight);
        window.addEventListener('load', sendHeight);
        
        // Send height when images load
        const images = document.getElementsByTagName('img');
        for (let i = 0; i < images.length; i++) {
          images[i].addEventListener('load', sendHeight);
          images[i].addEventListener('error', sendHeight);
        }
        
        // Handle link clicks
        document.addEventListener('click', function(e) {
          if (e.target.tagName === 'A') {
            e.preventDefault();
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage('link:' + e.target.href);
            }
          }
        });
        
        // Initial height send
        setTimeout(sendHeight, 100);
        setTimeout(sendHeight, 500);
        setTimeout(sendHeight, 1000);
      </script>
    </body>
    </html>
  `;
  
  // Render content based on platform
  const renderContent = () => {
    if (Platform.OS === 'web') {
      return (
        <View style={styles.htmlContainer}>
          <div 
            dangerouslySetInnerHTML={{ __html: cleanedHtml }}
            style={{
              color: isDarkMode ? '#F9FAFB' : '#111827',
              fontFamily: 'Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
              fontSize: '16px',
              lineHeight: '1.8',
            }}
          />
        </View>
      );
    } else if (webViewError) {
      // Fallback for Android when WebView fails
      return (
        <View style={[styles.fallbackContainer, { backgroundColor: theme.colors.subtle }]}>
          <Text style={[styles.fallbackText, { color: theme.colors.text, fontFamily: theme.fontFamily.regular }]}>
            Treść artykułu nie może być wyświetlona w aplikacji.
          </Text>
          <TouchableOpacity 
            style={[styles.fallbackButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => Linking.openURL(article.link)}
          >
            <Text style={[styles.fallbackButtonText, { fontFamily: theme.fontFamily.semibold }]}>
              Otwórz w przeglądarce
            </Text>
          </TouchableOpacity>
        </View>
      );
    } else {
      return (
        <View style={styles.htmlContainer}>
          <WebView
            originWhitelist={['*']}
            source={{ html: enhancedHtml }}
            style={[
              styles.webview, 
              { height: webViewHeight }
            ]}
            scrollEnabled={false}
            onNavigationStateChange={(event) => {
              // Handle link clicks
              if (event.url !== 'about:blank' && !event.url.startsWith('data:')) {
                Linking.openURL(event.url);
                return false;
              }
              return true;
            }}
            onMessage={(event) => {
              const message = event.nativeEvent.data;
              
              if (message.startsWith('link:')) {
                // Handle link clicks
                const url = message.substring(5);
                Linking.openURL(url);
              } else {
                // Adjust WebView height based on content
                const height = parseInt(message, 10);
                if (height > 0 && height !== webViewHeight) {
                  setWebViewHeight(Math.max(height + 50, 300)); // Add padding for Android
                }
              }
            }}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.warn('WebView error: ', nativeEvent);
              setWebViewError(true);
            }}
            onHttpError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.warn('WebView HTTP error: ', nativeEvent);
              if (Platform.OS === 'android') {
                setWebViewError(true);
              }
            }}
            onRenderProcessGone={() => {
              console.warn('WebView render process gone');
              setWebViewError(true);
            }}
            // Android-specific props
            androidLayerType="hardware"
            androidHardwareAccelerationDisabled={false}
            mixedContentMode="compatibility"
            allowsFullscreenVideo={false}
            mediaPlaybackRequiresUserAction={true}
            // Reduce memory usage on Android
            cacheEnabled={Platform.OS === 'android'}
            domStorageEnabled={true}
            javaScriptEnabled={true}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={[styles.loadingContainer, { backgroundColor: theme.colors.subtle }]}>
                <LoadingIndicator size="small" />
              </View>
            )}
          />
        </View>
      );
    }
  };
  
  // Render YouTube video from meta field
  const renderYouTubeVideo = () => {
    if (!youtubeUrl) return null;
    
    return (
      <View style={styles.youtubeContainer}>
        <Suspense fallback={null}>
          <VideoPlayer url={youtubeUrl} title="YouTube Video" />
        </Suspense>
      </View>
    );
  };
  
  // Render gallery (moved below content)
  const renderGallery = () => {
    if (!contentLoaded) return null;
    
    if (galleryLoading) {
      return (
        <View style={styles.galleryContainer}>
          <Text style={[styles.galleryTitle, { color: theme.colors.text, fontFamily: theme.fontFamily.semibold }]}>
            Galeria
          </Text>
          <View style={styles.galleryLoadingContainer}>
            <LoadingIndicator size="small" />
          </View>
        </View>
      );
    }
    
    if (galleryImages.length === 0) {
      return null;
    }
    
    return (
      <View style={styles.galleryContainer}>
        <Text style={[
          styles.galleryTitle, 
          { 
            color: theme.colors.text,
            fontFamily: theme.fontFamily.semibold
          }
        ]}>
          Galeria ({galleryImages.length})
        </Text>
        <View style={styles.galleryGrid}>
          {galleryImages.map((image, index) => (
            <TouchableOpacity
              key={image.id}
              style={styles.galleryImageContainer}
              onPress={() => openImageModal(index)}
              activeOpacity={0.8}
            >
              <Image
                source={{ 
                  uri: image.media_details?.sizes?.medium?.source_url || image.source_url 
                }}
                style={styles.galleryImage}
                contentFit="cover"
                transition={200}
                placeholder="Loading..."
                cachePolicy="memory-disk"
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };
  
  // Render related articles with slider and list
  const renderRelatedArticles = () => {
    if (!contentLoaded) return null;
    
    return (
      <View style={styles.relatedContainer}>
        {/* Slider for related articles */}
        {relatedSliderArticles.length > 0 && (
          <Suspense fallback={null}>
            <RelatedArticlesSlider 
              articles={relatedSliderArticles} 
              title="Sprawdź również" 
            />
          </Suspense>
        )}
        
        {/* List of latest articles */}
        {relatedListArticles.length > 0 && (
          <View style={styles.relatedListContainer}>
            <Text style={[
              styles.relatedTitle, 
              { 
                color: theme.colors.text,
                fontFamily: theme.fontFamily.semibold
              }
            ]}>
              Najnowsze artykuły
            </Text>
            
            {relatedLoading ? (
              <LoadingIndicator size="small" />
            ) : (
              <View style={styles.relatedList}>
                {relatedListArticles.map((relatedArticle) => (
                  <ArticleCard
                    key={relatedArticle.id}
                    article={relatedArticle}
                    compact={true}
                  />
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };
  
  // Render reading progress indicator - only show when at bottom
  const renderProgressIndicator = () => {
    if (!isAtBottom || readingProgress < 100) return null;
    
    return (
      <Animated.View 
        style={[
          styles.progressIndicator, 
          { 
            backgroundColor: theme.colors.primary,
            opacity: progressOpacity 
          }
        ]}
      >
        <Text style={[styles.progressText, { fontFamily: theme.fontFamily.semibold }]}>
          {readingProgress}%
        </Text>
      </Animated.View>
    );
  };
  
  // Render finish message
  const renderFinishMessage = () => {
    if (!showFinishMessage) return null;
    
    return (
      <Animated.View 
        style={[
          styles.finishMessage, 
          { 
            backgroundColor: theme.colors.primary,
            opacity: finishMessageOpacity 
          }
        ]}
      >
        <View style={styles.finishMessageContent}>
          <Text style={[styles.finishMessageTitle, { fontFamily: theme.fontFamily.semibold }]}>
            Koniec artykułu
          </Text>
          <Text style={[styles.finishMessageSubtitle, { fontFamily: theme.fontFamily.regular }]}>
            Kliknij, aby wrócić na stronę główną
          </Text>
        </View>
        <TouchableOpacity
          style={styles.finishMessageButton}
          onPress={handleReturnToHome}
          activeOpacity={0.8}
        >
          <Home size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>
    );
  };
  
  // Render image modal
  const renderImageModal = () => {
    if (selectedImageIndex === null || !galleryImages[selectedImageIndex]) {
      return null;
    }
    
    const currentImage = galleryImages[selectedImageIndex];
    
    return (
      <Modal
        visible={selectedImageIndex !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={closeImageModal}
      >
        <View style={styles.modalContainer}>
          <StatusBar hidden />
          
          {/* Close button */}
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={closeImageModal}
            activeOpacity={0.8}
          >
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          {/* Navigation buttons */}
          {selectedImageIndex > 0 && (
            <TouchableOpacity
              style={[styles.modalNavButton, styles.modalNavButtonLeft]}
              onPress={() => navigateImage('prev')}
              activeOpacity={0.8}
            >
              <ChevronLeft size={32} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          
          {selectedImageIndex < galleryImages.length - 1 && (
            <TouchableOpacity
              style={[styles.modalNavButton, styles.modalNavButtonRight]}
              onPress={() => navigateImage('next')}
              activeOpacity={0.8}
            >
              <ChevronRight size={32} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          
          {/* Image counter */}
          <View style={styles.modalCounter}>
            <Text style={[styles.modalCounterText, { fontFamily: theme.fontFamily.medium }]}>
              {selectedImageIndex + 1} / {galleryImages.length}
            </Text>
          </View>
          
          {/* Image */}
          <Image
            source={{ uri: currentImage.source_url }}
            style={styles.modalImage}
            contentFit="contain"
            transition={200}
          />
          
          {/* Caption */}
          {currentImage.caption?.rendered && (
            <View style={styles.modalCaptionContainer}>
              <Text style={[styles.modalCaption, { fontFamily: theme.fontFamily.regular }]}>
                {currentImage.caption.rendered.replace(/<[^>]*>/g, '')}
              </Text>
            </View>
          )}
        </View>
      </Modal>
    );
  };
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar 
        translucent 
        backgroundColor="transparent" 
        barStyle="light-content" 
      />
      
      {/* Header bar with circular icons */}
      <View style={styles.headerBar}>
        <TouchableOpacity 
          style={styles.circularButton} 
          onPress={handleGoBack}
          activeOpacity={0.8}
        >
          <ArrowLeft size={20} color="#FFFFFF" />
        </TouchableOpacity>
        
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.circularButton}
            onPress={handleShare}
            activeOpacity={0.7}
          >
            <Share2 size={20} color="#FFFFFF" />
          </TouchableOpacity>
          
          {!isSponsoredContent(article) && (
            <TouchableOpacity
              style={styles.circularButton}
              onPress={toggleSave}
              activeOpacity={0.7}
            >
              <Bookmark 
                size={20} 
                color="#FFFFFF"
                fill={isSaved ? "#FFFFFF" : 'transparent'} 
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      <ScrollView 
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={Platform.OS === 'android'}
        onScroll={handleScroll}
        scrollEventThrottle={16}
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
              // Android-specific caching
              cachePolicy={Platform.OS === 'android' ? 'memory-disk' : 'memory'}
            />
            <View style={styles.imageDarkOverlay} />
            
            {/* Category badge */}
            {categoryName && (
              <View style={[styles.categoryBadge, { backgroundColor: theme.colors.primary }]}>
                <Text style={[
                  styles.categoryText,
                  { 
                    fontFamily: theme.fontFamily.semibold 
                  }
                ]}>
                  {categoryName}
                </Text>
              </View>
            )}
          </View>
        ) : null}
        
        {/* Article content card */}
        <View style={[styles.articleContent, { backgroundColor: theme.colors.card }]}>
          {/* Title and metadata */}
          <Text style={[
            styles.title, 
            { 
              color: theme.colors.text,
              fontFamily: theme.fontFamily.bold
            }
          ]}>
            {article.title.rendered.replace(/&#8211;/g, '-').replace(/&#8217;/g, "'")}
          </Text>
          
          <View style={styles.metaContainer}>
            <View style={styles.metaItem}>
              <Calendar size={14} color={theme.colors.textSecondary} />
              <Text style={[
                styles.metaText, 
                { 
                  color: theme.colors.textSecondary,
                  fontFamily: theme.fontFamily.regular
                }
              ]}>
                {formatDateTime(article.date)}
              </Text>
            </View>
          </View>
          
          {metaSource ? (
            <Text style={[
              styles.source, 
              { 
                color: theme.colors.textSecondary,
                fontFamily: theme.fontFamily.regular
              }
            ]}>
              Źródło: {metaSource}
            </Text>
          ) : null}
          
          {/* Display videos if any */}
          {videoUrls.length > 0 && (
            <View style={styles.videoContainer}>
              {videoUrls.map((url, index) => (
                <Suspense fallback={null}>
                  <VideoPlayer key={`video-${index}`} url={url} />
                </Suspense>
              ))}
            </View>
          )}
          
          {/* Article content */}
          {renderContent()}
          
          {/* YouTube video from meta field */}
          {renderYouTubeVideo()}
          
          {/* Gallery (moved below content) */}
          {renderGallery()}
          
          {/* Related articles */}
          {renderRelatedArticles()}
        </View>
      </ScrollView>
      
      {/* Bottom menu bar - same as main page */}
      <View style={[styles.bottomMenuBar, { backgroundColor: theme.colors.card }]}>
        <TouchableOpacity
          style={styles.bottomMenuItem}
          onPress={handleGoHome}
          activeOpacity={0.7}
        >
          <Home size={20} color={theme.colors.text} />
          <Text style={[styles.bottomMenuText, { color: theme.colors.text, fontFamily: theme.fontFamily.medium }]}>
            Główna
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.bottomMenuItem}
          onPress={handleGoNotifications}
          activeOpacity={0.7}
        >
          <Bell size={20} color={theme.colors.text} />
          <Text style={[styles.bottomMenuText, { color: theme.colors.text, fontFamily: theme.fontFamily.medium }]}>
            Powiadomienia
          </Text>
          {unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: theme.colors.notification }]}>
              <Text style={[styles.badgeText, { fontFamily: theme.fontFamily.semibold }]}>
                {unreadCount > 9 ? '9+' : unreadCount.toString()}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.bottomMenuItem}
          onPress={handleGoSaved}
          activeOpacity={0.7}
        >
          <Bookmark size={20} color={theme.colors.text} />
          <Text style={[styles.bottomMenuText, { color: theme.colors.text, fontFamily: theme.fontFamily.medium }]}>
            Zapisane
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.bottomMenuItem}
          onPress={handleGoSettings}
          activeOpacity={0.7}
        >
          <Settings size={20} color={theme.colors.text} />
          <Text style={[styles.bottomMenuText, { color: theme.colors.text, fontFamily: theme.fontFamily.medium }]}>
            Ustawienia
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Reading progress indicator - only shows when at bottom */}
      {renderProgressIndicator()}
      
      {/* Finish message */}
      {renderFinishMessage()}
      
      {/* Image modal */}
      {renderImageModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.select({
      ios: 50,
      android: 45,
      default: 50
    }),
    paddingBottom: 12,
    zIndex: 1000,
  },
  circularButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 100, // Space for bottom menu
  },
  featuredImageContainer: {
    position: 'relative',
    height: Platform.select({
      ios: 320,
      android: 340, // Increased height for Android
      default: 320
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
    bottom: 80,
    left: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  articleContent: {
    padding: 24,
    marginTop: -30,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: 400,
  },
  title: {
    fontSize: Platform.OS === 'android' ? 20 : 22,
    fontWeight: '700',
    marginBottom: 16,
    lineHeight: Platform.OS === 'android' ? 28 : 30,
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
  youtubeContainer: {
    marginTop: 24,
    marginBottom: 24,
  },
  galleryContainer: {
    marginTop: 32,
    marginBottom: 24,
  },
  galleryTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  galleryLoadingContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },
  galleryImageContainer: {
    width: (width - 72) / 2,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  relatedContainer: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  relatedListContainer: {
    marginTop: 24,
  },
  relatedTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    marginHorizontal: 24,
  },
  relatedList: {
    gap: 12,
  },
  progressIndicator: {
    position: 'absolute',
    top: Platform.select({
      ios: 100,
      android: 95,
      default: 100
    }),
    right: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  progressText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  finishMessage: {
    position: 'absolute',
    bottom: 110,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  finishMessageContent: {
    flex: 1,
  },
  finishMessageTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  finishMessageSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '400',
  },
  finishMessageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  bottomMenuBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 20,
    paddingBottom: Platform.select({
      ios: 34,
      android: 12,
      default: 12,
    }),
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  bottomMenuItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    position: 'relative',
  },
  bottomMenuText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: '25%',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
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
  fallbackContainer: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  fallbackText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 24,
  },
  fallbackButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  fallbackButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: Platform.select({
      ios: 50,
      android: 40,
      default: 50
    }),
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalNavButton: {
    position: 'absolute',
    top: '50%',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    marginTop: -22,
  },
  modalNavButtonLeft: {
    left: 20,
  },
  modalNavButtonRight: {
    right: 20,
  },
  modalCounter: {
    position: 'absolute',
    top: Platform.select({
      ios: 50,
      android: 40,
      default: 50
    }),
    left: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 1000,
  },
  modalCounterText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  modalImage: {
    width: width,
    height: '70%',
  },
  modalCaptionContainer: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalCaption: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});