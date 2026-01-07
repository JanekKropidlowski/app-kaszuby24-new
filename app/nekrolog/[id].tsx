import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { ArrowLeft, Share2, MapPin, Download, Heart, Home, Settings, Bookmark, Search } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useThemeStore } from '@/store/themeStore';
import { SafeAreaView as SafeAreaViewContext } from 'react-native-safe-area-context';
import SkeletonLoader from '@/components/SkeletonLoader';
import GlobalTabBar from '@/components/GlobalTabBar';
import RenderHtml from 'react-native-render-html';

import { fetchNekrologById } from '@/services/api';
import { Nekrolog } from '@/types/article';
import LoadingIndicator from '@/components/LoadingIndicator';
import EmptyState from '@/components/EmptyState';

export default function NekrologDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { theme, isDarkMode } = useThemeStore();
  const { width } = useWindowDimensions();

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
      if (!id || Array.isArray(id)) {
        setError('Nieprawidłowy identyfikator nekrologu');
        setLoading(false);
        return;
      }

      const nekrologId = parseInt(id, 10);
      if (isNaN(nekrologId)) {
        setError('Nieprawidłowy identyfikator nekrologu');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const nekrologData = await fetchNekrologById(nekrologId);
        
        if (isMounted.current) {
          setNekrolog(nekrologData);
          
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
      // Sprawdź uprawnienia do zapisu
      const { status } = await MediaLibrary.requestPermissionsAsync();
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
        await MediaLibrary.createAlbumAsync('Kaszuby24', asset, false);
        
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

  if (loading) {
    return (
      <SafeAreaViewContext style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.header, { backgroundColor: theme.colors.background }]}>
            <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
              <ArrowLeft size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Nekrolog</Text>
            <View style={styles.placeholder} />
          </View>
          <SkeletonLoader type="article" immediate={true} />
        </View>
      </SafeAreaViewContext>
    );
  }

  // Wait until Poppins is loaded to avoid fallback fonts in HTML
  if (!fontsLoaded) {
    return (
      <SafeAreaViewContext style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          <LoadingIndicator />
        </View>
      </SafeAreaViewContext>
    );
  }

  if (error || !nekrolog) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { backgroundColor: theme.colors.card }]}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <ArrowLeft size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Nekrolog</Text>
          <View style={styles.placeholder} />
        </View>
        <EmptyState
          title="Nie znaleziono nekrologu"
          message={error || "Nekrolog nie został znaleziony"}
          actionLabel="Wróć"
          onAction={handleGoBack}
        />
      </View>
    );
  }

  return (
    <SafeAreaViewContext style={{ flex: 1 }}>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.card }]}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text, fontFamily: theme.fontFamily.semibold }]}>
          Nekrolog
        </Text>
        <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
          <Share2 size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Memorial Ribbon Header */}
        <View style={styles.ribbonHeader}>
          <Image
            source={{ uri: 'https://kaszuby24.pl/wp-content/uploads/2025/07/514697-PIHZZ2-291-01-300x300-–-ze-zmianami.png' }}
            style={styles.memorialRibbon}
            contentFit="cover"
            transition={200}
            placeholder="Nekrolog"
            onError={() => {
              // Fallback do tekstu jeśli grafika się nie załaduje
              console.warn('Nekrolog ribbon image failed to load');
            }}
          />
        </View>

        {/* Title Section */}
         <View style={styles.titleSection}>
          <Text style={[styles.title, { 
            color: theme.colors.text,
            fontFamily: theme.fontFamily.bold 
          }]}>
            {nekrolog.title.rendered}
          </Text>
          
          {/* Region Info */}
          {regionName && (
            <TouchableOpacity 
              style={styles.regionContainer}
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
              <Text style={[styles.regionText, { 
                color: theme.colors.primary,
                fontFamily: theme.fontFamily.medium 
              }]}>
                {regionName}
              </Text>
            </TouchableOpacity>
          )}
        </View>

                 {/* Content Section */}
         <View style={[styles.contentCard, { backgroundColor: theme.colors.card }]}>
            <RenderHtml
              contentWidth={Math.max(280, width - 40)}
              systemFonts={[
                'Poppins_Regular',
                'Poppins_Bold',
                'sans-serif',
                'System'
              ]}
              source={{ html: decodeHTMLContent(nekrolog.content.rendered) }}
              baseStyle={{
                color: theme.colors.text,
                fontFamily: 'Poppins_Regular',
                fontSize: 16,
                lineHeight: 26,
                textAlign: 'center',
              }}
              tagsStyles={{
                strong: {
                  fontFamily: 'Poppins_Bold',
                },
                b: {
                  fontFamily: 'Poppins_Bold',
                },
                p: {
                  marginBottom: 8,
                },
              }}
            />
         </View>

        {/* Download Image Button */}
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

        {/* Footer */}
        <View style={styles.footer}>
          <Heart size={16} color={theme.colors.textSecondary} style={styles.footerIcon} />
          <Text style={[styles.footerText, { 
            color: theme.colors.textSecondary,
            fontFamily: theme.fontFamily.regular 
          }]}>
            Wyrazy współczucia dla rodziny i bliskich
          </Text>
        </View>
      </ScrollView>

      {/* Global TabBar */}
      <GlobalTabBar activeTab="home" />
    </View>
    </SafeAreaViewContext>
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
    paddingVertical: 12,
    paddingTop: 0, // Usunięty niepotrzebny padding dla status bara
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
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
  ribbonHeader: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  memorialRibbon: {
    width: 120,
    height: 120,
    opacity: 0.9,
  },
  titleSection: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 34,
  },
  regionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(34, 74, 150, 0.1)',
    alignSelf: 'center',
    marginTop: 8,
  },
  regionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  contentCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 26,
    textAlign: 'left',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginBottom: 32,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  downloadText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    paddingBottom: 100, // Extra space for tab bar
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