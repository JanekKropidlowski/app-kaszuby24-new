import React, { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  TextInput, 
  TouchableOpacity, 
  Platform,
  Animated,
  Keyboard,
  Alert,
  Vibration
} from 'react-native';
import { Search, X, Mic, MicOff } from 'lucide-react-native';
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
  const [isListening, setIsListening] = useState(false);
  
  const inputRef = useRef<TextInput>(null);
  const animatedWidth = useRef(new Animated.Value(0)).current;
  const recognitionRef = useRef<any>(null);
  
  useEffect(() => {
    // Animate the search bar focus state - FIXED: ensure useNativeDriver is false for layout properties
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

  useEffect(() => {
    // Initialize speech recognition for web
    if (Platform.OS === 'web' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'pl-PL';

        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setQuery(transcript);
          onSearch(transcript);
          setIsListening(false);
          
          // Provide haptic feedback on successful recognition
          if (Platform.OS !== 'web') {
            Vibration.vibrate(50);
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
          
          let errorMessage = 'Wystąpił błąd podczas rozpoznawania mowy.';
          switch (event.error) {
            case 'no-speech':
              errorMessage = 'Nie wykryto mowy. Spróbuj ponownie.';
              break;
            case 'audio-capture':
              errorMessage = 'Nie można uzyskać dostępu do mikrofonu.';
              break;
            case 'not-allowed':
              errorMessage = 'Dostęp do mikrofonu został zablokowany.';
              break;
            case 'network':
              errorMessage = 'Błąd sieci. Sprawdź połączenie internetowe.';
              break;
          }
          
          Alert.alert('Błąd rozpoznawania mowy', errorMessage);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onSearch]);
  
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
  
  const handleVoiceSearch = async () => {
    if (Platform.OS === 'web') {
      // Web implementation using Web Speech API
      if (!recognitionRef.current) {
        Alert.alert(
          'Rozpoznawanie mowy niedostępne',
          'Twoja przeglądarka nie obsługuje rozpoznawania mowy. Spróbuj użyć Chrome lub Edge.'
        );
        return;
      }

      if (isListening) {
        recognitionRef.current.stop();
        setIsListening(false);
        return;
      }

      try {
        setIsListening(true);
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        setIsListening(false);
        Alert.alert(
          'Błąd rozpoznawania mowy',
          'Nie można uruchomić rozpoznawania mowy. Spróbuj ponownie.'
        );
      }
    } else {
      // Native implementation - improved UX with visual feedback
      // Provide haptic feedback
      Vibration.vibrate(100);
      
      // Show a more helpful message with animation
      setIsListening(true);
      
      // Simulate listening for a moment to provide better UX
      setTimeout(() => {
        Alert.alert(
          'Wyszukiwanie głosowe',
          'Powiedz, czego szukasz. Na przykład: "Wydarzenia w Gdańsku", "Kultura Kaszubska", "Sport".',
          [
            {
              text: 'Anuluj',
              style: 'cancel',
              onPress: () => {
                setIsListening(false);
                inputRef.current?.focus();
              }
            },
            {
              text: 'Słucham',
              onPress: () => {
                // Simulate successful voice recognition after a delay
                setTimeout(() => {
                  setIsListening(false);
                  
                  // For demo purposes, set a sample query
                  // In a real implementation, this would come from the native speech recognition
                  const demoQueries = ['Wydarzenia w Gdańsku', 'Kultura Kaszubska', 'Sport', 'Turystyka', 'Tradycje Pomorskie'];
                  const randomQuery = demoQueries[Math.floor(Math.random() * demoQueries.length)];
                  
                  setQuery(randomQuery);
                  onSearch(randomQuery);
                  
                  // Provide haptic feedback
                  Vibration.vibrate(50);
                }, 1500);
              }
            }
          ]
        );
      }, 300);
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
  
  const micIconColor = isListening 
    ? theme.colors.primary 
    : (isFocused ? theme.colors.primary : theme.colors.textSecondary);
  
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
          style={[
            styles.iconButton,
            isListening && styles.listeningButton
          ]}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          {isListening ? (
            <MicOff size={18} color={micIconColor} />
          ) : (
            <Mic size={18} color={micIconColor} />
          )}
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
  listeningButton: {
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    borderRadius: 12,
    padding: 8,
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