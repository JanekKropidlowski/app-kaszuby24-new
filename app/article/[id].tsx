import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Share, Platform, Dimensions, Modal, StatusBar, Linking, FlatList, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { ArrowLeft, Share2, Home, Search, Bookmark, CalendarIcon, Bookmark as BookmarkFilled, Settings, X, ChevronLeft, ChevronRight, ChevronUp, Grid, Play, ExternalLink, Newspaper, Download, RefreshCw } from 'lucide-react-native';
import { fetchArticleById, fetchArticles, fetchMediaByIds, fetchRelatedArticles } from '@/services/api';
import { Article, MediaItem } from '@/types/article';
import { useThemeStore } from '@/store/themeStore';
import { cleanHtml, processGalleryIds, extractYouTubeUrl } from '@/utils/htmlParser';
import { formatDateTime } from '@/utils/dateFormatter';
import RenderHtml from 'react-native-render-html';
import { useArticlesStore } from '@/store/articlesStore';
import { LinearGradient } from 'expo-linear-gradient';
import VideoPlayer from '@/components/VideoPlayer';
import { Tabs } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import SkeletonLoader from '@/components/SkeletonLoader';
import GlobalTabBar from '@/components/GlobalTabBar';
import { RelatedArticlesSlider } from '@/components/RelatedArticlesSlider';
import { PanGestureHandler, PinchGestureHandler, State } from 'react-native-gesture-handler';
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
import * as Updates from 'expo-updates';

const { width, height } = Dimensions.get('window');
const HEADER_HEIGHT = Platform.OS === 'ios' ? 94 : 82;

// Funkcja do czyszczenia tytułu z kodów HTML
const cleanTitle = (title: string): string => {
  return title
    .replace(/&#8211;/g, '–')
    .replace(/&#8217;/g, "'")
    .replace(/&#8230;/g, '...')
    .replace(/&#8216;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ');
};

// Dodaj funkcję do obliczania rozmiaru fontu na podstawie długości tytułu
const getTitleFontSize = (title: string) => {
  if (title.length <= 40) return 40;  // Maksymalny rozmiar
  if (title.length <= 60) return 36;
  if (title.length <= 80) return 32;
  return 30;  // Minimalny rozmiar
};

export default function ArticleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useThemeStore();
  const { isArticleSaved, saveArticle, removeArticle } = useArticlesStore();
  const insets = useSafeAreaInsets();

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [related, setRelated] = useState<Article[]>([]);
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [galleryImages, setGalleryImages] = useState<MediaItem[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState<string | null>(null);
  const [flickrUrl, setFlickrUrl] = useState<string | null>(null);
  const [allImages, setAllImages] = useState<MediaItem[]>([]);

  // OTA Update states
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateChecking, setUpdateChecking] = useState(false);
  const [updateDownloading, setUpdateDownloading] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);

  // Pinch-to-zoom shared values
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  // Płynne przejście shared values
  const screenTranslateY = useSharedValue(0);
  const scrollOverflow = useSharedValue(0);
  const isNavigatingHome = useSharedValue(false);

  // Stany dla płynnego przejścia
  const [showHomeHint, setShowHomeHint] = useState(false);
  const [scrollContentHeight, setScrollContentHeight] = useState(0);
  const [scrollViewHeight, setScrollViewHeight] = useState(0);

  // OTA Update functions
  const checkForUpdates = async () => {
    if (!Updates.isEnabled) {
      console.log('OTA updates are not enabled');
      return;
    }

    try {
      setUpdateChecking(true);
      console.log('Checking for OTA updates...');
      
      const update = await Updates.checkForUpdateAsync();
      
      if (update.isAvailable) {
        console.log('OTA update available:', update);
        setUpdateAvailable(true);
        
        // Show update notification with more details
        Alert.alert(
          'Dostępna aktualizacja',
          'Znaleziono nową wersję aplikacji. Czy chcesz ją pobrać teraz?',
          [
            { text: 'Później', style: 'cancel' },
            { text: 'Pobierz', onPress: downloadUpdate }
          ]
        );
      } else {
        console.log('No OTA update available');
        setUpdateAvailable(false);
      }
    } catch (error) {
      console.error('Error checking for OTA updates:', error);
      // Don't show error to user for check failures
    } finally {
      setUpdateChecking(false);
    }
  };

  const downloadUpdate = async () => {
    if (!Updates.isEnabled) {
      Alert.alert(
        'Aktualizacje wyłączone',
        'Aktualizacje OTA są wyłączone w tej wersji aplikacji.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setUpdateDownloading(true);
      setUpdateProgress(0);
      
      console.log('Downloading OTA update...');
      
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUpdateProgress(prev => {
          const newProgress = prev + Math.random() * 10;
          return newProgress > 90 ? 90 : newProgress;
        });
      }, 500);

      const result = await Updates.fetchUpdateAsync();
      
      clearInterval(progressInterval);
      setUpdateProgress(100);
      
      console.log('OTA update downloaded successfully:', result);
      
      // Show success message and reload
      Alert.alert(
        'Aktualizacja pobrana',
        'Aplikacja zostanie zrestartowana, aby zastosować zmiany.',
        [
          { 
            text: 'OK', 
            onPress: () => {
              Updates.reloadAsync();
            }
          }
        ]
      );
      
    } catch (error) {
      console.error('Error downloading OTA update:', error);
      
      // More specific error messages
      let errorMessage = 'Nie udało się pobrać aktualizacji. Spróbuj ponownie później.';
      
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('timeout')) {
          errorMessage = 'Błąd połączenia. Sprawdź połączenie z internetem i spróbuj ponownie.';
        } else if (error.message.includes('storage') || error.message.includes('disk')) {
          errorMessage = 'Brak miejsca na urządzeniu. Zwolnij miejsce i spróbuj ponownie.';
        }
      }
      
      Alert.alert(
        'Błąd aktualizacji',
        errorMessage,
        [{ text: 'OK' }]
      );
    } finally {
      setUpdateDownloading(false);
      setUpdateProgress(0);
    }
  };

  // Check for updates on component mount with better timing
  useEffect(() => {
    // Check for updates after a longer delay to not interfere with initial loading
    const updateTimer = setTimeout(() => {
      checkForUpdates();
    }, 5000); // Increased from 3000 to 5000ms

    return () => clearTimeout(updateTimer);
  }, []);

  // Funkcja do określania aktywnego stanu tabów
  const getActiveTab = () => {
    // W ekranie artykułu żaden tab nie jest aktywny
    return 'none';
  };

  // Debug font loading - sprawdź czy czcionki są poprawnie załadowane
  useEffect(() => {
    console.log('Article Screen - Theme fonts:', {
      regular: theme.fontFamily.regular,
      bold: theme.fontFamily.bold,
      medium: theme.fontFamily.medium,
      semibold: theme.fontFamily.semibold,
    });
    
    // Sprawdź czy czcionki są dostępne
    if (Platform.OS === 'android') {
      console.log('Android font check - Regular:', theme.fontFamily.regular);
      console.log('Android font check - Bold:', theme.fontFamily.bold);
    }
  }, [theme.fontFamily]);

  // Pinch gesture handler
  const pinchGestureHandler = useAnimatedGestureHandler({
    onStart: (_, context: any) => {
      context.startScale = scale.value;
    },
    onActive: (event: any, context: any) => {
      scale.value = context.startScale * event.scale;
    },
    onEnd: () => {
      if (scale.value < 1) {
        scale.value = withSpring(1);
      } else if (scale.value > 3) {
        scale.value = withSpring(3);
      }
    },
  });

  // Animated image style
  const animatedImageStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        { translateX: translateX.value },
        { translateY: translateY.value },
      ],
    };
  });

  // Animated style dla płynnego przejścia
  const animatedContentStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: screenTranslateY.value }
      ],
    };
  });

  // Animated style dla wskazówki
  const hintAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollOverflow.value,
      [0, 50],
      [0, 1],
      Extrapolate.CLAMP
    );
    
    const translateY = interpolate(
      scrollOverflow.value,
      [0, 100],
      [20, 0],
      Extrapolate.CLAMP
    );

    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  // Reset zoom when modal closes
  useEffect(() => {
    if (selectedImageIndex === null) {
      scale.value = withTiming(1);
      translateX.value = withTiming(0);
      translateY.value = withTiming(0);
    }
  }, [selectedImageIndex]);

  useEffect(() => {
    const loadArticleData = async () => {
      try {
        setLoading(true);
        const articleId = parseInt(id as string, 10);

        // Krok 1: Pobierz główny artykuł, aby uzyskać meta-dane
        const articleData = await fetchArticleById(articleId);
        setArticle(articleData);
        setIsSaved(isArticleSaved(articleData.id));

        // Krok 2: Przygotuj pozostałe zapytania
        const galleryIds = articleData.meta?.galeria ? processGalleryIds(articleData.meta.galeria) : [];
        const mediaPromise = galleryIds.length > 0 ? fetchMediaByIds(galleryIds) : Promise.resolve([]);
        const relatedPromise = fetchArticles(1, 10); // Pobierz więcej, by mieć z czego filtrować

        // Krok 3: Uruchom je równolegle i poczekaj na wszystkie
        const [galleryData, relatedData] = await Promise.all([
          mediaPromise.catch(err => {
            console.warn('Failed to load gallery images:', err);
            return [];
          }),
          relatedPromise.catch(err => {
            console.warn('Failed to load related articles:', err);
            return { articles: [] };
          })
        ]);

        // Krok 4: Przetwórz wyniki
        setGalleryImages(galleryData);
        setRelated(relatedData.articles.filter(a => a.id !== articleId).slice(0, 2));

        // Extract YouTube URL if available
        if (articleData.meta?.youtube) {
          const ytUrl = extractYouTubeUrl(articleData.meta.youtube);
          if (ytUrl) {
            setYoutubeUrl(ytUrl);
          }
        }
        
        // Extract Flickr URL if available
        if (articleData.meta?.flickr) {
          setFlickrUrl(articleData.meta.flickr);
        }
        
        // Featured image as MediaItem
        let featuredMedia: MediaItem | null = null;
        if (articleData.featured_media_url) {
          featuredMedia = {
            id: 0, // Use 0 as featured media ID
            source_url: articleData.featured_media_url,
            media_details: {
              width: 800,
              height: 600,
            },
            caption: { rendered: '' },
            alt_text: '',
          };
        }
        
        // Combine featured + gallery
        let allImgs: MediaItem[] = [];
        if (featuredMedia) {
          // Dodaj featured tylko jeśli nie ma go w galerii
          const isInGallery = galleryData.some(img => img.source_url === featuredMedia!.source_url);
          allImgs = isInGallery ? galleryData : [featuredMedia, ...galleryData];
        } else {
          allImgs = galleryData;
        }
        setAllImages(allImgs);

        // Krok 5: Pobierz powiązane artykuły z tej samej kategorii
        if (articleData.categories && articleData.categories.length > 0) {
          setLoadingRelated(true);
          try {
            const relatedData = await fetchRelatedArticles(articleId, articleData.categories, 6);
            const allRelated = [...relatedData.sliderArticles, ...relatedData.listArticles];
            setRelatedArticles(allRelated);
          } catch (err) {
            console.warn('Failed to load related articles:', err);
          } finally {
            setLoadingRelated(false);
          }
        }

      } catch (err) {
        console.error('Error loading article data:', err);
        setError('Nie udało się załadować artykułu');
      } finally {
        setLoading(false);
      }
    };

    loadArticleData();
  }, [id, isArticleSaved]);

  const handleCategoryPress = () => {
    if (article?.categories && article.categories.length > 0) {
      // Navigate to search with filtered category
      router.push({
        pathname: '/(tabs)/search',
        params: { 
          category: article.categories[0].toString(),
          categoryName: article.categories[0] === 17 ? 'Bezpieczeństwo' :
                       article.categories[0] === 11 ? 'Biznes' :
                       article.categories[0] === 24 ? 'Sport' :
                       article.categories[0] === 22 ? 'Religia' :
                       article.categories[0] === 2246 ? 'Zdrowie' :
                       article.categories[0] === 49 ? 'Nauka' :
                       article.categories[0] === 16 ? 'Kultura' : 'Aktualności'
        }
      });
    }
  };

  const handleGoBack = () => router.back();
  const handleShare = async () => {
    if (article) {
      try {
        await Share.share({
          message: cleanTitle(article.title.rendered),
          url: article.link,
          title: cleanTitle(article.title.rendered),
        });
      } catch {}
    }
  };
  const handleToggleSave = () => {
    if (!article) return;
    if (isSaved) {
      removeArticle(article.id);
      setIsSaved(false);
    } else {
      saveArticle(article);
      setIsSaved(true);
    }
  };

  // Function to navigate between images in the modal
  const navigateImage = (direction: 'prev' | 'next') => {
    if (selectedImageIndex === null || !allImages.length) return;
    
    if (direction === 'prev' && selectedImageIndex > 0) {
      setSelectedImageIndex(selectedImageIndex - 1);
    } else if (direction === 'next' && selectedImageIndex < allImages.length - 1) {
      setSelectedImageIndex(selectedImageIndex + 1);
    }
  };

  // Function to open image modal with correct index
  const openImageModal = (index: number) => {
    setSelectedImageIndex(index);
  };

  // Function to close image modal
  const closeImageModal = () => {
    setSelectedImageIndex(null);
  };

  // Auto-powrót na główną po scrollu do końca
  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const contentHeight = event.nativeEvent.contentSize.height;
    const scrollViewHeight = event.nativeEvent.layoutMeasurement.height;
    
    // Sprawdź czy użytkownik przewinął do końca
    const isAtBottom = offsetY + scrollViewHeight >= contentHeight - 10;
    
    if (isAtBottom && !showHomeHint) {
      setShowHomeHint(true);
    } else if (!isAtBottom && showHomeHint) {
      setShowHomeHint(false);
    }
    
    // Oblicz overflow scroll
    const maxScroll = contentHeight - scrollViewHeight;
    const overflow = Math.max(0, offsetY - maxScroll);
    
    if (overflow > 0 && !isNavigatingHome.value) {
      scrollOverflow.value = overflow;
      
      // Mapuj overflow na translateY ekranu
      const translateYValue = -Math.min(overflow * 0.5, height * 0.8);
      screenTranslateY.value = translateYValue;
      
      // Sprawdź czy osiągnięto próg nawigacji
      if (overflow > height * 0.3) {
        isNavigatingHome.value = true;
        runOnJS(navigateToHome)();
      }
    } else if (overflow <= 0) {
      // Resetuj animację gdy użytkownik wraca
      screenTranslateY.value = withSpring(0);
      scrollOverflow.value = 0;
    }
  };

  const navigateToHome = () => {
    // Finalna animacja wysunięcia ekranu
    screenTranslateY.value = withTiming(-height, { duration: 300 }, () => {
      runOnJS(() => {
        router.replace('/');
      })();
    });
  };

  const handleScrollViewLayout = (event: any) => {
    setScrollViewHeight(event.nativeEvent.layout.height);
  };

  const handleContentLayout = (event: any) => {
    setScrollContentHeight(event.nativeEvent.layout.height);
  };

  // Render gallery item
  const renderGalleryItem = ({ item, index }: { item: MediaItem; index: number }) => (
    <TouchableOpacity
      style={styles.galleryItem}
      onPress={() => openImageModal(index)}
      activeOpacity={0.9}
    >
      <Image
        source={{ uri: item.source_url }}
        style={styles.galleryItemImage}
        contentFit="cover"
        priority="high"
      />
    </TouchableOpacity>
  );

  // Render related article item
  const renderRelatedArticle = ({ item }: { item: Article }) => (
    <TouchableOpacity
      style={[styles.relatedArticleItem, { backgroundColor: theme.colors.card }]}
      onPress={() => router.push(`/article/${item.id}`)}
      activeOpacity={0.8}
    >
      {item.featured_media_url && (
        <Image
          source={{ uri: item.featured_media_url }}
          style={styles.relatedArticleImage}
          contentFit="cover"
        />
      )}
      <View style={styles.relatedArticleContent}>
        <Text style={[styles.relatedArticleTitle, { color: theme.colors.text, fontFamily: 'Poppins_SemiBold' }]}>
          {cleanTitle(item.title.rendered)}
        </Text>
        <Text style={[styles.relatedArticleDate, { color: theme.colors.textSecondary, fontFamily: 'Poppins_Regular' }]}>
          {formatDateTime(item.date)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <SkeletonLoader type="article" immediate={true} />
      </SafeAreaView>
    );
  }
  if (error || !article) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }]}> 
        <Text style={{ color: theme.colors.error, fontSize: 18, fontFamily: 'Poppins_Regular' }}>{error || 'Nie znaleziono artykułu'}</Text>
        <TouchableOpacity onPress={handleGoBack} style={styles.headerButton}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.rootContainer, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* WARSTWA 1: UI APLIKACJI (STAŁE) */}
      
      {/* Nagłówek - jest poza animowanym widokiem */}
      <View style={[styles.headerContainer, { zIndex: 10, paddingTop: insets.top + 10 }]}>
        <LinearGradient
          colors={['rgba(0,0,0,0.9)', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0)']}
          style={styles.headerGradient}
        />
        <TouchableOpacity style={styles.headerButton} onPress={handleGoBack}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        {/* Wypełnienie status bara bez logo */}
        <View style={styles.headerCenter}>
          {/* Logo zostało usunięte */}
        </View>
        
        <View style={styles.headerRightButtons}>
          <TouchableOpacity style={styles.headerButton} onPress={handleToggleSave}>
            {isSaved ? (
              <BookmarkFilled size={24} color="#FFFFFF" />
            ) : (
              <Bookmark size={24} color="#FFFFFF" />
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={handleShare}>
            <Share2 size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* WARSTWA 2: KONTENER TREŚCI (ANIMOWANY) */}
      
      {/* Ten Animated.View zawiera TYLKO ScrollView */}
      <Animated.View style={[styles.contentAnimatedContainer, animatedContentStyle]}>
        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          bounces={false}
          onLayout={handleScrollViewLayout}
        >
          {/* Featured image with gradient overlay */}
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: String(article.featured_media_url || article.featured_media) }}
              style={styles.featuredImage}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)']}
              style={styles.imageGradient}
            />
          </View>

          {/* Content container with improved curved transition */}
          <View style={[styles.contentContainer, { backgroundColor: theme.colors.background }]} onLayout={handleContentLayout}> 
            {/* Tytuł artykułu - przeniesiony nad metadata */}
            <Text
              style={[
                styles.articleTitle,
                {
                  color: theme.colors.text,
                  fontSize: getTitleFontSize(cleanTitle(article.title.rendered)),
                },
              ]}
              numberOfLines={4}
              ellipsizeMode="tail"
            >
              {cleanTitle(article.title.rendered)}
            </Text>

            {/* Metadata section - kategoria i data w jednej linii */}
            <View style={styles.metadataContainer}>
              <Text style={[styles.date, { 
                color: theme.colors.textSecondary, 
                fontFamily: 'Poppins_Regular'
              }]}>
                {formatDateTime(article.date)}
              </Text>
              
              {/* Kategoria w jednej linii z datą */}
              {article?.categories && article.categories.length > 0 && (
                <TouchableOpacity onPress={handleCategoryPress}>
                  <Text style={[styles.categoryText, { color: theme.colors.textSecondary }]}>
                    {article.categories[0] === 17 ? 'Bezpieczeństwo' :
                     article.categories[0] === 11 ? 'Biznes' :
                     article.categories[0] === 24 ? 'Sport' :
                     article.categories[0] === 22 ? 'Religia' :
                     article.categories[0] === 2246 ? 'Zdrowie' :
                     article.categories[0] === 49 ? 'Nauka' :
                     article.categories[0] === 16 ? 'Kultura' : 'Aktualności'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            
            <RenderHtml
              contentWidth={width - 40}
              source={{ html: cleanHtml(article.content.rendered) }}
              baseStyle={{
                color: theme.colors.text,
                fontSize: 18,
                lineHeight: 30,
                fontWeight: '400',
                textAlign: 'left',
                fontFamily: 'Poppins_Regular',
              }}
              tagsStyles={{
                p: {
                  color: theme.colors.text,
                  fontSize: 18,
                  lineHeight: 30,
                  fontWeight: '400',
                  textAlign: 'left',
                  fontFamily: 'Poppins_Regular',
                  marginBottom: 16,
                },
                h1: {
                  color: theme.colors.text,
                  fontSize: 32,
                  fontWeight: 'bold',
                  marginBottom: 16,
                  lineHeight: 40,
                  fontFamily: 'Poppins_Bold',
                  textAlign: 'left',
                },
                h2: {
                  color: theme.colors.text,
                  fontSize: 28,
                  fontWeight: 'bold',
                  marginBottom: 16,
                  lineHeight: 36,
                  fontFamily: 'Poppins_Bold',
                  textAlign: 'left',
                },
                h3: {
                  color: theme.colors.text,
                  fontSize: 24,
                  fontWeight: 'bold',
                  marginBottom: 16,
                  lineHeight: 32,
                  fontFamily: 'Poppins_Bold',
                  textAlign: 'left',
                },
                h4: {
                  color: theme.colors.text,
                  fontSize: 22,
                  fontWeight: 'bold',
                  marginBottom: 16,
                  lineHeight: 30,
                  fontFamily: 'Poppins_Bold',
                  textAlign: 'left',
                },
                h5: {
                  color: theme.colors.text,
                  fontSize: 20,
                  fontWeight: 'bold',
                  marginBottom: 16,
                  lineHeight: 28,
                  fontFamily: 'Poppins_Bold',
                  textAlign: 'left',
                },
                h6: {
                  color: theme.colors.text,
                  fontSize: 18,
                  fontWeight: 'bold',
                  marginBottom: 16,
                  lineHeight: 26,
                  fontFamily: 'Poppins_Bold',
                  textAlign: 'left',
                },
                strong: {
                  fontWeight: 'bold',
                  fontFamily: 'Poppins_Bold',
                },
                em: {
                  fontStyle: 'italic',
                  fontFamily: 'Poppins_Regular',
                },
                u: {
                  textDecorationLine: 'underline',
                },
                s: {
                  textDecorationLine: 'line-through',
                },
                a: {
                  color: theme.colors.primary,
                  textDecorationLine: 'underline',
                  fontFamily: 'Poppins_Medium',
                },
                blockquote: {
                  borderLeftWidth: 4,
                  borderLeftColor: theme.colors.primary,
                  paddingLeft: 16,
                  marginBottom: 16,
                  fontStyle: 'italic',
                  color: theme.colors.textSecondary,
                  fontFamily: 'Poppins_Regular',
                  fontSize: 17,
                  lineHeight: 28,
                  textAlign: 'left',
                },
                ul: {
                  marginBottom: 16,
                  paddingLeft: 24,
                },
                ol: {
                  marginBottom: 16,
                  paddingLeft: 24,
                },
                li: {
                  color: theme.colors.text,
                  fontSize: 18,
                  lineHeight: 30,
                  fontFamily: 'Poppins_Regular',
                  marginBottom: 8,
                  textAlign: 'left',
                },
                code: {
                  backgroundColor: theme.colors.card,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 6,
                  fontFamily: 'monospace',
                  fontSize: 16,
                },
                pre: {
                  backgroundColor: theme.colors.card,
                  padding: 16,
                  borderRadius: 12,
                  marginBottom: 16,
                  fontFamily: 'monospace',
                  fontSize: 16,
                },
                hr: {
                  borderBottomWidth: 1,
                  borderBottomColor: theme.colors.border,
                  marginVertical: 16,
                },
                table: {
                  marginBottom: 16,
                  width: '100%',
                },
                th: {
                  padding: 12,
                  textAlign: 'left',
                  backgroundColor: theme.colors.card,
                  fontWeight: 'bold',
                  fontFamily: 'Poppins_Medium',
                  fontSize: 16,
                },
                td: {
                  padding: 12,
                  textAlign: 'left',
                  fontFamily: 'Poppins_Regular',
                  fontSize: 16,
                },
                img: {
                  width: '100%',
                  height: 240,
                  borderRadius: 16,
                  marginBottom: 16,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.15,
                  shadowRadius: 8,
                  elevation: 4,
                },
              }}
            />
          </View>

          {/* YouTube Video */}
          {youtubeUrl && (
            <View style={styles.videoContainer}>
              <Text style={[styles.videoTitle, { color: theme.colors.text, fontFamily: 'Poppins_Bold' }]}>
                Wideo
              </Text>
              <VideoPlayer url={youtubeUrl} />
            </View>
          )}

          {/* Galeria - Przywrócona */}
          {allImages.length > 1 && (
            <View style={styles.galleryContainer}>
              <Text style={[styles.galleryTitle, { color: theme.colors.text, fontFamily: 'Poppins_Bold' }]}>
                Galeria ({allImages.length})
              </Text>
              
              <FlatList
                data={allImages.slice(1)}
                renderItem={renderGalleryItem}
                keyExtractor={(item) => item.id.toString()}
                numColumns={2}
                columnWrapperStyle={styles.galleryRow}
                showsVerticalScrollIndicator={false}
                scrollEnabled={false}
                contentContainerStyle={styles.galleryContent}
              />
              
              {/* Flickr link */}
              {flickrUrl && (
                <TouchableOpacity 
                  style={[styles.flickrButton, { backgroundColor: theme.colors.primary }]}
                  onPress={() => Linking.openURL(flickrUrl)}
                >
                  <Text style={styles.flickrButtonText}>Zobacz więcej zdjęć</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Źródło */}
          {article?.meta?.zrodlo && (
            <View style={styles.sourceContainer}>
              <Text style={[styles.sourceText, { color: theme.colors.textSecondary }]}>
                źródło: {article.meta.zrodlo}
              </Text>
            </View>
          )}

          {/* Sprawdź również - Sekcja z powiązanymi artykułami - Przywrócona */}
          {relatedArticles.length > 0 && (
            <View style={styles.relatedSection}>
              <Text style={[styles.relatedSectionTitle, { color: theme.colors.text, fontFamily: 'Poppins_Bold' }]}>
                Sprawdź również
              </Text>
              <FlatList
                data={relatedArticles}
                renderItem={renderRelatedArticle}
                keyExtractor={(item) => item.id.toString()}
                showsVerticalScrollIndicator={false}
                scrollEnabled={false}
                contentContainerStyle={styles.relatedList}
              />
            </View>
          )}

          {/* Wskazówka płynnego przejścia */}
          <Animated.View style={[styles.homeHintContainer, hintAnimatedStyle]}>
            <View style={[styles.homeHint, { backgroundColor: theme.colors.primary }]}>
              <ChevronUp size={20} color="#FFFFFF" />
              <Text style={styles.homeHintText}>Przewiń, by wrócić na stronę główną</Text>
            </View>
          </Animated.View>

          {/* Dodatkowy padding na końcu dla płynnego przejścia */}
          <View style={styles.bottomPadding} />
        </ScrollView>
      </Animated.View>

      {/* Global TabBar */}
      <GlobalTabBar activeTab="home" />

      {/* Image Modal */}
      <Modal
        visible={selectedImageIndex !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={closeImageModal}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.modalCloseButton} onPress={closeImageModal}>
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          {selectedImageIndex !== null && allImages[selectedImageIndex] && (
            <PinchGestureHandler onGestureEvent={pinchGestureHandler}>
              <Animated.View style={styles.modalImageContainer}>
                <Image
                  source={{ uri: allImages[selectedImageIndex].source_url }}
                  style={[styles.modalImage, animatedImageStyle]}
                  contentFit="contain"
                />
              </Animated.View>
            </PinchGestureHandler>
          )}
          
          {allImages.length > 1 && (
            <>
              <TouchableOpacity 
                style={[styles.modalNavButton, styles.modalNavButtonLeft]} 
                onPress={() => navigateImage('prev')}
              >
                <ChevronLeft size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalNavButton, styles.modalNavButtonRight]} 
                onPress={() => navigateImage('next')}
              >
                <ChevronRight size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  contentAnimatedContainer: {
    flex: 1,
    position: 'relative',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: { 
    width: '100%', 
    height: height * 0.65, // Zwiększone dla lepszego efektu wizualnego
    position: 'relative',
    zIndex: 1,           // zdjęcie najniżej
    elevation: 1,
    marginTop: -(StatusBar.currentHeight || 0), // Wypełnia status bar
  },
  featuredImage: { 
    width: '100%', 
    height: '100%' 
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    zIndex: 1,
  },
  contentContainer: { 
    marginTop: -40,              // wjeżdża 40px na zdjęcie
    borderTopLeftRadius: 40,     // zaokrąglenie 40px
    borderTopRightRadius: 40,
    paddingHorizontal: 20, 
    paddingTop: 20,
    paddingBottom: 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 2,                // nad zdjęciem
    zIndex: 2,
  },

  headerContainer: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    zIndex: 1000,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
    height: HEADER_HEIGHT,
  },
  headerGradient: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0,
    zIndex: -1,
    height: HEADER_HEIGHT + 20,
  },
  headerRightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between' 
  },
  headerButton: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    marginLeft: 8,
  },
  title: { 
    fontSize: 32,
    fontWeight: 'bold', 
    marginBottom: 16,
    lineHeight: 40,
    textAlign: 'left',
  },
  date: { 
    fontSize: 16,
    marginBottom: 0,
    opacity: 0.8,
  },
 
  photoCreditOverlay: { 
    position: 'absolute', 
    bottom: 20, // Odsunięte od dołu, by nie nachodzić na tytuł
    right: 20, 
    backgroundColor: 'rgba(0,0,0,0.7)', 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 12 
  },
  photoCreditText: { 
    color: '#FFFFFF', 
    fontSize: 13,
    fontFamily: 'Poppins_Regular',
    fontWeight: '500',
  },
  relatedContainer: { 
    marginTop: 32, 
    paddingHorizontal: 20 
  },
  relatedTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    marginBottom: 16 
  },
  relatedCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 16, 
    borderRadius: 16, 
    overflow: 'hidden', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 4, 
    elevation: 3 
  },
  relatedImage: { 
    width: 80, 
    height: 80, 
    borderTopLeftRadius: 16, 
    borderBottomLeftRadius: 16 
  },
  relatedContent: { 
    flex: 1, 
    padding: 12 
  },
  relatedCardTitle: { 
    fontSize: 15, 
    fontWeight: '600', 
    marginBottom: 4 
  },
  relatedCardDate: { 
    fontSize: 12, 
    color: '#888' 
  },
  
  // Nowe style dla sekcji
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 22,
    marginLeft: 12,
  },
  
  // Nowe style dla galerii
  galleryContainer: {
    marginTop: 40,
    marginBottom: 40,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 24,
    padding: 24,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  galleryTitle: {
    fontSize: 26,
    marginBottom: 28,
    fontFamily: 'Poppins_Bold',
    textAlign: 'center',
  },
  galleryContent: {
    paddingHorizontal: 0,
  },
  galleryRow: {
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  galleryItem: {
    width: (width - 100) / 2,
    height: 180,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  galleryItemImage: {
    width: '100%',
    height: '100%',
  },
  
  // Ulepszone style dla modala
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalNavButton: {
    position: 'absolute',
    top: '50%',
    zIndex: 10,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalNavButtonLeft: {
    left: 20,
  },
  modalNavButtonRight: {
    right: 20,
  },
  modalImage: {
    width: width * 0.9,
    height: height * 0.9,
    borderRadius: 16,
  },
  modalCaptionContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 10,
  },
  modalCaption: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
  },
  photoCreditsText: {
    fontSize: 13,
    marginTop: 8,
    marginBottom: 4,
  },
  sourceCreditsText: {
    fontSize: 13,
    marginTop: 4,
    marginBottom: 8,
  },
  flickrButton: {
    marginTop: 24,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  flickrButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'Poppins_Medium',
  },
  videoContainer: {
    marginTop: 40,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  videoTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  morePhotosButton: {
    marginTop: 16,
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(34, 74, 150, 0.3)',
  },
  morePhotosText: {
    fontSize: 14,
  },
  galleryLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  galleryLoadingText: {
    fontSize: 16,
  },
  modalImageInfo: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  modalImageInfoText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  modalImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  animatedImageStyle: {
    width: '100%',
    height: '100%',
  },
  homeHintContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 30,
    marginTop: 20,
  },
  homeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  homeHintText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginLeft: 8,
    fontFamily: 'Poppins_Regular',
  },
  bottomPadding: {
    height: 120,
  },
  sourceContainer: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sourceText: {
    fontSize: 13,
    fontFamily: 'Poppins_Regular',
  },
  
  // Nowe style dla sekcji powiązanych artykułów
  relatedSection: {
    marginTop: 40,
    marginBottom: 40,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 24,
    padding: 24,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  relatedSectionTitle: {
    fontSize: 26,
    marginBottom: 28,
    fontFamily: 'Poppins_Bold',
    textAlign: 'center',
  },
  relatedList: {
    paddingHorizontal: 0,
  },
  relatedArticleItem: {
    flexDirection: 'row',
    marginBottom: 24,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  relatedArticleImage: {
    width: 120,
    height: 120,
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
  },
  relatedArticleContent: {
    flex: 1,
    padding: 20,
  },
  relatedArticleTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 8,
    lineHeight: 24,
    fontFamily: 'Poppins_SemiBold',
  },
  relatedArticleDate: {
    fontSize: 14,
    opacity: 0.7,
    fontFamily: 'Poppins_Regular',
  },
  categoryText: {
    fontSize: 16,
    fontFamily: 'Poppins_Medium',
    fontWeight: '600',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
    overflow: 'hidden',
  },
  titleOverlay: {
    position: 'absolute',
    bottom: 45,          // margines od dołu zdjęcia 40px
    left: 24,
    right: 24,
    overflow: 'visible',  // kluczowe, żeby nic nie przycinać
    paddingTop: 8,        // opcjonalnie podciągnie tytuł niżej
    zIndex: 3,           // tytuł najwyżej
    elevation: 3,
    alignItems: 'flex-start', // Wyrównanie do lewej
  },
  titleOnImage: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 40,        // rozmiar fontu 40px
    lineHeight: 48,      // min. 1.2×40
    includeFontPadding: false, // usuwa dodatkowe wewnętrzne odstępy
    fontFamily: 'Poppins_Bold',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    textAlign: 'left',
    maxWidth: '90%',
  },
  articleTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 20,
    lineHeight: 40,
    fontFamily: 'Poppins_Bold',
    textAlign: 'left',
    color: '#1a1a1a',
    letterSpacing: -0.5,
  },
  // New styles for metadata container
  metadataContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16, // Zmniejszone z 30 na 16
    paddingHorizontal: 0,
  },
  metadataLeft: {
    flex: 1,
  },
  categoryContainer: {
    marginLeft: 16,
  },
});