import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft, Save, Globe, EyeOff, Link2, Camera, Youtube, Facebook,
} from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';
import { getArticle, updateArticle, publishArticle, unpublishArticle } from '@/services/adminApi';
import RichEditor from '@/components/admin/RichEditor';
import CategoryPicker from '@/components/admin/CategoryPicker';
import TagInput, { Tag } from '@/components/admin/TagInput';
import ImagePickerField from '@/components/admin/ImagePickerField';
import GalleryPicker from '@/components/admin/GalleryPicker';
import AiAssistant from '@/components/admin/AiAssistant';
import FbGraphicGenerator from '@/components/admin/FbGraphicGenerator';

export default function AdminEditArticleScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme, isDarkMode } = useThemeStore();
  const c = theme.colors;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [status, setStatus] = useState('draft');

  // Form fields
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
  const [publishedAt, setPublishedAt] = useState('');

  // SEO
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [seoKeyword, setSeoKeyword] = useState('');
  const [seoNoindex, setSeoNoindex] = useState(false);
  const [ogImageUrl, setOgImageUrl] = useState('');

  // Schedule
  const [scheduledAt, setScheduledAt] = useState('');

  // Other
  const [customHtml, setCustomHtml] = useState('');
  const [fbAutoPost, setFbAutoPost] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getArticle(Number(id));
        const a = res.data;
        setTitle(a.title || '');
        setContent(a.content || '');
        setFeaturedImageUrl(a.featured_image_url || '');
        // meta_galeria can be either comma-separated URLs or IDs from legacy WP
        const galStr = (a.meta_galeria || '').trim();
        if (galStr) {
          const parts = galStr.split(',').map((s: string) => s.trim()).filter(Boolean);
          // Only treat as URLs if they look like URLs (start with http or /)
          const urls = parts.filter((p: string) => /^https?:\/\/|^\//.test(p));
          setGallery(urls);
        }
        setPhotoAuthor(a.meta_foto || '');
        setSource(a.meta_zrodlo || '');
        setYoutube(a.meta_youtube || '');
        setFlickr(a.meta_flickr || '');
        setFbText(a.fb_text || '');
        setCategoryIds(a.category_ids || []);
        setTags((a.tag_names || []).map((name: string, i: number) => ({
          id: (a.tag_ids || [])[i] ?? -1,
          name,
        })));
        setStatus(a.status || 'draft');
        setPublishedAt(a.published_at || '');
        setSeoTitle(a.seo_title || '');
        setSeoDescription(a.seo_description || '');
        setSeoKeyword(a.seo_focus_keyword || '');
        setSeoNoindex(!!a.seo_noindex);
        setOgImageUrl(a.og_image_url || '');
        setScheduledAt(a.scheduled_at || '');
        setCustomHtml(a.custom_html || '');
        setFbAutoPost(a.fb_auto_post !== false);
      } catch {
        Alert.alert('Błąd', 'Nie udało się wczytać artykułu');
        router.back();
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleSave = async () => {
    if (!title.trim()) { Alert.alert('Błąd', 'Tytuł jest wymagany'); return; }
    setSaving(true);
    try {
      await updateArticle(Number(id), {
        title,
        content,
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
        seo_focus_keyword: seoKeyword || undefined,
        seo_noindex: seoNoindex,
        og_image_url: ogImageUrl || undefined,
        custom_html: customHtml || undefined,
        category_ids: categoryIds,
        tag_ids: tags.filter(t => t.id > 0).map(t => t.id),
      });
      Alert.alert('Zapisano', 'Artykuł został zaktualizowany');
    } catch (err: any) {
      Alert.alert('Błąd', err.response?.data?.error || 'Nie udało się zapisać');
    } finally {
      setSaving(false);
    }
  };

  const handlePublishToggle = async () => {
    const isPublished = status === 'publish';
    Alert.alert(
      isPublished ? 'Cofnij publikację' : 'Opublikuj',
      `Na pewno chcesz ${isPublished ? 'cofnąć publikację' : 'opublikować'} ten artykuł?`,
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: isPublished ? 'Cofnij' : 'Opublikuj',
          onPress: async () => {
            setPublishing(true);
            try {
              if (isPublished) {
                await unpublishArticle(Number(id));
                setStatus('draft');
              } else {
                await publishArticle(Number(id));
                setStatus('publish');
              }
            } catch (err: any) {
              Alert.alert('Błąd', err.response?.data?.error || 'Operacja nie powiodła się');
            } finally {
              setPublishing(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.flex, styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator color={c.primary} size="large" />
      </View>
    );
  }

  const isPublished = status === 'publish';

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
        <Text style={[styles.headerTitle, { color: c.text, fontFamily: 'Poppins_SemiBold' }]} numberOfLines={1}>
          Edycja artykułu
        </Text>
        <TouchableOpacity
          style={[styles.saveChip, { backgroundColor: c.primary, opacity: saving ? 0.7 : 1 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator size="small" color="#fff" />
            : <><Save size={14} color="#fff" /><Text style={[styles.saveChipText, { fontFamily: 'Poppins_SemiBold' }]}>Zapisz</Text></>
          }
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 60 }]}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        {/* Status row */}
        <View style={[styles.statusRow, {
          backgroundColor: isPublished ? c.success + '15' : c.warning + '15',
          borderColor: isPublished ? c.success + '40' : c.warning + '40',
        }]}>
          <View style={[styles.dot, { backgroundColor: isPublished ? c.success : c.warning }]} />
          <Text style={[styles.statusText, { color: isPublished ? c.success : c.warning, fontFamily: 'Poppins_Medium' }]}>
            {isPublished ? 'Opublikowany' : 'Szkic'}
          </Text>
          {publishedAt ? (
            <Text style={[styles.statusDate, { color: c.textSecondary, fontFamily: 'Poppins_Regular' }]}>
              · {formatDate(publishedAt)}
            </Text>
          ) : null}
          <TouchableOpacity
            style={[styles.publishToggle, { borderColor: isPublished ? c.warning : c.success, opacity: publishing ? 0.6 : 1 }]}
            onPress={handlePublishToggle}
            disabled={publishing}
          >
            {publishing
              ? <ActivityIndicator size="small" color={isPublished ? c.warning : c.success} />
              : isPublished
                ? <><EyeOff size={13} color={c.warning} /><Text style={[styles.toggleText, { color: c.warning, fontFamily: 'Poppins_Medium' }]}>Cofnij</Text></>
                : <><Globe size={13} color={c.success} /><Text style={[styles.toggleText, { color: c.success, fontFamily: 'Poppins_Medium' }]}>Publikuj</Text></>
            }
          </TouchableOpacity>
        </View>

        {/* Title */}
        <FieldLabel label="Tytuł *" color={c.textSecondary} />
        <TextInput
          style={[styles.titleInput, { color: c.text, borderColor: c.border, backgroundColor: c.subtle, fontFamily: 'Poppins_SemiBold' }]}
          value={title}
          onChangeText={setTitle}
          placeholder="Tytuł artykułu"
          placeholderTextColor={c.textSecondary}
          multiline
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

        {/* FB Auto-post toggle */}
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

        {/* FB Graphic Generator */}
        <FieldLabel label="Grafika na FB" color={c.textSecondary} icon={<Facebook size={12} color="#1877F2" />} />
        <FbGraphicGenerator
          title={title}
          excerpt={fbText}
          imageUrl={featuredImageUrl}
          articleId={Number(id)}
        />

        {/* SEO section */}
        <Text style={[styles.sectionHeader, { color: c.text, fontFamily: 'Poppins_SemiBold' }]}>
          SEO
        </Text>

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

        <FieldLabel label="Słowo kluczowe SEO" color={c.textSecondary} />
        <TextInput
          style={[styles.singleInput, { color: c.text, borderColor: c.border, backgroundColor: c.subtle, fontFamily: 'Poppins_Regular' }]}
          value={seoKeyword}
          onChangeText={setSeoKeyword}
          placeholder="np. wiadomości kaszuby"
          placeholderTextColor={c.textSecondary}
        />

        <FieldLabel label="OG Image URL" color={c.textSecondary} />
        <TextInput
          style={[styles.singleInput, { color: c.text, borderColor: c.border, backgroundColor: c.subtle, fontFamily: 'Poppins_Regular' }]}
          value={ogImageUrl}
          onChangeText={setOgImageUrl}
          placeholder="https://..."
          placeholderTextColor={c.textSecondary}
          autoCapitalize="none"
          keyboardType="url"
        />

        <View style={[styles.switchRow, { borderColor: c.border, backgroundColor: c.subtle }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.switchLabel, { color: c.text, fontFamily: 'Poppins_Medium' }]}>
              No-index (ukryj w Google)
            </Text>
            <Text style={[styles.switchSub, { color: c.textSecondary, fontFamily: 'Poppins_Regular' }]}>
              Artykuł nie pojawi się w wyszukiwarce
            </Text>
          </View>
          <Switch
            value={seoNoindex}
            onValueChange={setSeoNoindex}
            trackColor={{ false: c.border, true: c.error }}
            thumbColor="#fff"
          />
        </View>

        {/* Custom HTML */}
        <FieldLabel label="HTML niestandardowy" color={c.textSecondary} />
        <TextInput
          style={[styles.multiInput, { color: c.text, borderColor: c.border, backgroundColor: c.subtle, fontFamily: 'Poppins_Regular', minHeight: 80 }]}
          value={customHtml}
          onChangeText={setCustomHtml}
          placeholder="<div>Niestandardowy HTML wstawiany pod artykułem</div>"
          placeholderTextColor={c.textSecondary}
          multiline
          textAlignVertical="top"
          autoCapitalize="none"
        />

        {/* Save button (bottom) */}
        <TouchableOpacity
          style={[styles.bigSaveBtn, { backgroundColor: c.primary, opacity: saving ? 0.7 : 1 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={[styles.bigSaveBtnText, { fontFamily: 'Poppins_SemiBold' }]}>Zapisz zmiany</Text>
          }
        </TouchableOpacity>
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1,
  },
  iconBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 17 },
  saveChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
  },
  saveChipText: { color: '#fff', fontSize: 13 },
  content: { padding: 16, gap: 6 },
  statusRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    marginBottom: 10,
  },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  statusText: { fontSize: 13 },
  statusDate: { fontSize: 12 },
  publishToggle: {
    marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5,
  },
  toggleText: { fontSize: 12 },
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
    paddingTop: 8, borderTopWidth: 0,
  },
  bigSaveBtn: {
    borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 24,
  },
  bigSaveBtnText: { color: '#fff', fontSize: 16 },
});
