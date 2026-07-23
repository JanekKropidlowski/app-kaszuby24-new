import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useFonts } from 'expo-font';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  Platform,
  Share,
  TouchableOpacity,
  BackHandler,
  Linking,
  Alert,
  SafeAreaView
} from 'react-native';
import { useWindowDimensions } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Share2, MapPin, Download, Heart } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useThemeStore } from '@/store/themeStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SkeletonLoader from '@/components/SkeletonLoader';
import GlobalTabBar from '@/components/GlobalTabBar';
import RenderHtml from 'react-native-render-html';

const NEKROLOG_SYSTEM_FONTS = ['Poppins_Regular', 'Poppins_Bold', 'sans-serif', 'System'];
const NEKROLOG_TAGS_STYLES = {
  strong: { fontFamily: 'Poppins_Bold' as any },
  b: { fontFamily: 'Poppins_Bold' as any },
  p: { marginBottom: 8 },
};

import { fetchNekrologById, fetchNekrologBySlug } from '@/services/api';
import { analyticsService } from '@/services/analyticsService';
import { Nekrolog } from '@/types/article';
import LoadingIndicator from '@/components/LoadingIndicator';
import EmptyState from '@/components/EmptyState';

export default function NekrologDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { theme, isDarkMode } = useThemeStore();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Ensure Poppins is available for this screen (especially for RenderHtml)
  const [fontsLoaded] = useFonts({
    Poppins_Regular: require('../../assets/fonts/Poppins/Poppins_Regular.ttf'),
    Poppins_Bold: require('../../assets/fonts/Poppins/Poppins_Bold.ttf'),
  });

  
  const [nekrolog, setNekrolog] = useState<Nekrolog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [featuredImageUrl, setFeaturedImageUrl] = useState<string | null>(null);
  const [regionName, setRegionName] = useState<string>('');
  
  const isMounted = useRef(true);


  // Load nekrolog data
  useEffect(() => {
    const loadNekrologData = async () => {
      // Hydration guard — see article/[id].tsx for context
      if (id === undefined) return;

      const idStr = Array.isArray(id) ? id[0] : (id as string | undefined);
      if (!idStr) {
        setError('Nieprawidłowy identyfikator nekrologu');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Accept both numeric ID and slug (deeplinks like /nekrolog/jan-kowalski)
        const nekrologId = /^\d+$/.test(idStr) ? parseInt(idStr, 10) : await (async () => {
          const n = await fetchNekrologBySlug(idStr);
          return n?.id ?? NaN;
        })();

        if (!nekrologId || isNaN(nekrologId)) {
          setError('Nie znaleziono nekrologu');
          setLoading(false);
          return;
        }

        const nekrologData = await fetchNekrologById(nekrologId);
        
        if (isMounted.current) {
          setNekrolog(nekrologData);

          // GA4: page_view z `/nekrolog/<slug>` matching web URL — dashboard
          // sumuje web + mobile odsłony per slug. nekrolog_view event ma id +
          // deceased name jako mobile-specific signal.
          analyticsService.logNekrologView(
            nekrologData.id,
            (nekrologData.title?.rendered || '').replace(/<[^>]*>/g, ''),
            nekrologData.slug || '',
          );
          
          // Load featured image if available
          if (nekrologData.featured_media) {
            try {
              const mediaResponse = await fetch(`https://kaszuby24.pl/wp-json/wp/v2/media/${nekrologData.featured_media}`);
              if (mediaResponse.ok) {
                const mediaData = await mediaResponse.json();
                setFeaturedImageUrl(mediaData.source_url);
              }
            } catch (err) {
              console.warn('Failed to load featured image:', err);
            }
          }
          
          // Load region information
          if (nekrologData.region && nekrologData.region.length > 0) {
            try {
              const regionResponse = await fetch(`https://kaszuby24.pl/wp-json/wp/v2/region/${nekrologData.region[0]}`);
              if (regionResponse.ok) {
                const regionData = await regionResponse.json();
                setRegionName(regionData.name);
              }
            } catch (err) {
              console.warn('Failed to load region:', err);
            }
          }
        }
      } catch (err: any) {
        if (isMounted.current) {
          console.error('Error loading nekrolog:', err);
          setError(err.message || 'Nie udało się załadować nekrologu');
        }
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    };

    loadNekrologData();

    return () => {
      isMounted.current = false;
    };
  }, [id]);

  // Handle Android back button
  useEffect(() => {
    if (Platform.OS === 'android') {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        router.back();
        return true;
      });
      
      return () => backHandler.remove();
    }
  }, [router]);

  // Handle going back
  const handleGoBack = useCallback(() => {
    router.back();
  }, [router]);

  // Handle sharing
  const handleShare = useCallback(() => {
    if (nekrolog) {
      Share.share({
        message: `${nekrolog.title.rendered}\n${nekrolog.link}`,
        url: nekrolog.link,
        title: nekrolog.title.rendered,
      });
    }
  }, [nekrolog]);

  // Handle download image - POPRAWIONA
  const handleDownloadImage = useCallback(async () => {
    if (!featuredImageUrl) {
      Alert.alert('Brak obrazu', 'Ten nekrolog nie ma przypisanego obrazu.');
      return;
    }
    
    try {
      // Sprawdź uprawnienia do zapisu (tylko zapis — bez READ_MEDIA, polityka Google Play)
      const { status } = await MediaLibrary.requestPermissionsAsync(true);
      if (status !== 'granted') {
        Alert.alert('Błąd', 'Brak uprawnień do zapisu zdjęć');
        return;
      }
      
      // Pokaż loader
      Alert.alert('Pobieranie...', 'Nekrolog jest pobierany...');
      
      // Pobierz zdjęcie
      const fileName = `nekrolog_${Date.now()}.jpg`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      const downloadResult = await FileSystem.downloadAsync(featuredImageUrl, fileUri);
      
      if (downloadResult.status === 200) {
        // Zapisz do galerii
        const asset = await MediaLibrary.createAssetAsync(fileUri);
        // Album best-effort — zdjęcie i tak jest już w galerii; brak READ_MEDIA nie blokuje zapisu
        try { await MediaLibrary.createAlbumAsync('Kaszuby24', asset, false); } catch {}

        Alert.alert('Sukces!', 'Nekrolog został pobrany do galerii');
        
        // Usuń tymczasowy plik
        await FileSystem.deleteAsync(fileUri, { idempotent: true });
      } else {
        throw new Error('Błąd pobierania');
      }
    } catch (error) {
      console.error('Błąd pobierania nekrologu:', error);
      Alert.alert('Błąd', 'Nie udało się pobrać nekrologu');
    }
  }, [featuredImageUrl]);

  // Tab navigation handlers
  const handleTabNavigation = useCallback((route: string) => {
    router.push(route as any);
  }, [router]);

  // Decode Unicode characters in HTML content
  const decodeHTMLContent = useCallback((content: string) => {
    console.log('[NEKROLOG_DEBUG] Platform:', Platform.OS);
    console.log('[NEKROLOG_DEBUG] Font family for regular:', Platform.OS === 'android' ? 'Poppins_Regular' : 'System');
    console.log('[NEKROLOG_DEBUG] Font family for bold:', Platform.OS === 'android' ? 'Poppins_Bold' : 'System');
    
    return content
      .replace(/\\u003C/g, '<')
      .replace(/\\u003E/g, '>')
      .replace(/\\u0026/g, '&')
      .replace(/\\u0022/g, '"')
      .replace(/\\u0027/g, "'")
      .replace(/\\u003D/g, '=')
      .replace(/\\u0020/g, ' ')
      .replace(/\\u0021/g, '!')
      .replace(/\\u0023/g, '#')
      .replace(/\\u0024/g, '$')
      .replace(/\\u0025/g, '%')
      .replace(/\\u0028/g, '(')
      .replace(/\\u0029/g, ')')
      .replace(/\\u002A/g, '*')
      .replace(/\\u002B/g, '+')
      .replace(/\\u002C/g, ',')
      .replace(/\\u002D/g, '-')
      .replace(/\\u002E/g, '.')
      .replace(/\\u002F/g, '/')
      .replace(/\\u0030/g, '0')
      .replace(/\\u0031/g, '1')
      .replace(/\\u0032/g, '2')
      .replace(/\\u0033/g, '3')
      .replace(/\\u0034/g, '4')
      .replace(/\\u0035/g, '5')
      .replace(/\\u0036/g, '6')
      .replace(/\\u0037/g, '7')
      .replace(/\\u0038/g, '8')
      .replace(/\\u0039/g, '9')
      .replace(/\\u003A/g, ':')
      .replace(/\\u003B/g, ';')
      .replace(/\\u003F/g, '?')
      .replace(/\\u0040/g, '@')
      .replace(/\\u0041/g, 'A')
      .replace(/\\u0042/g, 'B')
      .replace(/\\u0043/g, 'C')
      .replace(/\\u0044/g, 'D')
      .replace(/\\u0045/g, 'E')
      .replace(/\\u0046/g, 'F')
      .replace(/\\u0047/g, 'G')
      .replace(/\\u0048/g, 'H')
      .replace(/\\u0049/g, 'I')
      .replace(/\\u004A/g, 'J')
      .replace(/\\u004B/g, 'K')
      .replace(/\\u004C/g, 'L')
      .replace(/\\u004D/g, 'M')
      .replace(/\\u004E/g, 'N')
      .replace(/\\u004F/g, 'O')
      .replace(/\\u0050/g, 'P')
      .replace(/\\u0051/g, 'Q')
      .replace(/\\u0052/g, 'R')
      .replace(/\\u0053/g, 'S')
      .replace(/\\u0054/g, 'T')
      .replace(/\\u0055/g, 'U')
      .replace(/\\u0056/g, 'V')
      .replace(/\\u0057/g, 'W')
      .replace(/\\u0058/g, 'X')
      .replace(/\\u0059/g, 'Y')
      .replace(/\\u005A/g, 'Z')
      .replace(/\\u005B/g, '[')
      .replace(/\\u005C/g, '\\')
      .replace(/\\u005D/g, ']')
      .replace(/\\u005E/g, '^')
      .replace(/\\u005F/g, '_')
      .replace(/\\u0060/g, '`')
      .replace(/\\u0061/g, 'a')
      .replace(/\\u0062/g, 'b')
      .replace(/\\u0063/g, 'c')
      .replace(/\\u0064/g, 'd')
      .replace(/\\u0065/g, 'e')
      .replace(/\\u0066/g, 'f')
      .replace(/\\u0067/g, 'g')
      .replace(/\\u0068/g, 'h')
      .replace(/\\u0069/g, 'i')
      .replace(/\\u006A/g, 'j')
      .replace(/\\u006B/g, 'k')
      .replace(/\\u006C/g, 'l')
      .replace(/\\u006D/g, 'm')
      .replace(/\\u006E/g, 'n')
      .replace(/\\u006F/g, 'o')
      .replace(/\\u0070/g, 'p')
      .replace(/\\u0071/g, 'q')
      .replace(/\\u0072/g, 'r')
      .replace(/\\u0073/g, 's')
      .replace(/\\u0074/g, 't')
      .replace(/\\u0075/g, 'u')
      .replace(/\\u0076/g, 'v')
      .replace(/\\u0077/g, 'w')
      .replace(/\\u0078/g, 'x')
      .replace(/\\u0079/g, 'y')
      .replace(/\\u007A/g, 'z')
      .replace(/\\u007B/g, '{')
      .replace(/\\u007C/g, '|')
      .replace(/\\u007D/g, '}')
      .replace(/\\u007E/g, '~')
      // Decode other common HTML entities
      .replace(/&#8211;/g, '–')
      .replace(/&#8217;/g, "'")
      .replace(/&#8216;/g, "'")
      .replace(/&#8220;/g, '"')
      .replace(/&#8221;/g, '"')
      .replace(/&#8230;/g, '…')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .trim();
  }, []);

  // Memoizowane props dla RenderHtml
  const nekrologHtmlSource = useMemo(() => ({
    html: nekrolog ? decodeHTMLContent(nekrolog.content.rendered) : '',
  }), [nekrolog, decodeHTMLContent]);
  const nekrologBaseStyle = useMemo(() => ({
    color: theme.colors.text,
    fontFamily: 'Poppins_Regular' as any,
    fontSize: 16,
    lineHeight: 26,
    textAlign: 'center' as const,
  }), [theme.colors.text]);

  // Header — używamy `paddingTop: insets.top` (zamiast SafeAreaView wokół całości),
  // żeby GlobalTabBar mógł dojechać do samego dołu ekranu (jego absolute bottom:0
  // wewnątrz SafeAreaView siadał na safe-area-inset zamiast krawędzi).
  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: theme.colors.card, paddingTop: insets.top + 8 }]}>
      <TouchableOpacity onPress={handleGoBack} style={styles.backButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <ArrowLeft size={24} color={theme.colors.text} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: theme.colors.text, fontFamily: theme.fontFamily.semibold }]}>
        Nekrolog
      </Text>
      {nekrolog ? (
        <TouchableOpacity onPress={handleShare} style={styles.shareButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Share2 size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      ) : (
        <View style={styles.placeholder} />
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {renderHeader()}
        <SkeletonLoader type="article" immediate={true} />
        <GlobalTabBar activeTab="home" />
      </View>
    );
  }

  // Wait until Poppins is loaded to avoid fallback fonts in HTML
  if (!fontsLoaded) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {renderHeader()}
        <LoadingIndicator />
        <GlobalTabBar activeTab="home" />
      </View>
    );
  }

  if (error || !nekrolog) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {renderHeader()}
        <EmptyState
          title="Nie znaleziono nekrologu"
          message={error || "Nekrolog nie został znaleziony"}
          actionLabel="Wróć"
          onAction={handleGoBack}
        />
        <GlobalTabBar activeTab="home" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {renderHeader()}

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Memorial Ribbon */}
        <View style={styles.ribbonHeader}>
          <Image
            source={{ uri: 'https://kaszuby24.pl/wp-content/uploads/2025/07/514697-PIHZZ2-291-01-300x300-–-ze-zmianami.png' }}
            style={styles.memorialRibbon}
            contentFit="contain"
            transition={200}
          />
        </View>

        {/* Title + Region badge — wycentrowane jak na web */}
        <View style={styles.titleSection}>
          <Text style={[styles.kicker, { color: theme.colors.textSecondary, fontFamily: theme.fontFamily.semibold }]}>ŚP.</Text>
          <Text style={[styles.title, { color: theme.colors.text, fontFamily: theme.fontFamily.bold }]}>
            {nekrolog.title.rendered.replace(/^śp\.\s*/i, '')}
          </Text>

          {regionName && (
            <TouchableOpacity
              style={[styles.regionContainer, { backgroundColor: theme.colors.primary + '14' }]}
              onPress={() => {
                if (nekrolog.region && nekrolog.region.length > 0) {
                  router.push({
                    pathname: '/(tabs)/search',
                    params: { regionId: nekrolog.region[0] }
                  });
                }
              }}
              activeOpacity={0.7}
            >
              <MapPin size={14} color={theme.colors.primary} />
              <Text style={[styles.regionText, { color: theme.colors.primary, fontFamily: theme.fontFamily.medium }]}>
                {regionName}
              </Text>
            </TouchableOpacity>
          )}

          {/* Separator decoracyjny — jak na web (kropka między dwiema kreskami) */}
          <View style={styles.separator}>
            <View style={[styles.separatorLine, { backgroundColor: theme.colors.border }]} />
            <View style={[styles.separatorDot, { backgroundColor: theme.colors.textSecondary }]} />
            <View style={[styles.separatorLine, { backgroundColor: theme.colors.border }]} />
          </View>
        </View>

        {/* Content card */}
        <View style={[styles.contentCard, { backgroundColor: theme.colors.card }]}>
          <RenderHtml
            contentWidth={Math.max(280, width - 80)}
            systemFonts={NEKROLOG_SYSTEM_FONTS}
            source={nekrologHtmlSource}
            baseStyle={nekrologBaseStyle}
            tagsStyles={NEKROLOG_TAGS_STYLES}
          />
        </View>

        {/* Download button */}
        {featuredImageUrl && (
          <TouchableOpacity
            style={[styles.downloadButton, { backgroundColor: theme.colors.primary }]}
            onPress={handleDownloadImage}
            activeOpacity={0.8}
          >
            <Download size={20} color="#FFFFFF" />
            <Text style={[styles.downloadText, { fontFamily: theme.fontFamily.semibold }]}>
              Pobierz nekrolog
            </Text>
          </TouchableOpacity>
        )}

        {/* Upkalia attribution — jak na web */}
        <TouchableOpacity
          style={styles.kaliaBlock}
          onPress={() => Linking.openURL('https://upkalia.pl')}
          activeOpacity={0.7}
        >
          <Text style={[styles.kaliaKicker, { color: theme.colors.textSecondary, fontFamily: theme.fontFamily.semibold }]}>
            CEREMONIĘ POGRZEBOWĄ ZORGANIZOWAŁA
          </Text>
          <Image
            source={{ uri: 'https://upkalia.pl/wp-content/uploads/2023/01/logo-e1614459984333.png' }}
            style={styles.kaliaLogo}
            contentFit="contain"
            transition={200}
          />
        </TouchableOpacity>

        {/* Sympathy footer */}
        <View style={styles.footer}>
          <Heart size={16} color={theme.colors.textSecondary} style={styles.footerIcon} />
          <Text style={[styles.footerText, { color: theme.colors.textSecondary, fontFamily: theme.fontFamily.regular }]}>
            Wyrazy współczucia dla rodziny i bliskich
          </Text>
        </View>
      </ScrollView>

      <GlobalTabBar activeTab="home" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  shareButton: {
    padding: 8,
    marginRight: -8,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    // Padding bottom MUSI być większy niż wysokość GlobalTabBar (~110 iOS / 100+ Android)
    paddingBottom: 140,
  },
  ribbonHeader: {
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 8,
    paddingHorizontal: 24,
  },
  memorialRibbon: {
    width: 110,
    height: 130,
    opacity: 0.85,
  },
  titleSection: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    alignItems: 'center',
  },
  kicker: {
    fontSize: 11,
    letterSpacing: 5,
    marginBottom: 10,
    opacity: 0.7,
  },
  title: {
    fontSize: 30,
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 38,
  },
  regionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    alignSelf: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  regionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 24,
    width: 120,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    opacity: 0.5,
  },
  separatorDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    opacity: 0.4,
  },
  contentCard: {
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 24,
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginBottom: 24,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  downloadText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  kaliaBlock: {
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    paddingVertical: 24,
    paddingHorizontal: 20,
    gap: 10,
  },
  kaliaKicker: {
    fontSize: 10,
    letterSpacing: 2.5,
    textAlign: 'center',
    opacity: 0.65,
  },
  kaliaLogo: {
    height: 48,
    width: 160,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 24,
  },
  footerIcon: {
    marginBottom: 8,
    opacity: 0.6,
  },
  footerText: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
    opacity: 0.8,
  },
  placeholder: {
    width: 40,
  },
});