import React from 'react';
import { StyleSheet, View, Animated, Dimensions, Platform } from 'react-native';
import { useThemeStore } from '@/store/themeStore';
import LoadingIndicator from './LoadingIndicator';

const { width } = Dimensions.get('window');

interface SkeletonLoaderProps {
  fullScreen?: boolean;
  type?: 'article' | 'home' | 'search';
  count?: number;
  immediate?: boolean; // New prop for immediate display
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ 
  fullScreen = false, 
  type = 'home',
  count = 3,
  immediate = false
}) => {
  const { theme } = useThemeStore();
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  // Darker gray color for skeleton - more prominent than theme.colors.subtle
  const skeletonColor = theme.isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)';

  React.useEffect(() => {
    // Start animation immediately if requested
    const startDelay = immediate ? 0 : 200;
    
    const timer = setTimeout(() => {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(animatedValue, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
    }, startDelay);

    return () => {
      clearTimeout(timer);
      animatedValue.stopAnimation();
    };
  }, [animatedValue, immediate]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.8], // Increased opacity range for more visible effect
  });

  if (fullScreen) {
    return (
      <View style={[styles.fullScreenContainer, { backgroundColor: theme.colors.background }]}>
        <LoadingIndicator 
          fullScreen 
        />
      </View>
    );
  }

  // Enhanced article detail skeleton with immediate display
  if (type === 'article') {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header skeleton - shows immediately */}
        <View style={styles.articleHeader}>
          <View style={[styles.headerButton, { backgroundColor: skeletonColor }]} />
          <View style={styles.headerActions}>
            <View style={[styles.headerButton, { backgroundColor: skeletonColor }]} />
            <View style={[styles.headerButton, { backgroundColor: skeletonColor }]} />
          </View>
        </View>
        
        {/* Featured image skeleton */}
        <Animated.View 
          style={[
            styles.articleFeaturedImage, 
            { backgroundColor: skeletonColor, opacity: immediate ? 0.6 : opacity }
          ]} 
        />
        
        {/* Content skeleton */}
        <View style={styles.articleContent}>
          {/* Title skeleton */}
          <Animated.View 
            style={[
              styles.articleTitle, 
              { backgroundColor: skeletonColor, opacity: immediate ? 0.6 : opacity }
            ]} 
          />
          <Animated.View 
            style={[
              styles.articleSubtitle, 
              { backgroundColor: skeletonColor, opacity: immediate ? 0.6 : opacity, width: '60%' }
            ]} 
          />
          
          {/* Meta info skeleton */}
          <View style={styles.metaContainer}>
            <Animated.View 
              style={[
                styles.metaItem, 
                { backgroundColor: skeletonColor, opacity: immediate ? 0.6 : opacity }
              ]} 
            />
            <Animated.View 
              style={[
                styles.metaItem, 
                { backgroundColor: skeletonColor, opacity: immediate ? 0.6 : opacity, width: 80 }
              ]} 
            />
          </View>
          
          {/* Content skeleton */}
          <View style={styles.articleBody}>
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <Animated.View
                key={item}
                style={[
                  styles.articleParagraph,
                  { 
                    backgroundColor: skeletonColor, 
                    opacity: immediate ? 0.6 : opacity,
                    width: item % 3 === 0 ? '80%' : '100%' // Vary widths for realism
                  }
                ]}
              />
            ))}
          </View>
        </View>
      </View>
    );
  }

  // Search skeleton
  if (type === 'search') {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Search results skeleton */}
        <View style={styles.searchResultsContainer}>
          {Array.from({ length: count }).map((_, index) => (
            <View key={index} style={styles.articleItem}>
              <Animated.View 
                style={[
                  styles.articleImage, 
                  { backgroundColor: skeletonColor, opacity }
                ]} 
              />
              <View style={styles.articleContent}>
                <Animated.View 
                  style={[
                    styles.articleTitle, 
                    { backgroundColor: skeletonColor, opacity }
                  ]} 
                />
                <Animated.View 
                  style={[
                    styles.articleSubtitle, 
                    { backgroundColor: skeletonColor, opacity }
                  ]} 
                />
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }

  // Default home skeleton
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Featured article skeleton */}
      <View style={styles.featuredContainer}>
        <Animated.View 
          style={[
            styles.featuredImage, 
            { backgroundColor: skeletonColor, opacity }
          ]} 
        />
      </View>

      {/* Categories skeleton */}
      <View style={styles.categoriesContainer}>
        <View style={styles.categoriesRow}>
          {[1, 2, 3, 4, 5].map((item) => (
            <Animated.View
              key={item}
              style={[
                styles.categoryPill,
                { backgroundColor: skeletonColor, opacity }
              ]}
            />
          ))}
        </View>
      </View>

      {/* Articles skeleton */}
      <View style={styles.articlesContainer}>
        {Array.from({ length: count }).map((_, index) => (
          <View key={index} style={styles.articleItem}>
            <Animated.View 
              style={[
                styles.articleImage, 
                { backgroundColor: skeletonColor, opacity }
              ]} 
            />
            <View style={styles.articleContent}>
              <Animated.View 
                style={[
                  styles.articleTitle, 
                  { backgroundColor: skeletonColor, opacity }
                ]} 
              />
              <Animated.View 
                style={[
                  styles.articleSubtitle, 
                  { backgroundColor: skeletonColor, opacity }
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
    paddingHorizontal: 8,
    flexWrap: 'wrap',
  },
  categoryPill: {
    height: 32,
    width: 80,
    borderRadius: 16,
    marginBottom: 8,
  },
  articlesContainer: {
    gap: 16,
  },
  articleItem: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
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
  // Article detail specific styles
  articleFeaturedImage: {
    width: '100%',
    height: 240,
    borderRadius: 0,
  },
  articleBody: {
    marginTop: 24,
    gap: 12,
  },
  articleParagraph: {
    height: 14,
    width: '100%',
    borderRadius: 4,
    marginBottom: 8,
  },
  // Search specific styles
  searchResultsContainer: {
    marginTop: 16,
  },
  // New styles for article skeleton
  articleHeader: {
    position: 'absolute',
    top: Platform.select({
      ios: 54,
      android: 48,
      default: 54
    }),
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    zIndex: 1000,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  metaContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
    marginTop: 16,
  },
  metaItem: {
    height: 16,
    width: 120,
    borderRadius: 8,
  },
});

export default SkeletonLoader;