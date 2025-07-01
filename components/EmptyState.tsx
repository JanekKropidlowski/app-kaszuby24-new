import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useThemeStore } from '@/store/themeStore';
import { RefreshCw } from 'lucide-react-native';

interface EmptyStateProps {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  message,
  actionLabel,
  onAction,
  icon,
}) => {
  const { theme } = useThemeStore();
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {icon ? (
        <View style={[styles.iconContainer, { backgroundColor: theme.colors.subtle }]}>
          {icon}
        </View>
      ) : (
        <View style={[styles.iconContainer, { backgroundColor: theme.colors.subtle }]}>
          <RefreshCw size={48} color={theme.colors.primary} />
        </View>
      )}
      
      <Text style={[
        styles.title, 
        { 
          color: theme.colors.text, 
          fontFamily: theme.fontFamily.semibold 
        }
      ]}>
        {title}
      </Text>
      
      <Text style={[
        styles.message, 
        { 
          color: theme.colors.textSecondary, 
          fontFamily: theme.fontFamily.regular 
        }
      ]}>
        {message}
      </Text>
      
      {actionLabel && onAction && (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.colors.primary }]}
          onPress={onAction}
          activeOpacity={0.8}
        >
          <Text style={[
            styles.buttonText, 
            { fontFamily: theme.fontFamily.medium }
          ]}>
            {actionLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    minHeight: 400,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 24,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default EmptyState;