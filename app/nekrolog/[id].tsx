import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Alert
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Share2, MapPin, Download, Heart } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useThemeStore } from '@/store/themeStore';
import { fetchNekrologById } from '@/services/api';
import { Nekrolog } from '@/types/article';
import LoadingIndicator from '@/components/LoadingIndicator';
import EmptyState from '@/components/EmptyState';

export default function NekrologDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { theme, isDarkMode } = useThemeStore();
  
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

  // Handle download image
  const handleDownloadImage = useCallback(() => {
    if (featuredImageUrl) {
      Linking.openURL(featuredImageUrl).catch(() => {
        Alert.alert('Błąd', 'Nie można otworzyć obrazu.');
      });
    } else {
      Alert.alert('Brak obrazu', 'Ten nekrolog nie ma przypisanego obrazu.');
    }
  }, [featuredImageUrl]);

  // Clean HTML content for display
  const getCleanContent = useCallback((content: string) => {
    return content
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim();
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { backgroundColor: theme.colors.card }]}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <ArrowLeft size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Nekrolog</Text>
          <View style={styles.placeholder} />
        </View>
        <LoadingIndicator fullScreen />
      </View>
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
            source={{ uri: 'http://kaszuby24.pl/wp-content/uploads/2023/05/514697-PIHZZ2-291-01.png' }}
            style={styles.memorialRibbon}
            contentFit="contain"
            transition={200}
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
          
          {/* Date and Region Info */}
          <View style={styles.metaInfo}>
            <Text style={[styles.dateText, { 
              color: theme.colors.textSecondary,
              fontFamily: theme.fontFamily.medium 
            }]}>
              {new Date(nekrolog.date).toLocaleDateString('pl-PL')}
            </Text>
            {regionName && (
              <View style={styles.regionContainer}>
                <MapPin size={14} color={theme.colors.primary} />
                <Text style={[styles.regionText, { 
                  color: theme.colors.primary,
                  fontFamily: theme.fontFamily.medium 
                }]}>
                  {regionName}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Content Section */}
        <View style={[styles.contentCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.contentText, { 
            color: theme.colors.text,
            fontFamily: theme.fontFamily.regular 
          }]}>
            {getCleanContent(nekrolog.content.rendered)}
          </Text>
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
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 44 : 12,
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
    width: 80,
    height: 80,
    opacity: 0.8,
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
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  dateText: {
    fontSize: 15,
    fontWeight: '500',
  },
  regionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(34, 74, 150, 0.1)',
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
    textAlign: 'center',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginBottom: 32,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    gap: 8,
  },
  downloadText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
}); 