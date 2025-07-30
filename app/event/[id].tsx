import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Share, Platform, Dimensions, Linking, Alert, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { ArrowLeft, Share2, Calendar as CalendarIcon, MapPin, Clock, Tag, Home, Search, Bookmark, Settings, CalendarPlus } from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';
import { useEventsStore, SavedEvent } from '@/store/eventsStore';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import GlobalTabBar from '@/components/GlobalTabBar';

const { width, height } = Dimensions.get('window');
const BASE_URL = 'https://kaszuby24.pl/wp-json/wp/v2/kalendarz';

// Simple HTML entities decoder
const he = {
  decode: (text: string) => {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&#8220;/g, '"')  // Left double quotation mark
      .replace(/&#8221;/g, '"')  // Right double quotation mark
      .replace(/&#8216;/g, "'")  // Left single quotation mark
      .replace(/&#8217;/g, "'")  // Right single quotation mark
      .replace(/&#8211;/g, '–')  // En dash
      .replace(/&#8212;/g, '—')  // Em dash
      .replace(/&#8230;/g, '…')  // Horizontal ellipsis
      .replace(/&#160;/g, ' ')   // Non-breaking space
      .replace(/&#xa0;/g, ' ')   // Non-breaking space (hex)
      .replace(/&ldquo;/g, '"')  // Left double quotation mark
      .replace(/&rdquo;/g, '"')  // Right double quotation mark
      .replace(/&lsquo;/g, "'")  // Left single quotation mark
      .replace(/&rsquo;/g, "'")  // Right single quotation mark
      .replace(/&ndash;/g, '–')  // En dash
      .replace(/&mdash;/g, '—')  // Em dash
      .replace(/&hellip;/g, '…') // Horizontal ellipsis
      .replace(/&apos;/g, "'")   // Apostrophe
      .replace(/&#x27;/g, "'")   // Apostrophe (hex)
      .replace(/&#x22;/g, '"')   // Quotation mark (hex)
      .replace(/&#x26;/g, '&')   // Ampersand (hex)
      .replace(/&#x3C;/g, '<')   // Less than (hex)
      .replace(/&#x3E;/g, '>');  // Greater than (hex)
  }
};

// Safe date conversion function
function safeDate(input: string | number): Date {
  // 1. Try parsing as ISO string first
  const maybe = new Date(input as any);
  if (!isNaN(maybe.getTime())) return maybe;

  // 2. Try as seconds timestamp
  const num = typeof input === 'string' ? parseInt(input, 10) : input;
  if (!isNaN(num)) {
    const d = new Date(num * 1000);
    if (!isNaN(d.getTime())) return d;
  }

  // 3. Fallback to current date
  return new Date();
}

function formatDate(dateStr: string) {
  const date = safeDate(dateStr);
  return date.toLocaleDateString('pl-PL', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatTime(dateStr: string) {
  const date = safeDate(dateStr);
  return date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useThemeStore();
  const { saveEvent, removeEvent, isEventSaved } = useEventsStore();
  const [event, setEvent] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const loadEvent = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${BASE_URL}/${id}?_embed`);
        if (!response.ok) {
          throw new Error('Nie udało się załadować wydarzenia');
        }
        const data = await response.json();
        setEvent(data);
      } catch (err) {
        setError('Nie udało się załadować wydarzenia');
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      loadEvent();
      // Check if event is saved
      setIsSaved(isEventSaved(Number(id)));
    }
  }, [id]);

  const handleGoBack = () => router.back();
  
  const handleShare = async () => {
    if (event) {
      try {
        await Share.share({
          message: `${he.decode(event.title.rendered)}\n\nData: ${formatDate(event.date)} ${formatTime(event.date)}\n${event.meta?.miasto ? `Miasto: ${event.meta.miasto}\n` : ''}${event.meta?.cena ? `Cena: ${event.meta.cena} zł\n` : ''}${event.meta?.['link-do-wydarzenia'] ? `\nSzczegóły: ${event.meta['link-do-wydarzenia']}` : ''}`,
          title: he.decode(event.title.rendered),
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    }
  };

  const handleAddToCalendar = async () => {
    if (!event) return;
    
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const eventDate = safeDate(event.date);
      const endDate = new Date(eventDate.getTime() + 2 * 60 * 60 * 1000); // +2 hours
      
      // Przygotuj dane wydarzenia
      const title = he.decode(event.title.rendered);
      
      const location = event.meta?.miasto || '';
      const description = event.meta?.['opis-wydarzenia']
        ? he.decode(event.meta['opis-wydarzenia'].replace(/<[^>]*>/g, ''))
        : '';
      
      // Format daty dla kalendarza
      const startDate = eventDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const endDateStr = endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      
      // Uniwersalny link do kalendarza Google (działa na iOS i Android)
      const googleUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startDate}/${endDateStr}&details=${encodeURIComponent(description)}&location=${encodeURIComponent(location)}&sf=true&output=xml`;
      
      await Linking.openURL(googleUrl);
      
      // Pokaż potwierdzenie po krótkim opóźnieniu
      setTimeout(() => {
        Alert.alert('Sukces', 'Wydarzenie zostało dodane do kalendarza');
      }, 1000);
    } catch (error) {
      Alert.alert('Błąd', 'Nie udało się dodać wydarzenia do kalendarza');
    }
  };

  const handleOpenLink = () => {
    if (event?.meta?.['link-do-wydarzenia']) {
      Linking.openURL(event.meta['link-do-wydarzenia']);
    }
  };

  const handleToggleSave = () => {
    if (!event) return;
    
    const savedEvent: SavedEvent = {
      id: event.id,
      title: event.title,
      date: event.date,
      image: event._embedded?.["wp:featuredmedia"]?.[0]?.source_url,
      meta: event.meta,
      categories: event._embedded?.['wp:term']?.flat()
        .filter((t: any) => t.taxonomy === 'kategoria-wydarzenia')
        .map((t: any) => t.name) || [],
      _embedded: event._embedded
    };
    
    if (isSaved) {
      removeEvent(event.id);
      setIsSaved(false);
    } else {
      saveEvent(savedEvent);
      setIsSaved(true);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }]}> 
        <Text style={{ color: theme.colors.text, fontSize: 18 }}>Ładowanie wydarzenia...</Text>
      </View>
    );
  }

  if (error || !event) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }]}> 
        <Text style={{ color: theme.colors.error, fontSize: 18 }}>{error || 'Nie znaleziono wydarzenia'}</Text>
        <TouchableOpacity onPress={handleGoBack} style={styles.headerButton}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>
    );
  }

  // Pobierz kategorie wydarzenia
  const categories = event._embedded?.['wp:term']?.flat()
    .filter((t: any) => t.taxonomy === 'kategoria-wydarzenia')
    .map((t: any) => t.name) || [];

  return (
    <SafeAreaView style={{ flex: 1 }}>
      {/* Header - przezroczysty */}
      <View style={styles.header}> 
        <TouchableOpacity onPress={handleGoBack} style={styles.headerButtonTransparent}>
          <ArrowLeft size={24} color="#ffffff" strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity onPress={handleToggleSave} style={styles.headerButtonTransparent}>
            <Bookmark size={24} color="#ffffff" strokeWidth={2.5} fill={isSaved ? '#ffffff' : 'transparent'} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare} style={styles.headerButtonTransparent}>
            <Share2 size={24} color="#ffffff" strokeWidth={2.5} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleAddToCalendar} style={styles.headerButtonTransparent}>
            <CalendarIcon size={24} color="#ffffff" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} bounces={false}>
        {/* Featured image with gradient overlay */}
        <View style={styles.imageContainer}>
          {event._embedded?.["wp:featuredmedia"]?.[0]?.source_url ? (
            <Image
              source={{ uri: event._embedded["wp:featuredmedia"][0].source_url }}
              style={styles.featuredImage}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.placeholderImage, { backgroundColor: theme.colors.card }]} />
          )}
          <LinearGradient
            colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.4)', 'transparent', 'transparent', 'rgba(0,0,0,0.6)']}
            style={styles.imageGradient}
          />
          {/* Data wydarzenia na zdjęciu - pod nagłówkiem */}
          <View style={styles.dateOverlay}>
            <Text style={styles.dateOverlayDay}>
              {new Date(event.date).getDate()}
            </Text>
            <Text style={styles.dateOverlayMonth}>
              {new Date(event.date).toLocaleDateString('pl-PL', { month: 'short' })}
            </Text>
          </View>
          
          {/* Kategorie na dole zdjęcia - wyżej i do lewej */}
          {categories.length > 0 && (
            <View style={styles.categoriesOverlay}>
              {categories.map((category, index) => (
                <View key={index} style={styles.categoryTag}>
                  <Text style={styles.categoryText}>{category}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Content container with rounded corners */}
        <View style={[styles.contentContainer, { backgroundColor: theme.colors.background }]}> 
          <Text style={[styles.title, { color: theme.colors.text, fontFamily: 'Poppins_Medium' }]}>
            {he.decode(event.title.rendered)}
          </Text>

          {/* Event details */}
          <View style={styles.detailsContainer}>
            {/* Ikony informacyjne w jednej linii, przewijane poziomo */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.infoScroll} contentContainerStyle={styles.infoScrollContent}>
              <View style={styles.infoKafelek}>
                <View style={styles.infoIconWrap}><CalendarIcon size={22} color={theme.colors.primary} /></View>
                <Text style={styles.infoText}>{formatDate(event.date)}</Text>
              </View>
              <View style={styles.infoKafelek}>
                <View style={styles.infoIconWrap}><Clock size={22} color={theme.colors.primary} /></View>
                <Text style={styles.infoText}>{formatTime(event.date)}</Text>
              </View>
              {event.meta?.miasto && (
                <View style={styles.infoKafelek}>
                  <View style={styles.infoIconWrap}><MapPin size={22} color={theme.colors.primary} /></View>
                  <Text style={styles.infoText}>{event.meta.miasto}</Text>
                </View>
              )}
              {event.meta?.cena && (
                <View style={styles.infoKafelek}>
                  <View style={styles.infoIconWrap}><Tag size={22} color={theme.colors.primary} /></View>
                  <Text style={styles.infoText}>{event.meta.cena} zł</Text>
                </View>
              )}
            </ScrollView>
          </View>

          {/* Kategorie są teraz wyświetlane na zdjęciu */}

          {/* Description */}
          {event.meta?.['opis-wydarzenia'] && (
            <View style={styles.descriptionContainer}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Opis</Text>
              <Text style={[styles.description, { color: theme.colors.text }]}>
                {he.decode(event.meta['opis-wydarzenia'])}
              </Text>
            </View>
          )}

          {/* Link button */}
          {event.meta?.['link-do-wydarzenia'] && (
            <TouchableOpacity 
              style={[styles.linkButton, { backgroundColor: theme.colors.primary }]} 
              onPress={handleOpenLink}
            >
              <Text style={styles.linkButtonText}>Kup bilet / Szczegóły</Text>
            </TouchableOpacity>
          )}

          {/* Calendar button */}
          <TouchableOpacity 
            style={[styles.calendarButton, { backgroundColor: theme.colors.card }]} 
            onPress={handleAddToCalendar}
          >
            <CalendarIcon size={20} color={theme.colors.primary} />
            <Text style={[styles.calendarButtonText, { color: theme.colors.primary }]}>
              Zapisz w kalendarzu
            </Text>
          </TouchableOpacity>
        </View>
        
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Global TabBar */}
      <GlobalTabBar activeTab="kalendarz" />
    </SafeAreaView>
  );
}



const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  scrollView: { 
    flex: 1 
  },
  imageContainer: { 
    width: '100%', 
    height: height * 0.5, 
    position: 'relative' 
  },
  featuredImage: { 
    width: '100%', 
    height: '100%' 
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center'
  },
  imageGradient: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0
  },
  dateOverlay: {
    position: 'absolute',
    top: 110,
    right: 20,
    width: 80,
    height: 80,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  dateOverlayDay: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
  },
  dateOverlayMonth: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    textTransform: 'uppercase',
  },
  contentContainer: { 
    marginTop: -30, 
    borderTopLeftRadius: 30, 
    borderTopRightRadius: 30, 
    paddingHorizontal: 20, 
    paddingTop: 30, 
    paddingBottom: 40 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingTop: Platform.OS === 'ios' ? 54 : 40, 
    paddingHorizontal: 20, 
    paddingBottom: 10,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10
  },
  headerButton: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'rgba(255,255,255,0.8)' 
  },
  headerButtonTransparent: {
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
    backdropFilter: 'blur(10px)'
  },
  categoriesOverlay: {
    position: 'absolute',
    bottom: 60,
    left: 20,
    right: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-start',
    paddingHorizontal: 0
  },
  categoryTag: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3
  },
  categoryText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  },
  priceOverlay: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: '#FF3B30',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 6,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.8)'
  },
  priceOverlayText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  },
  title: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    marginBottom: 24, 
    lineHeight: 36 
  },
  detailsContainer: {
    marginBottom: 30
  },
  infoContainer: {
    marginTop: 5,
    marginBottom: 25,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  infoText: {
    fontSize: 16,
    fontWeight: '500',
  },
  priceTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginTop: 8
  },
  priceText: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  descriptionContainer: {
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12
  },
  description: {
    fontSize: 16,
    lineHeight: 24
  },
  linkButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  linkButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  },
  calendarButton: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  calendarButtonText: {
    fontSize: 16,
    fontWeight: 'bold'
  },

  infoScroll: { marginTop: 5, marginBottom: 25 },
  infoScrollContent: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8,
    paddingHorizontal: 20,
  },
  infoRowHorizontal: { flexDirection: 'row', alignItems: 'center', marginRight: 18 },
  infoKafelek: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 18, paddingHorizontal: 12, paddingVertical: 7, marginRight: 8, borderWidth: 1, borderColor: '#F0F1F3', shadowColor: 'transparent', elevation: 0 },
  infoIconWrap: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F5F6FA', justifyContent: 'center', alignItems: 'center', marginRight: 7 },
  infoText: { fontSize: 15, fontWeight: '600', color: '#222', marginTop: 1 },

}); 