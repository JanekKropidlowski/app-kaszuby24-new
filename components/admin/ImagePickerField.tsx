import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, TextInput, Linking, Platform,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Trash2, Link2, ImagePlus } from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';
import { uploadImage } from '@/services/adminApi';

function showPermissionAlert(kind: 'gallery' | 'camera') {
  const label = kind === 'gallery' ? 'galerii zdjęć' : 'aparatu';
  Alert.alert(
    `Brak dostępu do ${label}`,
    `Aby wybrać zdjęcie, włącz dostęp do ${label} w ustawieniach systemowych.`,
    [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Otwórz Ustawienia', onPress: () => Linking.openSettings() },
    ]
  );
}

interface Props {
  value: string;
  onChange: (url: string) => void;
}

export default function ImagePickerField({ value, onChange }: Props) {
  const { theme } = useThemeStore();
  const c = theme.colors;

  const [uploading, setUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');

  const pickFromGallery = async () => {
    const { status, canAskAgain } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      if (!canAskAgain) {
        showPermissionAlert('gallery');
      } else {
        Alert.alert('Brak dostępu', 'Aplikacja potrzebuje dostępu do galerii zdjęć.');
      }
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.85,
    });

    if (result.canceled || !result.assets?.[0]) return;

    setUploading(true);
    try {
      const { url } = await uploadImage(result.assets[0].uri);
      onChange(url);
    } catch (err: any) {
      Alert.alert('Błąd wysyłania', err.message || 'Nie udało się wysłać zdjęcia');
    } finally {
      setUploading(false);
    }
  };

  const takePhoto = async () => {
    const { status, canAskAgain } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      if (!canAskAgain) {
        showPermissionAlert('camera');
      } else {
        Alert.alert('Brak dostępu', 'Aplikacja potrzebuje dostępu do aparatu.');
      }
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.85,
    });

    if (result.canceled || !result.assets?.[0]) return;

    setUploading(true);
    try {
      const { url } = await uploadImage(result.assets[0].uri);
      onChange(url);
    } catch (err: any) {
      Alert.alert('Błąd wysyłania', err.message || 'Nie udało się wysłać zdjęcia');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    Alert.alert('Usuń zdjęcie', 'Czy na pewno chcesz usunąć zdjęcie?', [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Usuń', style: 'destructive', onPress: () => onChange('') },
    ]);
  };

  const applyUrl = () => {
    const t = urlDraft.trim();
    if (t) onChange(t);
    setShowUrlInput(false);
    setUrlDraft('');
  };

  if (value) {
    return (
      <View style={[styles.preview, { borderColor: c.border }]}>
        <ExpoImage source={{ uri: value }} style={styles.image} contentFit="cover" transition={200} />
        {uploading && (
          <View style={styles.overlay}>
            <ActivityIndicator color="#fff" />
            <Text style={styles.overlayText}>Wysyłam...</Text>
          </View>
        )}
        <View style={[styles.previewActions, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <TouchableOpacity style={styles.previewBtn} onPress={pickFromGallery} disabled={uploading}>
            <ImagePlus size={16} color="#fff" />
            <Text style={styles.previewBtnText}>Zmień</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.previewBtn} onPress={removeImage} disabled={uploading}>
            <Trash2 size={16} color="#fff" />
            <Text style={styles.previewBtnText}>Usuń</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.buttonsRow}>
        <TouchableOpacity
          style={[styles.bigBtn, { backgroundColor: c.primary, opacity: uploading ? 0.7 : 1 }]}
          onPress={pickFromGallery}
          disabled={uploading}
        >
          {uploading
            ? <ActivityIndicator size="small" color="#fff" />
            : <ImagePlus size={20} color="#fff" />
          }
          <Text style={[styles.bigBtnText, { fontFamily: 'Poppins_SemiBold' }]}>
            {uploading ? 'Wysyłam...' : 'Z galerii'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.bigBtn, { backgroundColor: c.subtle, borderWidth: 1, borderColor: c.border, opacity: uploading ? 0.5 : 1 }]}
          onPress={takePhoto}
          disabled={uploading}
        >
          <Camera size={20} color={c.text} />
          <Text style={[styles.bigBtnText, { color: c.text, fontFamily: 'Poppins_SemiBold' }]}>
            Aparat
          </Text>
        </TouchableOpacity>
      </View>

      {showUrlInput ? (
        <View style={[styles.urlInputRow, { borderColor: c.border, backgroundColor: c.subtle }]}>
          <TextInput
            style={[styles.urlInput, { color: c.text, fontFamily: 'Poppins_Regular' }]}
            placeholder="https://..."
            placeholderTextColor={c.textSecondary}
            value={urlDraft}
            onChangeText={setUrlDraft}
            autoFocus
            autoCapitalize="none"
            keyboardType="url"
            onSubmitEditing={applyUrl}
          />
          <TouchableOpacity onPress={applyUrl} style={[styles.urlOkBtn, { backgroundColor: c.primary }]}>
            <Text style={[styles.urlOkText, { fontFamily: 'Poppins_SemiBold' }]}>OK</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.urlToggle} onPress={() => setShowUrlInput(true)}>
          <Link2 size={13} color={c.textSecondary} />
          <Text style={[styles.urlToggleText, { color: c.textSecondary, fontFamily: 'Poppins_Regular' }]}>
            lub wklej URL
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  buttonsRow: { flexDirection: 'row', gap: 10 },
  bigBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 12, paddingVertical: 16,
  },
  bigBtnText: { color: '#fff', fontSize: 14 },
  urlToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'center', paddingVertical: 6,
  },
  urlToggleText: { fontSize: 12, textDecorationLine: 'underline' },
  urlInputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 10, paddingLeft: 12, overflow: 'hidden',
  },
  urlInput: { flex: 1, paddingVertical: 10, fontSize: 14 },
  urlOkBtn: { paddingHorizontal: 16, paddingVertical: 12 },
  urlOkText: { color: '#fff', fontSize: 13 },
  preview: {
    borderRadius: 12, overflow: 'hidden', borderWidth: 1, aspectRatio: 16 / 9,
    position: 'relative',
  },
  image: { width: '100%', height: '100%' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  overlayText: { color: '#fff', fontSize: 13, fontFamily: 'Poppins_Medium' },
  previewActions: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-around',
    paddingVertical: 10,
  },
  previewBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  previewBtnText: { color: '#fff', fontSize: 13, fontFamily: 'Poppins_Medium' },
});
