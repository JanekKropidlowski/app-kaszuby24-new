import { StyleSheet } from 'react-native';

export const progressBarStyles = StyleSheet.create({
  progressBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    zIndex: 2000,
    backgroundColor: 'transparent',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: 'inherit',
  },
});