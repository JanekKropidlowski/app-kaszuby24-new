import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, TextInput,
  ActivityIndicator, ScrollView, Alert,
} from 'react-native';
import { Sparkles, X, FileText, Wand2, MessageSquare } from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';
import { aiSeo, aiChat, aiGenerateContent, findOrCreateTags, AiChatAction } from '@/services/adminApi';
import { Tag } from './TagInput';

interface Props {
  title: string;
  content: string;
  setContent: (v: string) => void;
  setFbText: (v: string) => void;
  setSeoTitle?: (v: string) => void;
  setSeoDescription?: (v: string) => void;
  onSuggestedTags?: (tags: Tag[]) => void;
}

const CHAT_ACTIONS: { id: AiChatAction; label: string; emoji: string }[] = [
  { id: 'shorten',     label: 'Skróć',         emoji: '✂️' },
  { id: 'expand',      label: 'Rozwiń',        emoji: '📝' },
  { id: 'rewrite',     label: 'Przepisz',      emoji: '🔄' },
  { id: 'first-person', label: 'Pierwsza osoba', emoji: '👤' },
  { id: 'fix-grammar', label: 'Popraw błędy',  emoji: '✏️' },
];

export default function AiAssistant(props: Props) {
  const { theme } = useThemeStore();
  const c = theme.colors;
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'menu' | 'brief' | 'chat' | 'custom'>('menu');
  const [briefText, setBriefText] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  const close = () => {
    setOpen(false);
    setMode('menu');
    setBriefText('');
    setCustomPrompt('');
  };

  const runSeo = async () => {
    if (!props.title.trim()) { Alert.alert('Błąd', 'Najpierw wpisz tytuł artykułu'); return; }
    if (!props.content.trim() || props.content.length < 50) {
      Alert.alert('Błąd', 'Treść musi mieć co najmniej kilka zdań');
      return;
    }
    setLoading(true);
    try {
      const res = await aiSeo(props.title, props.content);
      const d = res.data;
      if (d.seo_title && props.setSeoTitle) props.setSeoTitle(d.seo_title);
      if (d.seo_description && props.setSeoDescription) props.setSeoDescription(d.seo_description);
      if (d.fb_text) props.setFbText(d.fb_text);

      // Auto-add suggested tags
      if (d.suggested_tags?.length && props.onSuggestedTags) {
        try {
          const tagRes = await findOrCreateTags(d.suggested_tags);
          props.onSuggestedTags(tagRes.data || []);
        } catch { /* ignore */ }
      }

      Alert.alert('Gotowe!', 'AI wypełnił SEO i tekst FB.');
      close();
    } catch (err: any) {
      Alert.alert('Błąd AI', err.response?.data?.error || 'Nie udało się wygenerować');
    } finally {
      setLoading(false);
    }
  };

  const runBrief = async () => {
    if (!props.title.trim()) { Alert.alert('Błąd', 'Najpierw wpisz tytuł artykułu'); return; }
    if (!briefText.trim()) { Alert.alert('Błąd', 'Podaj notatki/brief'); return; }
    setLoading(true);
    try {
      const res = await aiGenerateContent(props.title, briefText);
      const d = res.data;
      if (d.content) props.setContent(d.content);
      if (d.fb_text) props.setFbText(d.fb_text);
      Alert.alert('Gotowe!', 'AI napisał pełny artykuł z Twojego briefu.');
      close();
    } catch (err: any) {
      Alert.alert('Błąd AI', err.response?.data?.error || 'Nie udało się wygenerować');
    } finally {
      setLoading(false);
    }
  };

  const runChat = async (action: AiChatAction, customPromptValue?: string) => {
    if (!props.title.trim() || !props.content.trim()) {
      Alert.alert('Błąd', 'Tytuł i treść są wymagane'); return;
    }
    setLoading(true);
    try {
      const res = await aiChat(props.title, props.content, action, customPromptValue);
      const newContent = res.data.proposed_content;
      if (newContent) {
        Alert.alert(
          'AI ma propozycję',
          'Czy zastąpić obecną treść?',
          [
            { text: 'Anuluj', style: 'cancel' },
            { text: 'Zastąp', onPress: () => { props.setContent(newContent); close(); } },
          ]
        );
      } else {
        Alert.alert('Błąd', 'AI nie zwrócił treści');
      }
    } catch (err: any) {
      Alert.alert('Błąd AI', err.response?.data?.error || 'Nie udało się przetworzyć');
    } finally {
      setLoading(false);
    }
  };

  const trigger = (
    <TouchableOpacity
      style={[styles.trigger, { backgroundColor: '#7C3AED' }]}
      onPress={() => setOpen(true)}
    >
      <Sparkles size={16} color="#fff" />
      <Text style={[styles.triggerText, { fontFamily: 'Poppins_SemiBold' }]}>
        Asystent AI
      </Text>
    </TouchableOpacity>
  );

  return (
    <>
      {trigger}

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
        <View style={[styles.modal, { backgroundColor: c.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: c.border }]}>
            <Sparkles size={20} color="#7C3AED" />
            <Text style={[styles.modalTitle, { color: c.text, fontFamily: 'Poppins_SemiBold' }]}>
              Asystent AI
            </Text>
            <TouchableOpacity onPress={close} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <X size={22} color={c.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody}>
            {mode === 'menu' && (
              <>
                <Text style={[styles.intro, { color: c.textSecondary, fontFamily: 'Poppins_Regular' }]}>
                  AI pomoże Ci napisać artykuł, wygenerować SEO, FB text i tagi automatycznie.
                </Text>

                <MenuButton
                  icon={<FileText size={20} color="#7C3AED" />}
                  title="Wygeneruj artykuł z briefu"
                  desc="Podaj kilka notatek/punktów — AI napisze pełną treść"
                  onPress={() => setMode('brief')}
                  theme={theme}
                />

                <MenuButton
                  icon={<Wand2 size={20} color={c.success} />}
                  title="Wygeneruj SEO i tekst FB"
                  desc="Z gotowego artykułu: tytuł SEO, meta description, post FB, tagi"
                  onPress={runSeo}
                  loading={loading}
                  theme={theme}
                />

                <MenuButton
                  icon={<MessageSquare size={20} color={c.warning} />}
                  title="Popraw treść"
                  desc="Skróć, rozwiń, popraw błędy, przepisz w innym stylu"
                  onPress={() => setMode('chat')}
                  theme={theme}
                />
              </>
            )}

            {mode === 'brief' && (
              <>
                <TouchableOpacity onPress={() => setMode('menu')} style={styles.backLink}>
                  <Text style={[styles.backLinkText, { color: c.primary, fontFamily: 'Poppins_Medium' }]}>← Wróć</Text>
                </TouchableOpacity>

                <Text style={[styles.sectionTitle, { color: c.text, fontFamily: 'Poppins_SemiBold' }]}>
                  Napisz brief / notatki
                </Text>
                <Text style={[styles.intro, { color: c.textSecondary, fontFamily: 'Poppins_Regular' }]}>
                  Podaj punkty, fakty, daty, nazwiska. AI rozwinie to w pełny artykuł zachowując tytuł "{props.title}".
                </Text>

                <TextInput
                  style={[styles.briefInput, { color: c.text, borderColor: c.border, backgroundColor: c.subtle, fontFamily: 'Poppins_Regular' }]}
                  value={briefText}
                  onChangeText={setBriefText}
                  placeholder="np. Wczoraj w Kościerzynie rozpoczęły się obchody jubileuszu 600-lecia miasta. W programie: koncerty, wystawy historyczne, festiwal smaków..."
                  placeholderTextColor={c.textSecondary}
                  multiline
                  textAlignVertical="top"
                  autoFocus
                />

                <TouchableOpacity
                  style={[styles.submitBtn, { backgroundColor: '#7C3AED', opacity: loading ? 0.7 : 1 }]}
                  onPress={runBrief}
                  disabled={loading}
                >
                  {loading
                    ? <ActivityIndicator color="#fff" />
                    : <>
                        <Sparkles size={16} color="#fff" />
                        <Text style={[styles.submitBtnText, { fontFamily: 'Poppins_SemiBold' }]}>
                          Generuj artykuł
                        </Text>
                      </>
                  }
                </TouchableOpacity>
              </>
            )}

            {mode === 'chat' && (
              <>
                <TouchableOpacity onPress={() => setMode('menu')} style={styles.backLink}>
                  <Text style={[styles.backLinkText, { color: c.primary, fontFamily: 'Poppins_Medium' }]}>← Wróć</Text>
                </TouchableOpacity>

                <Text style={[styles.sectionTitle, { color: c.text, fontFamily: 'Poppins_SemiBold' }]}>
                  Co zrobić z treścią?
                </Text>

                <View style={styles.actionsGrid}>
                  {CHAT_ACTIONS.map(a => (
                    <TouchableOpacity
                      key={a.id}
                      style={[styles.actionTile, { borderColor: c.border, backgroundColor: c.card, opacity: loading ? 0.5 : 1 }]}
                      onPress={() => runChat(a.id)}
                      disabled={loading}
                    >
                      <Text style={styles.actionEmoji}>{a.emoji}</Text>
                      <Text style={[styles.actionLabel, { color: c.text, fontFamily: 'Poppins_Medium' }]}>
                        {a.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.sectionTitle, { color: c.text, fontFamily: 'Poppins_SemiBold', marginTop: 20 }]}>
                  Własna instrukcja
                </Text>
                <TextInput
                  style={[styles.customInput, { color: c.text, borderColor: c.border, backgroundColor: c.subtle, fontFamily: 'Poppins_Regular' }]}
                  value={customPrompt}
                  onChangeText={setCustomPrompt}
                  placeholder="np. Dodaj cytat z burmistrza na końcu artykułu"
                  placeholderTextColor={c.textSecondary}
                  multiline
                />
                <TouchableOpacity
                  style={[styles.submitBtn, { backgroundColor: '#7C3AED', opacity: loading || !customPrompt.trim() ? 0.5 : 1 }]}
                  onPress={() => runChat('custom', customPrompt)}
                  disabled={loading || !customPrompt.trim()}
                >
                  {loading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={[styles.submitBtnText, { fontFamily: 'Poppins_SemiBold' }]}>Wykonaj</Text>
                  }
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

function MenuButton({ icon, title, desc, onPress, theme, loading }: {
  icon: React.ReactNode; title: string; desc: string;
  onPress: () => void; theme: any; loading?: boolean;
}) {
  const c = theme.colors;
  return (
    <TouchableOpacity
      style={[styles.menuBtn, { borderColor: c.border, backgroundColor: c.card, opacity: loading ? 0.6 : 1 }]}
      onPress={onPress}
      disabled={loading}
    >
      <View style={styles.menuIcon}>{loading ? <ActivityIndicator color="#7C3AED" /> : icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.menuTitle, { color: c.text, fontFamily: 'Poppins_SemiBold' }]}>{title}</Text>
        <Text style={[styles.menuDesc, { color: c.textSecondary, fontFamily: 'Poppins_Regular' }]}>{desc}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: 10, paddingVertical: 12,
  },
  triggerText: { color: '#fff', fontSize: 14 },
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1,
  },
  modalTitle: { flex: 1, fontSize: 18 },
  modalBody: { padding: 20, gap: 14 },
  intro: { fontSize: 13, lineHeight: 19 },
  menuBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderRadius: 12, padding: 14,
  },
  menuIcon: { width: 36, alignItems: 'center' },
  menuTitle: { fontSize: 14 },
  menuDesc: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  backLink: { alignSelf: 'flex-start', marginBottom: 6 },
  backLinkText: { fontSize: 13 },
  sectionTitle: { fontSize: 15, marginBottom: 6 },
  briefInput: {
    borderWidth: 1, borderRadius: 10, padding: 14,
    fontSize: 14, lineHeight: 21, minHeight: 160,
  },
  customInput: {
    borderWidth: 1, borderRadius: 10, padding: 14,
    fontSize: 14, lineHeight: 20, minHeight: 70,
  },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 10, paddingVertical: 14,
  },
  submitBtnText: { color: '#fff', fontSize: 15 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionTile: {
    width: '48%', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: 10, paddingVertical: 14, paddingHorizontal: 8,
  },
  actionEmoji: { fontSize: 22 },
  actionLabel: { fontSize: 13 },
});
