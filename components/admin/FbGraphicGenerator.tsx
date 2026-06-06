import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Share,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Sparkles, RefreshCw, Share2, Facebook } from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';
import { previewFbCard } from '@/services/adminApi';

interface Props {
  title: string;
  excerpt?: string;
  imageUrl: string;
  articleId?: number | null;
}

export default function FbGraphicGenerator({ title, excerpt, imageUrl, articleId }: Props) {
  const { theme } = useThemeStore();
  const c = theme.colors;
  const [generating, setGenerating] = useState(false);
  const [cardUrl, setCardUrl] = useState<string | null>(null);

  const canGenerate = !!title && !!imageUrl;

  const generate = async (force = false) => {
    if (!title.trim()) { Alert.alert('Błąd', 'Najpierw wpisz tytuł'); return; }
    if (!imageUrl) { Alert.alert('Błąd', 'Najpierw dodaj zdjęcie główne'); return; }

    setGenerating(true);
    try {
      const res = await previewFbCard({
        imageUrl,
        title,
        excerpt: excerpt || '',
        postId: articleId || 0,
        force,
      });
      setCardUrl(res.data.url);
    } catch (err: any) {
      Alert.alert('Błąd', err.response?.data?.error || 'Nie udało się wygenerować grafiki');
    } finally {
      setGenerating(false);
    }
  };

  const shareCard = async () => {
    if (!cardUrl) return;
    try {
      await Share.share({
        url: cardUrl,
        message: `${title}\n\n${cardUrl}`,
      });
    } catch { /* user cancelled */ }
  };

  return (
    <View style={[styles.container, { borderColor: c.border, backgroundColor: c.card }]}>
      <View style={styles.header}>
        <Facebook size={16} color="#1877F2" />
        <Text style={[styles.headerTitle, { color: c.text, fontFamily: 'Poppins_SemiBold' }]}>
          Grafika do postu FB
        </Text>
        <Text style={[styles.headerSub, { color: c.textSecondary, fontFamily: 'Poppins_Regular' }]}>
          1080×1350
        </Text>
      </View>

      {!cardUrl ? (
        <>
          <Text style={[styles.intro, { color: c.textSecondary, fontFamily: 'Poppins_Regular' }]}>
            Wygeneruje brandowaną kartę z tytułem, zajawką, logiem i zdjęciem głównym.
          </Text>

          <TouchableOpacity
            style={[styles.generateBtn, { backgroundColor: canGenerate ? '#1877F2' : c.subtle, opacity: generating ? 0.7 : 1 }]}
            onPress={() => generate(false)}
            disabled={!canGenerate || generating}
          >
            {generating
              ? <ActivityIndicator color={canGenerate ? '#fff' : c.textSecondary} />
              : <>
                  <Sparkles size={16} color={canGenerate ? '#fff' : c.textSecondary} />
                  <Text style={[styles.generateBtnText, { color: canGenerate ? '#fff' : c.textSecondary, fontFamily: 'Poppins_SemiBold' }]}>
                    Generuj grafikę FB
                  </Text>
                </>
            }
          </TouchableOpacity>

          {!canGenerate && (
            <Text style={[styles.hint, { color: c.warning, fontFamily: 'Poppins_Regular' }]}>
              {!title ? 'Brak tytułu' : !imageUrl ? 'Brak zdjęcia głównego' : ''}
            </Text>
          )}
        </>
      ) : (
        <View style={styles.previewBox}>
          <View style={[styles.imageWrap, { borderColor: c.border }]}>
            <ExpoImage
              source={{ uri: cardUrl }}
              style={styles.image}
              contentFit="cover"
              transition={200}
            />
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: c.border, opacity: generating ? 0.5 : 1 }]}
              onPress={() => generate(true)}
              disabled={generating}
            >
              {generating
                ? <ActivityIndicator size="small" color={c.text} />
                : <><RefreshCw size={14} color={c.text} /><Text style={[styles.actionBtnText, { color: c.text, fontFamily: 'Poppins_Medium' }]}>Wygeneruj nową</Text></>
              }
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#1877F2', borderColor: '#1877F2' }]}
              onPress={shareCard}
            >
              <Share2 size={14} color="#fff" />
              <Text style={[styles.actionBtnText, { color: '#fff', fontFamily: 'Poppins_Medium' }]}>Udostępnij</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { flex: 1, fontSize: 14 },
  headerSub: { fontSize: 11 },
  intro: { fontSize: 12, lineHeight: 17 },
  generateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: 10, paddingVertical: 12,
  },
  generateBtnText: { fontSize: 14 },
  hint: { fontSize: 12, textAlign: 'center' },
  previewBox: { gap: 10 },
  imageWrap: {
    borderRadius: 10, overflow: 'hidden', borderWidth: 1,
    aspectRatio: 1080 / 1350,
    maxHeight: 400,
    alignSelf: 'center',
    width: '70%',
  },
  image: { width: '100%', height: '100%' },
  actionsRow: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, borderWidth: 1, borderRadius: 8, paddingVertical: 10,
  },
  actionBtnText: { fontSize: 13 },
});
