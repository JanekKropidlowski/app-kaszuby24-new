import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, ActivityIndicator, Platform } from 'react-native';
import { Pause, Play, X as CloseIcon } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface AudioPlayerBarProps {
  isPlaying: boolean;
  duration: number; // w sekundach
  position: number; // w sekundach
  onPlayPause: () => void;
  onSeek?: (seconds: number) => void;
  onClose?: () => void;
  isLoading?: boolean; // Dodane: czy trwa generowanie głosu
}

const GRANT = '#1a237e'; // granat
const YELLOW = '#ffd600'; // żółty
const WHITE = '#fff';
const GLASS = 'rgba(255,255,255,0.7)';
const BLUR = 'rgba(255,255,255,0.25)';

function formatTime(sec: number) {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, '0');
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, '0');
  return `${m}:${s}`;
}

export const AudioPlayerBar = ({ isPlaying, duration, position, onPlayPause, onSeek, onClose, isLoading }: AudioPlayerBarProps) => {
  // Animacja pojawiania się
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  // Shimmer efekt dla ładowania
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (isLoading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
          Animated.timing(shimmerAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
        ])
      ).start();
    } else {
      shimmerAnim.stopAnimation();
    }
  }, [isLoading]);

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-100%', '100%'],
  });

  return (
    <Animated.View style={[styles.wrapper, { opacity: fadeAnim }] } pointerEvents="box-none">
      <LinearGradient
        colors={[WHITE, 'rgba(255,255,255,0.0)']}
        style={styles.gradientBg}
        pointerEvents="none"
      />
      <View style={styles.glassBg} />
      <View style={styles.playerBar}>
        <TouchableOpacity onPress={onPlayPause} style={styles.playPauseBtn} activeOpacity={0.8}>
          {isLoading ? (
            <ActivityIndicator size={32} color={GRANT} />
          ) : isPlaying ? (
            <Pause size={32} color={GRANT} />
          ) : (
            <Play size={32} color={GRANT} />
          )}
        </TouchableOpacity>
        <View style={styles.progressContainer}>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBar, { width: `${duration ? (position / duration) * 100 : 0}%` }]} />
            {isLoading && (
              <Animated.View
                style={[
                  styles.shimmer,
                  { transform: [{ translateX: shimmerTranslate }] },
                ]}
              />
            )}
          </View>
          <View style={styles.timeRow}>
            <Text style={styles.time}>{formatTime(position)}</Text>
            <Text style={styles.time}>{formatTime(duration)}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <CloseIcon size={24} color={GRANT} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 60, // większy margines nad tab barem
    zIndex: 1000,
    alignItems: 'center',
    justifyContent: 'flex-end',
    pointerEvents: 'box-none',
  },
  gradientBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 90,
  },
  glassBg: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 8,
    height: Platform.OS === 'android' ? 60 : 68, // Mniejsza wysokość na Android
    borderRadius: 28,
    backgroundColor: BLUR,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  playerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 24,
    margin: 8,
    paddingHorizontal: Platform.OS === 'android' ? 16 : 18, // Mniejszy padding na Android
    paddingVertical: Platform.OS === 'android' ? 10 : 12, // Mniejszy padding na Android
    minWidth: 320,
    maxWidth: 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  playPauseBtn: {
    width: Platform.OS === 'android' ? 48 : 54, // Mniejszy rozmiar na Android
    height: Platform.OS === 'android' ? 48 : 54, // Mniejszy rozmiar na Android
    borderRadius: Platform.OS === 'android' ? 24 : 27, // Mniejszy radius na Android
    backgroundColor: YELLOW,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Platform.OS === 'android' ? 12 : 14, // Mniejszy margin na Android
    shadowColor: YELLOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
  progressContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  progressBarBg: {
    height: 7,
    backgroundColor: '#eee',
    borderRadius: 3.5,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBar: {
    height: 7,
    backgroundColor: GRANT,
    borderRadius: 3.5,
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.5)',
    opacity: 0.7,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  time: {
    fontSize: Platform.OS === 'android' ? 12 : 13, // Zwiększona czcionka na Android dla lepszej czytelności
    color: GRANT,
    fontFamily: Platform.OS === 'ios' ? 'Poppins_Bold' : 'Poppins_Bold',
    fontWeight: Platform.OS === 'android' ? 'bold' : 'normal',
  },
  closeBtn: {
    marginLeft: Platform.OS === 'android' ? 12 : 14, // Mniejszy margin na Android
    padding: Platform.OS === 'android' ? 6 : 8, // Mniejszy padding na Android
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
}); 