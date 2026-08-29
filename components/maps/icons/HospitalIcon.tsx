import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';

import Svg, { Path, Circle } from 'react-native-svg';

interface HospitalIconProps {
  size?: number;
  color?: string;
}

export const HospitalIcon: React.FC<HospitalIconProps> = ({
  size = 32,
  color = '#EF4444'
}) => {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <View style={[styles.iconBg, { backgroundColor: color }]}>
        <Svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none">
          <Path
            d="M13 3H11V11H3V13H11V21H13V13H21V11H13V3Z"
            fill="white"
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
        elevation: 2,
      },
    }),
  },
});

