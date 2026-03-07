import React, { useState, useEffect } from 'react';
import { 
  TouchableOpacity, 
  View, 
  Text, 
  StyleSheet, 
  Animated, 
  Platform 
} from 'react-native';
import { MessageCircle } from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';
import { useCommunityStore } from '@/store/communityStore';
import * as Haptics from 'expo-haptics';

interface CommunityFABProps {
  onPress: () => void;
  hasNewMessages?: boolean;
}

export const CommunityFAB: React.FC<CommunityFABProps> = ({
  onPress,
  hasNewMessages = false
}) => {
  const { theme } = useThemeStore();
  const { streamMessages } = useCommunityStore();
  const unreadCount = 0; // Placeholder - implement when stream chat is ready
  const [pulseAnim] = useState(new Animated.Value(1));
  const [bounceAnim] = useState(new Animated.Value(0));

  const hasUrgent = hasNewMessages || unreadCount > 0;
  const backgroundColor = hasUrgent ? '#FF6B35' : theme.colors.primary;

  useEffect(() => {
    if (hasUrgent) {
      // Pulsowanie dla nowych wiadomości
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [hasUrgent, pulseAnim]);

  const handlePress = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    // Animacja bounce przy kliknięciu
    Animated.sequence([
      Animated.timing(bounceAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(bounceAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    onPress();
  };

  const bounceStyle = {
    transform: [
      {
        scale: bounceAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 0.9],
        }),
      },
    ],
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ scale: pulseAnim }],
        },
      ]}
    >
      <Animated.View style={bounceStyle}>
        <TouchableOpacity
          style={[
            styles.fab,
            {
              backgroundColor,
              shadowColor: backgroundColor,
            },
          ]}
          onPress={handlePress}
          activeOpacity={0.8}
        >
          <MessageCircle size={28} color="#FFFFFF" strokeWidth={2.5} />
          
          {unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: '#FF4757' }]}>
              <Text style={styles.badgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 120,
    right: 20,
    zIndex: 1000,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
}); 