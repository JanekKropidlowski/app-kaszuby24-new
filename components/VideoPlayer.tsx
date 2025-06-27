import React from 'react';
import { StyleSheet, View, Text, Dimensions, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { extractYouTubeId, extractVimeoId } from '@/utils/htmlParser';
import { useThemeStore } from '@/store/themeStore';

interface VideoPlayerProps {
  url: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ url }) => {
  const { theme } = useThemeStore();
  
  // Extract video IDs
  const youtubeId = extractYouTubeId(url);
  const vimeoId = extractVimeoId(url);
  
  // Determine which platform the video is from
  let embedUrl = '';
  
  if (youtubeId) {
    embedUrl = `https://www.youtube.com/embed/${youtubeId}?playsinline=1&modestbranding=1&rel=0`;
  } else if (vimeoId) {
    embedUrl = `https://player.vimeo.com/video/${vimeoId}?title=0&byline=0&portrait=0`;
  } else {
    // If we can't determine the platform, just use the URL as is
    embedUrl = url;
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
          }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </View>
    );
  }
  
  // For mobile platforms, use WebView
  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: embedUrl }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsFullscreenVideo={true}
        mediaPlaybackRequiresUserAction={false}
      />
    </View>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    width: width - 32, // Full width minus padding
    height: (width - 32) * 0.5625, // 16:9 aspect ratio
    marginVertical: 16,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  webview: {
    flex: 1,
  },
});

export default VideoPlayer;