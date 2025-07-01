import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  Platform,
  Share,
  TouchableOpacity,
  BackHandler
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Share2, MapPin, Calendar, Clock, Church, Heart } from 'lucide-react-native';
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

  // Parse content to extract key information
  const parseNekrologContent = useCallback((content: string) => {
    // Remove HTML tags and decode HTML entities for React Native compatibility
    const cleanText = content
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .trim();
    
    // Extract key information using regex
    const dateMatch = cleanText.match(/Dnia\s+(\d{4}-\d{2}-\d{2})/);
    const massMatch = cleanText.match(/Msza Święta:\s+(\d{4}-\d{2}-\d{2})\s+o\s+(\d{1,2}:\d{2})\s+w\s+(.+?)(?=Ceremonia|Różaniec|$)/);
    const cemeteryMatch = cleanText.match(/Ceremonia na cmentarzu:\s+(.+?)(?=Różaniec|$)/);
    const rosaryMatch = cleanText.match(/Różaniec:\s+(\d{4}-\d{2}-\d{2})\s+o\s+(\d{1,2}:\d{2})\s+w\s+(.+?)$/);
    
    return {
      deathDate: dateMatch ? dateMatch[1] : null,
      mass: massMatch ? {
        date: massMatch[1],
        time: massMatch[2],
        location: massMatch[3].trim()
      } : null,
      cemetery: cemeteryMatch ? cemeteryMatch[1].trim() : null,
      rosary: rosaryMatch ? {
        date: rosaryMatch[1],
        time: rosaryMatch[2],
        location: rosaryMatch[3].trim()
      } : null
    };
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

  const parsedContent = parseNekrologContent(nekrolog.content.rendered);

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
        {/* Black ribbon and title */}
        <View style={styles.titleSection}>
          <View style={styles.ribbonContainer}>
            <View style={styles.blackRibbon} />
            <Heart size={16} color="#000" style={styles.heartIcon} />
          </View>
          <Text style={[styles.title, { 
            color: theme.colors.text,
            fontFamily: theme.fontFamily.bold 
          }]}>
            {nekrolog.title.rendered}
          </Text>
          <Text style={[styles.publishDate, { 
            color: theme.colors.textSecondary,
            fontFamily: theme.fontFamily.regular 
          }]}>
            Opublikowano: {new Date(nekrolog.date).toLocaleDateString('pl-PL')}
          </Text>
        </View>

        {/* Featured Image */}
        {featuredImageUrl && (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: featuredImageUrl }}
              style={styles.featuredImage}
              contentFit="cover"
              transition={200}
            />
          </View>
        )}

        {/* Death Date */}
        {parsedContent.deathDate && (
          <View style={[styles.infoCard, { backgroundColor: theme.colors.card }]}>
            <View style={styles.infoHeader}>
              <Calendar size={20} color={theme.colors.primary} />
              <Text style={[styles.infoTitle, { 
                color: theme.colors.text,
                fontFamily: theme.fontFamily.semibold 
              }]}>
                Data śmierci
              </Text>
            </View>
            <Text style={[styles.infoText, { 
              color: theme.colors.textSecondary,
              fontFamily: theme.fontFamily.regular 
            }]}>
              {new Date(parsedContent.deathDate).toLocaleDateString('pl-PL')}
            </Text>
          </View>
        )}

        {/* Mass Information */}
        {parsedContent.mass && (
          <View style={[styles.infoCard, { backgroundColor: theme.colors.card }]}>
            <View style={styles.infoHeader}>
              <Church size={20} color={theme.colors.primary} />
              <Text style={[styles.infoTitle, { 
                color: theme.colors.text,
                fontFamily: theme.fontFamily.semibold 
              }]}>
                Msza Święta
              </Text>
            </View>
            <View style={styles.infoDetails}>
              <View style={styles.infoRow}>
                <Calendar size={16} color={theme.colors.textSecondary} />
                <Text style={[styles.infoText, { 
                  color: theme.colors.textSecondary,
                  fontFamily: theme.fontFamily.regular 
                }]}>
                  {new Date(parsedContent.mass.date).toLocaleDateString('pl-PL')}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Clock size={16} color={theme.colors.textSecondary} />
                <Text style={[styles.infoText, { 
                  color: theme.colors.textSecondary,
                  fontFamily: theme.fontFamily.regular 
                }]}>
                  {parsedContent.mass.time}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <MapPin size={16} color={theme.colors.textSecondary} />
                <Text style={[styles.infoText, { 
                  color: theme.colors.textSecondary,
                  fontFamily: theme.fontFamily.regular 
                }]}>
                  {parsedContent.mass.location}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Cemetery Information */}
        {parsedContent.cemetery && (
          <View style={[styles.infoCard, { backgroundColor: theme.colors.card }]}>
            <View style={styles.infoHeader}>
              <MapPin size={20} color={theme.colors.primary} />
              <Text style={[styles.infoTitle, { 
                color: theme.colors.text,
                fontFamily: theme.fontFamily.semibold 
              }]}>
                Ceremonia na cmentarzu
              </Text>
            </View>
            <Text style={[styles.infoText, { 
              color: theme.colors.textSecondary,
              fontFamily: theme.fontFamily.regular 
            }]}>
              {parsedContent.cemetery}
            </Text>
          </View>
        )}

        {/* Rosary Information */}
        {parsedContent.rosary && (
          <View style={[styles.infoCard, { backgroundColor: theme.colors.card }]}>
            <View style={styles.infoHeader}>
              <Heart size={20} color={theme.colors.primary} />
              <Text style={[styles.infoTitle, { 
                color: theme.colors.text,
                fontFamily: theme.fontFamily.semibold 
              }]}>
                Różaniec
              </Text>
            </View>
            <View style={styles.infoDetails}>
              <View style={styles.infoRow}>
                <Calendar size={16} color={theme.colors.textSecondary} />
                <Text style={[styles.infoText, { 
                  color: theme.colors.textSecondary,
                  fontFamily: theme.fontFamily.regular 
                }]}>
                  {new Date(parsedContent.rosary.date).toLocaleDateString('pl-PL')}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Clock size={16} color={theme.colors.textSecondary} />
                <Text style={[styles.infoText, { 
                  color: theme.colors.textSecondary,
                  fontFamily: theme.fontFamily.regular 
                }]}>
                  {parsedContent.rosary.time}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <MapPin size={16} color={theme.colors.textSecondary} />
                <Text style={[styles.infoText, { 
                  color: theme.colors.textSecondary,
                  fontFamily: theme.fontFamily.regular 
                }]}>
                  {parsedContent.rosary.location}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
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
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  titleSection: {
    padding: 24,
    alignItems: 'center',
  },
  ribbonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  blackRibbon: {
    width: 40,
    height: 6,
    backgroundColor: '#000',
    borderRadius: 3,
    marginRight: 8,
  },
  heartIcon: {
    opacity: 0.7,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 32,
  },
  publishDate: {
    fontSize: 14,
    textAlign: 'center',
  },
  imageContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  featuredImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  infoCard: {
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  infoDetails: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
}); 