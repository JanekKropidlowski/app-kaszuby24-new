import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Linking } from 'react-native';
import { Coffee, Heart, Star } from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';

const { width } = Dimensions.get('window');

interface CoffeeSupportCardProps {
  onPress?: () => void;
}

export default function CoffeeSupportCard({ onPress }: CoffeeSupportCardProps) {
  const { theme } = useThemeStore();

  const handleCoffeeSupport = () => {
    // Otwórz link do buycoffee.to
    Linking.openURL('https://buycoffee.to/kaszuby24');
  };

  return (
    <View style={styles.container}>
      {/* Główny blok z gradientem */}
      <View
        style={[styles.mainBlock, { backgroundColor: '#173D76' }]}
      >
        {/* Ikona kawy - większa */}
        <View style={styles.iconContainer}>
          <Coffee size={44} color="#FFFFFF" />
        </View>

        <Text style={[styles.heading, { fontFamily: theme.fontFamily.bold, color: '#FFFFFF' }]}>
          Doceniasz naszą pracę?
        </Text>

        <Text style={[styles.description, { fontFamily: theme.fontFamily.regular, color: '#FFFFFF' }]}>
          U nas nie znajdziesz żadnych reklam. Szanujemy Twój komfort i czas. Jeśli nasze artykuły są dla Ciebie wartościowe, postaw nam wirtualną kawę – to dla nas ogromna motywacja do dalszej pracy!
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={handleCoffeeSupport}
          activeOpacity={0.8}
        >
          <Text style={[styles.buttonText, { fontFamily: theme.fontFamily.medium, color: '#173D76' }]}>
            Postaw nam kawę ☕
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginVertical: 24,
  },
  mainBlock: {
    borderRadius: 20,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  heading: {
    fontSize: 20,
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 26,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
    textAlign: 'center',
    opacity: 0.95,
  },
  button: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
}); 