import React, { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  Platform, 
  Dimensions,
  Linking
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Play, ExternalLink } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useThemeStore } from '@/store/themeStore';

interface VideoPlayerProps {
  url: string;
  title?: string;
  autoPlay?: boolean;
}

const { width } = Dimensions.get('window');

const VideoPlayer: React.FC<VideoPlayerProps> = memo(({ url, title, autoPlay = false }) => {
  const { theme, isDarkMode } = useThemeStore();
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [error, setError] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const webViewRef = useRef<WebView>(null);

  // Memoized YouTube video ID extraction
  const youtubeVideoId = useMemo(() => {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
  }, [url]);

  // Memoized thumbnail URL
  useEffect(() => {
    if (youtubeVideoId) {
      setThumbnailUrl(`https://img.youtube.com/vi/${youtubeVideoId}/maxresdefault.jpg`);
    }
  }, [youtubeVideoId]);

  // Memoized YouTube embed HTML
  const youtubeEmbedHtml = useMemo(() => {
    if (!youtubeVideoId) return '';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          body, html {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            background-color: ${isDarkMode ? '#1E293B' : '#F8FAFC'};
          }
          .container {
            position: relative;
            width: 100%;
            height: 0;
            padding-bottom: 56.25%;
            overflow: hidden;
            border-radius: 16px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
          }
          iframe {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border: none;
            border-radius: 16px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <iframe
            src="https://www.youtube.com/embed/${youtubeVideoId}?rel=0&autoplay=${autoPlay ? 1 : 0}&playsinline=1&modestbranding=1&color=white"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
          ></iframe>
        </div>
      </body>
      </html>
    `;
  }, [youtubeVideoId, autoPlay, isDarkMode]);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const handleOpenExternal = useCallback(() => {
    Linking.openURL(url).catch(err => {
      console.error('Failed to open URL:', err);
      setError(true);
    });
  }, [url]);

  // Check if it's a YouTube URL
  const isYouTubeUrl = url.includes('youtube.com') || url.includes('youtu.be');



  // For mobile platforms
  if (isYouTubeUrl && youtubeVideoId) {
    if (!isPlaying) {
      return (
        <View style={styles.container}>
          {title && (
            <Text style={[styles.title, { color: theme.colors.text, fontFamily: theme.fontFamily.semibold }]}>
              {title}
            </Text>
          )}
          <TouchableOpacity 
            style={styles.thumbnailContainer}
            onPress={handlePlay}
            activeOpacity={0.9}
          >
            {thumbnailUrl ? (
              <Image
                source={{ uri: thumbnailUrl }}
                style={styles.thumbnail}
                contentFit="cover"
                transition={200}
                cachePolicy="memory-disk"
                priority="normal"
              />
            ) : (
              <View style={[styles.placeholderThumbnail, { backgroundColor: theme.colors.subtle }]} />
            )}
            <View style={styles.playButtonContainer}>
              <View style={styles.playButton}>
                <Play size={24} color="#FFFFFF" fill="#FFFFFF" />
              </View>
            </View>
          </TouchableOpacity>
        </View>
      );
    } else {
      return (
        <View style={styles.container}>
          {title && (
            <Text style={[styles.title, { color: theme.colors.text, fontFamily: theme.fontFamily.semibold }]}>
              {title}
            </Text>
          )}
          <View style={styles.webViewContainer}>
            <WebView
              ref={webViewRef}
              source={{ html: youtubeEmbedHtml }}
              style={styles.webView}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              allowsFullscreenVideo={true}
              mediaPlaybackRequiresUserAction={false}
              onError={() => setError(true)}
              startInLoadingState={true}
              renderLoading={() => (
                <View style={[styles.loadingContainer, { backgroundColor: theme.colors.subtle }]} />
              )}
            />
          </View>
        </View>
      );
    }
  } else {
    // For non-YouTube videos, embed as iframe instead of showing a link button
    return (
      <View style={styles.container}>
        {title && (
          <Text style={[styles.title, { color: theme.colors.text, fontFamily: theme.fontFamily.semibold }]}>
            {title}
          </Text>
        )}
        <View style={styles.webViewContainer}>
          <WebView
            ref={webViewRef}
            source={{ uri: url }}
            style={styles.webView}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            allowsFullscreenVideo={true}
            mediaPlaybackRequiresUserAction={true}
            onError={() => setError(true)}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={[styles.loadingContainer, { backgroundColor: theme.colors.subtle }]} />
            )}
          />
        </View>
      </View>
    );
  }
}, (prevProps, nextProps) => {
  return (
    prevProps.url === nextProps.url &&
    prevProps.title === nextProps.title &&
    prevProps.autoPlay === nextProps.autoPlay
  );
});

VideoPlayer.displayName = 'VideoPlayer';

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    marginBottom: 16,
    width: '100%',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  thumbnailContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  placeholderThumbnail: {
    width: '100%',
    height: '100%',
  },
  playButtonContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  playButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 4, // Adjust for play icon
  },
  webViewContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  webView: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginVertical: 8,
  },
  linkButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default VideoPlayer;