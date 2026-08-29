import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useThemeStore } from '@/store/themeStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path, G, Circle } from 'react-native-svg';
import { UserNameModal } from './UserNameModal';

// Stylizowana ikona machającej dłoni w stylu Apple
const WavingHandIcon = ({ size = 24, color = '#FECC00' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <G>
      <Path
        d="M12.5 1.5C11.5 1.5 10.5 2 10 3L9 4.5L8 3C7.5 2 6.5 1.5 5.5 1.5C4 1.5 3 2.5 3 4C3 4.5 3.2 5 3.5 5.5L7 11V20C7 21.7 8.3 23 10 23H14C15.7 23 17 21.7 17 20V11L20.5 5.5C20.8 5 21 4.5 21 4C21 2.5 20 1.5 18.5 1.5C17.5 1.5 16.5 2 16 3L15 4.5L14 3C13.5 2 12.5 1.5 11.5 1.5"
        fill={color}
        stroke={color}
        strokeWidth="0.5"
      />
      <Circle cx="10" cy="12" r="1" fill="#FFF" opacity="0.8" />
      <Circle cx="14" cy="12" r="1" fill="#FFF" opacity="0.8" />
      <Path
        d="M10 16C10 16 11 17 12 17C13 17 14 16 14 16"
        stroke="#FFF"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.8"
      />
    </G>
  </Svg>
);

interface WelcomeGreetingProps {
  compact?: boolean;
  enlarged?: boolean;
}

export const WelcomeGreeting = ({ compact = false, enlarged = false }: WelcomeGreetingProps) => {
  const { theme } = useThemeStore();
  const [userName, setUserName] = useState<string>('');
  const [greeting, setGreeting] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const [debugMode, setDebugMode] = useState(false);

  useEffect(() => {
    loadUserName();
    updateGreeting();
    const interval = setInterval(updateGreeting, 60000); // Aktualizuj co minutę
    AsyncStorage.getItem('debugMode').then(val => {
      if (val === 'true') setDebugMode(true);
    });
    return () => clearInterval(interval);
  }, []);

  const loadUserName = async () => {
    try {
      const name = await AsyncStorage.getItem('@userName');
      if (name) {
        setUserName(name);
      } else {
        // Jeśli nie ma imienia, pokaż modal po krótkiej chwili
        const hasSeenModal = await AsyncStorage.getItem('@hasSeenNameModal');
        if (!hasSeenModal) {
          setIsFirstTime(true);
          setTimeout(() => setShowModal(true), 1500);
        }
      }
    } catch (error) {
      console.log('Error loading user name:', error);
    }
  };

  const updateGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting('Dzień dobry');
    } else if (hour < 18) {
      setGreeting('Dzień dobry');
    } else {
      setGreeting('Dobry wieczór');
    }
  };

  const handlePress = () => {
    setShowModal(true);
  };

  const handleSaveName = async (name: string) => {
    setUserName(name);
    if (isFirstTime) {
      await AsyncStorage.setItem('@hasSeenNameModal', 'true');
      setIsFirstTime(false);
    }
  };

  const handleHandTap = async () => {
    setTapCount(prev => {
      const newCount = prev + 1;
      if (newCount >= 5) {
        setDebugMode(true);
        AsyncStorage.setItem('debugMode', 'true');
      }
      setTimeout(() => setTapCount(0), 2000); // reset po 2s
      return newCount;
    });
  };

  return (
    <>
      <TouchableOpacity 
        style={styles.container}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.textContainer}>
          <Text style={[styles.greetingText, {
            color: theme.colors.textSecondary,
            fontFamily: theme.fontFamily.light,
            fontSize: enlarged ? (Platform.OS === 'android' ? 13 : 14) : (Platform.OS === 'android' ? 11 : 12) // Zmniejszony font na Androidzie
          }]}>
            {greeting}
          </Text>
          {userName && (
            <Text style={[styles.nameText, {
              color: theme.isDarkMode ? '#FFFFFF' : '#1E293B',
              fontFamily: theme.fontFamily.bold,
              fontSize: enlarged ? (Platform.OS === 'android' ? 20 : 22) : (Platform.OS === 'android' ? 17 : 18) // Zmniejszony font na Androidzie
            }]}>
              {userName}
            </Text>
          )}
        </View>
      </TouchableOpacity>

      <UserNameModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSaveName}
        currentName={userName}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Platform.OS === 'android' ? 12 : 10, // Większy gap na Androidzie
  },
  iconContainer: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flexDirection: 'column',
    gap: Platform.OS === 'android' ? -1 : -2, // Lepsze spacing na Androidzie
  },
  greetingText: {
    fontSize: Platform.OS === 'android' ? 11 : 12, // Zmniejszony font na Androidzie
    fontWeight: '300',
    letterSpacing: Platform.OS === 'android' ? 0.3 : 0.2, // Lepsze letter spacing na Androidzie
    opacity: 0.8,
  },
  nameText: {
    fontSize: Platform.OS === 'android' ? 17 : 18, // Zmniejszony font na Androidzie
    fontWeight: '700',
    letterSpacing: Platform.OS === 'android' ? -0.3 : -0.4, // Lepsze letter spacing na Androidzie
  },
}); 