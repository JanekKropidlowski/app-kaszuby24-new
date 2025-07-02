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
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    marginRight: 12,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
  },
  text: {
    fontSize: 14,
  },
});

export default CategoryPill;