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
import { Search, X, Mic } from 'lucide-react-native';
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
      useNativeDriver: false,
    }).start();
    
    if (autoFocus) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isFocused, autoFocus]);
  
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
  
  const handleVoiceSearch = () => {
    // This would integrate with speech recognition
    // For now, just focus the input
    inputRef.current?.focus();
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
      
      {query.length > 0 ? (
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
      ) : (
        <TouchableOpacity 
          onPress={handleVoiceSearch} 
          style={styles.iconButton}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <Mic size={18} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 54,
    marginHorizontal: 16,
    marginVertical: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  input: {
    flex: 1,
    height: '100%',
    marginLeft: 12,
    fontSize: 16,
  },
  iconButton: {
    padding: 4,
  },
  clearButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SearchBar;