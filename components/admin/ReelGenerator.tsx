import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Linking,
} from 'react-native';
import { Sparkles, Video, ChevronDown, ChevronUp, Send, ExternalLink } from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';
import {
  generateReel, getReelStatus, publishReelToFb,
  ReelTemplateId, ReelJob,
} from '@/services/adminApi';

interface Props {
  articleId: number | null;
}

const TEMPLATES: { id: ReelTemplateId; icon: string; label: string; desc: string }[] = [
  { id: 'keypoints',    icon: '🎯', label: 'Najważniejsze', desc: 'Logo → zdjęcie + tytuł → 3 kluczowe fakty → CTA' },
  { id: 'teleprompter', icon: '📖', label: 'Lektor',         desc: 'Tekst narracji zdanie po zdaniu, zdjęcie w tle' },
  { id: 'breaking',     icon: '🔴', label: 'Ekspres',        desc: 'Breaking news, czarne tło, czerwony pasek' },
];

const STATUS_LABELS: Record<string, string> = {
  pending: 'Inicjalizacja...',
  generating_script: 'Generuję skrypt (AI)...',
  generating_audio: 'Generuję audio (ElevenLabs)...',
  rendering: 'Renderuję video (Remotion)...',
  uploading: 'Wysyłam do storage...',
};

export default function ReelGenerator({ articleId }: Props) {
  const { theme } = useThemeStore();
  const c = theme.colors;

  const [expanded, setExpanded] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ReelTemplateId>('keypoints');
  const [generating, setGenerating] = useState(false);
  const [job, setJob] = useState<ReelJob | null>(null);
  const [publishing, setPublishing] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  const startGenerate = async () => {
    if (!articleId) return;
    setGenerating(true);
    setJob(null);
    try {
      const res = await generateReel(articleId, selectedTemplate);
      const jobId = res.data.jobId;
      pollJob(jobId);
    } catch (err: any) {
      Alert.alert('Błąd', err.response?.data?.error || 'Nie udało się rozpocząć generowania');
      setGenerating(false);
    }
  };

  const pollJob = (jobId: string) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    const poll = async () => {
      try {
        const res = await getReelStatus(jobId);
        const j = res.data;
        setJob(j);
        if (j.status === 'done' || j.status === 'error') {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          setGenerating(false);
        }
      } catch {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        setGenerating(false);
      }
    };

    poll();
    pollTimerRef.current = setInterval(poll, 3000);
  };

  const handlePublish = () => {
    if (!job?.id) return;
    Alert.alert(
      'Opublikuj rolkę na Facebook',
      `Rolka "${job.scriptData?.titleShort || 'Bez tytułu'}" zostanie opublikowana na Twoim fanpage.`,
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Opublikuj teraz',
          onPress: async () => {
            setPublishing(true);
            try {
              await publishReelToFb(job.id, {});
              Alert.alert('Sukces!', 'Rolka została opublikowana na Facebooku.');
            } catch (err: any) {
              Alert.alert('Błąd', err.response?.data?.error || 'Nie udało się opublikować');
            } finally {
              setPublishing(false);
            }
          },
        },
      ]
    );
  };

  if (!articleId) {
    return (
      <View style={[styles.disabledBox, { borderColor: c.border, backgroundColor: c.subtle }]}>
        <Sparkles size={16} color={c.textSecondary} />
        <Text style={[styles.disabledText, { color: c.textSecondary, fontFamily: 'Poppins_Regular' }]}>
          Zapisz artykuł, aby wygenerować rolkę
        </Text>
      </View>
    );
  }

  const isReady = job?.status === 'done' && job.reelUrl;
  const isError = job?.status === 'error';
  const inProgress = generating && !isReady && !isError;

  return (
    <View style={[styles.container, { borderColor: c.border, backgroundColor: c.card }]}>
      <TouchableOpacity style={styles.header} onPress={() => setExpanded(!expanded)} activeOpacity={0.7}>
        <Video size={16} color={c.primary} />
        <Text style={[styles.headerTitle, { color: c.text, fontFamily: 'Poppins_SemiBold' }]}>
          Generator rolki FB
        </Text>
        {isReady && (
          <View style={[styles.statusPill, { backgroundColor: c.success + '20' }]}>
            <Text style={[styles.statusPillText, { color: c.success, fontFamily: 'Poppins_Medium' }]}>Gotowa</Text>
          </View>
        )}
        {expanded
          ? <ChevronUp size={16} color={c.textSecondary} />
          : <ChevronDown size={16} color={c.textSecondary} />
        }
      </TouchableOpacity>

      {expanded && (
        <View style={[styles.body, { borderTopColor: c.border }]}>
          {!inProgress && !isReady && (
            <>
              <Text style={[styles.label, { color: c.textSecondary, fontFamily: 'Poppins_Medium' }]}>
                Wybierz szablon
              </Text>
              <View style={styles.templatesRow}>
                {TEMPLATES.map(t => (
                  <TouchableOpacity
                    key={t.id}
                    style={[
                      styles.templateBtn,
                      { borderColor: c.border, backgroundColor: c.subtle },
                      selectedTemplate === t.id && { backgroundColor: c.primary, borderColor: c.primary },
                    ]}
                    onPress={() => setSelectedTemplate(t.id)}
                  >
                    <Text style={styles.templateIcon}>{t.icon}</Text>
                    <Text style={[
                      styles.templateLabel,
                      { color: selectedTemplate === t.id ? '#fff' : c.text, fontFamily: 'Poppins_Medium' },
                    ]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[styles.templateDesc, { color: c.textSecondary, fontFamily: 'Poppins_Regular' }]}>
                {TEMPLATES.find(t => t.id === selectedTemplate)?.desc}
              </Text>

              <TouchableOpacity
                style={[styles.generateBtn, { backgroundColor: c.primary }]}
                onPress={startGenerate}
              >
                <Sparkles size={16} color="#fff" />
                <Text style={[styles.generateBtnText, { fontFamily: 'Poppins_SemiBold' }]}>
                  Generuj rolkę
                </Text>
              </TouchableOpacity>
            </>
          )}

          {inProgress && job && (
            <View style={styles.progressBox}>
              <View style={styles.progressRow}>
                <ActivityIndicator color={c.primary} size="small" />
                <Text style={[styles.progressText, { color: c.text, fontFamily: 'Poppins_Medium' }]}>
                  {STATUS_LABELS[job.status] || 'Przetwarzam...'}
                </Text>
              </View>
              {job.progress > 0 && (
                <View style={[styles.progressBar, { backgroundColor: c.subtle }]}>
                  <View style={[styles.progressFill, { backgroundColor: c.primary, width: `${Math.min(100, job.progress)}%` }]} />
                </View>
              )}
              <Text style={[styles.progressNote, { color: c.textSecondary, fontFamily: 'Poppins_Regular' }]}>
                Generowanie trwa ~1-2 min. Możesz tymczasem robić co innego.
              </Text>
            </View>
          )}

          {isReady && job && (
            <View style={styles.readyBox}>
              {job.scriptData?.titleShort && (
                <Text style={[styles.readyTitle, { color: c.text, fontFamily: 'Poppins_SemiBold' }]} numberOfLines={2}>
                  {job.scriptData.titleShort}
                </Text>
              )}
              {Array.isArray(job.scriptData?.points) && job.scriptData!.points!.length > 0 && (
                <View style={[styles.pointsBox, { borderColor: c.border, backgroundColor: c.subtle }]}>
                  {job.scriptData!.points!.map((p, i) => (
                    <Text key={i} style={[styles.pointText, { color: c.text, fontFamily: 'Poppins_Regular' }]}>
                      • {p}
                    </Text>
                  ))}
                </View>
              )}

              <View style={styles.readyActions}>
                <TouchableOpacity
                  style={[styles.linkBtn, { borderColor: c.border }]}
                  onPress={() => Linking.openURL(job.reelUrl!)}
                >
                  <ExternalLink size={14} color={c.text} />
                  <Text style={[styles.linkBtnText, { color: c.text, fontFamily: 'Poppins_Medium' }]}>Podgląd</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.publishBtn, { backgroundColor: '#1877F2', opacity: publishing ? 0.7 : 1 }]}
                  onPress={handlePublish}
                  disabled={publishing}
                >
                  {publishing
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <><Send size={14} color="#fff" /><Text style={[styles.publishBtnText, { fontFamily: 'Poppins_SemiBold' }]}>Publikuj na FB</Text></>
                  }
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={() => { setJob(null); setGenerating(false); }} style={styles.regenLink}>
                <Text style={[styles.regenLinkText, { color: c.primary, fontFamily: 'Poppins_Medium' }]}>
                  Wygeneruj nową rolkę →
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {isError && (
            <View style={[styles.errorBox, { backgroundColor: c.error + '15' }]}>
              <Text style={[styles.errorText, { color: c.error, fontFamily: 'Poppins_Medium' }]}>
                Błąd: {job?.error || 'Generowanie nie powiodło się'}
              </Text>
              <TouchableOpacity onPress={() => { setJob(null); setGenerating(false); }}>
                <Text style={[styles.regenLinkText, { color: c.primary, fontFamily: 'Poppins_Medium' }]}>
                  Spróbuj ponownie →
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  headerTitle: { flex: 1, fontSize: 14 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusPillText: { fontSize: 11 },
  body: { padding: 14, borderTopWidth: 1, gap: 10 },
  label: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4 },
  templatesRow: { flexDirection: 'row', gap: 8 },
  templateBtn: {
    flex: 1, alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 4,
  },
  templateIcon: { fontSize: 18 },
  templateLabel: { fontSize: 12, textAlign: 'center' },
  templateDesc: { fontSize: 12, fontStyle: 'italic' },
  generateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 10, paddingVertical: 13, marginTop: 4,
  },
  generateBtnText: { color: '#fff', fontSize: 14 },
  progressBox: { gap: 10 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressText: { fontSize: 13 },
  progressBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressNote: { fontSize: 11 },
  readyBox: { gap: 10 },
  readyTitle: { fontSize: 14, lineHeight: 20 },
  pointsBox: { borderWidth: 1, borderRadius: 10, padding: 10, gap: 4 },
  pointText: { fontSize: 12, lineHeight: 18 },
  readyActions: { flexDirection: 'row', gap: 8 },
  linkBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9,
  },
  linkBtnText: { fontSize: 13 },
  publishBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9,
  },
  publishBtnText: { color: '#fff', fontSize: 13 },
  regenLink: { alignSelf: 'center', paddingVertical: 6 },
  regenLinkText: { fontSize: 12, textDecorationLine: 'underline' },
  errorBox: { padding: 12, borderRadius: 10, gap: 8 },
  errorText: { fontSize: 13 },
  disabledBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderStyle: 'dashed', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 14,
  },
  disabledText: { fontSize: 13 },
});
