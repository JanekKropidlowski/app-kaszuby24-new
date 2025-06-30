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
  StatusBar,
  BackHandler,
  Modal,
  PanResponder,
  Animated
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { WebView } from 'react-native-webview';
import { Bookmark, Share2, RefreshCw, ArrowLeft, Calendar, X, ChevronLeft, ChevronRight, Home } from 'lucide-react-native';
import { fetchArticleById, fetchMediaByIds, fetchRelatedArticles, getAdjacentArticle } from '@/services/api';
import { Article, MediaItem } from '@/types/article';
import LoadingIndicator from '@/components/LoadingIndicator';
import EmptyState from '@/components/EmptyState';
import VideoPlayer from '@/components/VideoPlayer';
import { ArticleCard } from '@/components/ArticleCard';
import { RelatedArticlesSlider } from '@/components/RelatedArticlesSlider';
import { useArticlesStore } from '@/store/articlesStore';
import { formatDateTime } from '@/utils/dateFormatter';
import { cleanHtml, extractVideoUrls, processGalleryIds, extractYouTubeUrl } from '@/utils/htmlParser';
import { useThemeStore } from '@/store/themeStore';
import { isSponsoredContent } from '@/utils/contentFilter';

const MAX_RETRIES = 3;
const { width, height } = Dimensions.get('window');

export default function ArticleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isArticleSaved, saveArticle, removeArticle, addRecentArticle } = useArticlesStore();
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
  const [nextArticle, setNextArticle] = useState<Article | null>(null);
  const [prevArticle, setPrevArticle] = useState<Article | null>(null);
  const [showRedirectInfo, setShowRedirectInfo] = useState(false);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const swipeGesture = useRef(new Animated.Value(0)).current;
  const swipeOpacity = useRef(new Animated.Value(0)).current;
  const isScrollingToEnd = useRef(false);
  const redirectTimeout = useRef<NodeJS.Timeout | null>(null);
  
  const articleId = parseInt(id as string, 10);
  const isSaved = isArticleSaved(articleId);
  
  // Swipe gesture handler
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only respond to horizontal swipes
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 20;
      },
      onPanResponderGrant: () => {
        swipeGesture.setValue(0);
        // Show swipe indicators
        Animated.timing(swipeOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderMove: (evt, gestureState) => {
        // Limit the swipe distance for visual feedback
        const clampedDx = Math.max(-100, Math.min(100, gestureState.dx));
        swipeGesture.setValue(clampedDx);
      },
      onPanResponderRelease: (evt, gestureState) => {
        const threshold = 50;
        
        // Hide swipe indicators
        Animated.timing(swipeOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
        
        if (gestureState.dx > threshold && prevArticle) {
          // Swipe right - go to previous article
          Animated.timing(swipeGesture, {
            toValue: width,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            router.replace(`/article/${prevArticle.id}`);
          });
        } else if (gestureState.dx < -threshold && nextArticle) {
          // Swipe left - go to next article
          Animated.timing(swipeGesture, {
            toValue: -width,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            router.replace(`/article/${nextArticle.id}`);
          });
        } else {
          // Snap back
          Animated.spring(swipeGesture, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;
  
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
  
  // Load adjacent articles for swipe navigation
  useEffect(() => {
    if (articleId) {
      // Load next and previous articles
      getAdjacentArticle(articleId, 'next').then(setNextArticle);
      getAdjacentArticle(articleId, 'prev').then(setPrevArticle);
    }
  }, [articleId]);
  
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
            const processedGalleryIds = processGalleryIds(data.meta?.galeria);
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
            const processedGalleryIds = processGalleryIds(data.meta?.galeria);
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
  
  // Handle scroll to end for auto-redirect
  const handleScroll = (event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const scrollPosition = contentOffset.y;
    const scrollViewHeight = layoutMeasurement.height;
    const contentHeight = contentSize.height;
    
    // Check if user has scrolled to the bottom
    const isAtBottom = scrollPosition + scrollViewHeight >= contentHeight - 100;
    
    if (isAtBottom && !isScrollingToEnd.current && !showRedirectInfo) {
      isScrollingToEnd.current = true;
      setShowRedirectInfo(true);
      
      // Clear any existing timeout
      if (redirectTimeout.current) {
        clearTimeout(redirectTimeout.current);
      }
      
      // Set timeout for redirect
      redirectTimeout.current = setTimeout(() => {
        router.replace('/(tabs)');
      }, 3000);
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
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
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
        }
        
        blockquote {
          border-left: 4px solid ${theme.colors.primary};
          padding-left: 16px;
          margin: 16px 0;
          font-style: italic;
          background-color: ${isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'};
          padding: 16px;
          border-radius: 8px;
        }
        
        ul, ol {
          padding-left: 20px;
          margin: 16px 0;
        }
        
        li {
          margin-bottom: 8px;
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
        }
        
        th {
          background-color: ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'};
          font-weight: bold;
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
          <Text style={[styles.fallbackText, { color: theme.colors.text }]}>
            Treść artykułu nie może być wyświetlona w aplikacji.
          </Text>
          <TouchableOpacity 
            style={[styles.fallbackButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => Linking.openURL(article.link)}
          >
            <Text style={styles.fallbackButtonText}>
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
        <VideoPlayer url={youtubeUrl} title="YouTube Video" />
      </View>
    );
  };
  
  // Render gallery (moved below content)
  const renderGallery = () => {
    if (!contentLoaded) return null;
    
    if (galleryLoading) {
      return (
        <View style={styles.galleryContainer}>
          <Text style={[styles.galleryTitle, { color: theme.colors.text }]}>
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
            fontFamily: Platform.OS === 'android' ? undefined : theme.fontFamily.semibold
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
                fontFamily: Platform.OS === 'android' ? undefined : theme.fontFamily.semibold
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
  
  // Render swipe indicators
  const renderSwipeIndicators = () => {
    if (!prevArticle && !nextArticle) return null;
    
    return (
      <Animated.View style={[styles.swipeIndicators, { opacity: swipeOpacity }]}>
        {prevArticle && (
          <View style={[styles.swipeIndicator, styles.swipeIndicatorLeft]}>
            <View style={[styles.swipePreview, { backgroundColor: theme.colors.card }]}>
              <ChevronLeft size={16} color={theme.colors.primary} />
              <Text style={[styles.swipeIndicatorText, { color: theme.colors.textSecondary }]}>
                Poprzedni
              </Text>
            </View>
          </View>
        )}
        
        {nextArticle && (
          <View style={[styles.swipeIndicator, styles.swipeIndicatorRight]}>
            <View style={[styles.swipePreview, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.swipeIndicatorText, { color: theme.colors.textSecondary }]}>
                Następny
              </Text>
              <ChevronRight size={16} color={theme.colors.primary} />
            </View>
          </View>
        )}
      </Animated.View>
    );
  };
  
  // Render redirect info
  const renderRedirectInfo = () => {
    if (!showRedirectInfo) return null;
    
    return (
      <Animated.View 
        style={[
          styles.redirectInfo, 
          { backgroundColor: theme.colors.primary }
        ]}
      >
        <Home size={16} color="#FFFFFF" />
        <Text style={styles.redirectText}>
          Przekierowanie do strony głównej za 3 sekundy...
        </Text>
        <TouchableOpacity
          onPress={() => {
            setShowRedirectInfo(false);
            if (redirectTimeout.current) {
              clearTimeout(redirectTimeout.current);
            }
          }}
        >
          <X size={16} color="#FFFFFF" />
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
            <Text style={styles.modalCounterText}>
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
              <Text style={styles.modalCaption}>
                {currentImage.caption.rendered.replace(/<[^>]*>/g, '')}
              </Text>
            </View>
          )}
        </View>
      </Modal>
    );
  };
  
  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          backgroundColor: theme.colors.background,
          transform: [{ translateX: swipeGesture }]
        }
      ]}
      {...panResponder.panHandlers}
    >
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
                    fontFamily: Platform.OS === 'android' ? undefined : theme.fontFamily.semibold 
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
              fontFamily: Platform.OS === 'android' ? undefined : theme.fontFamily.bold
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
                  fontFamily: Platform.OS === 'android' ? undefined : theme.fontFamily.regular
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
                fontFamily: Platform.OS === 'android' ? undefined : theme.fontFamily.regular
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
          <Text style={[styles.bottomMenuText, { color: theme.colors.text }]}>
            Główna
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.bottomMenuItem}
          onPress={handleShare}
          activeOpacity={0.7}
        >
          <Share2 size={20} color={theme.colors.text} />
          <Text style={[styles.bottomMenuText, { color: theme.colors.text }]}>
            Udostępnij
          </Text>
        </TouchableOpacity>
        
        {!isSponsoredContent(article) && (
          <TouchableOpacity
            style={styles.bottomMenuItem}
            onPress={toggleSave}
            activeOpacity={0.7}
          >
            <Bookmark 
              size={20} 
              color={isSaved ? theme.colors.primary : theme.colors.text}
              fill={isSaved ? theme.colors.primary : 'transparent'} 
            />
            <Text style={[
              styles.bottomMenuText, 
              { color: isSaved ? theme.colors.primary : theme.colors.text }
            ]}>
              {isSaved ? 'Zapisane' : 'Zapisz'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Swipe indicators */}
      {renderSwipeIndicators()}
      
      {/* Redirect info */}
      {renderRedirectInfo()}
      
      {/* Image modal */}
      {renderImageModal()}
    </Animated.View>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 80, // Space for bottom menu
  },
  featuredImageContainer: {
    position: 'relative',
    height: Platform.select({
      ios: 300,
      android: 280,
      default: 300
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
    gap: 12, // Improved spacing
    justifyContent: 'space-between',
  },
  galleryImageContainer: {
    width: (width - 72) / 2, // Better calculation for 2 columns
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
  swipeIndicators: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    pointerEvents: 'none',
  },
  swipeIndicator: {
    alignItems: 'center',
  },
  swipeIndicatorLeft: {
    alignSelf: 'flex-start',
  },
  swipeIndicatorRight: {
    alignSelf: 'flex-end',
  },
  swipePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  swipeIndicatorText: {
    fontSize: 12,
    marginHorizontal: 4,
    fontWeight: '500',
  },
  redirectInfo: {
    position: 'absolute',
    bottom: 90,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  redirectText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
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
  },
  bottomMenuText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
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