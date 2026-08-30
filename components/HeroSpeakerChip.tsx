import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Pause, Play, Mic } from 'lucide-react-native';
import { useTTSStore } from '@/store/ttsStore';
import { clipSourceId } from './SpeakerClipCard';
import type { AudioClip } from '@/types/article';

const YELLOW = '#fecc00';

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Plakietka na zdjęciu głównym artykułu: "Posłuchaj wypowiedzi". Odtwarza
 * nagranie w miejscu, bez przewijania do sekcji — dokładnie jak na stronie.
 */
export const HeroSpeakerChip = ({ clip }: { clip: AudioClip }) => {
  const tts = useTTSStore();
  const sourceId = clipSourceId(clip.id);
  const isCurrent = tts.sourceId === sourceId && tts.isVisible;
  const isPlaying = isCurrent && tts.status === 'playing';

  const name = clip.speaker_name || clip.speaker?.name || 'Wypowiedź';
  const photo = clip.speaker?.photo_url || null;

  const onPress = () => {
    if (isCurrent && (isPlaying || tts.status === 'paused')) {
      tts.toggle();
      return;
    }
    tts.start({
      title: name,
      subtitle: clip.speaker_title || clip.speaker?.title || 'Wypowiedź',
      categoryLabel: 'Wypowiedź',
      photoUrl: photo,
      sourceId,
      chunks: [],
      audioUrl: clip.audio_url,
      speakingRate: 1.0,
      language: 'pl-PL',
    });
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={styles.chip}
      accessibilityRole="button"
      accessibilityLabel={isPlaying ? 'Zatrzymaj wypowiedź' : `Posłuchaj wypowiedzi: ${name}`}
    >
      <View style={styles.avatarWrap}>
        {photo ? (
          <ExpoImage source={{ uri: photo }} style={styles.avatar} contentFit="cover" transition={150} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Mic size={14} color="#fff" />
          </View>
        )}
        <View style={styles.badge}>
          {isPlaying ? (
            <Pause size={9} color="#1a1a1a" />
          ) : (
            <Play size={9} color="#1a1a1a" style={{ marginLeft: 1 }} />
          )}
        </View>
      </View>

      <View style={styles.texts}>
        <Text style={styles.label} numberOfLines={1}>
          {isPlaying ? 'Zatrzymaj wypowiedź' : 'Posłuchaj wypowiedzi'}
        </Text>
        <Text style={styles.name} numberOfLines={1}>
          {name}
          {clip.duration_sec ? ` · ${fmt(clip.duration_sec)}` : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    position: 'absolute',
    left: 16,
    bottom: 16,
    maxWidth: '82%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 6,
    paddingRight: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.62)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  avatarWrap: { width: 34, height: 34 },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.2)' },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: YELLOW,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { marginLeft: 10, flexShrink: 1 },
  label: { fontFamily: 'Poppins_SemiBold', fontSize: 12, color: '#fff', lineHeight: 16 },
  name: { fontFamily: 'Poppins_Regular', fontSize: 11, color: 'rgba(255,255,255,0.78)', lineHeight: 15 },
});

export default HeroSpeakerChip;
