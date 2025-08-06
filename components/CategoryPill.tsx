import React from 'react';
import { StyleSheet, Text, TouchableOpacity, Animated, Platform } from 'react-native';
import { useThemeStore } from '@/store/themeStore';

interface CategoryPillProps {
  name: string;
  isSelected: boolean;
  onPress: () => void;
}

const CategoryPill: React.FC<CategoryPillProps> = ({ 
  name, 
  isSelected, 
  onPress 
}) => {
  const { theme } = useThemeStore();
  const animatedScale = React.useRef(new Animated.Value(1)).current;
  
  const handlePress = () => {
    // Instant visual feedback for responsiveness
    Animated.sequence([
      Animated.timing(animatedScale, {
        toValue: 0.95,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(animatedScale, {
        toValue: 1,
        duration: 80,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Immediate callback for instant filtering
    onPress();
  };
  
  return (
    <Animated.View style={{ transform: [{ scale: animatedScale }] }}>
      <TouchableOpacity
        style={[
          styles.pill,
          {
            backgroundColor: isSelected 
              ? '#224996' 
              : theme.colors.card,
            borderColor: isSelected
              ? '#224996'
              : theme.colors.border,
            shadowColor: isSelected ? '#224996' : theme.colors.border,
            shadowOpacity: isSelected ? 0.4 : 0.1,
            transform: [{ scale: isSelected ? 1.02 : 1 }],
          },
        ]}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <Text
          style={[
            styles.text,
            {
              color: isSelected 
                ? '#fff' 
                : theme.colors.text,
              fontWeight: isSelected ? '600' : '500',
              fontFamily: isSelected 
                ? theme.fontFamily.semibold
                : theme.fontFamily.medium
            },
          ]}
        >
          {name}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: Platform.OS === 'android' ? 22 : 18, // Większy padding na Androidzie
    paddingVertical: Platform.OS === 'android' ? 14 : 12, // Większy padding na Androidzie
    borderRadius: Platform.OS === 'android' ? 26 : 24, // Większy radius na Androidzie
    marginRight: Platform.OS === 'android' ? 14 : 12, // Większy margines na Androidzie
    borderWidth: 1,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: Platform.OS === 'android' ? 8 : 6, // Większy shadow na Androidzie
    elevation: Platform.OS === 'android' ? 5 : 3, // Większy elevation na Androidzie
    minHeight: Platform.OS === 'android' ? 52 : 44, // Minimum touch target na Androidzie
  },
  text: {
    fontSize: Platform.OS === 'android' ? 15 : 14, // Większy font na Androidzie
  },
});

export default CategoryPill;