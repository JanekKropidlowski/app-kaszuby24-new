import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useThemeStore } from '@/store/themeStore';
import { useRouter } from 'expo-router';

interface HeaderLogoProps {
  variant?: 'full' | 'text' | 'compact';
}

export const HeaderLogo = ({ variant = 'text' }: HeaderLogoProps) => {
  const { theme } = useThemeStore();
  const router = useRouter();
  const [imageError, setImageError] = useState(false);

  const getLogoSource = () => {
    if (variant === 'full') {
      // Pełne logo z sygnetem
      return 'https://kaszuby24.pl/wp-content/uploads/2020/03/logo-e1584093147599.png';
    } else {
      // Logo typograficzne
      return theme.isDarkMode 
        ? 'https://kaszuby24.pl/wp-content/uploads/2025/07/Bez-nazwy-2-01-1-scaled.png'
        : 'https://kaszuby24.pl/wp-content/uploads/2025/07/Bez-nazwy-2-01-scaled.png';
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

  const handleImageError = () => {
    setImageError(true);
  };

  if (imageError) {
    // Fallback text logo
    return (
      <TouchableOpacity 
        style={styles.container}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <View style={[styles.fallbackContainer, getLogoSize()]}>
          <Text style={[styles.fallbackText, { color: theme.colors.primary }]}>
            Kaszuby24
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

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
        onError={handleImageError}
        placeholder="Kaszuby24"
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  fallbackText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
}); 