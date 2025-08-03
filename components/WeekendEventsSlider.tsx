import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import Carousel, { ICarouselInstance } from 'react-native-reanimated-carousel';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Calendar, MapPin, Clock, Heart, Share2 } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useThemeStore } from '@/store/themeStore';
import { safeFormatDate, safeFormatTime } from '@/utils/dateFormatter';
import { LinearGradient } from 'expo-linear-gradient';
import * as he from 'he';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Skopiowane ustawienia z głównej strony (index.tsx)
const CARD_WIDTH = screenWidth * 0.75; // 75% szerokości - tak samo jak na głównej
const ITEM_SPACING = 20; // Zwiększony spacing między kartami
const SIDE_PEEK = (screenWidth - CARD_WIDTH) / 2; // Automatyczne obliczenie side peek

interface Event {
  id: number;
  title: { rendered: string };
  date: string;
  meta?: {
    miasto?: string;
    'opis-wydarzenia'?: string;
  };
  _embedded?: {
    'wp:featuredmedia'?: Array<{
      source_url: string;
    }>;
    'wp:term'?: Array<{
      taxonomy: string;
      name: string;
    }>;
  };
}

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

  if (events.length === 0) {
    return null;
  }



  const carouselOptions = {
    ref: carouselRef,
    vertical: false,
    width: CARD_WIDTH + ITEM_SPACING, // Szerokość karty + spacing
    height: 220, // Zwiększona wysokość
    style: {
      width: screenWidth,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    loop: true,
    autoPlay: false,
    scrollAnimationDuration: 500,
    mode: 'parallax' as const, // Parallax mode dla side preview
    modeConfig: {
      parallaxScrollingScale: 0.9, // Skala głównej karty
      parallaxScrollingOffset: ITEM_SPACING * 2, // Zmniejszony offset dla lepszych odstępów
      parallaxAdjacentItemScale: 0.8, // Skala sąsiednich kart
    },
    data: events,
    onScrollEnd: (index: number) => {
      setActiveIndex(index);
    },
    panGestureHandlerProps: {
      activeOffsetX: [-15, 15], // Większa tolerancja gestów
    },
    snapToInterval: CARD_WIDTH + ITEM_SPACING, // Dodane snap do interwału
    decelerationRate: 'fast', // Szybsze zatrzymanie
    showsHorizontalScrollIndicator: false, // Ukrycie scroll indicator
    contentContainerStyle: {
      paddingHorizontal: ITEM_SPACING, // Dodatkowy padding dla odstępów
    },
    keyExtractor: (item: Event) => item.id.toString(), // Dodane keyExtractor
  };

  const getEventCategory = (event: Event) => {
    // Sprawdź czy wydarzenie ma kategorie w _embedded
    const categories = event._embedded?.['wp:term']?.flat()
      .filter((term: any) => term.taxonomy === 'kategoria-wydarzenia')
      .map((term: any) => term.name) || [];
    
    // Jeśli ma kategorie, zwróć pierwszą
    if (categories.length > 0) {
      return categories[0];
    }
    
    // Jeśli nie ma kategorii, spróbuj określić na podstawie tytułu
    const title = event.title?.rendered?.toLowerCase() || '';
    
    // Mapowanie słów kluczowych na kategorie
    if (title.includes('kabaret') || title.includes('teatr') || title.includes('spektakl')) {
      return 'Teatr';
    }
    if (title.includes('koncert') || title.includes('muzyka') || title.includes('festival')) {
      return 'Muzyka';
    }
    if (title.includes('sport') || title.includes('bieg') || title.includes('turniej')) {
      return 'Sport';
    }
    if (title.includes('festyn') || title.includes('impreza') || title.includes('zabawa')) {
      return 'Festyn';
    }
    if (title.includes('wystawa') || title.includes('galeria') || title.includes('sztuka')) {
      return 'Kultura';
    }
    
    // Domyślna kategoria
    return 'Wydarzenie';
  };

  const renderEventCard = ({ item: event, index }: { item: Event; index: number }) => {
    // Bezpieczne parsowanie daty
    const formattedDate = safeFormatDate(event.date);
    const formattedTime = safeFormatTime(event.date);
    
    const hasImage = event._embedded?.['wp:featuredmedia']?.[0]?.source_url;
    const category = getEventCategory(event);

    return (
      <TouchableOpacity
        style={[
          styles.eventCard,
          { backgroundColor: theme.colors.card }
        ]}
        onPress={() => onEventPress(event)}
        activeOpacity={0.9}
      >
        {/* Event Image - pełna wysokość */}
        <View style={styles.imageContainer}>
          {hasImage ? (
            <Image
              source={{ uri: hasImage }}
              style={styles.eventImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.noImageContainer, { backgroundColor: theme.colors.primary }]}>
              <Calendar size={40} color="#fff" />
            </View>
          )}
          
          {/* Gradient overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
            style={styles.gradientOverlay}
          />
          
          {/* Kategoria na górze */}
          <View style={styles.categoryContainer}>
            <View style={[styles.categoryBadge, { backgroundColor: 'rgba(255,255,255,0.9)' }]}>
              <Text style={[styles.categoryText, { color: theme.colors.primary }]}>
                {category}
              </Text>
            </View>
          </View>
          
          {/* Przyciski akcji - prawa strona */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: 'rgba(255,255,255,0.9)' }]}
              onPress={() => onShare(event)}
            >
              <Share2 size={16} color={theme.colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: 'rgba(255,255,255,0.9)' }]}
              onPress={() => onAddToCalendar(event)}
            >
              <Calendar size={16} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
          
          {/* Informacje na obrazku - na dole */}
          <View style={styles.imageContent}>
            <Text style={[styles.imageTitle, { color: '#fff' }]} numberOfLines={2}>
              {he.decode(event.title.rendered)}
            </Text>
            
            <View style={styles.imageMeta}>
              <View style={styles.imageMetaRow}>
                <Clock size={14} color="#fff" />
                <Text style={[styles.imageMetaText, { color: '#fff' }]}>
                  {formattedDate} • {formattedTime}
                </Text>
              </View>
              
              {event.meta?.miasto && (
                <View style={styles.imageMetaRow}>
                  <MapPin size={14} color="#fff" />
                  <Text style={[styles.imageMetaText, { color: '#fff' }]}>
                    {event.meta.miasto}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Ten weekend
        </Text>
        <Text style={[styles.eventCount, { color: theme.colors.textSecondary }]}>
          {events.length} wydarzeń
        </Text>
      </View>
      
      <GestureHandlerRootView style={styles.carouselWrapper}>
        <Carousel
          {...carouselOptions}
          renderItem={renderEventCard}
        />
      </GestureHandlerRootView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  carouselWrapper: {
    width: screenWidth,
    alignItems: 'center', // Wyśrodkowanie carousel
    justifyContent: 'center', // Dodatkowe wyśrodkowanie
    paddingHorizontal: ITEM_SPACING, // Dodatkowy padding dla odstępów
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18, // Zmniejszony font
    fontWeight: '700',
  },
  eventCount: {
    fontSize: 13, // Zmniejszony font
    fontWeight: '500',
  },
  eventCard: {
    width: CARD_WIDTH, // Stała szerokość karty
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: Platform.OS === 'android' ? 0.15 : 0.08,
    shadowRadius: 8,
    elevation: Platform.OS === 'android' ? 6 : 4,
    marginHorizontal: ITEM_SPACING, // Zwiększony margines dla lepszych odstępów
    overflow: 'hidden',
    alignSelf: 'center', // Wyśrodkowanie każdej karty
  },
  imageContainer: {
    position: 'relative',
    height: 220, // Zwiększona wysokość
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
    height: '60%', // Gradient na dolnej części
  },
  categoryContainer: {
    position: 'absolute',
    top: 12,
    left: 12,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionButtons: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    gap: 6, // Zmniejszony gap
  },
  actionButton: {
    width: 32, // Zmniejszony rozmiar
    height: 32, // Zmniejszony rozmiar
    borderRadius: 16, // Zmniejszony border radius
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, // Zmniejszony shadow
    shadowOpacity: Platform.OS === 'android' ? 0.2 : 0.1, // Większa przezroczystość na Android
    shadowRadius: 2, // Zmniejszony radius
    elevation: Platform.OS === 'android' ? 3 : 2, // Większy elevation na Android
  },
  imageContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16, // Padding dla treści na obrazku
  },
  imageTitle: {
    fontSize: 16, // Zwiększony font size
    fontWeight: '700',
    lineHeight: 22, // Zwiększony line height
    marginBottom: 8, // Margines na dole
    textShadowColor: 'rgba(0, 0, 0, 0.8)', // Cień tekstu
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  imageMeta: {
    gap: 4, // Zmniejszony gap
  },
  imageMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4, // Zmniejszony gap
  },
  imageMetaText: {
    fontSize: 12, // Zmniejszony font
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.8)', // Cień tekstu
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

export default WeekendEventsSlider; 