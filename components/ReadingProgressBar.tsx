import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, { SharedValue, useAnimatedStyle } from 'react-native-reanimated';

interface ReadingProgressBarProps {
  /** Postęp 0–100 jako shared value — przewijanie nie przerysowuje całego ekranu artykułu. */
  progress: SharedValue<number>;
  /** Wysokość paska zakładek; pasek postępu wystaje nad nim zawsze o tyle samo (iOS i Android). */
  tabBarHeight: number;
  backgroundColor: string;
}

const YELLOW = '#fecc00';
const BAR_HEIGHT = 35;
// Ile paska chowa się pod zaokrągloną górą paska zakładek — widoczne zostaje 15 px.
const TUCKED = 20;

export const ReadingProgressBar = ({ progress, tabBarHeight, backgroundColor }: ReadingProgressBarProps) => {
  // Pasek pojawia się po przeczytaniu 10% tekstu, jak wcześniej.
  const containerStyle = useAnimatedStyle(() => ({ opacity: progress.value > 10 ? 1 : 0 }));
  const fillStyle = useAnimatedStyle(() => ({ width: `${Math.min(progress.value, 100)}%` }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.container, { bottom: tabBarHeight - TUCKED, backgroundColor }, containerStyle]}
    >
      <Animated.View style={styles.track}>
        <Animated.View style={[styles.fill, fillStyle]} />
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 30,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  track: {
    height: BAR_HEIGHT,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    overflow: 'hidden',
  },
  fill: {
    height: BAR_HEIGHT,
    backgroundColor: YELLOW,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
});
