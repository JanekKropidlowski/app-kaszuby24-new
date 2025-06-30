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
  const animatedScale = new Animated.Value(1);
  
  const handlePress = () => {
    // Animate the pill press
    Animated.sequence([
      Animated.timing(animatedScale, {
        toValue: 0.92,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(animatedScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    
    onPress();
  };
  
  return (
    <Animated.View style={{ transform: [{ scale: animatedScale }] }}>
      <TouchableOpacity
        style={[
          styles.pill,
          {
            backgroundColor: isSelected 
              ? theme.colors.primary 
              : theme.colors.card,
            borderColor: isSelected
              ? theme.colors.primary
              : theme.colors.border,
            shadowColor: isSelected ? theme.colors.primary : theme.colors.border,
            shadowOpacity: isSelected ? 0.4 : 0.1,
          },
        ]}
        onPress={handlePress}
        activeOpacity={0.7}
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
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    marginRight: 12,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 6,
        shadowOpacity: 0.15,
        shadowColor: '#000',
      },
      android: {
        elevation: 2,
      },
    }),
  },
  text: {
    fontSize: 14,
  },
});

export default React.memo(CategoryPill);