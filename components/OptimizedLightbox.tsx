import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Platform,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
const AnimatedExpoImage = Animated.createAnimatedComponent(ExpoImage);
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { X, Download, ChevronLeft, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface OptimizedLightboxProps {
  images: { uri: string }[];
  initialIndex: number;
  visible: boolean;
  onClose: () => void;
  onIndexChange?: (index: number) => void;
  onDownload?: () => void;
}

export const OptimizedLightbox: React.FC<OptimizedLightboxProps> = ({
  images,
  initialIndex,
  visible,
  onClose,
  onIndexChange,
  onDownload,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [imageLoading, setImageLoading] = useState(true);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());

  // Animowane wartości
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);

  // Refs
  const imageRefs = useRef<{ [key: number]: ExpoImage | null }>({});

  useEffect(() => {
    if (visible) {
      // Animacja wejścia
      opacity.value = withTiming(1, { duration: 200 });
      setCurrentIndex(initialIndex);
      setImageLoading(true);

      // Preloaduj sąsiednie zdjęcia
      preloadAdjacentImages(initialIndex);
    } else {
      // Animacja wyjścia
      opacity.value = withTiming(0, { duration: 200 });
      // Wyczyść referencje do obrazów
      imageRefs.current = {};
    }
  }, [visible, initialIndex]);

  // Preloadowanie sąsiednich zdjęć
  const preloadAdjacentImages = useCallback((index: number) => {
    const indicesToPreload = [index - 1, index, index + 1];

    indicesToPreload.forEach((i) => {
      if (i >= 0 && i < images.length && images[i]?.uri) {
        ExpoImage.prefetch(images[i].uri);
      }
    });
  }, [images]);

  // Zmiana indeksu
  const changeIndex = useCallback((newIndex: number) => {
    if (newIndex >= 0 && newIndex < images.length) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentIndex(newIndex);
      onIndexChange?.(newIndex);
      preloadAdjacentImages(newIndex);

      // Pokaż loader tylko jeśli zdjęcie nie było wcześniej załadowane
      if (!loadedImages.has(newIndex)) {
        setImageLoading(true);
      }

      // Reset transformacji
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      scale.value = withSpring(1);
    }
  }, [images.length, onIndexChange, preloadAdjacentImages, loadedImages]);

  // Gesty - Pan
  const pan = Gesture.Pan()
    .onUpdate((event) => {
      'worklet';
      if (scale.value === 1) {
        translateX.value = event.translationX;
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      'worklet';
      if (scale.value === 1) {
        // Swipe do zamknięcia
        if (Math.abs(event.translationY) > 100) {
          runOnJS(onClose)();
        }
        // Swipe do zmiany zdjęcia
        else if (Math.abs(event.translationX) > 100) {
          if (event.translationX > 0 && currentIndex > 0) {
            runOnJS(changeIndex)(currentIndex - 1);
          } else if (event.translationX < 0 && currentIndex < images.length - 1) {
            runOnJS(changeIndex)(currentIndex + 1);
          }
        }

        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  // Gesty - Pinch
  const pinch = Gesture.Pinch()
    .onUpdate((event) => {
      'worklet';
      scale.value = Math.max(1, Math.min(event.scale, 3));
    })
    .onEnd(() => {
      'worklet';
      if (scale.value < 1) {
        scale.value = withSpring(1);
      }
    });

  // Obsługa podwójnego stuknięcia do resetowania zoomu
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      'worklet';
      if (scale.value > 1) {
        scale.value = withSpring(1);
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      } else {
        scale.value = withSpring(2);
      }
    });

  const gesture = Gesture.Simultaneous(pan, pinch, doubleTap);

  // Style animowane
  const animatedContainerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  if (!visible) return null;

  const currentImage = images[currentIndex];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar backgroundColor="transparent" barStyle="light-content" />

      <Animated.View style={[styles.container, animatedContainerStyle]}>
        <View style={styles.backdrop} />

        <GestureHandlerRootView style={styles.gestureContainer}>
          <GestureDetector gesture={gesture}>
            <Animated.View style={styles.imageWrapper}>
              {currentImage && (
                <AnimatedExpoImage
                  key={`lightbox-image-${currentIndex}`}
                  ref={(ref: any) => {
                    if (ref) imageRefs.current[currentIndex] = ref;
                  }}
                  source={{ uri: currentImage.uri }}
                  style={[styles.image, animatedImageStyle]}
                  contentFit="contain"
                  transition={0}
                  onLoadStart={() => setImageLoading(true)}
                  onLoadEnd={() => {
                    setImageLoading(false);
                    setLoadedImages((prev: Set<number>) => new Set(prev).add(currentIndex));
                  }}
                  cachePolicy="memory-disk"
                  priority="high"
                  recyclingKey={`lightbox-${currentIndex}`}
                />
              )}

              {imageLoading && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#FFFFFF" />
                </View>
              )}
            </Animated.View>
          </GestureDetector>
        </GestureHandlerRootView>

        {/* Header */}
        <View style={styles.header}>
          {onDownload && (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={onDownload}
              activeOpacity={0.7}
            >
              <Download size={24} color="#FFFFFF" />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.headerButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <X size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Navigation */}
        {currentIndex > 0 && (
          <TouchableOpacity
            style={[styles.navButton, styles.navButtonLeft]}
            onPress={() => changeIndex(currentIndex - 1)}
            activeOpacity={0.7}
          >
            <ChevronLeft size={32} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        {currentIndex < images.length - 1 && (
          <TouchableOpacity
            style={[styles.navButton, styles.navButtonRight]}
            onPress={() => changeIndex(currentIndex + 1)}
            activeOpacity={0.7}
          >
            <ChevronRight size={32} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.counter}>
            <Text style={styles.counterText}>
              {currentIndex + 1} / {images.length}
            </Text>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  gestureContainer: {
    flex: 1,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingHorizontal: 20,
    paddingBottom: 20,
    zIndex: 10,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  navButtonLeft: {
    left: 20,
  },
  navButtonRight: {
    right: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    alignItems: 'center',
    zIndex: 10,
  },
  counter: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  counterText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Poppins_Medium',
  },
});