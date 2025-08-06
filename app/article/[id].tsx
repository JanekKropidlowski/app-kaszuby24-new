import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Share, 
  Platform, 
  Dimensions, 
  StatusBar,
  Alert,
  Modal,
  FlatList,
  Linking
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { 
  ArrowLeft, 
  Share2, 
  Bookmark, 
  BookMarked,
  Calendar, 
  Eye, 
  Clock, 
  MapPin, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Download,
  Home,
  ChevronUp
} from 'lucide-react-native';
import { Image } from 'expo-image';
import { Image as RNImage } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  useAnimatedGestureHandler,
  interpolate,
  Extrapolate,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { PanGestureHandler, PinchGestureHandler, State, GestureHandlerRootView } from 'react-native-gesture-handler';
// import ImageViewing from 'react-native-image-viewing';
import { OptimizedLightbox } from '@/components/OptimizedLightbox';
import * as Haptics from 'expo-haptics';
import { fetchArticleById, fetchMediaByIds, fetchRelatedArticles } from '@/services/api';
import { Article, MediaItem } from '@/types/article';
import { useThemeStore } from '@/store/themeStore';
import { useArticlesStore } from '@/store/articlesStore';
import { formatDateTime } from '@/utils/dateFormatter';
import { cleanHtml, processGalleryIds, extractYouTubeUrl } from '@/utils/htmlParser';
import SkeletonLoader from '@/components/SkeletonLoader';
import LoadingIndicator from '@/components/LoadingIndicator';
import EmptyState from '@/components/EmptyState';
import { RelatedArticlesSlider } from '@/components/RelatedArticlesSlider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GlobalTabBar from '@/components/GlobalTabBar';
import VideoPlayer from '@/components/VideoPlayer';
import RenderHtml from 'react-native-render-html';
import CoffeeSupportCard from '@/components/CoffeeSupportCard';

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

// Funkcja do skracania tytułów w sekcji "Sprawdź też"
const truncateRelatedTitle = (title: string, maxLength: number = 50): string => {
  const cleanedTitle = cleanTitle(title);
  if (cleanedTitle.length <= maxLength) {
    return cleanedTitle;
  }
  return cleanedTitle.substring(0, maxLength).trim() + '...';
};

// Dodaj funkcję do obliczania rozmiaru fontu na podstawie długości tytułu
const getTitleFontSize = (title: string) => {
  if (title.length <= 40) return 28;  // Maksymalny rozmiar
  if (title.length <= 60) return 26;
  if (title.length <= 80) return 24;
  return 22;  // Minimalny rozmiar
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
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isLightboxVisible, setIsLightboxVisible] = useState(false);
  const [isLightboxReady, setIsLightboxReady] = useState(false);

  // Stabilne referencje dla lightboxa - zapobiegają przeładowaniu
  const lightboxImages = useMemo(() => 
    allImages.map(img => ({ 
      uri: img.media_details?.sizes?.large?.source_url || img.source_url 
    })), [allImages]
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
  // DEBUG: Szczegółowe logi dla selectedImageIndex
  useEffect(() => {
    console.log('[LIGHTBOX DEBUG] selectedImageIndex changed to:', selectedImageIndex);
    if (selectedImageIndex !== null) {
      console.log('[LIGHTBOX DEBUG] Lightbox opening automatically! Stack trace:');
      console.trace('[LIGHTBOX DEBUG] Automatic lightbox open');
      console.log('[LIGHTBOX DEBUG] Current allImages length:', allImages.length);
      console.log('[LIGHTBOX DEBUG] Current galleryImages length:', galleryImages.length);
    }
  }, [selectedImageIndex, allImages.length, galleryImages.length]);

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

  // Load article data - optimized
  useEffect(() => {
    const loadArticleData = async () => {
      if (!id || Array.isArray(id)) {
        setError('Nieprawidłowy identyfikator artykułu');
        setLoading(false);
        return;
      }

      const articleId = parseInt(id, 10);
      if (isNaN(articleId)) {
        setError('Nieprawidłowy identyfikator artykułu');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // Load article data first
        const articleData = await fetchArticleById(articleId);
        
        if (!articleData) {
          setError('Nie znaleziono artykułu');
          setLoading(false);
          return;
        }

        setArticle(articleData);
        setIsSaved(isArticleSaved(articleId));
        
        // NIE resetuj selectedImageIndex tutaj - pozwól na płynne przejścia

        // Load gallery images in background (non-blocking)
        const galleryIds = articleData.meta?.galeria ? processGalleryIds(articleData.meta.galeria) : [];
        if (galleryIds.length > 0) {
          fetchMediaByIds(galleryIds)
            .then(galleryData => {
              setGalleryImages(galleryData);
              
              // Featured image as MediaItem
              let featuredMedia: MediaItem | null = null;
              if (articleData.featured_media_url) {
                featuredMedia = {
                  id: 0,
                  source_url: articleData.featured_media_url,
                  media_details: { width: 800, height: 600 },
                  caption: { rendered: '' },
                  alt_text: '',
                };
              }
              
              // Combine featured + gallery
              let allImgs: MediaItem[] = [];
              if (featuredMedia) {
                const isInGallery = galleryData.some(img => img.source_url === featuredMedia!.source_url);
                allImgs = isInGallery ? galleryData : [featuredMedia, ...galleryData];
              } else {
                allImgs = galleryData;
              }
              
              console.log('[LIGHTBOX DEBUG] Setting allImages with length:', allImgs.length);
              // NIE resetuj selectedImageIndex - pozwól na płynne przejścia w lightboxie
              setAllImages(allImgs);
            })
            .catch(err => {
              console.warn('Failed to load gallery images:', err);
            });
        }

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

        // Load related articles in background
        if (articleData.categories && articleData.categories.length > 0) {
          fetchRelatedArticles(articleId, articleData.categories, 6)
            .then(relatedData => {
              const allRelated = [...relatedData.sliderArticles, ...relatedData.listArticles];
              setRelatedArticles(allRelated);
            })
            .catch(err => {
              console.warn('Failed to load related articles:', err);
            });
        }

        setLoading(false);
        
      } catch (err) {
        console.error('Error loading article data:', err);
        setError('Nie udało się załadować artykułu');
        setLoading(false);
      }
    };

    loadArticleData();
  }, [id, isArticleSaved]);

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
    
    // Sprawdź czy RenderHtml otrzymuje poprawne style
    console.log('RenderHtml tagsStyles - strong:', {
      fontFamily: theme.fontFamily.bold,
      fontWeight: '700',
      color: theme.colors.text,
    });
  }, [theme.fontFamily, theme.colors.text]);

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
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      } else if (scale.value > 3) {
        scale.value = withSpring(3);
      }
    },
  });

  // Pan gesture handler
  const panGestureHandler = useAnimatedGestureHandler({
    onStart: (_, context: any) => {
      context.startX = translateX.value;
      context.startY = translateY.value;
    },
    onActive: (event: any, context: any) => {
      if (scale.value > 1) {
        translateX.value = context.startX + event.translationX;
        translateY.value = context.startY + event.translationY;
      }
    },
    onEnd: () => {
      const maxTranslateX = (width * (scale.value - 1)) / 2;
      const maxTranslateY = (height * (scale.value - 1)) / 2;

      if (translateX.value > maxTranslateX) {
        translateX.value = withSpring(maxTranslateX);
      } else if (translateX.value < -maxTranslateX) {
        translateX.value = withSpring(-maxTranslateX);
      }

      if (translateY.value > maxTranslateY) {
        translateY.value = withSpring(maxTranslateY);
      } else if (translateY.value < -maxTranslateY) {
        translateY.value = withSpring(-maxTranslateY);
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

  const handleCoffeeSupport = () => {
    // Tutaj można dodać logikę obsługi wsparcia
    // Na razie pokazujemy prosty alert
    Alert.alert(
      'Dziękujemy! ☕',
      'Dziękujemy za wsparcie! Twoja kawa motywuje nas do tworzenia jeszcze lepszych treści dla Kaszub.',
      [{ text: 'OK', style: 'default' }]
    );
  };

  // Function to navigate between images in the modal - zoptymalizowana
  const navigateImage = (direction: 'prev' | 'next') => {
    if (selectedImageIndex === null || !allImages.length) return;
    
    if (direction === 'prev' && selectedImageIndex > 0) {
      // Płynne przejście do poprzedniego zdjęcia
      setSelectedImageIndex(selectedImageIndex - 1);
      // Preloaduj poprzednie zdjęcie jeśli istnieje
      const prevIndex = selectedImageIndex - 2;
      if (prevIndex >= 0 && allImages[prevIndex]) {
        const prevImageUrl = allImages[prevIndex].media_details?.sizes?.large?.source_url || allImages[prevIndex].source_url;
        RNImage.prefetch(prevImageUrl).catch(() => {});
      }
    } else if (direction === 'next' && selectedImageIndex < allImages.length - 1) {
      // Płynne przejście do następnego zdjęcia
      setSelectedImageIndex(selectedImageIndex + 1);
      // Preloaduj następne zdjęcie jeśli istnieje
      const nextIndex = selectedImageIndex + 2;
      if (nextIndex < allImages.length && allImages[nextIndex]) {
        const nextImageUrl = allImages[nextIndex].media_details?.sizes?.large?.source_url || allImages[nextIndex].source_url;
        RNImage.prefetch(nextImageUrl).catch(() => {});
      }
    }
  };

  // Function to open image modal with haptic feedback - zoptymalizowana
  const openImageModal = useCallback((index: number) => {
    if (allImages.length === 0) return;
    
    if (index >= 0 && index < allImages.length) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      // Ustaw wszystko jednocześnie dla natychmiastowego otwarcia
      setSelectedImageIndex(index);
      setIsLightboxReady(true);
      setIsLightboxVisible(true);
    }
  }, [allImages.length]);

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

  // Function to download image - POPRAWIONA
  const downloadImage = async () => {
    if (selectedImageIndex === null || !allImages[selectedImageIndex]) return;
    
    try {
      const imageUrl = allImages[selectedImageIndex].source_url;
      
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
  };

  // Swipe gesture handlers
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
  const renderGalleryItem = ({ item, index }: { item: MediaItem; index: number }) => {
    // Calculate correct index for allImages array
    // Since we're showing allImages.slice(1), the actual index is index + 1
    const actualIndex = index + 1;
    
    return (
      <TouchableOpacity
        style={styles.galleryItem}
        onPress={() => {
          console.log('[LIGHTBOX DEBUG] Gallery item clicked:', index, 'actual index:', actualIndex);
          openImageModal(actualIndex);
        }}
        activeOpacity={0.9}
      >
        <Image
          source={{ uri: item.media_details?.sizes?.medium?.source_url || item.source_url }}
          style={styles.galleryItemImage}
          contentFit="cover"
          priority="high"
          cachePolicy="memory-disk"
          transition={200}
        />
      </TouchableOpacity>
    );
  };

  // Render related article item
  const renderRelatedArticle = ({ item }: { item: Article }) => (
    <TouchableOpacity
      style={[styles.relatedArticleItem, { backgroundColor: theme.colors.card }]}
      onPress={() => router.push(`/article/${item.id}`)}
      activeOpacity={0.7}
    >
      {item.featured_media_url && (
        <View style={styles.relatedArticleImageContainer}>
          <Image
            source={{ uri: item.featured_media_url }}
            style={styles.relatedArticleImage}
            contentFit="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.3)']}
            style={styles.relatedArticleImageGradient}
          />
        </View>
      )}
      <View style={styles.relatedArticleContent}>
        <Text style={[styles.relatedArticleTitle, { color: theme.colors.text, fontFamily: theme.fontFamily.semibold }]}>
          {truncateRelatedTitle(item.title.rendered)}
        </Text>
        <View style={styles.relatedArticleMeta}>
          <Text style={[styles.relatedArticleDate, { color: theme.colors.textSecondary, fontFamily: theme.fontFamily.medium }]}>
            {formatDateTime(item.date)}
          </Text>
          <View style={[styles.relatedArticleIndicator, { backgroundColor: '#fecc00' }]} />
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <SkeletonLoader type="article" immediate={true} />
      </View>
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
    <View style={[styles.rootContainer, { backgroundColor: theme.colors.background }]}>
      {/* StatusBar usunięty - dziedziczony z głównego _layout.tsx */}
      
      {/* WARSTWA 1: UI APLIKACJI (STAŁE) */}
      
      {/* Nagłówek - jest poza animowanym widokiem */}
      <View style={[styles.headerContainer, { zIndex: 10, paddingTop: insets.top }]}>
        <LinearGradient
          colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0)']}
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
            <Bookmark 
              size={24} 
              color="#FFFFFF" 
              fill={isSaved ? "#FFFFFF" : "transparent"} 
            />
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
          <TouchableOpacity 
            style={styles.imageContainer}
            onPress={() => openImageModal(0)}
            activeOpacity={0.95}
          >
            <Image
              source={{ uri: String(article.featured_media_url || article.featured_media) }}
              style={styles.featuredImage}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)']}
              style={styles.imageGradient}
            />
          </TouchableOpacity>

          {/* Content container with improved curved transition */}
          <View style={[styles.contentContainer, { backgroundColor: theme.colors.background }]} onLayout={handleContentLayout}> 
            {/* Tytuł artykułu - przeniesiony nad metadata */}
            <Text
              style={[
                styles.articleTitle,
                {
                  color: theme.colors.text,
                  fontSize: getTitleFontSize(cleanTitle(article.title.rendered)),
                  fontFamily: theme.fontFamily.bold,
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
                fontFamily: theme.fontFamily.regular
              }]}>
                {formatDateTime(article.date)}
              </Text>
              
              {/* Kategoria w jednej linii z datą */}
              {article?.categories && article.categories.length > 0 && (
                <TouchableOpacity onPress={handleCategoryPress}>
                  <Text style={[styles.categoryText, { color: '#FFFFFF', fontFamily: theme.fontFamily.medium }]}>
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
              source={{ html: cleanHtml(article.content.rendered, theme.isDarkMode) }}
              onHTMLLoaded={(html) => {
                console.log('[RENDER_HTML_DEBUG] HTML loaded successfully');
                console.log('[RENDER_HTML_DEBUG] Content length:', html.length);
                // Sprawdź czy są tagi strong/b w HTML
                const hasStrongTags = html.includes('<strong>') || html.includes('<b>');
                console.log('[RENDER_HTML_DEBUG] Has strong/b tags:', hasStrongTags);
              }}

              baseStyle={{
                color: theme.colors.text,
                fontSize: 15,
                lineHeight: 24,
                textAlign: 'left',
                fontFamily: theme.fontFamily.regular,
                // Usunięto fontWeight z baseStyle, aby nie nadpisywało tagów
              }}
              systemFonts={[
                theme.fontFamily.regular,
                theme.fontFamily.medium,
                theme.fontFamily.semibold,
                theme.fontFamily.bold,
                theme.fontFamily.light,
                theme.fontFamily.extralight,
                theme.fontFamily.thin,
                theme.fontFamily.extrabold,
                theme.fontFamily.black,
                'Poppins_Regular',
                'Poppins_Medium',
                'Poppins_SemiBold',
                'Poppins_Bold',
                'Poppins_Light',
                'Poppins_ExtraLight',
                'Poppins_Thin',
                'Poppins_ExtraBold',
                'Poppins_Black',
              ]}
              enableExperimentalBRCollapsing={true}
              enableExperimentalGhostLinesPrevention={true}
              enableUserAgentStyles={true}
              defaultTextProps={{
                style: {
                  fontFamily: theme.fontFamily.regular,
                  color: theme.colors.text,
                  // Usunięto fontWeight, aby nie nadpisywało tagów
                }
              }}



              tagsStyles={{
                p: {
                  color: theme.colors.text,
                  fontSize: 15, // Zmniejszone dla lepszej czytelności
                  lineHeight: 24, // Zmniejszone proporcjonalnie
                  fontWeight: '400',
                  textAlign: 'left',
                  fontFamily: theme.fontFamily.regular,
                  marginBottom: 16,
                },
                h1: {
                  color: theme.colors.text,
                  fontSize: 32,
                  fontWeight: '700',
                  marginBottom: 20,
                  marginTop: 32,
                  lineHeight: 40,
                  fontFamily: theme.fontFamily.bold,
                  textAlign: 'left',
                  includeFontPadding: false,
                },
                h2: {
                  color: theme.colors.text,
                  fontSize: 22,
                  fontWeight: '600',
                  marginBottom: 16,
                  marginTop: 20,
                  lineHeight: 28,
                  fontFamily: theme.fontFamily.semibold,
                  textAlign: 'left',
                  includeFontPadding: false,
                },
                h3: {
                  color: theme.colors.text,
                  fontSize: 19,
                  fontWeight: '600',
                  marginBottom: 14,
                  marginTop: 16,
                  lineHeight: 26,
                  fontFamily: theme.fontFamily.semibold,
                  textAlign: 'left',
                  includeFontPadding: false,
                },
                h4: {
                  color: theme.colors.text,
                  fontSize: 20,
                  fontWeight: '700',
                  marginBottom: 14,
                  marginTop: 18,
                  lineHeight: 28,
                  fontFamily: theme.fontFamily.bold,
                  textAlign: 'left',
                  includeFontPadding: false,
                },
                h5: {
                  color: theme.colors.text,
                  fontSize: 18,
                  fontWeight: '700',
                  marginBottom: 12,
                  marginTop: 16,
                  lineHeight: 26,
                  fontFamily: theme.fontFamily.bold,
                  textAlign: 'left',
                  includeFontPadding: false,
                },
                h6: {
                  color: theme.colors.text,
                  fontSize: 16,
                  fontWeight: '700',
                  marginBottom: 12,
                  marginTop: 14,
                  lineHeight: 24,
                  fontFamily: theme.fontFamily.bold,
                  textAlign: 'left',
                  includeFontPadding: false,
                },
                strong: {
                  fontFamily: theme.fontFamily.bold,
                  fontWeight: '700',
                  color: theme.colors.text,
                  includeFontPadding: false,
                  fontSize: 15,
                  lineHeight: 24,
                },
                b: {
                  fontFamily: theme.fontFamily.bold,
                  fontWeight: '700',
                  color: theme.colors.text,
                  includeFontPadding: false,
                  fontSize: 15,
                  lineHeight: 24,
                },
                em: {
                  fontStyle: 'italic',
                  fontFamily: theme.fontFamily.regular,
                  color: theme.colors.text,
                  includeFontPadding: false,
                },
                i: {
                  fontStyle: 'italic',
                  fontFamily: theme.fontFamily.regular,
                  color: theme.colors.text,
                  includeFontPadding: false,
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
                  fontFamily: theme.fontFamily.medium,
                },
                blockquote: {
                  borderLeftWidth: 4,
                  borderLeftColor: theme.colors.primary,
                  paddingLeft: 16,
                  marginBottom: 16,
                  fontStyle: 'italic',
                  color: theme.colors.textSecondary,
                  fontFamily: theme.fontFamily.regular,
                  fontSize: 15,
                  lineHeight: 24,
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
                  fontSize: 15, // Zmniejszone dla lepszej czytelności
                  lineHeight: 24, // Zmniejszone proporcjonalnie
                  fontFamily: theme.fontFamily.regular,
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
                // Dodatkowe style dla span z różnymi font-weight
                span: {
                  color: theme.colors.text,
                  fontFamily: theme.fontFamily.regular,
                  includeFontPadding: false,
                },
                // Dodatkowe wsparcie dla różnych formatów pogrubienia
                'span[style*="font-weight: bold"]': {
                  fontFamily: theme.fontFamily.bold,
                  fontWeight: '700',
                  color: theme.colors.text,
                  includeFontPadding: false,
                },
                'span[style*="font-weight: 700"]': {
                  fontFamily: theme.fontFamily.bold,
                  fontWeight: '700',
                  color: theme.colors.text,
                  includeFontPadding: false,
                },
                'span[style*="font-weight: 600"]': {
                  fontFamily: theme.fontFamily.semibold,
                  fontWeight: '600',
                  color: theme.colors.text,
                  includeFontPadding: false,
                },
                'span[style*="font-weight: 800"]': {
                  fontFamily: theme.fontFamily.extrabold,
                  fontWeight: '800',
                  color: theme.colors.text,
                  includeFontPadding: false,
                },
                'span[style*="font-weight: 900"]': {
                  fontFamily: theme.fontFamily.black,
                  fontWeight: '900',
                  color: theme.colors.text,
                  includeFontPadding: false,
                },
                // Dodatkowe selektory dla różnych formatów
                '[style*="font-weight: bold"]': {
                  fontFamily: theme.fontFamily.bold,
                  fontWeight: '700',
                  color: theme.colors.text,
                  includeFontPadding: false,
                },
                '[style*="font-weight: 700"]': {
                  fontFamily: theme.fontFamily.bold,
                  fontWeight: '700',
                  color: theme.colors.text,
                  includeFontPadding: false,
                },
                '[style*="font-weight: 600"]': {
                  fontFamily: theme.fontFamily.semibold,
                  fontWeight: '600',
                  color: theme.colors.text,
                  includeFontPadding: false,
                },
                table: {
                  marginBottom: 24,
                  marginTop: 24,
                  width: '100%',
                  borderWidth: 2,
                  borderColor: theme.colors.border,
                  borderRadius: 12,
                  overflow: 'hidden',
                  backgroundColor: theme.colors.card,
                  elevation: 2,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                },
                thead: {
                  backgroundColor: theme.colors.primary,
                },
                tbody: {
                  backgroundColor: theme.colors.card,
                },
                th: {
                  padding: 16,
                  textAlign: 'left',
                  backgroundColor: theme.colors.primary,
                  color: '#FFFFFF',
                  fontWeight: '700',
                  fontFamily: theme.fontFamily.bold,
                  fontSize: 15,
                  borderRightWidth: 1,
                  borderRightColor: 'rgba(255,255,255,0.2)',
                  borderBottomWidth: 0,
                },
                td: {
                  padding: 14,
                  textAlign: 'left',
                  fontFamily: theme.fontFamily.regular,
                  fontSize: 15,
                  color: theme.colors.text,
                  borderRightWidth: 1,
                  borderRightColor: theme.colors.border,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.colors.border,
                  lineHeight: 22,
                },
                tr: {
                  backgroundColor: theme.colors.card,
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
                              <Text style={[styles.videoTitle, { color: theme.colors.text, fontFamily: theme.fontFamily.bold }]}>
                  Wideo
                </Text>
              <VideoPlayer url={youtubeUrl} />
            </View>
          )}

          {/* Galeria - Przywrócona */}
          {allImages.length > 1 && (
            <View style={styles.galleryContainer}>
              <Text style={[styles.galleryTitle, { color: theme.colors.text, fontFamily: theme.fontFamily.bold }]}>
                Galeria
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
                  <Text style={[styles.flickrButtonText, { fontFamily: theme.fontFamily.medium }]}>Zobacz więcej zdjęć</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Źródło i informacje o zdjęciu */}
          {(article?.meta?.zrudlo || article?.meta?.zrodlo || article?.meta?.foto) && (
            <View style={styles.sourceContainer}>
              {article?.meta?.foto && (
                <Text style={[styles.sourceText, { color: theme.colors.textSecondary, fontFamily: theme.fontFamily.regular }]}>
                  fot. {article.meta.foto}
                </Text>
              )}
              {(article?.meta?.zrudlo || article?.meta?.zrodlo) && (
                <Text style={[styles.sourceText, { color: theme.colors.textSecondary, fontFamily: theme.fontFamily.regular }]}>
                  źródło: {article.meta.zrudlo || article.meta.zrodlo}
                </Text>
              )}
            </View>
          )}

          {/* Sekcja wsparcia - Postaw nam kawę */}
          <CoffeeSupportCard onPress={handleCoffeeSupport} />

          {/* Sprawdź również - Sekcja z powiązanymi artykułami - Ulepszona */}
          {relatedArticles.length > 0 && (
            <View style={styles.relatedSection}>
              <View style={styles.relatedSectionHeader}>
                <View style={styles.relatedSectionTitleContainer}>
                  <Text style={[styles.relatedSectionTitle, { color: theme.colors.text, fontFamily: theme.fontFamily.bold }]}>
                    Sprawdź też
                  </Text>
                  <View style={[styles.relatedSectionIcon, { backgroundColor: theme.colors.primary }]}>
                    <Eye size={16} color="#FFFFFF" />
                  </View>
                </View>
                <View style={[styles.relatedSectionDivider, { backgroundColor: theme.colors.border }]} />
              </View>
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
              <Text style={[styles.homeHintText, { fontFamily: theme.fontFamily.regular }]}>Przewiń, by wrócić na stronę główną</Text>
            </View>
          </Animated.View>

          {/* Dodatkowy padding na końcu dla płynnego przejścia */}
          <View style={styles.bottomPadding} />
        </ScrollView>
      </Animated.View>

      {/* Global TabBar */}
      <GlobalTabBar activeTab="home" />

      {/* Zoptymalizowany Lightbox - bez przeładowań */}
      {selectedImageIndex !== null && lightboxImages.length > 0 && isLightboxReady && (
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
    height: height * 0.55, // Zwiększone z 0.45 na 0.55
    position: 'relative',
    zIndex: 1,
    elevation: 1,
    marginTop: -20, // Przesunięte wyżej o 20px
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
    paddingTop: 0, // Usunięty niepotrzebny padding dla status bara
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
    fontWeight: '700', 
    marginBottom: 16,
    lineHeight: 40,
    textAlign: 'left',
  },
  date: { 
    fontSize: 14,
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
    fontWeight: '700', 
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
    marginTop: 32,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  galleryTitle: {
    fontSize: 22,
    marginBottom: 20,
    textAlign: 'left',
  },
  galleryContent: {
    paddingHorizontal: 0,
  },
  galleryRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  galleryItem: {
    width: (width - 52) / 2,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  galleryItemImage: {
    width: '100%',
    height: '100%',
  },
  
  // Ulepszone style dla modala
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)', // Mniej nieprzezroczyste tło
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  videoContainer: {
    marginTop: 40,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  videoTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
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
  },
  bottomPadding: {
    height: 120,
  },
  sourceContainer: {
    marginTop: 12,
    paddingHorizontal: 20,
  },
  sourceText: {
    fontSize: 13,
  },
  
  // Nowe style dla sekcji powiązanych artykułów
  relatedSection: {
    marginTop: 32,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  relatedSectionHeader: {
    marginBottom: 20,
  },
  relatedSectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  relatedSectionTitle: {
    fontSize: 20,
    textAlign: 'left',
    flex: 1,
  },
  relatedSectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  relatedSectionDivider: {
    height: 1,
    borderRadius: 0.5,
  },
  relatedList: {
    paddingHorizontal: 0,
  },
  relatedArticleItem: {
    flexDirection: 'row',
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    gap: 12,
  },
  relatedArticleImageContainer: {
    position: 'relative',
    width: 110,
    height: 110,
    marginLeft: 12,
    marginTop: 12,
    marginBottom: 12,
  },
  relatedArticleImage: {
    width: 110,
    height: 110,
    borderRadius: 16,
  },
  relatedArticleImageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    borderRadius: 16,
  },
  relatedArticleContent: {
    flex: 1,
    padding: 20,
    paddingLeft: 8,
    justifyContent: 'space-between',
  },
  relatedArticleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  relatedArticleIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  relatedArticleTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  relatedArticleDate: {
    fontSize: 13,
    opacity: 0.6,
    fontWeight: '500',
  },
  categoryText: {
    fontSize: 12, // Mniejszy font
    fontWeight: '600',
    paddingVertical: 8, // Więcej paddingu pionowego
    paddingHorizontal: 16, // Więcej paddingu poziomego
    borderRadius: 20, // Większy border radius
    backgroundColor: '#224996', // Granatowy kolor
    color: '#FFFFFF',
    overflow: 'hidden',
    minWidth: 80, // Minimalna szerokość
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
    fontWeight: '700',
    fontSize: 40,        // rozmiar fontu 40px
    lineHeight: 48,      // min. 1.2×40
    includeFontPadding: false, // usuwa dodatkowe wewnętrzne odstępy
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    textAlign: 'left',
    maxWidth: '90%',
  },
  articleTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
    lineHeight: 32,
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
    fontFamily: 'Poppins_SemiBold',
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
    fontFamily: 'Poppins_Medium',
  },
});