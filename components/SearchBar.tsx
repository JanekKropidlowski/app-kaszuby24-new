import React, { useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Platform } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  initialValue?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  placeholder = 'Szukaj artykułów...',
  initialValue = '',
}) => {
  const { theme } = useThemeStore();
  const [query, setQuery] = useState(initialValue);

  const handleClear = () => {
    setQuery('');
    onSearch('');
  };

  const handleSubmit = () => {
    onSearch(query);
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.subtle,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <Search size={20} color={theme.colors.textSecondary} />
      
      <TextInput
        style={[
          styles.input,
          { color: theme.colors.text, fontFamily: theme.fontFamily?.regular || 'Poppins-Regular' }
        ]}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textSecondary}
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={handleSubmit}
        returnKeyType="search"
        clearButtonMode="while-editing"
      />
      
      {query.length > 0 && (
        <TouchableOpacity 
          onPress={handleClear} 
          style={styles.clearButton}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <X size={18} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 50,
    marginHorizontal: 16,
    marginVertical: 12,
  },
  input: {
    flex: 1,
    height: '100%',
    marginLeft: 12,
    fontSize: 16,
  },
  clearButton: {
    padding: 4,
  },
});

export default SearchBar;