import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Dimensions,
  StatusBar,
  Linking,
  Share,
  Platform,
  Alert,
  Clipboard,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFonts } from 'expo-font';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { Image as ExpoImage } from 'expo-image';
const AnimatedImage = Animated.createAnimatedComponent(ExpoImage);
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import RenderHtml from 'react-native-render-html';

// Stałe poza komponentem — nie są tworzone przy każdym renderze
const HTML_SYSTEM_FONTS = ['Poppins_Regular', 'Poppins_Bold', 'Poppins_SemiBold', 'Poppins_Medium', 'sans-serif', 'System'];
import {
  ArrowLeft,
  Share2,
  Bookmark,
  Heart,
  Coffee,
  Eye,
  ChevronUp,
  Volume2,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Importy komponentów i serwisów
import { OptimizedLightbox } from '@/components/OptimizedLightbox';
import { fetchArticleById, fetchArticleBySlug, fetchMediaByIds, fetchRelatedArticles } from '@/services/api';
import { analyticsService } from '@/services/analyticsService';
import { EngagementService } from '@/services/EngagementService';
import { triggerSupportPrompt } from '@/app/_layout';
import { Article, MediaItem } from '@/types/article';
import { useThemeStore } from '@/store/themeStore';
import { useArticlesStore } from '@/store/articlesStore';
import GlobalTabBar from '@/components/GlobalTabBar';
import VideoPlayer from '@/components/VideoPlayer';
import CoffeeSupportCard from '@/components/CoffeeSupportCard';
import { shareArticle } from '@/utils/share';
import { useTTSStore } from '@/store/ttsStore';
import { useSupportStore } from '@/store/supportStore';
import { formatDateTime } from '@/utils/dateFormatter';
import { cleanHtml, processGalleryIds, parseGaleriaField, extractYouTubeUrl } from '@/utils/htmlParser';
import SkeletonLoader from '@/components/SkeletonLoader';
import LoadingIndicator from '@/components/LoadingIndicator';
import EmptyState from '@/components/EmptyState';
import { AdBanner } from '@/components/AdBanner'; // Import AdBanner
import { RelatedArticlesSlider } from '@/components/RelatedArticlesSlider';
import { WebView } from 'react-native-webview';
import ArticlePollWidget from '@/components/ArticlePollWidget';
import ArticleFbComments from '@/components/ArticleFbComments';
import { AudioPlayerBar } from '@/components/AudioPlayerBar';
import { ReadingProgressBar } from '@/components/ReadingProgressBar';
import * as Speech from 'expo-speech';
import * as Audio from 'expo-av';

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

// 1) mała pomoc do wykrycia "pogrubienia" na spanach
const isBoldStyle = (style?: string) =>
  !!style && /font-weight\s*:\s*(bold|6\d\d|7\d\d|8\d\d|9\d\d)/i.test(style);

export default function ArticleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme, isDarkMode } = useThemeStore();
  const { isArticleSaved, saveArticle, removeArticle } = useArticlesStore();
  const insets = useSafeAreaInsets();

  // Sprawdź audio na starcie
  useEffect(() => {
    console.log('[TTS] Audio module ready');
  }, []);

  // Ensure Poppins is available for this screen (especially for RenderHtml)
  const [fontsLoaded] = useFonts({
    Poppins_Regular: require('../../assets/fonts/Poppins/Poppins_Regular.ttf'),
    Poppins_Bold: require('../../assets/fonts/Poppins/Poppins_Bold.ttf'),
    Poppins_SemiBold: require('../../assets/fonts/Poppins/Poppins_SemiBold.ttf'),
    Poppins_Medium: require('../../assets/fonts/Poppins/Poppins_Medium.ttf'),
  });

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [related, setRelated] = useState<Article[]>([]);
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);
  const [relatedPage, setRelatedPage] = useState(1);
  const [hasMoreRelated, setHasMoreRelated] = useState(true);
  const [loadingMoreRelated, setLoadingMoreRelated] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [galleryImages, setGalleryImages] = useState<MediaItem[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState<string | null>(null);
  const [flickrUrl, setFlickrUrl] = useState<string | null>(null);
  const [allImages, setAllImages] = useState<MediaItem[]>([]);
  const [cleanedContentHtml, setCleanedContentHtml] = useState<string>('');
  const tts = useTTSStore();
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isLightboxVisible, setIsLightboxVisible] = useState(false);
  const [isLightboxReady, setIsLightboxReady] = useState(false);
  const [contentLightboxUri, setContentLightboxUri] = useState<string | null>(null);

  // Tooltip state dla ikony "czytaj na głos"
  const [showTtsTooltip, setShowTtsTooltip] = useState(true); // Pokazuje się od razu
  const tooltipOpacity = useSharedValue(1); // Zaczyna widoczny
  const tooltipScale = useSharedValue(1); // Zaczyna w pełnym rozmiarze

  // Stan dla paska postępu czytania
  const [readingProgress, setReadingProgress] = useState(0);
  const [showReadingProgress, setShowReadingProgress] = useState(false);

  // Memoizowane props dla RenderHtml — kluczowe dla wydajności
  const htmlSource = useMemo(() => ({ html: cleanedContentHtml }), [cleanedContentHtml]);
  const htmlBaseStyle = useMemo(() => ({
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'left' as const,
    fontFamily: 'Poppins_Regular',
  }), [theme.colors.text]);
  const htmlTagsStyles = useMemo(() => getHtmlViewStyles(theme), [theme]);
  const htmlRenderers = useMemo(() => ({
    iframe: ({ tnode, ...props }: { tnode: any; [key: string]: any }) => {
      const { src } = tnode.attributes;
      return (
        <View style={styles.iframeContainer}>
          <WebView
            source={{ uri: src }}
            style={{ width: '100%', height: 200, borderRadius: 8 }}
            allowsFullscreenVideo={true}
            mediaPlaybackRequiresUserAction={false}
            {...props}
          />
        </View>
      );
    },
    img: ({ tnode }: { tnode: any }) => {
      const src = tnode.attributes?.src || '';
      if (!src) return null;
      const sw = Dimensions.get('window').width - 32;
      const attrW = parseInt(tnode.attributes?.width || '0');
      const attrH = parseInt(tnode.attributes?.height || '0');
      const ratio = attrW && attrH ? attrH / attrW : 0.6;
      const displayH = Math.round(sw * ratio);
      return (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setContentLightboxUri(src)}
          style={{ marginVertical: 6 }}
        >
          <ExpoImage
            source={{ uri: src }}
            style={{ width: sw, height: displayH, borderRadius: 8 }}
            contentFit="cover"
            allowDownscaling={true}
            cachePolicy="memory-disk"
          />
        </TouchableOpacity>
      );
    },
  }), [setContentLightboxUri]);
  const htmlRenderersProps = useMemo(() => ({
    a: {
      onPress: (_event: any, href: string) => {
        if (href) Linking.openURL(href).catch(() => {});
      },
    },
  }), []);

  // Animowane style dla tooltip
  const tooltipAnimatedStyle = useAnimatedStyle(() => ({
    opacity: tooltipOpacity.value,
    transform: [{ scale: tooltipScale.value }],
  }));

  // Funkcje do obsługi tooltip
  const showTooltip = useCallback(() => {
    setShowTtsTooltip(true);
    tooltipOpacity.value = withTiming(1, { duration: 200 });
    tooltipScale.value = withSpring(1, { damping: 15, stiffness: 150 });
  }, [tooltipOpacity, tooltipScale]);

  const hideTooltip = useCallback(() => {
    tooltipOpacity.value = withTiming(0, { duration: 200 });
    tooltipScale.value = withTiming(0.8, { duration: 200 });
    setTimeout(() => setShowTtsTooltip(false), 200);
  }, [tooltipOpacity, tooltipScale]);

  // Ukryj tooltip po 5 sekundach od wejścia do artykułu
  useEffect(() => {
    const timer = setTimeout(() => {
      hideTooltip();
    }, 5000);

    return () => clearTimeout(timer);
  }, [hideTooltip]);

  // Cleanup TTS only on unmount (avoid stopping on every state change)
  useEffect(() => {
    return () => {
      try {
        // ensure we stop any ongoing speech when leaving the screen
        useTTSStore.getState().stop();
      } catch { }
    };
  }, []);

  const handleReadAloud = useCallback(() => {
    console.log('[TTS] handleReadAloud called');

    if (!article) {
      Alert.alert('Błąd', 'Brak treści do odczytania');
      return;
    }

    // Debounce - prevent multiple rapid clicks
    if (tts.status === 'loading' || tts.status === 'playing') {
      return;
    }

    // Prefer the prerecorded ElevenLabs lektor file if the editor uploaded one
    // (article.meta["plik-dzwiekowy"]). Falls back to native TTS on missing file
    // OR audio load failure (handled inside ttsStore.start).
    const lektorUrl = (article.meta?.['plik-dzwiekowy'] || '').trim();

    if (lektorUrl) {
      try {
        tts.start({
          title: article.title.rendered,
          chunks: [],
          audioUrl: lektorUrl,
          speakingRate: 1.0,
          language: 'pl-PL',
        });
      } catch (error) {
        console.error('[TTS] Error starting audio playback:', error);
        Alert.alert('Błąd', 'Nie udało się uruchomić nagrania: ' + error);
      }
      return;
    }

    if (!cleanedContentHtml) {
      Alert.alert('Błąd', 'Brak treści do odczytania');
      return;
    }

    // Native TTS path — clean HTML and split into chunks Speech.speak can handle.
    const plainText = cleanedContentHtml
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/https?:\/\/\S+/g, ' ')
      .replace(/[\r\n]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();

    if (plainText.length < 50) {
      Alert.alert('Błąd', 'Treść jest zbyt krótka do odczytania');
      return;
    }

    const chunks = plainText
      .split(/[.!?]+/)
      .filter(chunk => chunk.trim().length > 10)
      .map(chunk => chunk.trim())
      .reduce((acc, chunk) => {
        if (acc.length === 0) {
          return [chunk];
        }
        const lastChunk = acc[acc.length - 1];
        if (lastChunk.length + chunk.length < 800) {
          acc[acc.length - 1] = lastChunk + '. ' + chunk;
        } else {
          acc.push(chunk);
        }
        return acc;
      }, [] as string[]);

    if (chunks.length === 0) {
      Alert.alert('Błąd', 'Nie można przetworzyć treści do odczytania');
      return;
    }

    try {
      tts.start({
        title: article.title.rendered,
        chunks,
        speakingRate: 1.0,
        language: 'pl-PL',
      });
    } catch (error) {
      console.error('[TTS] Error starting TTS:', error);
      Alert.alert('Błąd', 'Nie udało się uruchomić czytania: ' + error);
    }
  }, [article, cleanedContentHtml, tts]);

  // Stabilne referencje dla lightboxa - zapobiegają przeładowaniu
  const lightboxImages = useMemo(() =>
    allImages.map(img => ({
      uri: img.media_details?.sizes?.large?.source_url || img.source_url,
      caption: img.caption?.rendered || ''
    })), [allImages]
  );

  // Preloadowanie zdjęć dla lightboxa - poprawia płynność
  useEffect(() => {
    if (lightboxImages.length > 0) {
      // Preloaduj tylko pierwsze 3 zdjęcia dla lepszej wydajności
      const imagesToPreload = lightboxImages.slice(0, 3);
      imagesToPreload.forEach(img => {
        if (img.uri) {
          ExpoImage.prefetch(img.uri).catch(() => {
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
      // Hydration guard: useLocalSearchParams may briefly return undefined right
      // after router.replace() during a deep-link redirect. Don't flash an error
      // UI in that window — wait for the next render where id is populated.
      if (id === undefined) return;

      const idStr = Array.isArray(id) ? id[0] : id;
      if (!idStr) {
        setError('Nieprawidłowy identyfikator artykułu');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Accept both numeric IDs (deep-link router.replace from linkHandler) and
        // slugs (e.g. push notifications that pass slug directly). Resolve slug→id
        // here so the screen never shows "nieprawidłowy" for valid WP slugs.
        const articleId = /^\d+$/.test(idStr) ? parseInt(idStr, 10) : await (async () => {
          const a = await fetchArticleBySlug(idStr);
          return a?.id ?? NaN;
        })();

        if (!articleId || isNaN(articleId)) {
          setError('Nie znaleziono artykułu');
          setLoading(false);
          return;
        }

        // Load article data first
        const articleData = await fetchArticleById(articleId);

        if (!articleData) {
          setError('Nie znaleziono artykułu');
          setLoading(false);
          return;
        }

        setArticle(articleData);
        setIsSaved(isArticleSaved(articleId));

        // GA4: track article view (page_view + article_view).
        // page_location matches web URL (https://kaszuby24.pl/<slug>) — dashboard
        // pageviews map sums web + mobile per slug. article_view event ma bogatsze
        // params (id/category) do mobile-specific funnels.
        analyticsService.logArticleView(
          articleData.id,
          cleanTitle(articleData.title?.rendered || ''),
          articleData.slug || '',
          articleData.categories?.[0],
        );

        // Engagement tracking — show support prompt every 5 articles.
        EngagementService.trackArticleRead().then((shouldPrompt) => {
          if (shouldPrompt) triggerSupportPrompt();
        });
        // Clean content
        const cleaned = cleanHtml(articleData.content.rendered || '', !!theme.isDarkMode || !!isDarkMode);
        setCleanedContentHtml(cleaned);

        // NIE resetuj selectedImageIndex tutaj - pozwól na płynne przejścia

        // Load gallery images in background (non-blocking)
        // galeria field ma 3 formaty: numeric WP IDs, JSON string "[123]", lub Supabase Storage paths "articles/x.webp"
        const { ids: galleryIds, urls: storageUrls } = parseGaleriaField(articleData.meta?.galeria);

        // Featured image as MediaItem - zawsze dodaj zdjęcie główne
        let featuredMedia: MediaItem | null = null;
        if (articleData.featured_media_url) {
          featuredMedia = {
            id: 0,
            source_url: articleData.featured_media_url,
            media_details: { width: 800, height: 600 },
            caption: { rendered: articleData.meta?.foto ? `fot. ${articleData.meta.foto.replace(/^fot\.\s*/i, '')}` : '' },
            alt_text: '',
          };
        }

        // Supabase Storage paths → bezpośrednie MediaItem bez fetchowania WP API
        const storageMediaItems: MediaItem[] = storageUrls.map((url, i) => ({
          id: -(i + 2),
          source_url: url,
          alt_text: '',
          media_details: { width: 1200, height: 800 },
        }));

        const buildAllImages = (galleryData: MediaItem[]) => {
          const uniqueGallery = galleryData.filter((img, index, self) =>
            index === self.findIndex(t => t.source_url === img.source_url)
          );
          if (!featuredMedia) return uniqueGallery;
          const isInGallery = uniqueGallery.some(img => img.source_url === featuredMedia!.source_url);
          return isInGallery ? uniqueGallery : [{ ...featuredMedia, id: -1 }, ...uniqueGallery];
        };

        if (galleryIds.length > 0) {
          setGalleryLoading(true);
          fetchMediaByIds(galleryIds)
            .then(galleryData => {
              const allGallery = [...galleryData, ...storageMediaItems];
              setGalleryImages(allGallery);
              setAllImages(buildAllImages(allGallery));
              setGalleryLoading(false);
            })
            .catch(err => {
              console.warn('Failed to load gallery images:', err);
              setGalleryLoading(false);
              if (storageMediaItems.length > 0) {
                setGalleryImages(storageMediaItems);
                setAllImages(buildAllImages(storageMediaItems));
              } else if (featuredMedia) {
                setAllImages([{ ...featuredMedia, id: -1 }]);
              }
            });
        } else if (storageMediaItems.length > 0) {
          // Tylko Supabase Storage paths — nie trzeba fetchować WP API
          setGalleryImages(storageMediaItems);
          setAllImages(buildAllImages(storageMediaItems));
        } else {
          // Brak galerii — tylko zdjęcie główne
          if (featuredMedia) {
            setAllImages([{ ...featuredMedia, id: -1 }]);
          }
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
          fetchRelatedArticles(articleId, articleData.categories, 6, 1)
            .then(relatedData => {
              const allRelated = [...relatedData.sliderArticles, ...relatedData.listArticles];
              setRelatedArticles(allRelated);
              setRelatedPage(1);
              setHasMoreRelated(allRelated.length >= 6);
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

  // Debug font logs removed



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
  // Reset zoom when modal closes
  useEffect(() => {
    if (selectedImageIndex === null) {
      // Logic removed as shared values were removed
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
    if (!article) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const shareTitle = cleanTitle(article.title.rendered);
      const shareUrl = article.link;
      await shareArticle(shareTitle, shareUrl);
    } catch (error) {
      console.warn('Share failed:', error);
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

  // Nowa funkcja dla animowanej sekcji wsparcia - uproszczona bez problematycznych animacji
  const [coffeePressed, setCoffeePressed] = useState(false);

  const handleCoffeePress = () => {
    // Prosta animacja stanu
    setCoffeePressed(true);
    setTimeout(() => setCoffeePressed(false), 300);

    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Pokazuj alert z opóźnieniem dla lepszego UX
    setTimeout(() => {
      Alert.alert(
        '☕ Postaw nam kawę!',
        'Wesprzyj naszą pracę i pomóż nam tworzyć jeszcze lepsze treści dla Kaszub. Każda kawa to motywacja do dalszej pracy!',
        [
          { text: 'Później', style: 'cancel' },
          { text: 'Wesprzyj', style: 'default' }
        ]
      );
    }, 200);
  };

  // Funkcja do ładowania kolejnych stron powiązanych artykułów
  const loadMoreRelatedArticles = useCallback(async () => {
    if (!article || !hasMoreRelated || loadingMoreRelated) return;

    try {
      setLoadingMoreRelated(true);
      const nextPage = relatedPage + 1;

      // Pobierz kolejną stronę powiązanych artykułów
      const moreRelated = await fetchRelatedArticles(
        article.id,
        article.categories,
        6,
        nextPage
      );

      if (moreRelated.sliderArticles.length > 0 || moreRelated.listArticles.length > 0) {
        const allMoreRelated = [...moreRelated.sliderArticles, ...moreRelated.listArticles];
        setRelatedArticles(prev => [...prev, ...allMoreRelated]);
        setRelatedPage(nextPage);
        setHasMoreRelated(allMoreRelated.length >= 6);
      } else {
        setHasMoreRelated(false);
      }
    } catch (error) {
      console.warn('Failed to load more related articles:', error);
    } finally {
      setLoadingMoreRelated(false);
    }
  }, [article, hasMoreRelated, loadingMoreRelated, relatedPage]);

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
        ExpoImage.prefetch(prevImageUrl).catch(() => { });
      }
    } else if (direction === 'next' && selectedImageIndex < allImages.length - 1) {
      // Płynne przejście do następnego zdjęcia
      setSelectedImageIndex(selectedImageIndex + 1);
      // Preloaduj następne zdjęcie jeśli istnieje
      const nextIndex = selectedImageIndex + 2;
      if (nextIndex < allImages.length && allImages[nextIndex]) {
        const nextImageUrl = allImages[nextIndex].media_details?.sizes?.large?.source_url || allImages[nextIndex].source_url;
        ExpoImage.prefetch(nextImageUrl).catch(() => { });
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

    // Oblicz postęp czytania
    const maxScroll = contentHeight - scrollViewHeight;
    const scrollableHeight = Math.max(0, maxScroll);
    const currentProgress = scrollableHeight > 0 ? Math.min(100, (offsetY / scrollableHeight) * 100) : 0;

    setReadingProgress(currentProgress);

    // Pokaż pasek postępu po przewinięciu 10% treści
    if (currentProgress > 10 && !showReadingProgress) {
      setShowReadingProgress(true);
    } else if (currentProgress <= 10 && showReadingProgress) {
      setShowReadingProgress(false);
    }

    // Oblicz overflow scroll
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

  // Render gallery item - zoptymalizowane z memo
  const renderGalleryItem = useCallback(({ item, index }: { item: MediaItem; index: number }) => {
    // Użyj item.id zamiast actualIndex aby uniknąć duplikacji kluczy
    const hasFeatured = !!article?.featured_media_url;
    const actualIndex = (hasFeatured ? 1 : 0) + index;

    return (
      <TouchableOpacity
        style={styles.galleryItem}
        onPress={() => {
          console.log('[LIGHTBOX DEBUG] Gallery item clicked:', index, 'actual index:', actualIndex);
          openImageModal(actualIndex);
        }}
        activeOpacity={0.9}
        accessible={true}
        accessibilityLabel={`Zdjęcie ${index + 1} z galerii`}
        accessibilityHint="Kliknij aby powiększyć zdjęcie"
        key={`gallery_item_${item.id}_${index}`}
      >
        <ExpoImage
          source={{ uri: item.media_details?.sizes?.medium?.source_url || item.source_url }}
          style={styles.galleryItemImage}
          contentFit="cover"
          priority="high"
          cachePolicy="memory-disk"
          transition={200}
        />
      </TouchableOpacity>
    );
  }, [article?.featured_media_url, openImageModal]);

  // Render related article item - zoptymalizowane z memo
  const renderRelatedArticle = useCallback(({ item, index }: { item: Article; index: number }) => (
    <TouchableOpacity
      style={[styles.relatedArticleItem, { backgroundColor: theme.colors.card }]}
      onPress={() => router.push(`/article/${item.id}`)}
      activeOpacity={0.7}
      accessible={true}
      accessibilityLabel={`Powiązany artykuł: ${truncateRelatedTitle(item.title.rendered)}`}
      accessibilityHint="Otwiera powiązany artykuł"
      key={`related_article_${item.id}`}
    >
      {item.featured_media_url && (
        <View style={styles.relatedArticleImageContainer}>
          <ExpoImage
            source={{ uri: item.featured_media_url }}
            style={styles.relatedArticleImage}
            contentFit="cover"
            priority="normal"
            cachePolicy="memory-disk"
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
  ), [theme.colors, theme.fontFamily, router]);

  // Wait for fonts to load
  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <LoadingIndicator />
      </View>
    );
  }

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
      <View style={[styles.headerContainer, {
        zIndex: 10,
        paddingTop: insets.top,
        height: HEADER_HEIGHT + insets.top,
        backgroundColor: 'transparent',
      }]}>
        <LinearGradient
          colors={
            Platform.OS === 'android'
              ? ['rgba(0,0,0,0.78)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.22)', 'rgba(0,0,0,0)']
              : ['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0)']
          }
          style={[styles.headerGradient, { height: HEADER_HEIGHT + insets.top + 20 }]}
        />
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleGoBack}
          accessible={true}
          accessibilityLabel="Wróć do poprzedniej strony"
          accessibilityHint="Nawiguje do poprzedniej strony"
        >
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Wypełnienie status bara bez logo */}
        <View style={styles.headerCenter}>
          {/* Logo zostało usunięte */}
        </View>

        <View style={styles.headerRightButtons}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleToggleSave}
            accessible={true}
            accessibilityLabel={isSaved ? "Usuń z zapisanych" : "Zapisz artykuł"}
            accessibilityHint="Zapisuje lub usuwa artykuł z listy zapisanych"
          >
            <Bookmark
              size={24}
              color="#FFFFFF"
              fill={isSaved ? "#FFFFFF" : "transparent"}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleReadAloud}
            accessible={true}
            accessibilityLabel="Czytaj artykuł na głos"
            accessibilityHint="Uruchamia czytanie całego artykułu przez syntezator mowy"
            disabled={tts.status === 'loading' || tts.status === 'playing'}
          >
            <Volume2
              size={24}
              color={tts.status === 'loading' || tts.status === 'playing' ? "#CCCCCC" : "#FFFFFF"}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleShare}
            accessible={true}
            accessibilityLabel="Udostępnij artykuł z obrazem"
            accessibilityHint="Otwiera menu udostępniania artykułu z obrazem"
          >
            <Share2 size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Tooltip dla ikony "czytaj na głos" */}
        {showTtsTooltip && (
          <Animated.View style={[styles.ttsTooltip, tooltipAnimatedStyle]}>
            <Text style={styles.ttsTooltipText}>Po co czytać? Lepiej posłuchaj!</Text>
            {/* Ogonek dymka */}
            <View style={styles.tooltipArrow} />
          </Animated.View>
        )}
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
            accessible={true}
            accessibilityLabel="Zdjęcie główne artykułu"
            accessibilityHint="Kliknij aby powiększyć zdjęcie"
          >
            <ExpoImage
              source={{ uri: String(article.featured_media_url || article.featured_media) }}
              style={styles.featuredImage}
              contentFit="cover"
              allowDownscaling={true}
              cachePolicy="memory-disk"
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)']}
              style={styles.imageGradient}
            />

            {/* Photo credit overlay - nowy */}
            {article?.meta?.foto && (
              <View style={styles.photoCreditOverlay}>
                <Text style={styles.photoCreditText}>
                  fot. {article.meta.foto.replace(/^fot\.\s*/i, '')}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Content container with improved curved transition */}
          <View style={[styles.contentContainer, { backgroundColor: theme.colors.card }]} onLayout={handleContentLayout}>
            {/* Tytuł artykułu - przeniesiony nad metadata */}
            <Text
              style={[
                styles.articleTitle,
                {
                  color: theme.colors.text,
                  fontSize: getTitleFontSize(cleanTitle(article.title.rendered)),
                  fontFamily: Platform.OS === 'android' ? 'Poppins_SemiBold' : theme.fontFamily.bold,
                  fontWeight: Platform.OS === 'android' ? 'normal' : '700',
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




            {/* Video player nad treścią */}
            {/* --- AD: TOP --- */}
            <AdBanner position="article_top" style={{ marginBottom: 20 }} />

            {youtubeUrl && (
              <VideoPlayer url={youtubeUrl} />
            )}

            <RenderHtml
              source={htmlSource}
              contentWidth={width - 40}
              baseStyle={htmlBaseStyle}
              systemFonts={HTML_SYSTEM_FONTS}
              tagsStyles={htmlTagsStyles}
              renderers={htmlRenderers}
              renderersProps={htmlRenderersProps}
            />

            {/* Źródło i informacje o zdjęciu - przeniesione pod treść artykułu */}
            {(article?.meta?.zrudlo || article?.meta?.zrodlo || article?.meta?.foto) && (
              <View style={styles.sourceContainer}>
                {article?.meta?.foto && (
                  <Text style={[styles.sourceText, { color: theme.colors.textSecondary, fontFamily: theme.fontFamily.regular }]}>
                    fot. {article.meta.foto.replace(/^fot\.\s*/i, '')}
                  </Text>
                )}
                {(article?.meta?.zrudlo || article?.meta?.zrodlo) && (
                  <Text style={[styles.sourceText, { color: theme.colors.textSecondary, fontFamily: theme.fontFamily.regular }]}>
                    źródło: {article.meta.zrudlo || article.meta.zrodlo}
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* --- AD: BOTTOM - zaraz po treści artykułu --- */}
          <AdBanner position="article_bottom" style={{ marginHorizontal: 20, marginVertical: 20 }} />



          {/* Galeria - Przywrócona */}
          {(galleryImages.length > 0 || galleryLoading) && (
            <View style={[
              styles.galleryContainer,
              {
                backgroundColor: theme.colors.card,
                borderRadius: 16,
                paddingVertical: 16,
                paddingHorizontal: 16,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 8,
                elevation: 2,
              }
            ]}>
              <Text style={[styles.galleryTitle, { color: theme.colors.text, fontFamily: theme.fontFamily.bold }]}>
                Galeria
              </Text>

              {galleryLoading ? (
                <View style={styles.galleryLoadingContainer}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                  <Text style={[styles.galleryLoadingText, { color: theme.colors.textSecondary, fontFamily: theme.fontFamily.medium, marginTop: 10 }]}>
                    Ładowanie zdjęć...
                  </Text>
                </View>
              ) : (
                <View style={styles.galleryContent}>
                  {(() => {
                    const rows = [];
                    for (let i = 0; i < galleryImages.length; i += 2) {
                      rows.push(
                        <View key={`row_${i}`} style={styles.galleryRow}>
                          {renderGalleryItem({ item: galleryImages[i], index: i })}
                          {i + 1 < galleryImages.length ?
                            renderGalleryItem({ item: galleryImages[i + 1], index: i + 1 }) :
                            <View style={{ width: (width - 52) / 2 }} />
                          }
                        </View>
                      );
                    }
                    return rows;
                  })()}
                </View>
              )}

              {/* Flickr link */}
              {!galleryLoading && flickrUrl && (
                <TouchableOpacity
                  style={[styles.flickrButton, { backgroundColor: theme.colors.primary }]}
                  onPress={() => Linking.openURL(flickrUrl)}
                >
                  <Text style={[styles.flickrButtonText, { fontFamily: theme.fontFamily.medium }]}>Zobacz więcej zdjęć</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Mini-player usunięty z wnętrza ScrollView */}

          {/* Baner wsparcia – pełna grafika klikalna */}
          <View style={styles.supportHeroImageWrapper}>
            <TouchableOpacity
              onPress={() => useSupportStore.getState().show()}
              activeOpacity={0.9}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Otwórz formularz wsparcia Fundacji Twoje Wspomnienia"
            >
              <ExpoImage
                source={{ uri: 'https://kaszuby24.pl/wp-content/uploads/2025/08/Bez-nazwy-1-03-scaled.png' }}
                style={styles.supportHeroImage}
                contentFit="cover"
                priority="high"
                placeholder="Wesprzyj Kaszuby24"
                onError={() => {
                  // Fallback do tekstu jeśli grafika się nie załaduje
                  console.warn('Support banner image failed to load');
                }}
              />
            </TouchableOpacity>
          </View>

          {/* Ankieta i komentarze FB */}
          {article && (
            <>
              <ArticlePollWidget postId={article.id} />
              <ArticleFbComments postId={article.id} />
            </>
          )}

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
              <View style={styles.relatedList}>
                {relatedArticles.map((item, index) => (
                  <React.Fragment key={`related_${item.id}`}>
                    {renderRelatedArticle({ item, index })}
                  </React.Fragment>
                ))}
                {hasMoreRelated && (
                  <TouchableOpacity
                    style={styles.loadMoreButton}
                    onPress={loadMoreRelatedArticles}
                    disabled={loadingMoreRelated}
                  >
                    {loadingMoreRelated ? (
                      <ActivityIndicator size="small" color={theme.colors.primary} />
                    ) : (
                      <Text style={[styles.loadMoreText, { color: theme.colors.primary }]}>Pokaż więcej</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
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

      {/* Pasek postępu czytania - ukryty gdy player jest aktywny */}
      {showReadingProgress && !tts.isVisible && (
        <ReadingProgressBar
          progress={readingProgress}
          currentPosition={0}
          totalHeight={0}
        />
      )}

      {/* Mini-player TTS – POD TAB BAREM Z BIAŁYM TŁEM */}
      {tts.isVisible && (
        <View style={[styles.articleTtsPlayerContainer, {
          zIndex: 1,
          elevation: 1
        }]}>
          <AudioPlayerBar
            isPlaying={tts.status === 'playing'}
            isLoading={tts.status === 'loading'}
            duration={Math.max(1, tts.totalSecEst)}
            position={Math.min(tts.elapsedSec, tts.totalSecEst)}
            title={tts.title}
            label={tts.categoryLabel}
            onPlayPause={() => {
              if (tts.status === 'playing') tts.pause();
              else if (tts.status === 'paused') tts.resume();
            }}
            onStop={() => tts.stop()}
          />
        </View>
      )}

      {/* Global TabBar – na końcu drzewa, ale z niższym zIndex niż player */}
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

      {/* Lightbox dla zdjęć w treści artykułu */}
      <Modal
        visible={!!contentLightboxUri}
        transparent
        animationType="fade"
        onRequestClose={() => setContentLightboxUri(null)}
        statusBarTranslucent
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.93)', justifyContent: 'center', alignItems: 'center' }}
          activeOpacity={1}
          onPress={() => setContentLightboxUri(null)}
        >
          {contentLightboxUri && (
            <ExpoImage
              source={{ uri: contentLightboxUri }}
              style={{ width: Dimensions.get('window').width, height: Dimensions.get('window').height * 0.75 }}
              contentFit="contain"
              allowDownscaling={true}
              cachePolicy="memory"
            />
          )}
          <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, marginTop: 14 }}>Dotknij, aby zamknąć</Text>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
// Forced Rebuild 01

const getHtmlViewStyles = (theme: any) => ({
  // Główny styl dla całej treści
  body: {
    fontFamily: 'Poppins_Regular' as any,
    fontSize: 15 as any,
    lineHeight: 22 as any,
    color: theme.colors.text as any,
    backgroundColor: 'transparent' as any,
    textAlign: 'left' as any,
  },
  ttsButton: {
    alignSelf: 'flex-start' as const,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    marginBottom: 12,
  },
  ttsButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  // Paragrafy - mniejsze odstępy
  p: {
    fontFamily: 'Poppins_Regular' as any,
    fontSize: 15 as any,
    lineHeight: 22 as any,
    color: theme.colors.text as any,
    marginBottom: 8,
    marginTop: 0,
  },
  // Nagłówki - mniejsze odstępy
  h2: {
    fontFamily: 'Poppins_SemiBold' as any,
    fontSize: 19 as any,
    lineHeight: 26 as any,
    marginTop: 12,
    marginBottom: 6,
    color: theme.colors.text as any,
  },
  h3: {
    fontFamily: 'Poppins_SemiBold' as any,
    fontSize: 17 as any,
    lineHeight: 24 as any,
    marginTop: 10,
    marginBottom: 5,
    color: theme.colors.text as any,
  },
  h4: {
    fontFamily: 'Poppins_SemiBold' as any,
    fontSize: 16 as any,
    lineHeight: 22 as any,
    marginTop: 8,
    marginBottom: 4,
    color: theme.colors.text as any,
  },
  // Listy - mniejsze odstępy
  ul: {
    paddingLeft: 16,
    marginBottom: 8,
    marginTop: 0,
  },
  ol: {
    paddingLeft: 16,
    marginBottom: 8,
    marginTop: 0,
  },
  li: {
    fontFamily: 'Poppins_Regular' as any,
    fontSize: 15 as any,
    lineHeight: 22 as any,
    color: theme.colors.text as any,
    marginBottom: 4,
  },
  // Linki - kolor aplikacji
  a: {
    color: '#224A96' as any,
    textDecorationLine: 'underline' as any,
    fontFamily: 'Poppins_Regular' as any,
  },
  // Obrazy - mniejsze marginesy
  img: {
    borderRadius: 8,
    marginVertical: 6,
    maxWidth: '100%' as any,
  },
  figure: {
    marginVertical: 6,
  },
  figcaption: {
    color: theme.colors.textSecondary as any,
    fontSize: 11 as any, // Zmniejszone z 12 na 11
    textAlign: 'center' as any,
    marginTop: 2,
    fontFamily: 'Poppins_Regular' as any,
  },
  // Blockquote - kompaktowy
  blockquote: {
    marginVertical: 0,
    borderLeftWidth: 3,
    borderLeftColor: '#224A96' as any,
    paddingLeft: 16,
    paddingRight: 12,
    paddingVertical: 12,
    marginBottom: 12,
    marginTop: 12,
    backgroundColor: (theme.colors.card + '10') as any,
    borderRadius: 6,
  },
  // Pogrubienia
  strong: {
    fontFamily: 'Poppins_Bold' as any,
  },
  b: {
    fontFamily: 'Poppins_Bold' as any,
  },
  // Kursywy
  em: {
    fontStyle: 'italic' as any,
    fontFamily: 'Poppins_Regular' as any,
  },
  i: {
    fontStyle: 'italic' as any,
    fontFamily: 'Poppins_Regular' as any,
  },
  // Tabele
  table: {
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#ddd' as any,
    borderRadius: 6,
    overflow: 'hidden' as any, // Dodane dla lepszego wyglądu
  },
  th: {
    fontFamily: 'Poppins_SemiBold' as any,
    fontSize: 13 as any, // Zmniejszone z 14 na 13
    padding: 8,
    backgroundColor: (theme.colors.card + '10') as any,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border as any,
    textAlign: 'left' as any,
  },
  td: {
    fontFamily: 'Poppins_Regular' as any,
    fontSize: 13 as any, // Zmniejszone z 14 na 13
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border as any,
    textAlign: 'left' as any,
    color: theme.colors.text as any,
  },
  // Iframe - dla YouTube, map, etc.
  iframe: {
    width: '100%' as any,
    height: 200 as any, // Domyślna wysokość
    borderRadius: 8,
    marginVertical: 8,
    backgroundColor: (theme.colors.card + '10') as any,
  },
  // Div - dla kontenerów
  div: {
    marginVertical: 0,
    color: theme.colors.text as any,
  },
  // Span - dla inline elementów
  span: {
    fontFamily: 'Poppins_Regular' as any,
    color: theme.colors.text as any,
  },
  // Code - dla kodu
  code: {
    fontFamily: 'monospace' as any,
    fontSize: 13 as any,
    backgroundColor: (theme.colors.card + '10') as any,
    padding: 4,
    borderRadius: 4,
  },
  // Pre - dla bloków kodu
  pre: {
    fontFamily: 'monospace' as any,
    fontSize: 13 as any,
    backgroundColor: (theme.colors.card + '10') as any,
    padding: 12,
    borderRadius: 6,
    marginVertical: 8,
    overflow: 'scroll' as any,
  },
});

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
    paddingBottom: 120, // Increased for GlobalTabBar
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
    marginTop: Platform.OS === 'android' ? 8 : 35,
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
    bottom: 60, // Przywrócone do poprzedniej pozycji
    right: 20,
    backgroundColor: 'rgba(254, 204, 0, 0.9)', // Żółte tło zamiast czarnego
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)', // Jaśniejsza ramka
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, // Lżejszy cień
    shadowOpacity: 0.2, // Mniejsza nieprzezroczystość cienia
    shadowRadius: 3, // Mniejszy radius cienia
    elevation: 2, // Mniejsza wysokość na Android
    zIndex: 10, // Dodany z-index żeby był nad gradientem
    alignSelf: 'flex-end', // Automatycznie dopasowuje szerokość do zawartości
    maxWidth: '80%', // Maksymalna szerokość żeby nie było za szeroko
  },
  photoCreditText: {
    color: '#1a1a1a', // Ciemny tekst na żółtym tle
    fontSize: 13,
    fontFamily: 'Poppins_Medium',
    fontWeight: '600', // Nieco grubszy font dla lepszej czytelności
    letterSpacing: 0.2,
    textAlign: 'right', // Wyrównanie do prawej strony
    flexShrink: 1, // Pozwala na zawijanie tekstu
    flexWrap: 'wrap', // Zawijanie tekstu jeśli jest za długi
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
    flexDirection: 'row',
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
  // Uwaga: style wideo zostały zdefiniowane niżej jako część globalnych stylów
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
    marginTop: 16, // Dodane 16px odstępu od treści
    marginBottom: 8, // Dodane 8px odstępu do galerii
    paddingHorizontal: 0, // Usunięte - marginesy są już w contentContainer
    alignItems: 'flex-start', // Wyrównanie do lewej strony
  },
  sourceText: {
    fontSize: 13, // Zmniejszone z 16 na 13
    fontStyle: 'italic',
    lineHeight: 18, // Dodane line-height
    marginBottom: 4, // Dodane odstępy między elementami
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
    fontWeight: Platform.OS === 'android' ? 'normal' : '700',
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
    marginBottom: 24, // Zwiększone z 8 na 24
    marginTop: 8, // Dodane 8px od góry
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
  blockquoteContainer: {
    borderLeftWidth: 4,
    borderLeftColor: '#224A96',
    paddingLeft: 20,
    paddingRight: 16,
    paddingVertical: 16,
    marginBottom: 20,
    marginTop: 20,
    backgroundColor: 'rgba(34, 74, 150, 0.04)',
    borderRadius: 8,
  },
  footnotesContainer: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  footnotesTitle: {
    fontSize: 16,
    marginBottom: 8,
  },
  // Nowe style dla sekcji wsparcia - ulepszone
  supportSection: {
    marginTop: 32,
    marginBottom: 32,
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(254, 204, 0, 0.2)',
    position: 'relative',
    overflow: 'hidden',
  },
  supportGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
  },
  supportContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  supportLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: 16,
  },
  supportIconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 80,
    marginTop: -10,
  },
  coffeeIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'visible',
    backgroundColor: 'rgba(254, 204, 0, 0.1)',
    position: 'relative',
  },
  coffeeImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    position: 'relative',
    zIndex: 2,
  },
  coffeeGlow: {
    position: 'absolute',
    top: -15,
    left: -15,
    right: -15,
    bottom: -15,
    borderRadius: 50,
    backgroundColor: 'rgba(254, 204, 0, 0.4)',
    zIndex: 1,
  },
  coffeeSteam: {
    position: 'absolute',
    top: -8,
    left: 20,
    flexDirection: 'row',
    gap: 2,
  },
  steamLine: {
    width: 2,
    height: 8,
    borderRadius: 1,
    opacity: 0.6,
  },
  relatedFooterText: {
    fontSize: 14,
    fontFamily: 'Poppins_Regular',
    marginLeft: 8,
  },
  loadMoreButton: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(34, 74, 150, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(34, 74, 150, 0.1)',
  },
  loadMoreText: {
    fontSize: 15,
    fontFamily: 'Poppins_Medium',
    fontWeight: '600',
  },
  supportTextContainer: {
    flex: 1,
    marginRight: 16,
    paddingTop: 8,
  },
  supportTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  supportSubtitle: {
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.7,
    letterSpacing: -0.1,
    marginBottom: 4,
  },
  supportNoAds: {
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.6,
    marginTop: 8,
    letterSpacing: -0.1,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  supportButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  // Uwaga: style galerii i źródeł istnieją wyżej w obiekcie; duplikaty usunięte
  cupsWrapper: {
    position: 'absolute',
    top: -50, // Wystaje ponad kartę
    left: -50,
    right: -50,
    bottom: -50,
    zIndex: -1, // Umieść za kartą
  },
  cupsImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20, // Zaokrąglenie kartki
  },
  supportText: {
    flex: 1,
    marginRight: 16,
  },
  supportBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  badge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  badgePrimary: {
    backgroundColor: '#224996',
    borderColor: '#224996',
  },
  badgeNeutral: {
    backgroundColor: '#E0E0E0',
    borderColor: '#E0E0E0',
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Nowe style dla sekcji wsparcia - nowy layout
  supportCard: {
    marginTop: 32,
    marginBottom: 32,
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(254, 204, 0, 0.2)',
    position: 'relative',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  supportBadgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  supportBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  supportContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  supportLeftCol: {
    flex: 1,
  },
  supportHeadline: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  supportSubline: {
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.7,
    letterSpacing: -0.1,
    marginBottom: 4,
  },
  supportActions: {
    flexDirection: 'row',
    gap: 12,
  },
  supportCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  supportCTAtext: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  supportCTASecondary: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  supportCTASecondaryText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  supportCups: {
    width: 120,
    height: 120,
    borderRadius: 20,
    position: 'relative',
    zIndex: 1,
  },
  supportHeroImageWrapper: {
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 32,
    borderRadius: 24,
    overflow: 'hidden',
  },
  supportHeroImage: {
    width: '100%',
    height: undefined,
    aspectRatio: 768 / 865, // proporcje dostarczonej grafiki
  },
  // Style dla dodatkowego przycisku share
  articleShareContainer: {
    marginTop: 24,
    marginBottom: 16,
    alignItems: 'center',
  },
  articleShareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    gap: 8,
  },
  articleShareText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  iframeContainer: {
    marginVertical: 16,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
  },

  articleTtsPlayerContainer: {
    position: 'absolute',
    bottom: 100, // Pozycja nad tab barem - podniesione o 10px
    left: 0,
    right: 0,
    backgroundColor: '#ffffff', // Białe tło
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    zIndex: 10, // Niski z-index żeby tab bar mógł go przykryć
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  ttsTooltip: {
    position: 'absolute',
    top: 110, // Pozycja jeszcze niżej (było 90)
    right: 80, // Przesunięte bardziej w lewo, żeby ogonek wskazywał na ikonę głośnika
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    minWidth: 140, // Minimalna szerokość dla lepszego wyglądu
  },
  ttsTooltipText: {
    color: '#333333',
    fontSize: 12,
    fontFamily: 'Poppins_Medium',
    textAlign: 'center',
  },
  tooltipArrow: {
    position: 'absolute',
    top: -6,
    right: 10,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  relatedFooterLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
  }
});
