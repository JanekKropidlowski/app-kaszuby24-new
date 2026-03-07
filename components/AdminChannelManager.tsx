import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useThemeStore } from '@/store/themeStore';
import { useCommunityStore } from '@/store/communityStore';
import { Plus, Edit, Trash2, Users, MessageCircle } from 'lucide-react-native';

interface AdminChannelManagerProps {
  visible: boolean;
  onClose: () => void;
}

export const AdminChannelManager: React.FC<AdminChannelManagerProps> = ({
  visible,
  onClose,
}) => {
  const { theme } = useThemeStore();
  const { 
    streamChannels,
    setStreamChannels
  } = useCommunityStore();

  const [selectedChannel, setSelectedChannel] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const handleCreateChannel = () => {
    setShowCreateModal(true);
  };

  const handleEditChannel = (channel: any) => {
    setSelectedChannel(channel);
    setShowEditModal(true);
  };

  const handleDeleteChannel = (channelId: string) => {
    Alert.alert(
      'Usuń kanał',
      'Czy na pewno chcesz usunąć ten kanał?',
      [
        { text: 'Anuluj', style: 'cancel' },
        { 
          text: 'Usuń', 
          style: 'destructive',
          onPress: () => {
            // TODO: Implementacja usuwania kanału w GetStream.io
            const updatedChannels = streamChannels.filter(ch => ch.id !== channelId);
            setStreamChannels(updatedChannels);
          }
        }
      ]
    );
  };

  if (!visible) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Zarządzanie kanałami
        </Text>
        <TouchableOpacity 
          style={[styles.createButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleCreateChannel}
        >
          <Plus size={20} color="#FFFFFF" />
          <Text style={styles.createButtonText}>Nowy kanał</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {streamChannels.map((channel) => (
          <View key={channel.id} style={[styles.channelCard, { backgroundColor: theme.colors.card }]}>
            <View style={styles.channelInfo}>
              <View style={[styles.channelIcon, { backgroundColor: theme.colors.primary }]}>
                <MessageCircle size={24} color="#FFFFFF" />
              </View>
              <View style={styles.channelDetails}>
                <Text style={[styles.channelName, { color: theme.colors.text }]}>
                  {channel.name}
                </Text>
                <Text style={[styles.channelDescription, { color: theme.colors.textSecondary }]}>
                  {channel.description || 'Brak opisu'}
                </Text>
                <View style={styles.channelStats}>
                  <Users size={16} color={theme.colors.textSecondary} />
                  <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                    {channel.memberCount || 0} członków
                  </Text>
                </View>
              </View>
            </View>
            
            <View style={styles.channelActions}>
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: theme.colors.subtle }]}
                onPress={() => handleEditChannel(channel)}
              >
                <Edit size={16} color={theme.colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: theme.colors.error }]}
                onPress={() => handleDeleteChannel(channel.id)}
              >
                <Trash2 size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* TODO: Implementacja edycji kanału w GetStream.io */}
      {showEditModal && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: theme.colors.background }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Edytuj kanał
            </Text>
            <Text style={[styles.modalText, { color: theme.colors.textSecondary }]}>
              Funkcja edycji kanału będzie dostępna wkrótce.
            </Text>
            <TouchableOpacity 
              style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => setShowEditModal(false)}
            >
              <Text style={styles.modalButtonText}>Zamknij</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* TODO: Implementacja usuwania kanału w GetStream.io */}
      {showCreateModal && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: theme.colors.background }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Nowy kanał
            </Text>
            <Text style={[styles.modalText, { color: theme.colors.textSecondary }]}>
              Funkcja tworzenia kanału będzie dostępna wkrótce.
            </Text>
            <TouchableOpacity 
              style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => setShowCreateModal(false)}
            >
              <Text style={styles.modalButtonText}>Zamknij</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
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
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  channelCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  channelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  channelIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  channelDetails: {
    flex: 1,
  },
  channelName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  channelDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  channelStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 12,
  },
  channelActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modal: {
    width: '80%',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modalText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  modalButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default AdminChannelManager; 