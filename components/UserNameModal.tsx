import React, { useState } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet,
  KeyboardAvoidingView,
  Platform 
} from 'react-native';
import { useThemeStore } from '@/store/themeStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { X } from 'lucide-react-native';

interface UserNameModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  currentName?: string;
}

export const UserNameModal = ({ visible, onClose, onSave, currentName = '' }: UserNameModalProps) => {
  const { theme } = useThemeStore();
  const [name, setName] = useState(currentName);

  const handleSave = async () => {
    if (name.trim()) {
      await AsyncStorage.setItem('@userName', name.trim());
      onSave(name.trim());
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { 
              color: theme.colors.text,
              fontFamily: theme.fontFamily.semibold 
            }]}>
              Jak masz na imię?
            </Text>
            {/* X button removed */}
            {/* <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity> */}
          </View>

          <Text style={[styles.subtitle, { 
            color: theme.colors.textSecondary,
            fontFamily: theme.fontFamily.regular 
          }]}>
            Spersonalizujemy dla Ciebie powitanie
          </Text>

          <TextInput
            style={[styles.input, { 
              backgroundColor: theme.isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              color: theme.colors.text,
              fontFamily: theme.fontFamily.regular,
              borderColor: theme.isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'
            }]}
            placeholder="Wpisz swoje imię..."
            placeholderTextColor={theme.colors.textSecondary}
            value={name}
            onChangeText={setName}
            autoFocus
            maxLength={20}
          />

          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.button, styles.cancelButton, {
                backgroundColor: theme.isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
              }]}
              onPress={onClose}
            >
              <Text style={[styles.buttonText, { 
                color: theme.colors.text,
                fontFamily: theme.fontFamily.medium 
              }]}>
                Anuluj
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.button, styles.saveButton, {
                backgroundColor: theme.colors.primary,
                opacity: name.trim() ? 1 : 0.5
              }]}
              onPress={handleSave}
              disabled={!name.trim()}
            >
              <Text style={[styles.buttonText, styles.saveButtonText, { 
                fontFamily: theme.fontFamily.semibold 
              }]}>
                Zapisz
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 24,
  },
  input: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    
  },
  saveButton: {
    
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  saveButtonText: {
    color: '#FFFFFF',
  },
}); 