import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useThemeStore } from '@/store/themeStore';
import { useRouter } from 'expo-router';

interface HeaderLogoProps {
  variant?: 'full' | 'text' | 'compact';
}

export const HeaderLogo = ({ variant = 'text' }: HeaderLogoProps) => {
  const { theme } = useThemeStore();
  const router = useRouter();

  const getLogoSource = () => {
    if (variant === 'full') {
      // Pełne logo z sygnetem
      return 'https://kaszuby24.pl/wp-content/uploads/2020/03/logo-e1584093147599.png';
    } else {
      // Logo typograficzne
      return theme.isDarkMode 
        ? 'http://kaszuby24.pl/wp-content/uploads/2025/07/Bez-nazwy-2-01-1-scaled.png'
        : 'http://kaszuby24.pl/wp-content/uploads/2025/07/Bez-nazwy-2-01-scaled.png';
    }
  };

  const getLogoSize = () => {
    switch (variant) {
      case 'full':
        return { width: 140, height: 40 };
      case 'compact':
        return { width: 100, height: 28 };
      default:
        return { width: 120, height: 34 };
    }
  };

  const handlePress = () => {
    // Przewiń do góry lub odśwież
    router.push('/');
  };

  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: getLogoSource() }}
        style={getLogoSize()}
        contentFit="contain"
        cachePolicy="memory-disk"
        transition={200}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
}); 