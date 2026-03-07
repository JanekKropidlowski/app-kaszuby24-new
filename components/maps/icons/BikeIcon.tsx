import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';

import Svg, { Path, Circle } from 'react-native-svg';

interface BikeIconProps {
  size?: number;
  color?: string;
}

export const BikeIcon: React.FC<BikeIconProps> = ({
  size = 32,
  color = '#DC2626'
}) => {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <View style={[styles.iconBg, { backgroundColor: color }]}>
        <Svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none">
          <Circle cx="6" cy="18" r="2.5" stroke="white" strokeWidth="1.5" fill="none" />
          <Circle cx="18" cy="18" r="2.5" stroke="white" strokeWidth="1.5" fill="none" />
          <Path
            d="M12 6L14 11M14 11L11 17M14 11H17L19 15M9 11L6 18M9 11H12"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBg: {
    width: '100%',
    height: '100%',
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
      },
      android: {
        elevation: 2, // Minimal elevation
      },
    }),
  },
});

