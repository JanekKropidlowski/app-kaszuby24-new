import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Vibration,
  Modal,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '@/store/themeStore';
import {
  ArrowRight,
  ArrowLeft,
  X,
  Check,
  Star,
  Heart,
  Search,
  Bookmark,
  Bell,
  Settings,
  Home,
  Calendar,
  MapPin,
  CloudRain,
  Wifi,
  Users,
  Sparkles,
  Zap,
  Eye,
  Share2,
  Download,
  Volume2,
  Filter,
  Clock,
  TrendingUp,
  AlertTriangle,
  Thermometer,
  Droplets,
  RefreshCw,
  WifiOff,
  Accessibility,
  Type,
  Contrast,
  Palette,
  Hand,
  MessageCircle,
  ThumbsUp,
  Navigation,
  BookOpen,
  BellRing,
  BellOff,
} from 'lucide-react-native';

interface Coachmark {
  id: string;
  title: string;
  description: string;
  icon: any;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  target?: string;
  action?: () => void;
  showDemo?: boolean;
  demoContent?: React.ReactNode;
}

interface OnboardingCoachmarksProps {
  visible: boolean;
  onComplete: () => void;
  onSkip: () => void;
  currentStep?: number;
}

export const OnboardingCoachmarks: React.FC<OnboardingCoachmarksProps> = ({
  visible,
  onComplete,
  onSkip,
  currentStep = 0,
}) => {
  const { theme } = useThemeStore();
  const insets = useSafeAreaInsets();
  const [currentCoachmark, setCurrentCoachmark] = useState(currentStep);
  const [animationValue] = useState(new Animated.Value(0));
  const [pulseAnimation] = useState(new Animated.Value(1));
  const [showCelebration, setShowCelebration] = useState(false);

  const { width, height } = Dimensions.get('window');

  const coachmarks: Coachmark[] = [
    {
      id: 'welcome',
      title: 'Witaj w Kaszuby24!',
      description: 'Pozwól nam pokazać Ci najważniejsze funkcje aplikacji',
      icon: Sparkles,
      position: 'center',
      action: () => {
        Vibration.vibrate(50);
        // Show welcome animation
      },
    },
    {
      id: 'home',
      title: 'Strona główna',
      description: 'Tu znajdziesz najnowsze wiadomości i wydarzenia',
      icon: Home,
      position: 'bottom',
      target: 'home-tab',
      action: () => {
        Vibration.vibrate(50);
        // Navigate to home
      },
    },
    {
      id: 'search',
      title: 'Wyszukiwanie',
      description: 'Znajdź konkretne artykuły i wydarzenia',
      icon: Search,
      position: 'top',
      target: 'search-tab',
      action: () => {
        Vibration.vibrate(50);
        // Show search demo
      },
    },
    {
      id: 'saved',
      title: 'Zapisane',
      description: 'Artykuły zapisane do czytania offline',
      icon: Bookmark,
      position: 'bottom',
      target: 'saved-tab',
      action: () => {
        Vibration.vibrate(50);
        // Show saved articles
      },
    },
    {
      id: 'calendar',
      title: 'Kalendarz',
      description: 'Wydarzenia i imprezy w regionie',
      icon: Calendar,
      position: 'bottom',
      target: 'calendar-tab',
      action: () => {
        Vibration.vibrate(50);
        // Show calendar
      },
    },
    {
      id: 'weather',
      title: 'Pogoda',
      description: 'Sprawdź aktualną pogodę i prognozy',
      icon: CloudRain,
      position: 'top',
      target: 'weather-tab',
      action: () => {
        Vibration.vibrate(50);
        // Show weather widget
      },
    },
    {
      id: 'settings',
      title: 'Ustawienia',
      description: 'Dostosuj aplikację do swoich potrzeb',
      icon: Settings,
      position: 'bottom',
      target: 'settings-tab',
      action: () => {
        Vibration.vibrate(50);
        // Show settings
      },
    },
  ];

  useEffect(() => {
    if (visible) {
      try {
        Animated.parallel([
          Animated.timing(animationValue, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.loop(
            Animated.sequence([
              Animated.timing(pulseAnimation, {
                toValue: 1.1,
                duration: 1000,
                useNativeDriver: true,
              }),
              Animated.timing(pulseAnimation, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
              }),
            ])
          ),
        ]).start();
      } catch (error) {
        console.warn('Error in coachmarks animation:', error);
      }
    } else {
      try {
        Animated.timing(animationValue, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
      } catch (error) {
        console.warn('Error in coachmarks close animation:', error);
      }
    }
  }, [visible, animationValue, pulseAnimation]);

  const handleNext = () => {
    if (currentCoachmark < coachmarks.length - 1) {
      // Execute current coachmark action
      const currentCoachmarkData = coachmarks[currentCoachmark];
      if (currentCoachmarkData.action && typeof currentCoachmarkData.action === 'function') {
        try {
          currentCoachmarkData.action();
        } catch (error) {
          console.warn('Error in coachmark action:', error);
        }
      }

      setCurrentCoachmark(currentCoachmark + 1);
    } else {
      // Complete onboarding
      setShowCelebration(true);
      setTimeout(() => {
        setShowCelebration(false);
        if (onComplete && typeof onComplete === 'function') {
          try {
            onComplete();
          } catch (error) {
            console.warn('Error in onComplete callback:', error);
          }
        }
      }, 2000);
    }
  };

  const handlePrevious = () => {
    if (currentCoachmark > 0) {
      setCurrentCoachmark(currentCoachmark - 1);
    }
  };

  const handleSkip = () => {
    if (onSkip && typeof onSkip === 'function') {
      onSkip();
    }
  };

  if (!visible) return null;

  const currentCoachmarkData = coachmarks[currentCoachmark];
  const IconComponent = currentCoachmarkData.icon;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleSkip}
    >
      <View style={styles.overlay}>
        {/* Background overlay */}
        <Animated.View 
          style={[
            styles.backgroundOverlay,
            {
              opacity: animationValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.8],
              }),
            },
          ]}
        />

        {/* Coachmark content */}
        <Animated.View
          style={[
            styles.coachmarkContainer,
            {
              opacity: animationValue,
              transform: [
                {
                  scale: animationValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Icon with pulse animation */}
          <Animated.View
            style={[
              styles.iconContainer,
              {
                backgroundColor: theme.colors.primary,
                transform: [{ scale: pulseAnimation }],
              },
            ]}
          >
            <IconComponent size={32} color="#FFFFFF" />
          </Animated.View>

          {/* Title */}
          <Text
            style={[
              styles.title,
              { color: theme.colors.text, fontFamily: theme.fontFamily.bold },
            ]}
          >
            {currentCoachmarkData.title}
          </Text>

          {/* Description */}
          <Text
            style={[
              styles.description,
              { color: theme.colors.textSecondary, fontFamily: theme.fontFamily.regular },
            ]}
          >
            {currentCoachmarkData.description}
          </Text>

          {/* Progress indicator */}
          <View style={styles.progressContainer}>
            {coachmarks.map((_, index) => (
              <View key={index} style={styles.progressItem}>
                <View
                  style={[
                    styles.progressDot,
                    {
                      backgroundColor: index <= currentCoachmark ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                />
              </View>
            ))}
          </View>

          {/* Action buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.skipButton, { backgroundColor: theme.colors.subtle }]}
              onPress={handleSkip}
            >
              <Text
                style={[
                  styles.skipButtonText,
                  { color: theme.colors.textSecondary, fontFamily: theme.fontFamily.medium },
                ]}
              >
                Pomiń
              </Text>
            </TouchableOpacity>

            {currentCoachmark > 0 && (
              <TouchableOpacity
                style={[styles.previousButton, { backgroundColor: theme.colors.subtle }]}
                onPress={handlePrevious}
              >
                <ArrowLeft size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.nextButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleNext}
            >
              <Text
                style={[
                  styles.nextButtonText,
                  { color: '#FFFFFF', fontFamily: theme.fontFamily.semibold },
                ]}
              >
                {currentCoachmark === coachmarks.length - 1 ? 'Zaczynamy!' : 'Dalej'}
              </Text>
              {currentCoachmark < coachmarks.length - 1 && (
                <ArrowRight size={20} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Celebration animation */}
        {showCelebration && (
          <Animated.View style={styles.celebrationContainer}>
            <Text style={styles.celebrationText}>🎉 Witaj w Kaszuby24! 🎉</Text>
            <Text style={styles.celebrationSubtext}>Jesteś gotowy do odkrywania!</Text>
          </Animated.View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
  },
  coachmarkContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    margin: 20,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    maxWidth: 320,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  progressItem: {
    marginHorizontal: 4,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  skipButtonText: {
    fontSize: 14,
  },
  previousButton: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  nextButtonText: {
    fontSize: 16,
  },
  celebrationContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -120 }, { translateY: -50 }],
    backgroundColor: 'rgba(0,0,0,0.9)',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  celebrationText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Poppins_Bold',
    textAlign: 'center',
  },
  celebrationSubtext: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Poppins_Regular',
    textAlign: 'center',
    marginTop: 4,
  },
});

export default OnboardingCoachmarks;


