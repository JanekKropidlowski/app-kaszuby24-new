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
  FlatList
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { WebView } from 'react-native-webview';
import { Bookmark, Share2, RefreshCw, ArrowLeft, Clock, Calendar, Eye, X, ChevronLeft, ChevronRight, Menu, ExternalLink } from 'lucide-react-native';
import { fetchArticleById, fetchMediaByIds, fetchRelatedArticles } from '@/services/api';
import { Article, MediaItem } from '@/types/article';
import LoadingIndicator from '@/components/LoadingIndicator';
import EmptyState from '@/components/EmptyState';
import VideoPlayer from '@/components/VideoPlayer';
import { ArticleCard } from '@/components/ArticleCard';
import { useArticlesStore } from '@/store/articlesStore';
import { formatDateTime } from '@/utils/dateFormatter';
import { cleanHtml, extractVideoUrls } from '@/utils/htmlParser';
import { useThemeStore } from '@/store/themeStore';
import { isSponsoredContent } from '@/utils/contentFilter';

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
  const [webViewError, setWebViewError] = useState(false);
  const [galleryImages, setGalleryImages] = useState<MediaItem[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [contentLoaded, setContentLoaded] = useState(false);
  
  const articleId = parseInt(id as string, 10);
  const isSaved = isArticleSaved(articleId);
  
  // Handle Android back button
  useEffect(() => {
    if (Platform.OS === 'android') {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        if (selectedImageIndex !== null) {
          setSelectedImageIndex(null);
          return true;
        }
        if (showMenu) {
          setShowMenu(false);
          return true;
        }
        router.back();
        return true;
      });
      
      return () => backHandler.remove();
    }
  }, [router, selectedImageIndex, showMenu]);
  
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
        
        // Add to recent articles (filtering is handled in the store)
        addRecentArticle(data);
        
        // Load related articles
        loadRelatedArticles(data);
        
        // Load gallery images with delay for better performance
        if (data.meta?.galeria && data.meta.galeria.length > 0) {
          setTimeout(() => {
            loadGalleryImages(data.meta.galeria);
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
      const related = await fetchRelatedArticles(currentArticle.id, currentArticle.categories);
      setRelatedArticles(related);
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
  
  const handleOpenInBrowser = () => {
    if (article) {
      Linking.openURL(article.link);
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
        
        // Load gallery images if available
        if (data.meta?.galeria && data.meta.galeria.length > 0) {
          setTimeout(() => {
            loadGalleryImages(data.meta.galeria);
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
  
  // Render related articles
  const renderRelatedArticles = () => {
    if (!contentLoaded || relatedArticles.length === 0) return null;
    
    return (
      <View style={styles.relatedContainer}>
        <Text style={[
          styles.relatedTitle, 
          { 
            color: theme.colors.text,
            fontFamily: Platform.OS === 'android' ? undefined : theme.fontFamily.semibold
          }
        ]}>
          Powiązane artykuły
        </Text>
        
        {relatedLoading ? (
          <LoadingIndicator size="small" />
        ) : (
          <View style={styles.relatedList}>
            {relatedArticles.map((relatedArticle) => (
              <ArticleCard
                key={relatedArticle.id}
                article={relatedArticle}
                compact={true}
              />
            ))}
          </View>
        )}
      </View>
    );
  };
  
  // Render floating menu
  const renderFloatingMenu = () => {
    if (!showMenu) return null;
    
    return (
      <Modal
        visible={showMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity 
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={[styles.menuContainer, { backgroundColor: theme.colors.card }]}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                handleShare();
              }}
            >
              <Share2 size={20} color={theme.colors.text} />
              <Text style={[styles.menuText, { color: theme.colors.text }]}>Udostępnij</Text>
            </TouchableOpacity>
            
            {!isSponsoredContent(article) && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowMenu(false);
                  toggleSave();
                }}
              >
                <Bookmark 
                  size={20} 
                  color={isSaved ? theme.colors.primary : theme.colors.text}
                  fill={isSaved ? theme.colors.primary : 'transparent'} 
                />
                <Text style={[styles.menuText, { color: theme.colors.text }]}>
                  {isSaved ? 'Usuń z zapisanych' : 'Zapisz artykuł'}
                </Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                handleOpenInBrowser();
              }}
            >
              <ExternalLink size={20} color={theme.colors.text} />
              <Text style={[styles.menuText, { color: theme.colors.text }]}>Otwórz w przeglądarce</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
      
      {/* Floating menu button */}
      <TouchableOpacity 
        style={styles.floatingMenuButton} 
        onPress={() => setShowMenu(true)}
        activeOpacity={0.8}
      >
        <Menu size={20} color="#FFFFFF" />
      </TouchableOpacity>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={Platform.OS === 'android'}
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
              <View style={styles.categoryBadge}>
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
            
            {metaViews && (
              <View style={styles.metaItem}>
                <Eye size={14} color={theme.colors.textSecondary} />
                <Text style={[
                  styles.metaText, 
                  { 
                    color: theme.colors.textSecondary,
                    fontFamily: Platform.OS === 'android' ? undefined : theme.fontFamily.regular
                  }
                ]}>
                  {metaViews}
                </Text>
              </View>
            )}
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
          
          {/* Gallery (moved below content) */}
          {renderGallery()}
          
          {/* Related articles */}
          {renderRelatedArticles()}
        </View>
      </ScrollView>
      
      {/* Floating menu */}
      {renderFloatingMenu()}
      
      {/* Image modal */}
      {renderImageModal()}
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
      android: 320, // Reduced height for Android
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
      android: 45, // Adjusted for Android status bar
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
  floatingMenuButton: {
    position: 'absolute',
    top: Platform.select({
      ios: 50,
      android: 45,
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
    fontSize: Platform.OS === 'android' ? 20 : 22, // Smaller font for Android
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
    gap: 8,
  },
  galleryImageContainer: {
    width: (width - 64) / 2, // 2 columns with padding and gap
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
  relatedTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  relatedList: {
    gap: 12,
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
  // Menu styles
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    borderRadius: 16,
    padding: 8,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  menuText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
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