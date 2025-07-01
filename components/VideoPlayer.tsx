import React from 'react';
import { StyleSheet, View, Text, Dimensions, Platform, TouchableOpacity, Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import { Play } from 'lucide-react-native';
import { extractYouTubeId, extractVimeoId } from '@/utils/htmlParser';
import { useThemeStore } from '@/store/themeStore';

interface VideoPlayerProps {
  url: string;
  title?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ url, title = 'Video' }) => {
  const { theme } = useThemeStore();
  
  // Extract video IDs
  const youtubeId = extractYouTubeId(url);
  const vimeoId = extractVimeoId(url);
  
  // Determine which platform the video is from
  let embedUrl = '';
  let videoTitle = title;
  
  if (youtubeId) {
    embedUrl = `https://www.youtube.com/embed/${youtubeId}?playsinline=1&modestbranding=1&rel=0&autoplay=0`;
    videoTitle = title || 'YouTube Video';
  } else if (vimeoId) {
    embedUrl = `https://player.vimeo.com/video/${vimeoId}?title=0&byline=0&portrait=0&autoplay=0`;
    videoTitle = title || 'Vimeo Video';
  } else {
    // If we can't determine the platform, show a fallback
    return (
      <View style={[styles.fallbackContainer, { backgroundColor: theme.colors.subtle }]}>
        <TouchableOpacity 
          style={styles.fallbackButton}
          onPress={() => Linking.openURL(url)}
        >
          <Play size={32} color={theme.colors.primary} />
          <Text style={[styles.fallbackText, { color: theme.colors.text, fontFamily: theme.fontFamily.medium }]}>
            Otwórz video w przeglądarce
          </Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  // For web platform, we'll use an iframe directly
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <iframe
          src={embedUrl}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: '12px',
          }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={videoTitle}
        />
      </View>
    );
  }
  
  // For mobile platforms, use WebView with improved iframe support
  try {
    return (
      <View style={styles.container}>
        <WebView
          source={{ 
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                  body { margin: 0; padding: 0; background: #000; }
                  iframe { 
                    width: 100%; 
                    height: 100%; 
                    border: none; 
                    border-radius: 12px;
                  }
                </style>
              </head>
              <body>
                <iframe 
                  src="${embedUrl}" 
                  frameborder="0" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowfullscreen>
                </iframe>
              </body>
              </html>
            `
          }}
          style={styles.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowsFullscreenVideo={true}
          mediaPlaybackRequiresUserAction={false}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.warn('VideoPlayer WebView error: ', nativeEvent);
          }}
          onHttpError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.warn('VideoPlayer WebView HTTP error: ', nativeEvent);
          }}
          renderError={() => (
            <View style={[styles.fallbackContainer, { backgroundColor: theme.colors.subtle }]}>
              <TouchableOpacity 
                style={styles.fallbackButton}
                onPress={() => Linking.openURL(url)}
              >
                <Play size={32} color={theme.colors.primary} />
                <Text style={[styles.fallbackText, { color: theme.colors.text, fontFamily: theme.fontFamily.medium }]}>
                  Otwórz video w przeglądarce
                </Text>
              </TouchableOpacity>
            </View>
          )}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={[styles.loadingContainer, { backgroundColor: theme.colors.subtle }]}>
              <Text style={[styles.loadingText, { color: theme.colors.textSecondary, fontFamily: theme.fontFamily.regular }]}>
                Ładowanie video...
              </Text>
            </View>
          )}
          androidLayerType="hardware"
          mixedContentMode="compatibility"
          cacheEnabled={true}
        />
      </View>
    );
  } catch (error) {
    // Fallback if WebView is not available
    console.warn('WebView not available, showing fallback:', error);
    return (
      <View style={[styles.fallbackContainer, { backgroundColor: theme.colors.subtle }]}>
        <TouchableOpacity 
          style={styles.fallbackButton}
          onPress={() => Linking.openURL(url)}
        >
          <Play size={32} color={theme.colors.primary} />
          <Text style={[styles.fallbackText, { color: theme.colors.text, fontFamily: theme.fontFamily.medium }]}>
            Otwórz video w przeglądarce
          </Text>
        </TouchableOpacity>
      </View>
    );
  }
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: (width - 48) * 0.5625, // 16:9 aspect ratio
    marginVertical: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  webview: {
    flex: 1,
  },
  fallbackContainer: {
    width: '100%',
    height: (width - 48) * 0.5625,
    marginVertical: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  fallbackText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  fallbackSubtext: {
    marginTop: 4,
    fontSize: 14,
    textAlign: 'center',
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
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default VideoPlayer;