import React from 'react';
import { StyleSheet, Text, TouchableOpacity, Animated } from 'react-native';
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
        toValue: 0.95,
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
            shadowColor: isSelected ? theme.colors.primary : 'transparent',
            shadowOpacity: isSelected ? 0.3 : 0,
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
              fontWeight: theme.fontWeight.medium,
              fontFamily: theme.fontFamily?.medium || 'Poppins-Medium'
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  text: {
    fontSize: 14,
  },
});

export default CategoryPill;