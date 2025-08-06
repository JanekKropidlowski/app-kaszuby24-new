import React, { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  TextInput, 
  TouchableOpacity, 
  Platform,
  Animated,
  Keyboard
} from 'react-native';
import { Search, X } from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  initialValue?: string;
  autoFocus?: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  placeholder = 'Szukaj artykułów...',
  initialValue = '',
  autoFocus = false,
}) => {
  const { theme } = useThemeStore();
  const [query, setQuery] = useState(initialValue);
  const [isFocused, setIsFocused] = useState(autoFocus);
  
  const inputRef = useRef<TextInput>(null);
  const animatedWidth = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    // Animate the search bar focus state
    Animated.timing(animatedWidth, {
      toValue: isFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: false, // Layout properties not supported by native driver
    }).start();
    
    if (autoFocus) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isFocused, autoFocus, animatedWidth]);
  
  const handleClear = () => {
    setQuery('');
    onSearch('');
    inputRef.current?.focus();
  };
  
  const handleSubmit = () => {
    onSearch(query);
    Keyboard.dismiss();
  };
  
  const handleFocus = () => {
    setIsFocused(true);
  };
  
  const handleBlur = () => {
    if (query.length === 0) {
      setIsFocused(false);
    }
  };
  
  const borderRadius = animatedWidth.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 20],
  });
  
  const shadowOpacity = animatedWidth.interpolate({
    inputRange: [0, 1],
    outputRange: [0.05, 0.15],
  });
  
  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.card,
          borderColor: isFocused ? theme.colors.primary : theme.colors.border,
          borderRadius,
          shadowOpacity,
        },
      ]}
    >
      <Search 
        size={20} 
        color={isFocused ? theme.colors.primary : theme.colors.textSecondary} 
      />
      
      <TextInput
        ref={inputRef}
        style={[
          styles.input,
          { 
            color: theme.colors.text, 
            fontFamily: theme.fontFamily.regular 
          }
        ]}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textSecondary}
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={handleSubmit}
        onFocus={handleFocus}
        onBlur={handleBlur}
        returnKeyType="search"
        clearButtonMode="never"
        autoFocus={autoFocus}
      />
      
      {/* X button removed */}
      {/* {query.length > 0 && (
        <TouchableOpacity 
          onPress={handleClear} 
          style={styles.iconButton}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <View style={[
            styles.clearButton, 
            { backgroundColor: theme.colors.subtle }
          ]}>
            <X size={14} color={theme.colors.textSecondary} />
          </View>
        </TouchableOpacity>
      )} */}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Platform.OS === 'android' ? 18 : 16, // Większy radius na Androidzie
    paddingHorizontal: Platform.OS === 'android' ? 20 : 16, // Większy padding na Androidzie
    height: Platform.OS === 'android' ? 58 : 54, // Większa wysokość na Androidzie dla lepszych touch targets
    marginHorizontal: Platform.OS === 'android' ? 20 : 16, // Większy margines na Androidzie
    marginVertical: Platform.OS === 'android' ? 14 : 12, // Większy margines na Androidzie
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: Platform.OS === 'android' ? 10 : 8, // Większy shadow na Androidzie
    elevation: Platform.OS === 'android' ? 4 : 2, // Większy elevation na Androidzie
  },
  input: {
    flex: 1,
    height: '100%',
    marginLeft: Platform.OS === 'android' ? 14 : 12, // Większy margines na Androidzie
    fontSize: Platform.OS === 'android' ? 17 : 16, // Większy font na Androidzie
  },
  iconButton: {
    padding: Platform.OS === 'android' ? 6 : 4, // Większy padding na Androidzie dla lepszych touch targets
    minWidth: Platform.OS === 'android' ? 44 : 32, // Minimum touch target na Androidzie
    minHeight: Platform.OS === 'android' ? 44 : 32, // Minimum touch target na Androidzie
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButton: {
    width: Platform.OS === 'android' ? 26 : 22, // Większy przycisk na Androidzie
    height: Platform.OS === 'android' ? 26 : 22, // Większy przycisk na Androidzie
    borderRadius: Platform.OS === 'android' ? 13 : 11, // Większy radius na Androidzie
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SearchBar;