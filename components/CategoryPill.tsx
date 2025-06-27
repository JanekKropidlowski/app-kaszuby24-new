import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
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
  
  return (
    <TouchableOpacity
      style={[
        styles.pill,
        {
          backgroundColor: isSelected 
            ? theme.colors.primary 
            : theme.colors.card,
          borderColor: theme.colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.text,
          {
            color: isSelected 
              ? '#fff' 
              : theme.colors.text,
            fontWeight: theme.fontWeight.medium
          },
        ]}
      >
        {name}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  text: {
    fontSize: 14,
  },
});

export default CategoryPill;