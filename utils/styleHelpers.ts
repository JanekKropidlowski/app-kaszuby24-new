import { Platform, TextStyle } from 'react-native';

/**
 * Font weight helper - reduces font weight on Android for better rendering
 * iOS: keeps original weight (800/900)
 * Android: reduces by 100 (800→700, 900→800)
 */
export const W = (weight: '400' | '500' | '600' | '700' | '800' | '900'): TextStyle['fontWeight'] => {
  if (Platform.OS === 'android') {
    if (weight === '900') return '800';
    if (weight === '800') return '700';
  }
  return weight;
};

/**
 * Base text style for Android optimization
 * Removes font padding and ensures consistent rendering
 */
export const textBase: TextStyle = Platform.select({
  ios: {},
  android: { includeFontPadding: false }
}) || {};
