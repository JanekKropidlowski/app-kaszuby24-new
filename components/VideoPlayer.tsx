import React, { useState, useRef, useEffect } from 'react';
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

const VideoPlayer: React.FC<VideoPlayerProps> = ({ url, title, autoPlay = false }) => {
  const { theme, isDarkMode } = useThemeStore();
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [error, setError] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const webViewRef = useRef<WebView>(null);

  // Extract YouTube video ID
  const getYouTubeVideoId = (url: string): string | null => {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
  };

  // Get YouTube thumbnail URL
  useEffect(() => {
    const videoId = getYouTubeVideoId(url);
    if (videoId) {
      setThumbnailUrl(`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`);
    }
  }, [url]);

  // Create YouTube embed HTML
  const getYouTubeEmbedHtml = (videoId: string | null): string => {
    if (!videoId) return '';
    
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
            src="https://www.youtube.com/embed/${videoId}?rel=0&autoplay=${autoPlay ? 1 : 0}&playsinline=1"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
          ></iframe>
        </div>
      </body>
      </html>
    `;
  };

  const handlePlay = () => {
    setIsPlaying(true);
  };

  const handleOpenExternal = () => {
    Linking.openURL(url).catch(err => {
      console.error('Failed to open URL:', err);
      setError(true);
    });
  };

  // Check if it's a YouTube URL
  const isYouTubeUrl = url.includes('youtube.com') || url.includes('youtu.be');
  const youtubeVideoId = getYouTubeVideoId(url);

  // For web platform, we'll use a different approach
  if (Platform.OS === 'web') {
    if (isYouTubeUrl && youtubeVideoId) {
      return (
        <View style={styles.container}>
          {title && (
            <Text style={[styles.title, { color: theme.colors.text, fontFamily: theme.fontFamily.semibold }]}>
              {title}
            </Text>
          )}
          <div 
            style={{
              position: 'relative',
              width: '100%',
              paddingBottom: '56.25%', // 16:9 aspect ratio
              borderRadius: '16px',
              overflow: 'hidden',
              marginBottom: '16px',
            }}
          >
            <iframe
              src={`https://www.youtube.com/embed/${youtubeVideoId}?rel=0&playsinline=1`}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                border: 'none',
                borderRadius: '16px',
              }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={title || "YouTube video"}
            />
          </div>
        </View>
      );
    } else {
      // For non-YouTube videos on web, show a link
      return (
        <View style={styles.container}>
          {title && (
            <Text style={[styles.title, { color: theme.colors.text, fontFamily: theme.fontFamily.semibold }]}>
              {title}
            </Text>
          )}
          <TouchableOpacity
            style={[styles.linkButton, { backgroundColor: theme.colors.primary }]}
            onPress={handleOpenExternal}
          >
            <ExternalLink size={20} color="#FFFFFF" />
            <Text style={[styles.linkButtonText, { fontFamily: theme.fontFamily.semibold }]}>
              Otwórz wideo w przeglądarce
            </Text>
          </TouchableOpacity>
        </View>
      );
    }
  }

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
              source={{ html: getYouTubeEmbedHtml(youtubeVideoId) }}
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
    // For non-YouTube videos, show a link button
    return (
      <View style={styles.container}>
        {title && (
          <Text style={[styles.title, { color: theme.colors.text, fontFamily: theme.fontFamily.semibold }]}>
            {title}
          </Text>
        )}
        <TouchableOpacity
          style={[styles.linkButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleOpenExternal}
        >
          <ExternalLink size={20} color="#FFFFFF" />
          <Text style={[styles.linkButtonText, { fontFamily: theme.fontFamily.semibold }]}>
            Otwórz wideo w przeglądarce
          </Text>
        </TouchableOpacity>
      </View>
    );
  }
};

const styles = StyleSheet.create({
  container: {
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