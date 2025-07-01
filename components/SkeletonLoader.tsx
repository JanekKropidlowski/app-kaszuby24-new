import React from 'react';
import { StyleSheet, View, Animated, Dimensions } from 'react-native';
import { useThemeStore } from '@/store/themeStore';
import LoadingIndicator from './LoadingIndicator';

const { width } = Dimensions.get('window');

interface SkeletonLoaderProps {
  fullScreen?: boolean;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ fullScreen = false }) => {
  const { theme } = useThemeStore();
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true, // Using native driver for opacity
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true, // Using native driver for opacity
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  if (fullScreen) {
    return (
      <View style={[styles.fullScreenContainer, { backgroundColor: theme.colors.background }]}>
        <LoadingIndicator 
          fullScreen 
          message="Łączenie z serwerem..." 
          showConnecting={true}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Featured article skeleton */}
      <View style={styles.featuredContainer}>
        <Animated.View 
          style={[
            styles.featuredImage, 
            { backgroundColor: theme.colors.subtle, opacity }
          ]} 
        />
      </View>

      {/* Categories skeleton */}
      <View style={styles.categoriesContainer}>
        <View style={styles.categoriesRow}>
          {[1, 2, 3, 4].map((item) => (
            <Animated.View
              key={item}
              style={[
                styles.categoryPill,
                { backgroundColor: theme.colors.subtle, opacity }
              ]}
            />
          ))}
        </View>
      </View>

      {/* Articles skeleton */}
      <View style={styles.articlesContainer}>
        {[1, 2, 3].map((item) => (
          <View key={item} style={styles.articleItem}>
            <Animated.View 
              style={[
                styles.articleImage, 
                { backgroundColor: theme.colors.subtle, opacity }
              ]} 
            />
            <View style={styles.articleContent}>
              <Animated.View 
                style={[
                  styles.articleTitle, 
                  { backgroundColor: theme.colors.subtle, opacity }
                ]} 
              />
              <Animated.View 
                style={[
                  styles.articleSubtitle, 
                  { backgroundColor: theme.colors.subtle, opacity }
                ]} 
              />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  featuredContainer: {
    marginBottom: 24,
  },
  featuredImage: {
    width: '100%',
    height: 200,
    borderRadius: 16,
  },
  categoriesContainer: {
    marginBottom: 24,
  },
  categoriesRow: {
    flexDirection: 'row',
    gap: 12,
  },
  categoryPill: {
    height: 32,
    width: 80,
    borderRadius: 16,
  },
  articlesContainer: {
    gap: 16,
  },
  articleItem: {
    flexDirection: 'row',
    gap: 12,
  },
  articleImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  articleContent: {
    flex: 1,
    gap: 8,
  },
  articleTitle: {
    height: 20,
    borderRadius: 4,
  },
  articleSubtitle: {
    height: 16,
    width: '70%',
    borderRadius: 4,
  },
});

export default SkeletonLoader;