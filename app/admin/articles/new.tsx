import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Send, Link2, Camera, Youtube, Facebook } from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';
import { createArticle } from '@/services/adminApi';
import RichEditor from '@/components/admin/RichEditor';
import CategoryPicker from '@/components/admin/CategoryPicker';
import TagInput, { Tag } from '@/components/admin/TagInput';
import ImagePickerField from '@/components/admin/ImagePickerField';
import GalleryPicker from '@/components/admin/GalleryPicker';
import AiAssistant from '@/components/admin/AiAssistant';
import FbGraphicGenerator from '@/components/admin/FbGraphicGenerator';

export default function AdminNewArticleScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme, isDarkMode } = useThemeStore();
  const c = theme.colors;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [featuredImageUrl, setFeaturedImageUrl] = useState('');
  const [gallery, setGallery] = useState<string[]>([]);
  const [photoAuthor, setPhotoAuthor] = useState('');
  const [source, setSource] = useState('');
  const [youtube, setYoutube] = useState('');
  const [flickr, setFlickr] = useState('');
  const [fbText, setFbText] = useState('');
  const [categoryIds, setCategoryIds] = useState<number[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [fbAutoPost, setFbAutoPost] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleCreate = async (publish = false) => {
    if (!title.trim()) { Alert.alert('Błąd', 'Tytuł jest wymagany'); return; }
    setSaving(true);
    try {
      const res = await createArticle({
        title,
        content: content || undefined,
        featured_image_url: featuredImageUrl || undefined,
        meta_foto: photoAuthor || undefined,
        meta_zrodlo: source || undefined,
        meta_youtube: youtube || undefined,
        meta_flickr: flickr || undefined,
        meta_galeria: gallery.length ? gallery.join(',') : undefined,
        fb_text: fbText || undefined,
        fb_auto_post: fbAutoPost,
        seo_title: seoTitle || undefined,
        seo_description: seoDescription || undefined,
        category_ids: categoryIds,
        tag_ids: tags.filter(t => t.id > 0).map(t => t.id),
        status: publish ? 'publish' : 'draft',
      });
      const newId = res.data.article?.id;
      Alert.alert(
        publish ? 'Opublikowano!' : 'Zapisano szkic',
        publish ? 'Artykuł został opublikowany.' : 'Artykuł zapisany jako szkic.',
        [{
          text: 'Otwórz edycję',
          onPress: () => newId ? router.replace(`/admin/articles/${newId}`) : router.back(),
        }]
      );
    } catch (err: any) {
      Alert.alert('Błąd', err.response?.data?.error || 'Nie udało się zapisać artykułu');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: c.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <ArrowLeft size={22} color={c.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.text, fontFamily: 'Poppins_SemiBold' }]}>
          Nowy artykuł
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 60 }]}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        {/* Title */}
        <FieldLabel label="Tytuł *" color={c.textSecondary} />
        <TextInput
          style={[styles.titleInput, { color: c.text, borderColor: c.border, backgroundColor: c.subtle, fontFamily: 'Poppins_SemiBold' }]}
          value={title}
          onChangeText={setTitle}
          placeholder="Tytuł artykułu"
          placeholderTextColor={c.textSecondary}
          multiline
          autoFocus
        />

        {/* AI Assistant — auto-fill */}
        <View style={{ marginTop: 6 }}>
          <AiAssistant
            title={title}
            content={content}
            setContent={setContent}
            setFbText={setFbText}
            setSeoTitle={setSeoTitle}
            setSeoDescription={setSeoDescription}
            onSuggestedTags={(newTags) => {
              const existing = new Set(tags.map(t => t.name.toLowerCase()));
              const merged = [...tags, ...newTags.filter(t => !existing.has(t.name.toLowerCase()))];
              setTags(merged);
            }}
          />
        </View>

        {/* Featured image */}
        <FieldLabel label="Zdjęcie główne" color={c.textSecondary} icon={<Camera size={12} color={c.textSecondary} />} />
        <ImagePickerField value={featuredImageUrl} onChange={setFeaturedImageUrl} />

        {/* Rich text editor */}
        <FieldLabel label="Treść" color={c.textSecondary} />
        <View style={[styles.editorWrapper, { borderColor: c.border }]}>
          <RichEditor
            value={content}
            onChange={setContent}
            isDark={isDarkMode}
            primaryColor={c.primary}
            minHeight={300}
          />
        </View>

        {/* Categories */}
        <FieldLabel label="Kategorie" color={c.textSecondary} />
        <CategoryPicker selectedIds={categoryIds} onChange={setCategoryIds} />

        {/* Tags */}
        <FieldLabel label="Tagi" color={c.textSecondary} />
        <TagInput tags={tags} onChange={setTags} />

        {/* Gallery */}
        <FieldLabel label="Galeria" color={c.textSecondary} icon={<Camera size={12} color={c.textSecondary} />} />
        <GalleryPicker urls={gallery} onChange={setGallery} />

        {/* Photo author */}
        <FieldLabel label="Autor zdjęć" color={c.textSecondary} icon={<Camera size={12} color={c.textSecondary} />} />
        <TextInput
          style={[styles.singleInput, { color: c.text, borderColor: c.border, backgroundColor: c.subtle, fontFamily: 'Poppins_Regular' }]}
          value={photoAuthor}
          onChangeText={setPhotoAuthor}
          placeholder="np. Jan Kowalski, Pixabay..."
          placeholderTextColor={c.textSecondary}
        />

        {/* Source */}
        <FieldLabel label="Źródło" color={c.textSecondary} icon={<Link2 size={12} color={c.textSecondary} />} />
        <TextInput
          style={[styles.singleInput, { color: c.text, borderColor: c.border, backgroundColor: c.subtle, fontFamily: 'Poppins_Regular' }]}
          value={source}
          onChangeText={setSource}
          placeholder="np. PAP, własne, redakcja..."
          placeholderTextColor={c.textSecondary}
        />

        {/* YouTube */}
        <FieldLabel label="YouTube (link lub ID)" color={c.textSecondary} icon={<Youtube size={12} color="#FF0000" />} />
        <TextInput
          style={[styles.singleInput, { color: c.text, borderColor: c.border, backgroundColor: c.subtle, fontFamily: 'Poppins_Regular' }]}
          value={youtube}
          onChangeText={setYoutube}
          placeholder="https://youtube.com/watch?v=..."
          placeholderTextColor={c.textSecondary}
          autoCapitalize="none"
          keyboardType="url"
        />

        {/* Flickr */}
        <FieldLabel label="Flickr (link do albumu)" color={c.textSecondary} icon={<Camera size={12} color="#FF0084" />} />
        <TextInput
          style={[styles.singleInput, { color: c.text, borderColor: c.border, backgroundColor: c.subtle, fontFamily: 'Poppins_Regular' }]}
          value={flickr}
          onChangeText={setFlickr}
          placeholder="https://flickr.com/photos/..."
          placeholderTextColor={c.textSecondary}
          autoCapitalize="none"
          keyboardType="url"
        />

        {/* FB text */}
        <FieldLabel label="Tekst na Facebook (opcjonalnie)" color={c.textSecondary} icon={<Facebook size={12} color="#1877F2" />} />
        <TextInput
          style={[styles.multiInput, { color: c.text, borderColor: c.border, backgroundColor: c.subtle, fontFamily: 'Poppins_Regular', minHeight: 70 }]}
          value={fbText}
          onChangeText={setFbText}
          placeholder="Krótszy tekst używany przy publikacji na Facebook..."
          placeholderTextColor={c.textSecondary}
          multiline
          textAlignVertical="top"
        />

        {/* Auto-post FB */}
        <View style={[styles.switchRow, { borderColor: c.border, backgroundColor: c.subtle }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.switchLabel, { color: c.text, fontFamily: 'Poppins_Medium' }]}>
              Auto-publikacja na Facebook
            </Text>
            <Text style={[styles.switchSub, { color: c.textSecondary, fontFamily: 'Poppins_Regular' }]}>
              Po publikacji artykuł trafi do kolejki FB
            </Text>
          </View>
          <Switch
            value={fbAutoPost}
            onValueChange={setFbAutoPost}
            trackColor={{ false: c.border, true: '#1877F2' }}
            thumbColor="#fff"
          />
        </View>

        {/* FB Graphic preview (only with image + title) */}
        {!!featuredImageUrl && !!title && (
          <>
            <FieldLabel label="Grafika na FB" color={c.textSecondary} icon={<Facebook size={12} color="#1877F2" />} />
            <FbGraphicGenerator
              title={title}
              excerpt={fbText}
              imageUrl={featuredImageUrl}
            />
          </>
        )}

        {/* SEO (compact) */}
        <Text style={[styles.sectionHeader, { color: c.text, fontFamily: 'Poppins_SemiBold' }]}>SEO</Text>

        <FieldLabel label="Tytuł SEO" color={c.textSecondary} />
        <TextInput
          style={[styles.singleInput, { color: c.text, borderColor: c.border, backgroundColor: c.subtle, fontFamily: 'Poppins_Regular' }]}
          value={seoTitle}
          onChangeText={setSeoTitle}
          placeholder={title || 'Tytuł SEO (maks. 60 znaków)'}
          placeholderTextColor={c.textSecondary}
        />

        <FieldLabel label="Opis SEO (meta description)" color={c.textSecondary} />
        <TextInput
          style={[styles.multiInput, { color: c.text, borderColor: c.border, backgroundColor: c.subtle, fontFamily: 'Poppins_Regular', minHeight: 70 }]}
          value={seoDescription}
          onChangeText={setSeoDescription}
          placeholder="Krótki opis dla wyszukiwarek (150-160 znaków)..."
          placeholderTextColor={c.textSecondary}
          multiline
          textAlignVertical="top"
        />

        {/* Action buttons */}
        <View style={styles.buttons}>
          <TouchableOpacity
            style={[styles.draftBtn, { borderColor: c.border, opacity: saving ? 0.7 : 1 }]}
            onPress={() => handleCreate(false)}
            disabled={saving}
          >
            {saving ? <ActivityIndicator size="small" color={c.textSecondary} /> : null}
            <Text style={[styles.draftBtnText, { color: c.text, fontFamily: 'Poppins_Medium' }]}>
              Zapisz szkic
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.publishBtn, { backgroundColor: c.primary, opacity: saving ? 0.7 : 1 }]}
            onPress={() => handleCreate(true)}
            disabled={saving}
          >
            <Send size={16} color="#fff" />
            <Text style={[styles.publishBtnText, { fontFamily: 'Poppins_SemiBold' }]}>
              Opublikuj
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function FieldLabel({ label, color, icon }: { label: string; color: string; icon?: React.ReactNode }) {
  return (
    <View style={styles.fieldLabelRow}>
      {icon}
      <Text style={[styles.fieldLabel, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1,
  },
  iconBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 17 },
  content: { padding: 16, gap: 6 },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 14, marginBottom: 6 },
  fieldLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, fontFamily: 'Poppins_Medium' },
  titleInput: {
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 17, lineHeight: 24,
  },
  multiInput: {
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12,
    fontSize: 14, lineHeight: 22,
  },
  singleInput: {
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14,
  },
  editorWrapper: { borderWidth: 1, borderRadius: 10, overflow: 'hidden' },
  switchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    marginTop: 14,
  },
  switchLabel: { fontSize: 14 },
  switchSub: { fontSize: 12, marginTop: 2 },
  sectionHeader: {
    fontSize: 16, marginTop: 24, marginBottom: 4,
  },
  buttons: { flexDirection: 'row', gap: 12, marginTop: 24 },
  draftBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderWidth: 1, borderRadius: 12, paddingVertical: 15,
  },
  draftBtnText: { fontSize: 15 },
  publishBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 12, paddingVertical: 15,
  },
  publishBtnText: { color: '#fff', fontSize: 15 },
});
