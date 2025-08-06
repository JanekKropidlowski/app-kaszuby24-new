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
  Alert,
  FlatList
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Image as RNImage } from 'react-native';
import { WebView } from 'react-native-webview';
import { Bookmark, Share2, RefreshCw, ArrowLeft, Calendar, X, ChevronLeft, ChevronRight, Home, Bell, Settings, Search, Download, Eye, Clock, MapPin } from 'lucide-react-native';
import { PanGestureHandler, PinchGestureHandler, State, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  useAnimatedGestureHandler,
  runOnJS,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate
} from 'react-native-reanimated';
// import ImageViewing from 'react-native-image-viewing';
import { OptimizedLightbox } from '@/components/OptimizedLightbox';
import * as Haptics from 'expo-haptics';
import { fetchArticleBySlug, fetchMediaByIds, fetchRelatedArticles } from '@/services/api';
import { Article, MediaItem } from '@/types/article';
import LoadingIndicator from '@/components/LoadingIndicator';
import EmptyState from '@/components/EmptyState';
import VideoPlayer from '@/components/VideoPlayer';
import { ArticleCard } from '@/components/ArticleCard';
import { RelatedArticlesSlider } from '@/components/RelatedArticlesSlider';
import SkeletonLoader from '@/components/SkeletonLoader';
import { useArticlesStore } from '@/store/articlesStore';
import { useNotificationsStore } from '@/store/notificationsStore';
import { formatDateTime } from '@/utils/dateFormatter';
import { cleanHtml, processGalleryIds, extractVideoUrls, extractYouTubeUrl, getYouTubeVideoId } from '@/utils/htmlParser';
import { useThemeStore } from '@/store/themeStore';
import { isSponsoredContent } from '@/utils/contentFilter';
import { progressBarStyles } from '@/styles/progressBar';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import GlobalTabBar from '@/components/GlobalTabBar';

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

export default function ArticleSlugScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  
  useEffect(() => {
    if (!slug || typeof slug !== 'string') {
      console.error('Invalid article slug:', slug);
      router.back();
      return;
    }
  }, [slug, router]);
  
  const { isArticleSaved, saveArticle, removeArticle, addRecentArticle } = useArticlesStore();

  const { theme, isDarkMode } = useThemeStore();
  
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoUrls, setVideoUrls] = useState<string[]>([]);
  const [youtubeUrl, setYoutubeUrl] = useState<string | null>(null);
  const [webViewHeight, setWebViewHeight] = useState(300);
  const [webViewError, setWebViewError] = useState(false);
  const [galleryImages, setGalleryImages] = useState<MediaItem[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  // DEBUG: Szczegółowe logi dla selectedImageIndex
  useEffect(() => {
    console.log('[LIGHTBOX DEBUG SLUG] selectedImageIndex changed to:', selectedImageIndex);
    if (selectedImageIndex !== null) {
      console.log('[LIGHTBOX DEBUG SLUG] Lightbox opening automatically! Stack trace:');
      console.trace('[LIGHTBOX DEBUG SLUG] Automatic lightbox open');
      console.log('[LIGHTBOX DEBUG SLUG] Current galleryImages length:', galleryImages.length);
    }
  }, [selectedImageIndex, galleryImages.length]);
  const [relatedSliderArticles, setRelatedSliderArticles] = useState<Article[]>([]);
  const [relatedListArticles, setRelatedListArticles] = useState<Article[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [contentLoaded, setContentLoaded] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const [showProgressBar, setShowProgressBar] = useState(false);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const redirectTimeout = useRef<NodeJS.Timeout | null>(null);
  const webViewRef = useRef<WebView>(null);
  const progressOpacityValue = useRef(0);
  const progressBarWidthValue = useRef(0);
  
  // Pinch-to-zoom shared values
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  
  const isSaved = article ? isArticleSaved(article.id) : false;
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isLightboxVisible, setIsLightboxVisible] = useState(false);
  const [isLightboxReady, setIsLightboxReady] = useState(false);

  // Stabilne referencje dla lightboxa - zapobiegają przeładowaniu
  const lightboxImages = useMemo(() => 
    galleryImages.map(img => ({ 
      uri: img.media_details?.sizes?.large?.source_url || img.source_url 
    })), [galleryImages]
  );

  // Preloadowanie zdjęć dla lightboxa - poprawia płynność
  useEffect(() => {
    if (lightboxImages.length > 0) {
      // Preloaduj tylko pierwsze 3 zdjęcia dla lepszej wydajności
      const imagesToPreload = lightboxImages.slice(0, 3);
      imagesToPreload.forEach(img => {
        if (img.uri) {
          RNImage.prefetch(img.uri).catch(() => {
            // Ignoruj błędy preloadowania
          });
        }
      });
    }
  }, [lightboxImages]);

  // Stabilna referencja dla onImageIndexChange - zapobiega niepotrzebnym re-renderom
  const handleImageIndexChange = useCallback((index: number) => {
    setSelectedImageIndex(index);
  }, []);

  // Optymalizacja: nie resetuj selectedImageIndex przy ładowaniu danych
  
  // Load article data - optimized
  useEffect(() => {
    const loadArticleData = async () => {
      if (!slug || Array.isArray(slug)) {
        setError('Nieprawidłowy slug artykułu');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        // NIE resetuj selectedImageIndex tutaj - pozwól na płynne przejścia
        
        // Load article data first
        const articleData = await fetchArticleBySlug(slug);
        
        if (!articleData) {
          setError('Nie znaleziono artykułu');
          setLoading(false);
          return;
        }

        setArticle(articleData);
        addRecentArticle(articleData);

        // Load gallery images in background (non-blocking)
        const galleryIds = articleData.meta?.galeria ? processGalleryIds(articleData.meta.galeria) : [];
        if (galleryIds.length > 0) {
          fetchMediaByIds(galleryIds)
            .then(galleryData => {
              console.log('[LIGHTBOX DEBUG SLUG] Setting galleryImages with length:', galleryData.length);
              // NIE resetuj selectedImageIndex - pozwól na płynne przejścia w lightboxie
              setGalleryImages(galleryData);
            })
            .catch(err => {
              console.warn('Failed to load gallery images:', err);
            });
        }

        // Extract video URLs in background
        if (articleData.content?.rendered) {
          const videoUrls = extractVideoUrls(articleData.content.rendered);
          setVideoUrls(videoUrls);
        }

        // Extract YouTube URL if available
        if (articleData.meta?.youtube) {
          const ytUrl = extractYouTubeUrl(articleData.meta.youtube);
          if (ytUrl) {
            setYoutubeUrl(ytUrl);
          }
        }

        // Load related articles in background
        if (articleData.categories && articleData.categories.length > 0) {
          fetchRelatedArticles(articleData.id, articleData.categories, 6)
            .then(relatedData => {
              setRelatedSliderArticles(relatedData.sliderArticles);
              setRelatedListArticles(relatedData.listArticles);
            })
            .catch(err => {
              console.warn('Failed to load related articles:', err);
            });
        }

        setLoading(false);
        
      } catch (err: any) {
        console.error('Error loading article:', err);
        setError(err.message || 'Nie udało się załadować artykułu. Spróbuj ponownie.');
        setLoading(false);
      }
    };
    
    loadArticleData();
    
    return () => {
      // Cleanup if needed
    };
  }, [slug, addRecentArticle]);
  
  // Function to handle retry when article loading fails
  const handleRetry = useCallback(() => {
    setLoading(true);
    setError(null);
    
    // Force reload the current page
    router.replace(`/article/${slug}`);
  }, [router, slug]);

  // Function to handle going back
  const handleGoBack = useCallback(() => {
    router.back();
  }, [router]);

  // Function to handle sharing the article
  const handleShare = useCallback(() => {
    if (article) {
      Share.share({
        message: article.title.rendered,
        url: article.link,
        title: article.title.rendered,
      });
    }
  }, [article]);

  // Function to toggle saving/unsaving the article
  const toggleSave = useCallback(() => {
    if (article) {
      if (isSaved) {
        removeArticle(article.id);
      } else {
        saveArticle(article);
      }
    }
  }, [article, isSaved, removeArticle, saveArticle]);

  // Function to open image modal with haptic feedback - zoptymalizowana
  const openImageModal = useCallback((index: number) => {
    if (galleryImages.length === 0) return;
    
    if (index >= 0 && index < galleryImages.length) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      // Ustaw wszystko jednocześnie dla natychmiastowego otwarcia
      setSelectedImageIndex(index);
      setIsLightboxReady(true);
      setIsLightboxVisible(true);
    }
  }, [galleryImages.length]);

  // Function to close image modal - zoptymalizowana
  const closeImageModal = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Najpierw zamknij lightbox, potem zresetuj index
    setIsLightboxVisible(false);
    setZoomLevel(1);
    setIsLightboxReady(false);
    // Krótkie opóźnienie przed resetowaniem indexu
    setTimeout(() => setSelectedImageIndex(null), 300);
  }, []);

  // Function to navigate between images in the modal - zoptymalizowana
  const navigateImage = useCallback((direction: 'prev' | 'next') => {
    if (selectedImageIndex === null || !galleryImages.length) return;
    
    if (direction === 'prev' && selectedImageIndex > 0) {
      // Płynne przejście do poprzedniego zdjęcia
      setSelectedImageIndex(selectedImageIndex - 1);
      // Preloaduj poprzednie zdjęcie jeśli istnieje
      const prevIndex = selectedImageIndex - 2;
      if (prevIndex >= 0 && galleryImages[prevIndex]) {
        const prevImageUrl = galleryImages[prevIndex].media_details?.sizes?.large?.source_url || galleryImages[prevIndex].source_url;
        RNImage.prefetch(prevImageUrl).catch(() => {});
      }
    } else if (direction === 'next' && selectedImageIndex < galleryImages.length - 1) {
      // Płynne przejście do następnego zdjęcia
      setSelectedImageIndex(selectedImageIndex + 1);
      // Preloaduj następne zdjęcie jeśli istnieje
      const nextIndex = selectedImageIndex + 2;
      if (nextIndex < galleryImages.length && galleryImages[nextIndex]) {
        const nextImageUrl = galleryImages[nextIndex].media_details?.sizes?.large?.source_url || galleryImages[nextIndex].source_url;
        RNImage.prefetch(nextImageUrl).catch(() => {});
      }
    }
  }, [selectedImageIndex, galleryImages.length]);

  // Function to download image - POPRAWIONA
  const downloadImage = useCallback(async () => {
    if (selectedImageIndex === null || !galleryImages[selectedImageIndex]) return;
    
    try {
      const imageUrl = galleryImages[selectedImageIndex].source_url;
      
      // Sprawdź uprawnienia do zapisu
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Błąd', 'Brak uprawnień do zapisu zdjęć');
        return;
      }
      
      // Pokaż loader
      Alert.alert('Pobieranie...', 'Zdjęcie jest pobierane...');
      
      // Pobierz zdjęcie
      const fileName = `kaszuby24_${Date.now()}.jpg`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      const downloadResult = await FileSystem.downloadAsync(imageUrl, fileUri);
      
      if (downloadResult.status === 200) {
        // Zapisz do galerii
        const asset = await MediaLibrary.createAssetAsync(fileUri);
        await MediaLibrary.createAlbumAsync('Kaszuby24', asset, false);
        
        Alert.alert('Sukces!', 'Zdjęcie zostało pobrane do galerii');
        
        // Usuń tymczasowy plik
        await FileSystem.deleteAsync(fileUri, { idempotent: true });
      } else {
        throw new Error('Błąd pobierania');
      }
    } catch (error) {
      console.error('Błąd pobierania zdjęcia:', error);
      Alert.alert('Błąd', 'Nie udało się pobrać zdjęcia');
    }
  }, [selectedImageIndex, galleryImages, article]);

  // Swipe gesture handler for image navigation
  const swipeGestureHandler = useAnimatedGestureHandler({
    onStart: (_, context: any) => {
      context.startX = 0;
    },
    onActive: (event, context) => {
      context.startX = event.translationX;
    },
    onEnd: (event) => {
      if (Math.abs(event.translationX) > 100) {
        if (event.translationX > 0) {
          runOnJS(navigateImage)('prev');
        } else {
          runOnJS(navigateImage)('next');
        }
      }
    },
  });

  // Navigation functions for bottom menu - updated to match main tabs
  const handleGoHome = useCallback(() => {
    router.replace('/(tabs)');
  }, [router]);

  const handleGoSearch = useCallback(() => {
    router.push('/(tabs)/search');
  }, [router]);

  const handleGoSaved = useCallback(() => {
    router.push('/(tabs)/saved');
  }, [router]);



  const handleGoSettings = useCallback(() => {
    router.push('/(tabs)/preferences');
  }, [router]);
  
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
  
  // Simple scroll handler without animations
  const handleScroll = useCallback((event: any) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    const scrollViewHeight = event.nativeEvent.layoutMeasurement.height;
    const contentHeight = event.nativeEvent.contentSize.height;
    
    // Calculate reading progress (0 to 1)
    const progress = Math.min(
      Math.max(scrollY / (contentHeight - scrollViewHeight), 0),
      1
    );
    
    setReadingProgress(progress);
    
    // Show/hide progress bar based on scroll position
    setShowProgressBar(scrollY > 50);
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
    
    const cleanedHtml = cleanHtml(article.content.rendered, isDarkMode);
    
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
            font-family: 'Poppins', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
            font-size: 14px !important;
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
            font-size: 14px !important;
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
          
          h1 { font-size: 22px !important; }
          h2 { font-size: 18px !important; }
          h3 { font-size: 16px !important; }
          h4 { font-size: 15px !important; }
          h5 { font-size: 14px !important; }
          h6 { font-size: 13px !important; }
          
          blockquote {
            position: relative !important;
            margin: 24px 0 !important;
            padding: 20px 24px 20px 60px !important;
            background: ${isDarkMode ? 'rgba(74, 123, 200, 0.12)' : 'rgba(34, 74, 150, 0.06)'} !important;
            border-radius: 16px !important;
            border-left: 4px solid ${theme.colors.primary} !important;
            font-style: italic !important;
            font-size: 14px !important;
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
            font-size: 14px !important;
          }
          
          ul, ol {
            padding-left: 24px !important;
            margin: 18px 0 !important;
          }
          
          li {
            margin-bottom: 10px !important;
            font-family: 'Poppins', sans-serif !important;
            color: ${isDarkMode ? '#F1F5F9' : '#1E293B'} !important;
            font-size: 14px !important;
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
          
          /* Force bold styling */
          strong, b {
            font-weight: 700 !important;
            font-family: 'Poppins', sans-serif !important;
            color: ${isDarkMode ? '#F1F5F9' : '#1E293B'} !important;
            font-size: 14px !important;
            line-height: 1.6 !important;
          }
          
          /* Force bold on any element with font-weight: bold */
          [style*="font-weight: bold"], [style*="font-weight:bold"] {
            font-weight: 700 !important;
            font-family: 'Poppins', sans-serif !important;
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
    if (webViewError) {
      // Fallback for Android when WebView fails - now using embedded iframe instead of external link
      const youtubeVideoId = getYouTubeVideoId(article?.link || '');
      if (youtubeVideoId) {
        return (
          <View style={[styles.fallbackContainer, { backgroundColor: theme.colors.background }]}>
            <VideoPlayer url={`https://www.youtube.com/watch?v=${youtubeVideoId}`} />
          </View>
        );
      }
      
      return (
        <View style={[styles.fallbackContainer, { backgroundColor: theme.colors.background }]}>
          <WebView
            source={{ uri: article?.link || '' }}
            style={styles.webview}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
                <LoadingIndicator size="small" />
              </View>
            )}
          />
        </View>
      );
    } else {
      return (
        <View style={[styles.htmlContainer, { backgroundColor: theme.colors.background }]}>
          <WebView
            ref={webViewRef}
            originWhitelist={['*']}
            source={{ html: enhancedHtml }}
            style={[
              styles.webview, 
              { 
                height: webViewHeight,
                backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC'
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
  
  // Render source and photo credit at the bottom
  const renderSourceAndCredit = useMemo(() => {
    if (!article) return null;
    
    const metaSource = article.meta?.zrudlo || article.meta?.zrodlo || '';
    const photoCredit = article.meta?.foto || '';
    
    if (!metaSource && !photoCredit) return null;
    
    return (
      <View style={styles.sourceCreditsContainer}>
        {photoCredit && (
          <Text style={[
            styles.sourceCreditsText, 
            { 
              color: theme.colors.textSecondary,
              fontFamily: theme.fontFamily.regular
            }
          ]}>
            fot. {photoCredit}
          </Text>
        )}
        
        {metaSource && (
          <Text style={[
            styles.sourceCreditsText, 
            { 
              color: theme.colors.textSecondary,
              fontFamily: theme.fontFamily.regular
            }
          ]}>
            źródło: {metaSource}
          </Text>
        )}
      </View>
    );
  }, [article, theme.colors, theme.fontFamily]);
  
  if (initialLoading) {
    return <SkeletonLoader type="article" immediate={true} />;
  }
  
  if (loading && !initialLoading) {
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
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar 
        translucent 
        backgroundColor="transparent" 
        barStyle="light-content" 
      />
      
      {/* Simple progress bar without animations */}
      {showProgressBar && (
        <View style={[styles.progressBar, { backgroundColor: theme.colors.primary }]}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${readingProgress * 100}%`
              }
            ]}
          />
        </View>
      )}
      
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
        {/* Featured image with enhanced styling */}
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
          </View>
        ) : (
          <View style={[styles.featuredImageContainer, styles.featuredImagePlaceholder, { backgroundColor: theme.colors.subtle }]}>
            <View style={styles.imageDarkOverlay} />
          </View>
        )}
        
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
            {categoryName && (
              <View style={styles.metaItem}>
                <Text style={[
                  styles.categoryMetaText, 
                  { 
                    color: theme.colors.primary,
                    fontFamily: theme.fontFamily.semibold,
                    backgroundColor: isDarkMode ? 'rgba(74, 123, 200, 0.15)' : 'rgba(34, 74, 150, 0.1)'
                  }
                ]}>
                  {categoryName}
                </Text>
              </View>
            )}
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
          {renderContent}
          
          {/* YouTube video from meta field - positioned directly after content */}
          {youtubeUrl && (
            <View style={styles.youtubeContainer}>
              <Text style={[
                styles.youtubeTitle,
                { 
                  color: theme.colors.text,
                  fontFamily: theme.fontFamily.bold
                }
              ]}>
                Wideo
              </Text>
              <VideoPlayer url={youtubeUrl} title="YouTube Video" />
            </View>
          )}
          
          {/* Additional YouTube videos from content */}
          {videoUrls.length > 0 && (
            <View style={styles.additionalVideosContainer}>
              <Text style={[
                styles.sectionTitle,
                { 
                  color: theme.colors.text,
                  fontFamily: theme.fontFamily.bold
                }
              ]}>
                Powiązane wideo
              </Text>
              {videoUrls.map((url, index) => (
                <VideoPlayer 
                  key={`additional-video-${index}`} 
                  url={url} 
                  title={`Wideo ${index + 1}`} 
                />
              ))}
            </View>
          )}
          
          {/* Gallery (moved below content and videos) */}
          {renderGallery}
          
          {/* Source and photo credits */}
          {renderSourceAndCredit}
          
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
      
      {/* Bottom menu bar - updated styling to match main tabs */}
      <View style={[styles.bottomMenuBar, { backgroundColor: theme.colors.card }]}>
        <TouchableOpacity
          style={styles.bottomMenuItem}
          onPress={handleGoSearch}
          activeOpacity={0.7}
        >
          <Search size={20} color={theme.colors.text} />
          <Text style={[styles.bottomMenuText, { color: theme.colors.text, fontFamily: theme.fontFamily.medium }]}>
            Szukaj
          </Text>
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
          onPress={handleGoHome}
          activeOpacity={0.7}
        >
          <Home size={22} color={theme.colors.primary} strokeWidth={2.5} />
          <Text style={[styles.bottomMenuText, { color: theme.colors.primary, fontFamily: theme.fontFamily.medium }]}>
            Główna
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
      
      {/* Zoptymalizowany Lightbox - bez przeładowań */}
      {selectedImageIndex !== null && lightboxImages.length > 0 && galleryImages[selectedImageIndex] && isLightboxReady && (
        <OptimizedLightbox
          images={lightboxImages}
          initialIndex={selectedImageIndex}
          visible={isLightboxVisible}
          onClose={closeImageModal}
          onIndexChange={handleImageIndexChange}
          onDownload={downloadImage}
        />
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
    paddingTop: 0, // Usunięty niepotrzebny padding dla status bara
    paddingBottom: 16,
    zIndex: 1000,
  },
  circularButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
    paddingBottom: 120,
  },
  featuredImageContainer: {
    position: 'relative',
    width: '100%',
    height: height * 0.55, // Zwiększone z 0.45 na 0.55
    marginTop: 0, // Usunięty zbędny margines
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  featuredImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  imageDarkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  articleContent: {
    padding: 24,
    marginTop: -24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
    lineHeight: 32,
    letterSpacing: -0.3,
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
  categoryMetaText: {
    fontSize: 12, // Mniejszy font
    fontWeight: '600',
    paddingHorizontal: 16, // Więcej paddingu poziomego
    paddingVertical: 8, // Więcej paddingu pionowego
    borderRadius: 20, // Większy border radius
    backgroundColor: '#224996', // Granatowy kolor
    color: '#FFFFFF',
    minWidth: 80, // Minimalna szerokość
  },
  videoContainer: {
    marginBottom: 28,
  },
  youtubeContainer: {
    marginTop: 28,
    marginBottom: 28,
  },
  youtubeTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  additionalVideosContainer: {
    marginTop: 28,
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  galleryContainer: {
    marginTop: 32,
    marginBottom: 24,
  },
  galleryTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
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
    gap: 8, // Reduced from 16 to 8
    justifyContent: 'space-between',
  },
  galleryImageContainer: {
    width: (width - 64) / 2, // Increased from (width - 88) / 2
    height: 160, // Increased from 140
    borderRadius: 12, // Reduced from 16 for tighter look
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, // Reduced shadow
    shadowOpacity: 0.1, // Reduced from 0.15
    shadowRadius: 4, // Reduced from 8
    elevation: 3, // Reduced from 6
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  relatedContainer: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
    marginHorizontal: -24,
  },
  relatedListContainer: {
    marginTop: 24,
    paddingHorizontal: 24,
  },
  relatedTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  relatedList: {
    gap: 16,
  },
  sourceCreditsContainer: {
    marginTop: 24,
    marginBottom: 8,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderRadius: 12,
  },
  sourceCreditsText: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  bottomMenuBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    paddingBottom: Platform.select({
      ios: 20,
      android: 15,
      default: 15,
    }),
    paddingTop: 10,
    borderTopWidth: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: Platform.select({
      ios: 85,
      android: 75,
      default: 75
    }),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  bottomMenuItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    position: 'relative',
  },
  bottomMenuText: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
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
  progressBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    zIndex: 1001,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)', // Mniej nieprzezroczyste tło
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 10,
    zIndex: 1000,
    backgroundColor: 'transparent',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCloseButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalDownloadButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 50 : 30,
    paddingTop: 20,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  modalCounter: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalCounterText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  zoomIndicator: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  zoomText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },

});