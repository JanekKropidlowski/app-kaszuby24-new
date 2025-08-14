import React, { useState, useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert, Animated, Vibration } from 'react-native';
import { HelpCircle, Sparkles, Bell, BookOpen, Search, Settings } from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';
import ComprehensiveTutorial from './ComprehensiveTutorial';

interface TutorialTriggerProps {
  type?: 'comprehensive' | 'contextual' | 'feature-specific';
  title?: string;
  description?: string;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'center';
  size?: 'small' | 'medium' | 'large';
  feature?: 'search' | 'articles' | 'weather' | 'notifications' | 'settings' | 'offline';
  showPulse?: boolean;
  showBadge?: boolean;
  badgeCount?: number;
  onPress?: () => void;
}

export const TutorialTrigger: React.FC<TutorialTriggerProps> = ({
  type = 'comprehensive',
  title = 'Pomoc',
  description = 'Kliknij, aby zobaczyć samouczek',
  position = 'top-right',
  size = 'medium',
  feature,
  showPulse = false,
  showBadge = false,
  badgeCount = 0,
  onPress,
}) => {
  const { theme } = useThemeStore();
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [pulseAnimation] = useState(new Animated.Value(1));
  const [scaleAnimation] = useState(new Animated.Value(1));
  const [rotationAnimation] = useState(new Animated.Value(0));

  // Start pulse animation if enabled
  useEffect(() => {
    if (showPulse) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [showPulse, pulseAnimation]);

  const handlePress = () => {
    // Add haptic feedback
    Vibration.vibrate(50);

    // Scale animation on press
    Animated.sequence([
      Animated.timing(scaleAnimation, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnimation, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Rotation animation
    Animated.timing(rotationAnimation, {
      toValue: (rotationAnimation as any).value + 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    if (type === 'comprehensive') {
      setShowTutorial(true);
    } else if (type === 'feature-specific' && feature) {
      // Show feature-specific tutorial
      setShowTutorial(true);
    } else {
      Alert.alert(
        title,
        description,
        [{ text: 'OK' }]
      );
    }

    onPress?.();
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return { width: 32, height: 32, borderRadius: 16 };
      case 'large':
        return { width: 48, height: 48, borderRadius: 24 };
      default:
        return { width: 40, height: 40, borderRadius: 20 };
    }
  };

  const getPositionStyles = () => {
    switch (position) {
      case 'top-left':
        return { top: 10, left: 10 };
      case 'bottom-right':
        return { bottom: 10, right: 10 };
      case 'bottom-left':
        return { bottom: 10, left: 10 };
      case 'center':
        return { top: '50%', left: '50%', transform: [{ translateX: -20 }, { translateY: -20 }] };
      default:
        return { top: 10, right: 10 };
    }
  };

  const getFeatureIcon = () => {
    switch (feature) {
      case 'search':
        return Search;
      case 'articles':
        return BookOpen;
      case 'weather':
        return Bell;
      case 'notifications':
        return Bell;
      case 'settings':
        return Settings;
      case 'offline':
        return BookOpen;
      default:
        return HelpCircle;
    }
  };

  const getFeatureColor = () => {
    switch (feature) {
      case 'search':
        return '#3B82F6';
      case 'articles':
        return '#10B981';
      case 'weather':
        return '#F59E0B';
      case 'notifications':
        return '#EF4444';
      case 'settings':
        return '#8B5CF6';
      case 'offline':
        return '#6B7280';
      default:
        return theme.colors.primary;
    }
  };

  const IconComponent = getFeatureIcon();
  const featureColor = getFeatureColor();

  return (
    <>
      <Animated.View
        style={[
          styles.container,
          getSizeStyles(),
          // getPositionStyles(),
          {
            backgroundColor: feature ? featureColor : theme.colors.primary,
            shadowColor: feature ? featureColor : theme.colors.primary,
            transform: [
              { scale: Animated.multiply(scaleAnimation, pulseAnimation) },
              {
                rotate: rotationAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '360deg'],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.touchable}
          onPress={handlePress}
          activeOpacity={0.8}
        >
          <IconComponent 
            size={size === 'small' ? 16 : size === 'large' ? 24 : 20} 
            color="#FFFFFF" 
          />
          
          {/* Sparkles effect for feature-specific triggers */}
          {feature && (
            <Animated.View style={styles.sparklesContainer}>
              <Sparkles size={8} color="#FFFFFF" />
            </Animated.View>
          )}
        </TouchableOpacity>

        {/* Badge */}
        {showBadge && badgeCount > 0 && (
          <Animated.View 
            style={[
              styles.badge,
              { backgroundColor: '#EF4444' },
            ]}
          >
            <Text style={styles.badgeText}>
              {badgeCount > 99 ? '99+' : badgeCount}
            </Text>
          </Animated.View>
        )}
      </Animated.View>

      {(type === 'comprehensive' || type === 'feature-specific') && (
        <ComprehensiveTutorial
          visible={showTutorial}
          onClose={() => {
            setShowTutorial(false);
            setTutorialStep(0);
          }}
          initialStep={feature ? getFeatureStep(feature) : 0}
          onComplete={() => {
            // Handle tutorial completion
            console.log('Tutorial completed');
            setShowTutorial(false);
          }}
        />
      )}
    </>
  );
};

const getFeatureStep = (feature: string): number => {
  switch (feature) {
    case 'search':
      return 3; // Search step
    case 'articles':
      return 2; // Articles step
    case 'weather':
      return 5; // Weather step
    case 'notifications':
      return 4; // Notifications step
    case 'settings':
      return 7; // Accessibility step
    case 'offline':
      return 6; // Offline step
    default:
      return 0;
  }
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
    zIndex: 1000,
  },
  touchable: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  sparklesContainer: {
    position: 'absolute',
    top: -2,
    right: -2,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'Poppins_Bold',
    textAlign: 'center',
  },
});

export default TutorialTrigger;
