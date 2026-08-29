import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, ActivityIndicator, Platform } from 'react-native';
import { Pause, Play, X, Volume2 } from 'lucide-react-native';

interface AudioPlayerBarProps {
  isPlaying: boolean;
  duration: number; // w sekundach
  position: number; // w sekundach
  onPlayPause: () => void;
  onStop?: () => void;
  isLoading?: boolean; // czy trwa generowanie głosu
  title?: string;
  label?: string; // np. "Czytanie"
}

const YELLOW = '#fecc00'; // żółty Kaszub
const WHITE = '#fff';
const BLACK = '#1a1a1a';
const GRAY = '#666666';

function formatTime(sec: number) {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, '0');
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, '0');
  return `${m}:${s}`;
}

export const AudioPlayerBar = ({ isPlaying, duration, position, onPlayPause, onStop, isLoading, title, label = 'Czytanie' }: AudioPlayerBarProps) => {
  // Animacja pojawiania się
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Główny przycisk play/pause */}
      <TouchableOpacity 
        onPress={onPlayPause} 
        style={styles.playButton} 
        activeOpacity={0.8} 
        accessibilityLabel={isPlaying ? 'Pauza' : 'Odtwórz'}
      >
        {isLoading ? (
          <ActivityIndicator size={24} color={WHITE} />
        ) : isPlaying ? (
          <Pause size={24} color={WHITE} />
        ) : (
          <Play size={24} color={WHITE} />
        )}
      </TouchableOpacity>

      {/* Informacje o treści */}
      <View style={styles.contentContainer}>
        <View style={styles.titleRow}>
          <Volume2 size={16} color={BLACK} style={styles.volumeIcon} />
          <Text style={styles.title} numberOfLines={1}>
            {title && title.length > 35 ? `${title.substring(0, 35)}...` : title || 'Czytanie artykułu'}
          </Text>
        </View>
        
        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBarBg}>
            <View 
              style={[
                styles.progressBar, 
                { width: `${duration ? (position / duration) * 100 : 0}%` }
              ]} 
            />
          </View>
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>{formatTime(position)}</Text>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>
        </View>
      </View>

      {/* Przycisk zamknięcia */}
      <TouchableOpacity 
        onPress={onStop} 
        style={styles.stopButton} 
        activeOpacity={0.8}
        accessibilityLabel="Zamknij"
      >
        <X size={20} color={BLACK} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: '100%',
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: YELLOW,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  contentContainer: {
    flex: 1,
    marginRight: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  volumeIcon: {
    marginRight: 6,
  },
  title: {
    fontSize: 14,
    color: BLACK,
    fontFamily: 'Poppins_SemiBold',
    flex: 1,
  },
  progressContainer: {
    width: '100%',
  },
  progressBarBg: {
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 2,
    marginBottom: 6,
    overflow: 'hidden',
  },
  progressBar: {
    height: 4,
    backgroundColor: YELLOW,
    borderRadius: 2,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    fontSize: 11,
    color: GRAY,
    fontFamily: 'Poppins_Medium',
  },
  stopButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
}); 