import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Share, Platform, Dimensions, Animated } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { ArrowLeft, Share2, Home, Search, Bookmark, Calendar as CalendarIcon, Bookmark as BookmarkFilled, Settings } from 'lucide-react-native';
import { fetchArticleById, fetchArticles } from '@/services/api';
import { Article } from '@/types/article';
import { useThemeStore } from '@/store/themeStore';
import { cleanHtml } from '@/utils/htmlParser';
import { formatDateTime } from '@/utils/dateFormatter';
import RenderHtml from 'react-native-render-html';
import { useArticlesStore } from '@/store/articlesStore';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');
const HEADER_HEIGHT = Platform.OS === 'ios' ? 94 : 82;

export default function ArticleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useThemeStore();
  const { isArticleSaved, saveArticle, removeArticle } = useArticlesStore();

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [related, setRelated] = useState<Article[]>([]);
  const scrollRef = useRef<ScrollView>(null);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const loadArticle = async () => {
      try {
        setLoading(true);
        const articleData = await fetchArticleById(parseInt(id as string, 10));
        setArticle(articleData);
        setIsSaved(isArticleSaved(articleData.id));
      } catch (err) {
        setError('Nie udało się załadować artykułu');
      } finally {
        setLoading(false);
      }
    };
    loadArticle();
  }, [id, isArticleSaved]);

  useEffect(() => {
    // Warto sprawdzić również: pobierz 2 losowe artykuły
    const loadRelated = async () => {
      try {
        const { articles } = await fetchArticles(1, 10);
        setRelated(articles.filter(a => a.id !== Number(id)).slice(0, 2));
      } catch {}
    };
    loadRelated();
  }, [id]);

  const handleGoBack = () => router.back();
  const handleShare = async () => {
    if (article) {
      try {
        await Share.share({
          message: article.title.rendered,
          url: article.link,
          title: article.title.rendered,
        });
      } catch {}
    }
  };
  const handleToggleSave = () => {
    if (!article) return;
    if (isSaved) {
      removeArticle(article.id);
      setIsSaved(false);
    } else {
      saveArticle(article);
      setIsSaved(true);
    }
  };

  // Auto-powrót na główną po scrollu do końca
  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 40;
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
      setTimeout(() => router.replace('/(tabs)'), 1200);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }]}> 
        <Text style={{ color: theme.colors.text, fontSize: 18 }}>Ładowanie artykułu...</Text>
      </View>
    );
  }
  if (error || !article) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }]}> 
        <Text style={{ color: theme.colors.error, fontSize: 18 }}>{error || 'Nie znaleziono artykułu'}</Text>
        <TouchableOpacity onPress={handleGoBack} style={styles.headerButton}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}> 
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.background }]}> 
        <TouchableOpacity onPress={handleGoBack} style={styles.headerButton}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity onPress={handleShare} style={styles.headerButton}>
            <Share2 size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleToggleSave} style={styles.headerButton}>
            <Bookmark size={24} color={isSaved ? theme.colors.primary : theme.colors.text} fill={isSaved ? theme.colors.primary : 'none'} />
          </TouchableOpacity>
        </View>
      </View>



      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        bounces={false}
      >
        {/* Featured image with gradient overlay */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: article.featured_media_url }}
            style={styles.featuredImage}
            contentFit="cover"
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.7)', 'transparent', 'transparent']}
            style={styles.imageGradient}
          />
        </View>

        {/* Content container with rounded corners */}
        <View style={[styles.contentContainer, { backgroundColor: theme.colors.background }]}> 
          <Text style={[styles.title, { color: theme.colors.text, fontFamily: theme.fontFamily.bold }]}>
            {article.title.rendered.replace(/&#8211;/g, '-').replace(/&#8217;/g, "'")}
          </Text>
          <Text style={[styles.date, { color: theme.colors.textSecondary, fontFamily: theme.fontFamily.regular }]}>
            {formatDateTime(article.date)}
          </Text>
          <RenderHtml
            contentWidth={width - 40}
            source={{ html: article.content.rendered }}
            baseStyle={{ color: theme.colors.text, fontSize: 17, lineHeight: 28, fontFamily: theme.fontFamily.regular }}
            tagsStyles={{
              p: { marginBottom: 16 },
              h1: { fontSize: 26, fontWeight: 'bold', marginBottom: 12 },
              h2: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
              h3: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
              img: { borderRadius: 16, marginVertical: 12 },
            }}
            enableExperimentalMarginCollapsing
          />
        </View>

        {/* Warto sprawdzić również */}
        {related.length > 0 && (
          <View style={styles.relatedContainer}>
            <Text style={[styles.relatedTitle, { color: theme.colors.text }]}>Warto sprawdzić również</Text>
            {related.map((a) => (
              <TouchableOpacity key={a.id} style={styles.relatedCard} onPress={() => router.push(`/article/${a.id}`)}>
                {a.featured_media_url && (
                  <Image source={{ uri: a.featured_media_url }} style={styles.relatedImage} contentFit="cover" />
                )}
                <View style={styles.relatedContent}>
                  <Text style={[styles.relatedCardTitle, { color: theme.colors.text }]} numberOfLines={2}>
                    {a.title.rendered.replace(/&#8211;/g, '-').replace(/&#8217;/g, "'")}
                  </Text>
                  <Text style={[styles.relatedCardDate, { color: theme.colors.textSecondary }]}>
                    {formatDateTime(a.date)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Tab Bar (identyczny jak na głównej) */}
      <View style={[styles.tabBar, { backgroundColor: theme.colors.tabBarBackground, borderTopColor: theme.colors.border }]}> 
        <TabBarButton icon="Home" label="Główna" onPress={() => router.push('/(tabs)')} active={false} />
        <TabBarButton icon="Search" label="Szukaj" onPress={() => router.push('/(tabs)/search')} active={false} />
        <TabBarButton icon="Bookmark" label="Zapisane" onPress={() => router.push('/(tabs)/saved')} active={false} />
        <TabBarButton icon="CalendarIcon" label="Kalendarz" onPress={() => router.push('/(tabs)/kalendarz')} active={false} />
        <TabBarButton icon="Settings" label="Ustawienia" onPress={() => router.push('/(tabs)/preferences')} active={false} />
      </View>
    </View>
  );
}

function TabBarButton({ icon, label, onPress, active }: { icon: string, label: string, onPress: () => void, active: boolean }) {
  const { theme } = useThemeStore();
  const iconMap = { Home, Search, Bookmark, CalendarIcon, Settings };
  const Icon = iconMap[icon as keyof typeof iconMap];
  
  if (!Icon) return null;
  
  return (
    <TouchableOpacity style={styles.tabItem} onPress={onPress}>
      <View style={{
        backgroundColor: active ? theme.colors.primary : 'transparent',
        borderRadius: active ? 24 : 0,
        width: active ? 48 : 'auto',
        height: active ? 48 : 'auto',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Icon size={active ? 26 : 24} color={active ? '#FFFFFF' : theme.colors.textSecondary} strokeWidth={active ? 2.5 : 2} />
      </View>
      <Text style={[styles.tabLabel, { color: active ? theme.colors.primary : theme.colors.textSecondary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  imageContainer: { width: '100%', height: height * 0.5, position: 'relative' },
  featuredImage: { width: '100%', height: '100%' },
  imageGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 200 },
  contentContainer: { marginTop: -30, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 20, paddingTop: 30, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Platform.OS === 'ios' ? 54 : 40, paddingHorizontal: 20, paddingBottom: 10 },
  headerButton: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.06)' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 12, lineHeight: 36 },
  date: { fontSize: 15, marginBottom: 24 },
  tabBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: Platform.OS === 'ios' ? 110 : 98, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingBottom: Platform.OS === 'ios' ? 32 : 18, borderTopWidth: 1 },
  tabItem: { alignItems: 'center' },
  tabLabel: { fontSize: 12, marginTop: 4, fontWeight: '500' },
  relatedContainer: { marginTop: 32, paddingHorizontal: 20 },
  relatedTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  relatedCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, backgroundColor: '#F3F4F6', borderRadius: 16, overflow: 'hidden' },
  relatedImage: { width: 80, height: 80, borderTopLeftRadius: 16, borderBottomLeftRadius: 16 },
  relatedContent: { flex: 1, padding: 12 },
  relatedCardTitle: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  relatedCardDate: { fontSize: 12, color: '#888' },
});