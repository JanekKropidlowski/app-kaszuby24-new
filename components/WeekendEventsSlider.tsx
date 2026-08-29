import React, { useState, useRef, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  Dimensions, 
  Platform,
  Alert,
  Share
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, Clock, MapPin, Share2, Heart } from 'lucide-react-native';
import { Event } from '@/types/article';
import { useThemeStore } from '@/store/themeStore';
import { safeFormatDate, safeFormatTime } from '@/utils/dateFormatter';
import { cleanArticleTitle } from '@/utils/htmlEntityCleaner';
import Carousel, { ICarouselInstance } from 'react-native-reanimated-carousel';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as he from 'he';

const { width: screenWidth } = Dimensions.get('window');

// --- Ustawienia dla slidera ---
const CARD_WIDTH = screenWidth * 0.85; // Szerokość głównej, widocznej karty
// Obliczamy, jak bardzo ma być widoczny sąsiedni element
const PEEK_AMOUNT = 50; // Stała wartość 50px z każdej strony

interface WeekendEventsSliderProps {
  events: Event[];
  onEventPress: (event: Event) => void;
  onShare: (event: Event) => void;
  onAddToCalendar: (event: Event) => void;
}

const WeekendEventsSlider: React.FC<WeekendEventsSliderProps> = ({
  events,
  onEventPress,
  onShare,
  onAddToCalendar,
}) => {
  const { theme } = useThemeStore();
  const carouselRef = useRef<ICarouselInstance>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Funkcja pomocnicza do bezpiecznego pobierania tytułu
  const getEventTitle = (event: Event): string => {
    if (typeof event.title === 'string') {
      return event.title;
    } else if (event.title?.rendered) {
      return event.title.rendered;
    }
    return 'Brak tytułu';
  };

  if (events.length === 0) {
    return null;
  }

  const getEventCategory = (event: Event) => {
    const categories = event._embedded?.['wp:term']?.flat()
      .filter((term: any) => term.taxonomy === 'kategoria-wydarzenia')
      .map((term: any) => term.name) || [];
    
    if (categories.length > 0) return categories[0];
    
    const title = getEventTitle(event).toLowerCase();
    if (title.includes('kabaret') || title.includes('teatr') || title.includes('spektakl')) return 'Teatr';
    if (title.includes('koncert') || title.includes('muzyka') || title.includes('festival')) return 'Muzyka';
    if (title.includes('sport') || title.includes('bieg') || title.includes('turniej')) return 'Sport';
    if (title.includes('festyn') || title.includes('impreza') || title.includes('zabawa')) return 'Festyn';
    if (title.includes('wystawa') || title.includes('galeria') || title.includes('sztuka')) return 'Kultura';
    
    return 'Wydarzenie';
  };

  const renderEventCard = ({ item: event }: { item: Event }) => {
    const formattedDate = safeFormatDate(event.date);
    const formattedTime = safeFormatTime(event.date);
    
    const hasImage = event._embedded?.['wp:featuredmedia']?.[0]?.source_url;
    const category = getEventCategory(event);

    return (
      // Ten kontener ma pełną szerokość elementu karuzeli (screenWidth)
      // i centruje w sobie właściwą kartę.
      <View style={styles.cardContainer}>
        <TouchableOpacity
          style={[styles.eventCard, { backgroundColor: theme.colors.card }]}
          onPress={() => onEventPress(event)}
          activeOpacity={0.9}
        >
          <View style={styles.imageContainer}>
            {hasImage ? (
              <Image 
                source={{ uri: hasImage }} 
                style={styles.eventImage} 
                contentFit="cover"
                placeholder="Wydarzenie"
                onError={() => {
                  // Fallback do ikony kalendarza jeśli grafika się nie załaduje
                  console.warn('Event image failed to load');
                }}
              />
            ) : (
              <View style={[styles.noImageContainer, { backgroundColor: theme.colors.primary }]}>
                <Calendar size={40} color="#fff" />
              </View>
            )}
            
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']} style={styles.gradientOverlay} />
            
            <View style={styles.categoryContainer}>
              <View style={[styles.categoryBadge, { backgroundColor: 'rgba(255,255,255,0.9)' }]}>
                <Text style={[styles.categoryText, { color: theme.colors.primary }]}>{category}</Text>
              </View>
            </View>
            
            <View style={styles.actionButtons}>
              <TouchableOpacity style={[styles.actionButton, { backgroundColor: 'rgba(255,255,255,0.9)' }]} onPress={() => onShare(event)}>
                <Text>
                  <Share2 size={16} color={theme.colors.primary} />
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, { backgroundColor: 'rgba(255,255,255,0.9)' }]} onPress={() => onAddToCalendar(event)}>
                <Text>
                  <Calendar size={16} color={theme.colors.primary} />
                </Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.imageContent}>
              <Text style={[styles.imageTitle, { color: '#fff' }]} numberOfLines={2}>{cleanArticleTitle(getEventTitle(event))}</Text>
              <View style={styles.imageMeta}>
                <View style={styles.imageMetaRow}>
                  <Clock size={14} color="#fff" />
                  <Text style={[styles.imageMetaText, { color: '#fff' }]}>{formattedDate} • {formattedTime}</Text>
                </View>
                {event.meta?.miasto && (
                  <View style={styles.imageMetaRow}>
                    <MapPin size={14} color="#fff" />
                    <Text style={[styles.imageMetaText, { color: '#fff' }]}>{event.meta.miasto}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Ten weekend</Text>
        <Text style={[styles.eventCount, { color: theme.colors.textSecondary }]}>{events.length} wydarzeń</Text>
      </View>
      
      <GestureHandlerRootView>
        <Carousel
          ref={carouselRef}
          loop
          width={screenWidth} // Szerokość jednego "slotu" w karuzeli to cała szerokość ekranu
          height={260}
          autoPlay={true}
          autoPlayInterval={5000}
          data={events}
          scrollAnimationDuration={500}
          onSnapToItem={(index) => setActiveIndex(index)}
          renderItem={renderEventCard}
          keyExtractor={(item) => `weekend_event_${item.id}`}
          // --- Konfiguracja dla trybu "center mode" ---
          mode="parallax"
          modeConfig={{
            parallaxScrollingScale: 0.99, // Skala sąsiednich elementów (prawie identyczne do głównej)
            parallaxScrollingOffset: PEEK_AMOUNT, // Jak bardzo widoczne są sąsiednie elementy
          }}
        />
      </GestureHandlerRootView>
      
      {events.length > 1 && (
        <View style={styles.pagination}>
          {events.map((event, index) => (
            <View
              key={`pagination_${event.id}_${index}`}
              style={[
                styles.paginationDot,
                {
                  backgroundColor: index === activeIndex ? theme.colors.primary : theme.colors.border,
                  width: index === activeIndex ? 24 : 8,
                }
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Platform.OS === 'android' ? 20 : 16, // Większy padding na Androidzie
    marginBottom: Platform.OS === 'android' ? 14 : 12, // Większy margines na Androidzie
  },
  sectionTitle: {
    fontSize: Platform.OS === 'android' ? 20 : 18, // Większy font na Androidzie
    fontWeight: '700',
  },
  eventCount: {
    fontSize: Platform.OS === 'android' ? 14 : 13, // Większy font na Androidzie
    fontWeight: '500',
  },
  cardContainer: {
    // Ten kontener zajmuje całą szerokość (screenWidth) i centruje kartę
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventCard: {
    width: CARD_WIDTH, // Właściwa, widoczna szerokość karty
    height: Platform.OS === 'android' ? 250 : 240, // Większa wysokość na Androidzie
    borderRadius: Platform.OS === 'android' ? 22 : 20, // Większy radius na Androidzie
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: Platform.OS === 'android' ? 0.2 : 0.1,
    shadowRadius: Platform.OS === 'android' ? 12 : 10, // Większy shadow na Androidzie
    elevation: Platform.OS === 'android' ? 10 : 6, // Większy elevation na Androidzie
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  eventImage: {
    width: '100%',
    height: '100%',
  },
  noImageContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  categoryContainer: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 14 : 12, // Większy margines na Androidzie
    left: Platform.OS === 'android' ? 14 : 12, // Większy margines na Androidzie
  },
  categoryBadge: {
    paddingHorizontal: Platform.OS === 'android' ? 10 : 8, // Większy padding na Androidzie
    paddingVertical: Platform.OS === 'android' ? 5 : 4, // Większy padding na Androidzie
    borderRadius: Platform.OS === 'android' ? 8 : 6, // Większy radius na Androidzie
  },
  categoryText: {
    fontSize: Platform.OS === 'android' ? 12 : 11, // Większy font na Androidzie
    fontWeight: '600',
  },
  actionButtons: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 14 : 12, // Większy margines na Androidzie
    right: Platform.OS === 'android' ? 14 : 12, // Większy margines na Androidzie
    flexDirection: 'row',
    gap: Platform.OS === 'android' ? 8 : 6, // Większy gap na Androidzie
  },
  actionButton: {
    width: Platform.OS === 'android' ? 38 : 32, // Większy przycisk na Androidzie dla lepszych touch targets
    height: Platform.OS === 'android' ? 38 : 32, // Większy przycisk na Androidzie
    borderRadius: Platform.OS === 'android' ? 19 : 16, // Większy radius na Androidzie
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: Platform.OS === 'android' ? 0.2 : 0.1,
    shadowRadius: Platform.OS === 'android' ? 4 : 2, // Większy shadow na Androidzie
    elevation: Platform.OS === 'android' ? 5 : 2, // Większy elevation na Androidzie
  },
  imageContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Platform.OS === 'android' ? 18 : 16, // Większy padding na Androidzie
  },
  imageTitle: {
    fontSize: Platform.OS === 'android' ? 17 : 16, // Większy font na Androidzie
    fontWeight: '700',
    lineHeight: Platform.OS === 'android' ? 24 : 22, // Większy line height na Androidzie
    marginBottom: Platform.OS === 'android' ? 10 : 8, // Większy margines na Androidzie
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  imageMeta: {
    gap: Platform.OS === 'android' ? 6 : 4, // Większy gap na Androidzie
  },
  imageMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Platform.OS === 'android' ? 6 : 4, // Większy gap na Androidzie
  },
  imageMetaText: {
    fontSize: Platform.OS === 'android' ? 13 : 12, // Większy font na Androidzie
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Platform.OS === 'android' ? 18 : 16, // Większy margines na Androidzie
    gap: Platform.OS === 'android' ? 8 : 6, // Większy gap na Androidzie
  },
  paginationDot: {
    height: Platform.OS === 'android' ? 10 : 8, // Większy dot na Androidzie
    borderRadius: Platform.OS === 'android' ? 5 : 4, // Większy radius na Androidzie
  },
});

export default WeekendEventsSlider;