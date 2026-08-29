import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface AedIconProps {
  size?: number;
  color?: string;
}

export const AedIcon: React.FC<AedIconProps> = ({
  size = 32,
  color = '#F59E0B'
}) => {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <View style={[styles.iconBg, { backgroundColor: color }]}>
        {/* Medical cross / plus */}
        <Svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none">
          <Path
            d="M19 9h-4V5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v4H5a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h4v4a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-4h4a1 1 0 0 0 1-1v-4a1 1 0 0 0-1-1z"
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
        elevation: 3,
      },
    }),
  },
});
