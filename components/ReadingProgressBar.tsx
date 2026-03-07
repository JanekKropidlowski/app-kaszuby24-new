import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';

interface ReadingProgressBarProps {
  progress: number; // 0-100
  currentPosition: number; // aktualna pozycja w pikselach
  totalHeight: number; // całkowita wysokość treści
}

const YELLOW = '#fecc00';

export const ReadingProgressBar = ({ progress, currentPosition, totalHeight }: ReadingProgressBarProps) => {
  return (
    <View style={styles.container}>
      {/* Progress bar */}
      <View style={styles.progressBarBg}>
        <View 
          style={[
            styles.progressBar, 
            { width: `${Math.min(progress, 100)}%` }
          ]} 
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'android' ? 116 : 90,
    left: 0,
    right: 0,
    backgroundColor: Platform.OS === 'android' ? 'transparent' : '#ffffff',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    paddingHorizontal: 0, // Usunięty padding poziomy
    paddingVertical: 0, // Usunięty padding pionowy - pasek wypełni całą wysokość
    zIndex: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: Platform.OS === 'android' ? 20 : 3,
  },
  progressBarBg: {
    height: 35, // Jeszcze grubszy pasek (było 20)
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderTopLeftRadius: 8, // Zaokrąglenie od góry lewej
    borderTopRightRadius: 8, // Zaokrąglenie od góry prawej
    overflow: 'hidden',
  },
  progressBar: {
    height: 35, // Jeszcze grubszy pasek (było 20)
    backgroundColor: YELLOW,
    borderTopLeftRadius: 8, // Zaokrąglenie od góry lewej
    borderTopRightRadius: 8, // Zaokrąglenie od góry prawej
  },
});
