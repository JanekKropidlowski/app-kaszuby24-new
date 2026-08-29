import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';

interface AlertsCardProps {
  count: number;
  onPress: () => void;
}

export const AlertsCard: React.FC<AlertsCardProps> = ({ count, onPress }) => {
  const { theme } = useThemeStore();
  return (
    <TouchableOpacity style={[
      styles.container,
      { 
        backgroundColor: theme.colors.card,
        borderColor: theme.colors.border,
        shadowColor: theme.colors.shadow,
      }
    ]} onPress={onPress} accessibilityRole="button" accessibilityLabel="Zobacz ostrzeżenia IMGW">
      <View style={styles.left}>
        <AlertTriangle size={18} color={theme.colors.error} />
        <Text style={[styles.title, { color: theme.colors.text }]}>Ostrzeżenia IMGW</Text>
      </View>
      <View style={[styles.badge, { backgroundColor: theme.colors.error }]}>
        <Text style={styles.badgeText}>{count}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: '5%',
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 14,
    fontFamily: Platform.select({ default: 'Poppins_SemiBold', android: 'Poppins_SemiBold' }) || 'Poppins_SemiBold',
  },
  badge: {
    minWidth: 28,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontFamily: Platform.select({ default: 'Poppins_SemiBold', android: 'Poppins_SemiBold' }) || 'Poppins_SemiBold',
  },
});


