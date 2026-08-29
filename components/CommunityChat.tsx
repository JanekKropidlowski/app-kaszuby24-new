import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useThemeStore } from '@/store/themeStore';
import { useCommunityStore } from '@/store/communityStore';
import { Send, Image, Paperclip, Smile, MoreVertical, Edit, Trash2, Flag, User, Clock, MapPin } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { Swipeable } from 'react-native-gesture-handler';
import * as Location from 'expo-location';

export const CommunityChat: React.FC = () => {
  const { theme } = useThemeStore();
  const { 
    streamMessages,
    addStreamMessage,
    currentStreamChannel,
    streamChannels,
    currentStreamUser,
    setCurrentStreamChannel,
    setStreamMessages
  } = useCommunityStore();
  
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAdminManager, setShowAdminManager] = useState(false);
  const [showChannelSelector, setShowChannelSelector] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Debug log
      // console.log('MessageText:', messageText);
    // console.log('IsSending:', isSending);

  // Mock data dla testów
  useEffect(() => {
    if (streamMessages.length === 0) {
      const mockMessages: any[] = [
        {
          id: '1',
          text: 'Cześć! Widział ktoś korek na obwodnicy?',
          user: { id: '1', name: 'Jan Kowalski' },
          created_at: new Date().toISOString(),
        },
        {
          id: '2',
          text: 'Tak, jest duży korek od ronda do węzła',
          user: { id: '2', name: 'Anna Nowak' },
          created_at: new Date().toISOString(),
        },
        {
          id: '3',
          text: 'Dzięki za info!',
          user: { id: '1', name: 'Jan Kowalski' },
          created_at: new Date().toISOString(),
        },
      ];
      mockMessages.forEach(msg => addStreamMessage(msg));
    }
  }, []);

  const handleSendMessage = async () => {
    if (!messageText.trim() || isSending) return;

          // console.log('Wysyłanie wiadomości:', messageText.trim());

    try {
      setIsSending(true);
      
      // Zawsze używaj lokalnych wiadomości
      const newMessage: any = {
        id: Date.now().toString(),
        text: messageText.trim(),
        user: {
          id: 'user_' + Date.now(),
          name: 'Mieszkaniec',
        },
        created_at: new Date().toISOString(),
      };

              // console.log('Dodaję wiadomość:', newMessage);
      addStreamMessage(newMessage);
      
      setMessageText('');
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

    } catch (error) {
      console.error('Błąd wysyłania:', error);
      Alert.alert('Błąd', 'Nie udało się wysłać wiadomości');
    } finally {
      setIsSending(false);
    }
  };

  const handleAddImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Błąd', 'Potrzebujemy dostępu do galerii');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        
        const imageMessage: any = {
          id: Date.now().toString(),
          text: '📷 Zdjęcie',
          user: {
            id: 'user_' + Date.now(),
            name: 'Mieszkaniec',
          },
          created_at: new Date().toISOString(),
          attachments: {
            images: [imageUri]
          }
        };
        
        addStreamMessage(imageMessage);
      }
    } catch (error) {
      Alert.alert('Błąd', 'Nie udało się dodać zdjęcia');
    }
  };

  const handleAddLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Błąd', 'Potrzebujemy dostępu do lokalizacji');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      const locationText = address[0] 
        ? `📍 ${address[0].street}, ${address[0].city}`
        : `📍 ${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}`;
      
      // Dodaj lokalizację do wiadomości
      setMessageText(prev => prev + ` ${locationText}`);
    } catch (error) {
      Alert.alert('Błąd', 'Nie udało się dodać lokalizacji');
    }
  };

  const handleChannelSelect = async (channel: any) => {
    try {
      setCurrentStreamChannel(channel);
      // Używamy lokalnych wiadomości
    } catch (error) {
      Alert.alert('Błąd', 'Nie udało się przełączyć kanału');
    }
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isOwnMessage = item.user?.id === currentStreamUser?.id;
    const messageText = item.text || item.message || '';
    const userName = item.user?.name || item.userName || 'Nieznany';
    const timestamp = new Date(item.created_at || item.timestamp);
    
    return (
      <View style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessage : styles.otherMessage
      ]}>
        {!isOwnMessage && (
          <Text style={[styles.userName, { color: theme.colors.textSecondary }]}>
            {userName}
          </Text>
        )}
        <View style={[
          styles.messageBubble,
          {
            backgroundColor: isOwnMessage ? theme.colors.primary : theme.colors.card,
          }
        ]}>
          <Text style={[
            styles.messageText,
            { color: isOwnMessage ? '#FFFFFF' : theme.colors.text }
          ]}>
            {messageText}
          </Text>
          
          {item.attachments?.images && item.attachments.images.length > 0 && (
            <View style={styles.imageContainer}>
              <Text style={[styles.imageText, { color: theme.colors.textSecondary }]}>
                📷 Zdjęcie
              </Text>
            </View>
          )}
          
          <Text style={[
            styles.messageTime,
            { color: isOwnMessage ? 'rgba(255,255,255,0.7)' : theme.colors.textSecondary }
          ]}>
            {timestamp.toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </Text>
        </View>
      </View>
    );
  };

  const renderChannelSelector = () => (
    <View style={[styles.channelSelector, { backgroundColor: theme.colors.card }]}>
      <Text style={[styles.channelSelectorTitle, { color: theme.colors.text }]}>
        Wybierz kanał:
      </Text>
      {streamChannels.map((channel) => (
        <TouchableOpacity
          key={channel.id}
          style={[
            styles.channelOption,
            currentStreamChannel?.id === channel.id && { backgroundColor: theme.colors.primary }
          ]}
          onPress={() => {
            handleChannelSelect(channel);
            setShowChannelSelector(false);
          }}
        >
          <Text style={[
            styles.channelOptionText,
            { color: currentStreamChannel?.id === channel.id ? '#FFFFFF' : theme.colors.text }
          ]}>
            {channel.name}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <>
      <View style={styles.container}>
        {/* Header z wyborem kanału */}
        <View style={[styles.header, { backgroundColor: theme.colors.card }]}>
          <TouchableOpacity 
            style={styles.channelButton}
            onPress={() => setShowChannelSelector(!showChannelSelector)}
          >
            <User size={20} color={theme.colors.text} />
            <Text style={[styles.channelButtonText, { color: theme.colors.text }]}>
              {currentStreamChannel?.name || 'Wybierz kanał'}
            </Text>
          </TouchableOpacity>
          
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.settingsButton}
              onPress={() => setShowProfileModal(true)}
            >
              <User size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.settingsButton}
              onPress={() => setShowAdminManager(true)}
            >
              <MoreVertical size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {showChannelSelector && renderChannelSelector()}

                 {/* Messages List */}
         <FlatList
           ref={flatListRef}
           data={streamMessages} // Zawsze używaj lokalnych wiadomości
           renderItem={renderMessage}
           keyExtractor={(item) => item.id}
           style={styles.messagesList}
           contentContainerStyle={styles.messagesContent}
           showsVerticalScrollIndicator={false}
           onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
         />

        {/* Input Area */}
        <View style={[styles.inputContainer, { backgroundColor: theme.colors.card }]}>
          <View style={styles.inputRow}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.colors.subtle }]}
              onPress={handleAddImage}
              activeOpacity={0.7}
            >
              <Image size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.colors.subtle }]}
              onPress={handleAddLocation}
              activeOpacity={0.7}
            >
              <MapPin size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                }
              ]}
              placeholder="Napisz wiadomość..."
              placeholderTextColor={theme.colors.textSecondary}
              value={messageText}
              onChangeText={(text) => {
                // console.log('TextInput onChangeText:', text);
                setMessageText(text);
              }}
              onPressIn={() => {/* console.log('TextInput onPressIn') */}}
              onFocus={() => {/* console.log('TextInput onFocus') */}}
              multiline
              maxLength={500}
              editable={true}
              autoFocus={false}
              blurOnSubmit={false}
              onSubmitEditing={handleSendMessage}
            />
            
            <TouchableOpacity
              style={[
                styles.sendButton,
                {
                  backgroundColor: messageText.trim() ? theme.colors.primary : theme.colors.subtle,
                }
              ]}
              onPress={handleSendMessage}
              disabled={!messageText.trim() || isSending}
              activeOpacity={0.7}
            >
              <Send 
                size={20} 
                color={messageText.trim() ? '#FFFFFF' : theme.colors.textSecondary} 
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* User Profile Modal - Placeholder */}
      {/* TODO: Implement UserProfileModal component */}

      {/* Admin Channel Manager - Placeholder */}
      {/* TODO: Implement AdminChannelManager component */}
    </>
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
  channelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  channelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  settingsButton: {
    padding: 4,
  },
  channelSelector: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  channelSelectorTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  channelOption: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  channelOptionText: {
    fontSize: 14,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    marginBottom: 12,
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  userName: {
    fontSize: 12,
    marginBottom: 4,
    marginLeft: 12,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  imageContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
  },
  imageText: {
    fontSize: 14,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    zIndex: 999,
    elevation: 999,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    fontSize: 16,
    zIndex: 999,
    elevation: 999,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 