import React, { useRef, useEffect } from 'react';
import { 
  Modal, 
  View, 
  StyleSheet, 
  Dimensions, 
  TouchableOpacity, 
  Text,
} from 'react-native';
import { PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '@/store/themeStore';
import { X } from 'lucide-react-native';
import { 
  useAnimatedGestureHandler, 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring, 
  runOnJS 
} from 'react-native-reanimated';

const { height: screenHeight } = Dimensions.get('window');

interface SwipeableModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  showCloseButton?: boolean;
  children: React.ReactNode;
  animationType?: 'slide' | 'fade';
  presentationStyle?: 'pageSheet' | 'formSheet' | 'fullScreen';
}

export default function SwipeableModal({
  visible,
  onClose,
  title,
  showCloseButton = true,
  children,
  animationType = 'slide',
  presentationStyle = 'pageSheet'
}: SwipeableModalProps) {
  const { theme, isDarkMode } = useThemeStore();
  const insets = useSafeAreaInsets();
  
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  
  const panGestureHandler = useAnimatedGestureHandler<PanGestureHandlerGestureEvent>({
    onStart: () => {
      'worklet';
    },
    onActive: (event) => {
      'worklet';
      if (event.translationY > 0) {
        translateY.value = event.translationY;
        opacity.value = 1 - (event.translationY / screenHeight) * 0.5;
      }
    },
    onEnd: (event) => {
      'worklet';
      if (event.translationY > 100) {
        // Swipe down to close
        translateY.value = withSpring(screenHeight);
        opacity.value = withSpring(0);
        runOnJS(onClose)();
      } else {
        // Return to original position
        translateY.value = withSpring(0);
        opacity.value = withSpring(1);
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
      opacity: opacity.value,
    };
  });

  const handleClose = () => {
    translateY.value = withSpring(screenHeight);
    opacity.value = withSpring(0);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0);
      opacity.value = withSpring(1);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType={animationType}
      presentationStyle={presentationStyle === 'pageSheet' ? 'pageSheet' : presentationStyle}
      transparent
      onRequestClose={handleClose}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={handleClose}
        style={[styles.backdrop, { backgroundColor: 'rgba(0,0,0,0.4)' }]}
      />
      <View style={styles.sheetContainer}>
        <PanGestureHandler onGestureEvent={panGestureHandler}>
          <Animated.View style={[styles.content, { backgroundColor: theme.colors.background }, animatedStyle]}>
            {/* Header with drag indicator */}
            <View style={styles.header}>
              <View style={[styles.dragIndicator, { backgroundColor: theme.colors.border }]} />
              {title && (
                <Text style={[styles.title, { color: theme.colors.text }]}>
                  {title}
                </Text>
              )}
              {showCloseButton && (
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={24} color={theme.colors.text} />
                </TouchableOpacity>
              )}
            </View>
            
            {/* Content */}
            <View style={[styles.childrenContainer, { paddingBottom: Math.max(20, insets.bottom + 8) }]}>
              {children}
            </View>
          </Animated.View>
        </PanGestureHandler>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  sheetContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: '10%', // Zmniejszam z 15% na 10% żeby modal był wyższy
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'visible', // Zmieniam z 'hidden' na 'visible' żeby scroll działał
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
    position: 'relative',
  },
  dragIndicator: {
    position: 'absolute',
    top: 8,
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    padding: 8,
  },
  childrenContainer: {
    flex: 1,
    paddingHorizontal: 8,
    overflow: 'visible', // Zmieniam z 'hidden' na 'visible' żeby scroll działał
  },
});
