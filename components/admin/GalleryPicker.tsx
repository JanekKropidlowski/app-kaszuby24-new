import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Linking,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Plus, X, ImagePlus } from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';
import { uploadImage } from '@/services/adminApi';

interface Props {
  urls: string[];
  onChange: (urls: string[]) => void;
}

export default function GalleryPicker({ urls, onChange }: Props) {
  const { theme } = useThemeStore();
  const c = theme.colors;

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });

  const addImages = async () => {
    const { status, canAskAgain } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      if (!canAskAgain) {
        Alert.alert(
          'Brak dostępu do galerii zdjęć',
          'Aby dodać zdjęcia do galerii, włącz dostęp w ustawieniach systemowych.',
          [
            { text: 'Anuluj', style: 'cancel' },
            { text: 'Otwórz Ustawienia', onPress: () => Linking.openSettings() },
          ]
        );
      } else {
        Alert.alert('Brak dostępu', 'Aplikacja potrzebuje dostępu do galerii zdjęć.');
      }
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 20,
      quality: 0.85,
    });

    if (result.canceled || !result.assets?.length) return;

    setUploading(true);
    setProgress({ done: 0, total: result.assets.length });

    const uploaded: string[] = [];
    for (let i = 0; i < result.assets.length; i++) {
      try {
        const { url } = await uploadImage(result.assets[i].uri);
        uploaded.push(url);
        setProgress({ done: i + 1, total: result.assets.length });
      } catch (err: any) {
        Alert.alert('Błąd', `Nie udało się wysłać zdjęcia ${i + 1}: ${err.message}`);
      }
    }

    if (uploaded.length) {
      onChange([...urls, ...uploaded]);
    }
    setUploading(false);
    setProgress({ done: 0, total: 0 });
  };

  const removeAt = (idx: number) => {
    onChange(urls.filter((_, i) => i !== idx));
  };

  return (
    <View style={styles.container}>
      {urls.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {urls.map((url, i) => (
            <View key={`${url}-${i}`} style={[styles.thumb, { borderColor: c.border }]}>
              <ExpoImage source={{ uri: url }} style={styles.thumbImg} contentFit="cover" transition={150} />
              <TouchableOpacity
                style={[styles.removeBtn, { backgroundColor: c.error }]}
                onPress={() => removeAt(i)}
              >
                <X size={12} color="#fff" strokeWidth={3} />
              </TouchableOpacity>
              <View style={[styles.indexBadge, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
                <Text style={styles.indexText}>{i + 1}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <TouchableOpacity
        style={[styles.addBtn, { borderColor: c.primary, backgroundColor: c.primary + '10', opacity: uploading ? 0.6 : 1 }]}
        onPress={addImages}
        disabled={uploading}
      >
        {uploading ? (
          <>
            <ActivityIndicator size="small" color={c.primary} />
            <Text style={[styles.addBtnText, { color: c.primary, fontFamily: 'Poppins_Medium' }]}>
              Wysyłam {progress.done}/{progress.total}...
            </Text>
          </>
        ) : (
          <>
            {urls.length > 0 ? <Plus size={16} color={c.primary} /> : <ImagePlus size={16} color={c.primary} />}
            <Text style={[styles.addBtnText, { color: c.primary, fontFamily: 'Poppins_Medium' }]}>
              {urls.length > 0 ? `Dodaj więcej (${urls.length})` : 'Dodaj zdjęcia do galerii'}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  scroll: { gap: 8, paddingVertical: 2 },
  thumb: {
    width: 90, height: 90, borderRadius: 10,
    overflow: 'hidden', borderWidth: 1, position: 'relative',
  },
  thumbImg: { width: '100%', height: '100%' },
  removeBtn: {
    position: 'absolute', top: 4, right: 4,
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  indexBadge: {
    position: 'absolute', bottom: 4, left: 4,
    minWidth: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
  },
  indexText: { color: '#fff', fontSize: 10, fontFamily: 'Poppins_SemiBold' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 10,
    paddingVertical: 14,
  },
  addBtnText: { fontSize: 13 },
});
