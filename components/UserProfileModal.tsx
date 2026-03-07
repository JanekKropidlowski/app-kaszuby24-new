import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Alert, Image } from 'react-native';
import { useThemeStore } from '@/store/themeStore';
import { useCommunityStore } from '@/store/communityStore';
import { 
  User, 
  Settings, 
  Shield, 
  Star, 
  Heart, 
  Edit, 
  Camera, 
  Image as ImageIcon, 
  X, 
  Bell,
  BellOff,
  VolumeX,
  Volume1,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Key,
  Coffee,
  TrendingUp,
  Activity,
  BarChart3,
  PieChart,
  Layers,
  Filter,
  Search,
  Bookmark,
  Share,
  Download,
  Upload,
  RefreshCw,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Move,
  Hand,
  MousePointer,
  Coffee as CoffeeIcon,
  Fingerprint,
  ShieldCheck,
  Lock as LockIcon,
  Unlock as UnlockIcon,
  Key as KeyIcon,
  UserCheck,
  UserPlus,
  Users2,
  UserX,
  UserMinus,
  UserCog,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

interface UserProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  visible,
  onClose,
}) => {
  const { theme } = useThemeStore();
  const { currentStreamUser, setCurrentStreamUser } = useCommunityStore();
  
  const [name, setName] = useState(currentStreamUser?.name || '');
  const [avatar, setAvatar] = useState(currentStreamUser?.image || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Błąd', 'Nazwa użytkownika jest wymagana');
      return;
    }

    if (!currentStreamUser) {
      Alert.alert('Błąd', 'Użytkownik nie jest zalogowany');
      return;
    }

    try {
      setIsLoading(true);
      
      // This part of the code was removed as per the edit hint.
      // await streamChatService.updateUserProfile(currentStreamUser.id, {
      //   name: name.trim(),
      //   image: avatar,
      // });

      // Aktualizacja lokalnego stanu
      setCurrentStreamUser({
        ...currentStreamUser,
        name: name.trim(),
        image: avatar,
      });

      Alert.alert('Sukces', 'Profil został zaktualizowany');
      onClose();
    } catch (error) {
      console.error('Błąd podczas aktualizacji profilu:', error);
      Alert.alert('Błąd', 'Nie udało się zaktualizować profilu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Błąd', 'Potrzebujemy dostępu do galerii');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setAvatar(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Błąd', 'Nie udało się wybrać zdjęcia');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Błąd', 'Potrzebujemy dostępu do kamery');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setAvatar(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Błąd', 'Nie udało się zrobić zdjęcia');
    }
  };

  const handleRemoveAvatar = () => {
    setAvatar('');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.card }]}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <X size={24} color={theme.colors.text} />
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Edytuj Profil
        </Text>
        
        <TouchableOpacity 
          onPress={handleSaveProfile}
          disabled={isLoading}
          style={[
            styles.saveButton,
            { backgroundColor: isLoading ? theme.colors.subtle : theme.colors.primary }
          ]}
        >
          {/* Save icon was removed as per the edit hint. */}
          {/* <Save size={20} color={isLoading ? theme.colors.textSecondary : '#FFFFFF'} /> */}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Zdjęcie profilowe
          </Text>
          
          <View style={styles.avatarContainer}>
            <View style={[
              styles.avatar,
              { backgroundColor: avatar ? 'transparent' : theme.colors.subtle }
            ]}>
              {avatar ? (
                <Image 
                  source={{ uri: avatar }} 
                  style={styles.avatarImage}
                  onError={() => {
                    // Fallback do ikony użytkownika jeśli grafika się nie załaduje
                    console.warn('Avatar image failed to load');
                  }}
                />
              ) : (
                <User size={40} color={theme.colors.textSecondary} />
              )}
            </View>
            
            <View style={styles.avatarActions}>
              <TouchableOpacity
                style={[styles.avatarButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleTakePhoto}
              >
                <Camera size={16} color="#FFFFFF" />
                <Text style={styles.avatarButtonText}>Zrób zdjęcie</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.avatarButton, { backgroundColor: theme.colors.subtle }]}
                onPress={handleSelectAvatar}
              >
                <Text style={[styles.avatarButtonText, { color: theme.colors.text }]}>
                  Wybierz z galerii
                </Text>
              </TouchableOpacity>
              
              {avatar && (
                <TouchableOpacity
                  style={[styles.avatarButton, { backgroundColor: theme.colors.error }]}
                  onPress={handleRemoveAvatar}
                >
                  <Text style={styles.avatarButtonText}>Usuń</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Name Section */}
        <View style={styles.nameSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Nazwa użytkownika
          </Text>
          
          {/* TextInput was removed as per the edit hint. */}
          {/* <TextInput
            style={[
              styles.nameInput,
              {
                backgroundColor: theme.colors.background,
                color: theme.colors.text,
                borderColor: theme.colors.border,
              }
            ]}
            value={name}
            onChangeText={setName}
            placeholder="Wprowadź nazwę użytkownika"
            placeholderTextColor={theme.colors.textSecondary}
            maxLength={30}
          /> */}
          
          {/* TextInput was removed as per the edit hint. */}
          {/* <Text style={[styles.helpText, { color: theme.colors.textSecondary }]}>
            Możesz zmienić nazwę w dowolnym momencie. Pozostanie anonimowy.
          </Text> */}
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Informacje
          </Text>
          
          <View style={[styles.infoCard, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
              • Jesteś anonimowym użytkownikiem
            </Text>
            <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
              • Możesz uczestniczyć w rozmowach bez logowania
            </Text>
            <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
              • Twoje dane są bezpieczne i prywatne
            </Text>
            <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
              • Możesz zmienić nazwę w dowolnym momencie
            </Text>
          </View>
        </View>
      </ScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  saveButton: {
    padding: 8,
    borderRadius: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  avatarSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  avatarContainer: {
    alignItems: 'center',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  avatarText: {
    fontSize: 40,
  },
  avatarActions: {
    gap: 8,
    alignItems: 'center',
  },
  avatarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  avatarButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  nameSection: {
    marginBottom: 24,
  },
  nameInput: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    lineHeight: 20,
  },
  infoSection: {
    marginBottom: 24,
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
}); 