import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import VideoPlayer from '@/components/VideoPlayer';
import { ArticleCard } from '@/components/ArticleCard';
import { RelatedArticlesSlider } from '@/components/RelatedArticlesSlider';
import { useArticlesStore } from '@/store/articlesStore';
import { useNotificationsStore } from '@/store/notificationsStore';
import { formatDateTime } from '@/utils/dateFormatter';
import { cleanHtml, extractVideoUrls, processGalleryIds, extractYouTubeUrl } from '@/utils/htmlParser';
import { useThemeStore } from '@/store/themeStore';
import { isSponsoredContent } from '@/utils/contentFilter';

const MAX_RETRIES = 3;
const { width, height } = Dimensions.get('window');

// Memoized gallery image component for better performance
const GalleryImage = React.memo(({ 
  image, 
  index, 
  onPress 
}: { 
  image: MediaItem; 
  index: number; 
  onPress: (index: number) => void;
}) => (
  <TouchableOpacity
    style={styles.galleryImageContainer}
    onPress={() => onPress(index)}
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
      priority="normal"
    />
  </TouchableOpacity>
));

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
  
  const scrollViewRef = useRef<ScrollView>(null);
  const progressOpacity = useRef(new Animated.Value(0)).current;
  const finishMessageOpacity = useRef(new Animated.Value(0)).current;
  const redirectTimeout = useRef<NodeJS.Timeout | null>(null);
  const hasShownFinishMessage = useRef(false);
  const webViewRef = useRef<WebView>(null);
  
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
  
  // Optimized article loading with better error handling
  const loadArticle = useCallback(async (retry = 0) => {
    try {
      console.log(`Loading article ${articleId}, retry: ${retry}`);
      setLoading(true);
      setError(null);
      
      const data = await fetchArticleById(articleId);
      
      console.log('Article loaded successfully:', data.title.rendered);
      
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
      
      // Add to recent articles
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
        }, Platform.OS === 'android' ? 800 : 500);
      }
    } catch (err: any) {
      console.error('Error loading article:', err);
      
      // Retry logic
      if (retry < MAX_RETRIES) {
        console.log(`Retrying article load (${retry + 1}/${MAX_RETRIES})...`);
        setTimeout(() => {
          loadArticle(retry + 1);
        }, 1000 * (retry + 1));
        return;
      }
      
      const errorMessage = err.message || 'Nie udało się załadować artykułu. Sprawdź połączenie internetowe i spróbuj ponownie.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [articleId, addRecentArticle]);
  
  useEffect(() => {
    loadArticle();
  }, [loadArticle]);
  
  const loadGalleryImages = useCallback(async (galleryIds: string[]) => {
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
  }, []);
  
  const loadRelatedArticles = useCallback(async (currentArticle: Article) => {
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
  }, []);
  
  const toggleSave = useCallback(() => {
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
  }, [article, isSaved, removeArticle, saveArticle, articleId]);
  
  const handleShare = useCallback(async () => {
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
      
      // Simplified native sharing
      const result = await Share.share({
        title: cleanTitle,
        message: `${cleanTitle}

${article.link}`,
        url: article.link,
      });
      
      if (result.action === Share.sharedAction) {
        console.log('Article shared successfully');
      }
    } catch (error: any) {
      console.error('Error sharing article:', error);
      
      // Fallback - copy to clipboard
      if (Platform.OS === 'web') {
        try {
          const cleanTitle = article.title.rendered
            .replace(/&#8211;/g, '-')
            .replace(/&#8217;/g, "'")
            .replace(/&#8220;/g, '"')
            .replace(/&#8221;/g, '"')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>');
            
          await navigator.clipboard.writeText(`${cleanTitle}

${article.link}`);
          Alert.alert(
            'Link skopiowany!',
            'Link do artykułu został skopiowany do schowka.',
            [{ text: 'OK' }]
          );
        } catch (clipboardError) {
          Alert.alert(
            'Udostępnij artykuł',
            `Skopiuj ten link:

${article.link}`,
            [{ text: 'OK' }]
          );
        }
      } else {
        Alert.alert(
          'Błąd udostępniania',
          'Nie udało się udostępnić artykułu. Spróbuj ponownie.',
          [{ text: 'OK' }]
        );
      }
    }
  }, [article]);
  
  const handleRetry = useCallback(() => {
    setError(null);
    setWebViewError(false);
    loadArticle();
  }, [loadArticle]);
  
  const handleGoBack = useCallback(() => {
    router.back();
  }, [router]);
  
  const handleGoHome = useCallback(() => {
    router.replace('/(tabs)');
  }, [router]);
  
  const handleGoNotifications = useCallback(() => {
    router.replace('/(tabs)/notifications');
  }, [router]);
  
  const handleGoSaved = useCallback(() => {
    router.replace('/(tabs)/saved');
  }, [router]);
  
  const handleGoSettings = useCallback(() => {
    router.replace('/(tabs)/preferences');
  }, [router]);
  
  const openImageModal = useCallback((index: number) => {
    setSelectedImageIndex(index);
  }, []);
  
  const closeImageModal = useCallback(() => {
    setSelectedImageIndex(null);
  }, []);
  
  const navigateImage = useCallback((direction: 'prev' | 'next') => {
    if (selectedImageIndex === null) return;
    
    if (direction === 'prev' && selectedImageIndex > 0) {
      setSelectedImageIndex(selectedImageIndex - 1);
    } else if (direction === 'next' && selectedImageIndex < galleryImages.length - 1) {
      setSelectedImageIndex(selectedImageIndex + 1);
    }
  }, [selectedImageIndex, galleryImages.length]);
  
  // Simplified scroll handler - removed reading progress logic
  const handleScroll = useCallback((event: any) => {
    // Keep only basic scroll handling if needed
  }, []);
  
  // Cleanup timeout when component unmounts
  useEffect(() => {
    return () => {
      if (redirectTimeout.current) {
        clearTimeout(redirectTimeout.current);
      }
    };
  }, []);
  
  // Memoized enhanced HTML for better performance
  const enhancedHtml = useMemo(() => {
    if (!article) return '';
    
    const cleanedHtml = cleanHtml(article.content.rendered);
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
          
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          
          body {
            font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
            font-size: 15px;
            line-height: 1.6;
            color: ${isDarkMode ? '#F1F5F9' : '#1E293B'} !important;
            background-color: ${isDarkMode ? '#1E293B' : '#F8FAFC'} !important;
            margin: 0;
            padding: 20px;
            word-wrap: break-word;
            overflow-wrap: break-word;
            -webkit-text-size-adjust: 100%;
            text-size-adjust: 100%;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }
          
          p {
            margin-bottom: 16px !important;
            font-family: 'Poppins', sans-serif !important;
            color: ${isDarkMode ? '#F1F5F9' : '#1E293B'} !important;
            font-size: 15px !important;
            line-height: 1.6 !important;
            font-weight: 400 !important;
          }
          
          img {
            max-width: 100% !important;
            height: auto !important;
            border-radius: 12px !important;
            margin: 20px 0 !important;
            display: block !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
          }
          
          a {
            color: ${theme.colors.primary} !important;
            text-decoration: none !important;
            font-weight: 500 !important;
            border-bottom: 1px solid transparent !important;
            transition: border-color 0.2s ease !important;
          }
          
          a:hover {
            border-bottom-color: ${theme.colors.primary} !important;
          }
          
          h1, h2, h3, h4, h5, h6 {
            color: ${isDarkMode ? '#F1F5F9' : '#1E293B'} !important;
            margin: 28px 0 18px 0 !important;
            line-height: 1.3 !important;
            font-family: 'Poppins', sans-serif !important;
            font-weight: 700 !important;
            letter-spacing: -0.02em !important;
          }
          
          h1 { font-size: 26px !important; }
          h2 { font-size: 22px !important; }
          h3 { font-size: 18px !important; }
          h4 { font-size: 16px !important; }
          h5 { font-size: 15px !important; }
          h6 { font-size: 14px !important; }
          
          blockquote {
            position: relative !important;
            margin: 24px 0 !important;
            padding: 20px 24px 20px 60px !important;
            background: ${isDarkMode ? 'rgba(74, 123, 200, 0.12)' : 'rgba(34, 74, 150, 0.06)'} !important;
            border-radius: 16px !important;
            border-left: 4px solid ${theme.colors.primary} !important;
            font-style: italic !important;
            font-size: 16px !important;
            line-height: 1.5 !important;
            color: ${isDarkMode ? '#E2E8F0' : '#475569'} !important;
            box-shadow: ${isDarkMode ? '0 6px 24px rgba(0, 0, 0, 0.2)' : '0 6px 24px rgba(34, 74, 150, 0.06)'} !important;
            font-family: 'Poppins', sans-serif !important;
          }
          
          blockquote::before {
            content: '"' !important;
            position: absolute !important;
            left: 20px !important;
            top: 12px !important;
            font-size: 48px !important;
            font-weight: bold !important;
            color: ${theme.colors.primary} !important;
            opacity: 0.25 !important;
            line-height: 1 !important;
            font-family: 'Poppins', sans-serif !important;
          }
          
          blockquote p {
            margin: 0 !important;
            position: relative !important;
            z-index: 1 !important;
            font-family: 'Poppins', sans-serif !important;
            color: ${isDarkMode ? '#E2E8F0' : '#475569'} !important;
            font-size: 16px !important;
          }
          
          ul, ol {
            padding-left: 24px !important;
            margin: 18px 0 !important;
          }
          
          li {
            margin-bottom: 10px !important;
            font-family: 'Poppins', sans-serif !important;
            color: ${isDarkMode ? '#F1F5F9' : '#1E293B'} !important;
            font-size: 15px !important;
            line-height: 1.5 !important;
          }
          
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin: 20px 0 !important;
            border-radius: 12px !important;
            overflow: hidden !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
          }
          
          th, td {
            border: 1px solid ${isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'} !important;
            padding: 14px 10px !important;
            text-align: left !important;
            font-family: 'Poppins', sans-serif !important;
            color: ${isDarkMode ? '#F1F5F9' : '#1E293B'} !important;
            font-size: 14px !important;
          }
          
          th {
            background-color: ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'} !important;
            font-weight: 600 !important;
            font-family: 'Poppins', sans-serif !important;
          }
          
          /* Remove any video/iframe elements to prevent conflicts */
          iframe, video, embed, object {
            display: none !important;
          }
          
          /* Force text color on all elements */
          *, *::before, *::after {
            color: ${isDarkMode ? '#F1F5F9' : '#1E293B'} !important;
          }
          
          /* iOS specific fixes */
          @supports (-webkit-touch-callout: none) {
            body {
              -webkit-text-size-adjust: 100% !important;
              -webkit-font-smoothing: antialiased !important;
              color: ${isDarkMode ? '#F1F5F9' : '#1E293B'} !important;
              background-color: ${isDarkMode ? '#1E293B' : '#F8FAFC'} !important;
            }
            
            p, span, div, li, td, th, h1, h2, h3, h4, h5, h6, a {
              color: ${isDarkMode ? '#F1F5F9' : '#1E293B'} !important;
              -webkit-font-smoothing: antialiased !important;
            }
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
  }, [article, isDarkMode, theme.colors.primary]);
  
  // Memoized content renderer
  const renderContent = useMemo(() => {
    if (Platform.OS === 'web') {
      return (
        <View style={styles.htmlContainer}>
          <div 
            dangerouslySetInnerHTML={{ __html: enhancedHtml }}
            style={{
              color: isDarkMode ? '#F1F5F9' : '#1E293B',
              fontFamily: 'Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
              fontSize: '15px', // Reduced font size
              lineHeight: '1.6',
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
            onPress={() => Linking.openURL(article?.link || '')}
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
            ref={webViewRef}
            originWhitelist={['*']}
            source={{ html: enhancedHtml }}
            style={[
              styles.webview, 
              { 
                height: webViewHeight,
                backgroundColor: theme.colors.background // Match app background
              }
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
                  setWebViewHeight(Math.max(height + (Platform.OS === 'android' ? 100 : 50), 300));
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
            // Simplified Android props
            androidLayerType="hardware"
            mixedContentMode="compatibility"
            allowsFullscreenVideo={false}
            mediaPlaybackRequiresUserAction={true}
            cacheEnabled={Platform.OS === 'android'}
            domStorageEnabled={true}
            javaScriptEnabled={true}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
                <LoadingIndicator size="small" />
              </View>
            )}
          />
        </View>
      );
    }
  }, [enhancedHtml, webViewError, webViewHeight, isDarkMode, theme.colors, article]);
  
  // Memoized gallery render
  const renderGallery = useMemo(() => {
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
            <GalleryImage
              key={image.id}
              image={image}
              index={index}
              onPress={openImageModal}
            />
          ))}
        </View>
      </View>
    );
  }, [contentLoaded, galleryLoading, galleryImages, theme.colors, openImageModal]);
  
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
        {/* Featured image with 40% screen height */}
        {article.featured_media_url ? (
          <View style={styles.featuredImageContainer}>
            <Image
              source={{ uri: article.featured_media_url }}
              style={styles.featuredImage}
              contentFit="cover"
              transition={300}
              placeholder="Loading..."
              cachePolicy="memory-disk"
              priority="high"
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
        <View style={[styles.articleContent, { backgroundColor: theme.colors.background }]}>
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
                <VideoPlayer key={`video-${index}`} url={url} />
              ))}
            </View>
          )}
          
          {/* Article content */}
          {renderContent}
          
          {/* YouTube video from meta field - moved after content */}
          {youtubeUrl && (
            <View style={styles.youtubeContainer}>
              <VideoPlayer url={youtubeUrl} title="YouTube Video" />
            </View>
          )}
          
          {/* Gallery (moved below content) */}
          {renderGallery}
          
          {/* Related articles */}
          {contentLoaded && (
            <View style={styles.relatedContainer}>
              {/* Slider for related articles */}
              {relatedSliderArticles.length > 0 && (
                <RelatedArticlesSlider 
                  articles={relatedSliderArticles} 
                  title="Sprawdź również" 
                />
              )}
              
              {/* List of latest articles */}
              {relatedListArticles.length > 0 && (
                <View style={styles.relatedListContainer}>
                  <Text style={[
                    styles.relatedTitle, 
                    { 
                      color: theme.colors.text,
                      fontFamily: theme.fontFamily.bold
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
          )}
        </View>
      </ScrollView>
      
      {/* Bottom menu bar */}
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
      
      {/* Image modal */}
      {selectedImageIndex !== null && galleryImages[selectedImageIndex] && (
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
              source={{ uri: galleryImages[selectedImageIndex].source_url }}
              style={styles.modalImage}
              contentFit="contain"
              transition={200}
            />
            
            {/* Caption */}
            {galleryImages[selectedImageIndex].caption?.rendered && (
              <View style={styles.modalCaptionContainer}>
                <Text style={[styles.modalCaption, { fontFamily: theme.fontFamily.regular }]}>
                  {galleryImages[selectedImageIndex].caption.rendered.replace(/<[^>]*>/g, '')}
                </Text>
              </View>
            )}
          </View>
        </Modal>
      )}
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
    paddingHorizontal: 20,
    paddingTop: Platform.select({
      ios: 54,
      android: 48,
      default: 54
    }),
    paddingBottom: 16,
    zIndex: 1000,
  },
  circularButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 120, // Space for bottom menu
  },
  featuredImageContainer: {
    position: 'relative',
    width: '100%',
    height: height * 0.4, // 40% of screen height
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  imageDarkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  categoryBadge: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  articleContent: {
    padding: 28,
    marginTop: -32,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    minHeight: 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 20,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  metaContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  metaText: {
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },
  source: {
    fontSize: 13,
    marginBottom: 24,
    fontStyle: 'italic',
    opacity: 0.8,
  },
  videoContainer: {
    marginBottom: 28,
  },
  youtubeContainer: {
    marginTop: 28,
    marginBottom: 28,
  },
  galleryContainer: {
    marginTop: 36,
    marginBottom: 28,
  },
  galleryTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  galleryLoadingContainer: {
    height: 120,
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
    width: (width - 88) / 2,
    height: 140,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  relatedContainer: {
    marginTop: 40,
    paddingTop: 32,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
    marginHorizontal: -28, // Extend to full width for slider
  },
  relatedListContainer: {
    marginTop: 32,
    paddingHorizontal: 28, // Add padding back for list
  },
  relatedTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 24,
    letterSpacing: -0.4,
  },
  relatedList: {
    gap: 16,
  },
  bottomMenuBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 24,
    paddingBottom: Platform.select({
      ios: 38,
      android: 16,
      default: 16,
    }),
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 12,
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
    fontWeight: '600',
    marginTop: 6,
    letterSpacing: 0.2,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: '25%',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  htmlContainer: {
    width: '100%',
    minHeight: 200,
    marginTop: 8,
  },
  webview: {
    width: '100%',
    minHeight: 300,
    backgroundColor: 'transparent',
  },
  fallbackContainer: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
    marginTop: 8,
  },
  fallbackText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  fallbackButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  fallbackButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
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
    borderRadius: 16,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.96)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: Platform.select({
      ios: 54,
      android: 44,
      default: 54
    }),
    right: 24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalNavButton: {
    position: 'absolute',
    top: '50%',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    marginTop: -24,
  },
  modalNavButtonLeft: {
    left: 24,
  },
  modalNavButtonRight: {
    right: 24,
  },
  modalCounter: {
    position: 'absolute',
    top: Platform.select({
      ios: 54,
      android: 44,
      default: 54
    }),
    left: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 1000,
  },
  modalCounterText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  modalImage: {
    width: width,
    height: '70%',
  },
  modalCaptionContainer: {
    position: 'absolute',
    bottom: 48,
    left: 24,
    right: 24,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  modalCaption: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  // Reading progress indicator - only shows when at bottom
  progressIndicator: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  // Finish message
  finishMessage: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    height: 100,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  finishMessageContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  finishMessageTitle: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 12,
  },
  finishMessageSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  finishMessageButton: {
    marginTop: 16,
    width: '100%',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
});