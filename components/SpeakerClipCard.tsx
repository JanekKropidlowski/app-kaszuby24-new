import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Pause, Play, Mic, ChevronDown } from 'lucide-react-native';
import { useTTSStore } from '@/store/ttsStore';
import type { AudioClip } from '@/types/article';

const YELLOW = '#fecc00';
const NAVY = '#224A96';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export const clipSourceId = (clipId: number) => `clip-${clipId}`;

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

interface Props {
  clip: AudioClip;
  theme: any;
  isDarkMode: boolean;
}

/**
 * Wypowiedź w treści artykułu: kto mówi, ile trwa, pasek postępu i
 * rozwijana transkrypcja. Odtwarzanie idzie przez ten sam store co lektor
 * artykułu, więc nagrania nigdy nie grają jednocześnie, a po zjechaniu
 * ekranem sterowanie przejmuje pasek nad tab barem.
 */
export const SpeakerClipCard = ({ clip, theme, isDarkMode }: Props) => {
  const tts = useTTSStore();
  const [transcriptOpen, setTranscriptOpen] = useState(false);

  const sourceId = clipSourceId(clip.id);
  const isCurrent = tts.sourceId === sourceId && tts.isVisible;
  const isPlaying = isCurrent && tts.status === 'playing';
  const isLoading = isCurrent && tts.status === 'loading';

  const name = clip.speaker_name || clip.speaker?.name || 'Wypowiedź';
  const title = clip.speaker_title || clip.speaker?.title || null;
  const photo = clip.speaker?.photo_url || null;

  const duration = isCurrent && tts.totalSecEst ? tts.totalSecEst : clip.duration_sec || 0;
  const position = isCurrent ? Math.min(tts.elapsedSec, duration || tts.elapsedSec) : 0;
  const progress = duration ? Math.min(1, position / duration) : 0;

  const cardBg = isDarkMode ? 'rgba(255,255,255,0.06)' : '#fff';
  const borderColor = isDarkMode ? 'rgba(255,255,255,0.12)' : '#e8e8ee';

  const onToggle = () => {
    if (isCurrent && (isPlaying || tts.status === 'paused')) {
      tts.toggle();
      return;
    }
    tts.start({
      title: name,
      subtitle: title || 'Wypowiedź',
      categoryLabel: 'Wypowiedź',
      photoUrl: photo,
      sourceId,
      chunks: [],
      audioUrl: clip.audio_url,
      speakingRate: 1.0,
      language: 'pl-PL',
    });
  };

  const toggleTranscript = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setTranscriptOpen((v) => !v);
  };

  const avatar = useMemo(
    () =>
      photo ? (
        <ExpoImage source={{ uri: photo }} style={styles.avatar} contentFit="cover" transition={150} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Mic size={18} color={NAVY} />
        </View>
      ),
    [photo],
  );

  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
      <View style={styles.row}>
        {avatar}

        <View style={styles.info}>
          <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
            {name}
          </Text>
          {!!title && (
            <Text style={[styles.title, { color: theme.textSecondary }]} numberOfLines={2}>
              {title}
            </Text>
          )}
        </View>

        <TouchableOpacity
          onPress={onToggle}
          activeOpacity={0.85}
          style={[styles.playButton, isPlaying && styles.playButtonActive]}
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? `Zatrzymaj wypowiedź: ${name}` : `Odtwórz wypowiedź: ${name}`}
        >
          {isPlaying ? <Pause size={20} color="#1a1a1a" /> : <Play size={20} color="#1a1a1a" style={{ marginLeft: 2 }} />}
        </TouchableOpacity>
      </View>

      <View style={styles.progressRow}>
        <View style={[styles.track, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.14)' : '#eceaf2' }]}>
          <View style={[styles.fill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={[styles.time, { color: theme.textSecondary }]}>
          {isCurrent ? `${fmt(position)} / ${duration ? fmt(duration) : '—'}` : duration ? fmt(duration) : '—'}
        </Text>
      </View>

      {isLoading && (
        <Text style={[styles.loading, { color: theme.textSecondary }]}>Wczytywanie nagrania…</Text>
      )}

      {!!clip.caption && (
        <Text style={[styles.caption, { color: theme.textSecondary }]}>{clip.caption}</Text>
      )}

      {!!clip.transcript && (
        <>
          <TouchableOpacity
            onPress={toggleTranscript}
            activeOpacity={0.7}
            style={[styles.transcriptToggle, { borderTopColor: borderColor }]}
            accessibilityRole="button"
            accessibilityLabel={transcriptOpen ? 'Ukryj transkrypcję' : 'Pokaż transkrypcję'}
          >
            <ChevronDown
              size={14}
              color={theme.textSecondary}
              style={{ transform: [{ rotate: transcriptOpen ? '180deg' : '0deg' }] }}
            />
            <Text style={[styles.transcriptLabel, { color: theme.textSecondary }]}>
              {transcriptOpen ? 'Ukryj transkrypcję' : 'Transkrypcja'}
            </Text>
          </TouchableOpacity>
          {transcriptOpen && (
            <Text style={[styles.transcript, { color: theme.text }]}>{clip.transcript}</Text>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    marginBottom: 12,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#f0f0f5' },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, marginLeft: 12, marginRight: 10 },
  name: { fontFamily: 'Poppins_SemiBold', fontSize: 15, lineHeight: 20 },
  title: { fontFamily: 'Poppins_Regular', fontSize: 12, lineHeight: 16, marginTop: 1 },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: YELLOW,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 5,
    elevation: 3,
  },
  playButtonActive: { backgroundColor: '#ffd83d' },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  track: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2, backgroundColor: NAVY },
  time: { fontFamily: 'Poppins_Regular', fontSize: 11, marginLeft: 10, minWidth: 76, textAlign: 'right' },
  loading: { fontFamily: 'Poppins_Regular', fontSize: 11, marginTop: 8 },
  caption: { fontFamily: 'Poppins_Regular', fontSize: 12, fontStyle: 'italic', marginTop: 8 },
  transcriptToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  transcriptLabel: { fontFamily: 'Poppins_Medium', fontSize: 12 },
  transcript: { fontFamily: 'Poppins_Regular', fontSize: 13, lineHeight: 20, marginTop: 8 },
});

export default SpeakerClipCard;
