import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Share, Platform, Dimensions, Linking, Alert, StatusBar } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { ArrowLeft, Share2, Calendar as CalendarIcon, MapPin, Clock, Tag, Home, Search, Bookmark, Settings, CalendarPlus, User, Building } from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';
import { useEventsStore, SavedEvent } from '@/store/eventsStore';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import GlobalTabBar from '@/components/GlobalTabBar';
import calendarService from '@/services/calendarService';
import { fetchRelatedEvents, fetchArtist, fetchVenue } from '@/services/api';
import { VenueMap } from '@/components/VenueMap';
import * as he from 'he';
import { safeFormatDate, safeFormatTime } from '@/utils/dateFormatter';

const { width, height } = Dimensions.get('window');
const BASE_URL = 'https://kaszuby24.pl/wp-json/wp/v2/kalendarz';

// HTML entities decoder - using he library

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useThemeStore();
  const { saveEvent, removeEvent, isEventSaved } = useEventsStore();
  const [event, setEvent] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [relatedEvents, setRelatedEvents] = useState<any[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);
  const [artist, setArtist] = useState<any | null>(null);
  const [venue, setVenue] = useState<any | null>(null);
  


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
        
        // Load related events after main event is loaded
        await loadRelatedEvents(data);
        
        // Load artist and venue information
        await loadArtistAndVenue(data);
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

  const loadRelatedEvents = async (eventData: any) => {
    if (!eventData) return;
    
    try {
      setLoadingRelated(true);
      
      // Get categories from event
      const categories = eventData._embedded?.['wp:term']?.flat()
        .filter((t: any) => t.taxonomy === 'kategoria-wydarzenia')
        .map((t: any) => t.id) || [];
      
      // Get location from event
      const location = eventData.meta?.miasto;
      
      // Fetch related events
      const related = await fetchRelatedEvents(
        eventData.id,
        categories,
        location,
        6
      );
      
      setRelatedEvents(related);
    } catch (error) {
      console.error('Error loading related events:', error);
    } finally {
      setLoadingRelated(false);
    }
  };

  const loadArtistAndVenue = async (eventData: any) => {
    if (!eventData) return;
    
    try {
      // Extract artist and venue IDs from event terms
      const terms = eventData._embedded?.['wp:term']?.flat() || [];
      
      // Find artist terms
      const artistTerms = terms.filter((t: any) => t.taxonomy === 'artysta');
      
      if (artistTerms.length > 0) {
        const artistData = await fetchArtist(artistTerms[0].id);
        setArtist(artistData);
      }
      
      // Find venue terms
      const venueTerms = terms.filter((t: any) => t.taxonomy === 'obiekt');
      
      if (venueTerms.length > 0) {
        const venueData = await fetchVenue(venueTerms[0].id);
        setVenue(venueData);
      }
    } catch (error) {
      console.error('Error loading artist and venue:', error);
    }
  };

  const handleGoBack = () => router.back();
  
  const handleShare = async () => {
    if (event) {
      try {
        await Share.share({
          message: `${he.decode(event.title.rendered)}\n\nData: ${safeFormatDate(event.meta?.['data-i-godzina'] || event.meta?.['sama-data'] || event.date)} ${safeFormatTime(event.meta?.['data-i-godzina'] || event.meta?.['sama-data'] || event.date)}\n${event.meta?.miasto ? `Miasto: ${event.meta.miasto}\n` : ''}${event.meta?.cena ? `Cena: ${event.meta.cena} zł\n` : ''}${event.meta?.['link-do-wydarzenia'] ? `\nSzczegóły: ${event.meta['link-do-wydarzenia']}` : ''}`,
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
      
      // Use the calendar service to add event
      const calendarEvent = calendarService.createEventFromEventData(event);
      const success = await calendarService.addEventToCalendar(calendarEvent);
      
      if (!success) {
        Alert.alert('Błąd', 'Nie udało się dodać wydarzenia do kalendarza');
      }
    } catch (error) {
      console.error('Error adding to calendar:', error);
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
      date: event.meta?.['data-i-godzina'] || event.meta?.['sama-data'] || event.date,
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

  const handleRelatedEventPress = (relatedEvent: any) => {
    router.push(`/event/${relatedEvent.id}`);
  };

  // Function to extract performers from event content
  const extractPerformersFromContent = (content: string): string => {
    try {
      // Decode HTML entities
      const decodedContent = he.decode(content);
      
      // Look for "Wykonawcy:" section
      const performersMatch = decodedContent.match(/Wykonawcy:(.*?)(?=\n|$)/s);
      if (performersMatch) {
        return performersMatch[1].trim();
      }
      
      // Look for "Gospodarz wieczoru" or similar
      const hostMatch = decodedContent.match(/Gospodarz wieczoru[^:]*:\s*([^\n]+)/);
      if (hostMatch) {
        return hostMatch[1].trim();
      }
      
      // Fallback: look for any strong tags that might contain performer names
      const strongMatches = decodedContent.match(/<strong>([^<]+)<\/strong>/g);
      if (strongMatches && strongMatches.length > 0) {
        const performers = strongMatches
          .map(match => match.replace(/<\/?strong>/g, '').trim())
          .filter(name => name.length > 3) // Filter out very short names
          .slice(0, 3); // Take first 3 names
        return performers.join(', ');
      }
      
      return 'Informacje o wykonawcach dostępne w opisie wydarzenia';
    } catch (error) {
      return 'Informacje o wykonawcach dostępne w opisie wydarzenia';
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        
        {/* Header skeleton */}
        <View style={styles.headerSkeleton}>
          <View style={styles.headerButtonSkeleton} />
          <View style={styles.headerActionsSkeleton}>
            <View style={styles.headerButtonSkeleton} />
            <View style={styles.headerButtonSkeleton} />
            <View style={styles.headerButtonSkeleton} />
          </View>
        </View>

        {/* Image skeleton */}
        <View style={styles.imageSkeleton} />
        
        {/* Content skeleton */}
        <View style={styles.contentSkeleton}>
          <View style={styles.titleSkeleton} />
          <View style={styles.metaSkeleton}>
            <View style={styles.metaItemSkeleton} />
            <View style={styles.metaItemSkeleton} />
            <View style={styles.metaItemSkeleton} />
          </View>
          <View style={styles.descriptionSkeleton} />
          <View style={styles.buttonSkeleton} />
          <View style={styles.buttonSkeleton} />
        </View>
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
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      

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
             <View style={styles.dateOverlayInner}>
               <Text style={styles.dateOverlayDay}>
                 {new Date((event.meta?.['data-i-godzina'] || event.meta?.['sama-data'] || event.date) * 1000).getDate()}
               </Text>
               <Text style={styles.dateOverlayMonth}>
                 {new Date((event.meta?.['data-i-godzina'] || event.meta?.['sama-data'] || event.date) * 1000).toLocaleDateString('pl-PL', { month: 'short' })}
               </Text>
             </View>
           </View>
           
           
          
          {/* Kategorie na dole zdjęcia - wyżej i do lewej */}
          {categories.length > 0 && (
            <View style={styles.categoriesOverlay}>
              {categories.map((category: string, index: number) => (
                <TouchableOpacity key={index} style={styles.categoryTag} activeOpacity={1}>
                  <Text style={styles.categoryText}>{category}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Content container with rounded corners */}
        <View style={[styles.contentContainer, { backgroundColor: theme.colors.background }]}> 
          <Text style={[styles.title, { color: theme.colors.text, fontFamily: 'Poppins_Bold' }]}>
            {he.decode(event.title.rendered)}
          </Text>

          {/* Event details */}
          <View style={styles.detailsContainer}>
            {/* Ikony informacyjne w jednej linii, przewijane poziomo */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.infoScroll} contentContainerStyle={styles.infoScrollContent}>
              <View style={styles.infoKafelek}>
                <View style={styles.infoIconWrap}><CalendarIcon size={22} color={theme.colors.primary} /></View>
                <Text style={styles.infoTextSmall}>{safeFormatDate(event.meta?.['data-i-godzina'] || event.meta?.['sama-data'] || event.date)}</Text>
              </View>
              <View style={styles.infoKafelek}>
                <View style={styles.infoIconWrap}><Clock size={22} color={theme.colors.primary} /></View>
                <Text style={styles.infoTextSmall}>{safeFormatTime(event.meta?.['data-i-godzina'] || event.meta?.['sama-data'] || event.date)}</Text>
              </View>
              {event.meta?.miasto && (
                <View style={styles.infoKafelek}>
                  <View style={styles.infoIconWrap}><MapPin size={22} color={theme.colors.primary} /></View>
                  <Text style={styles.infoTextSmall}>{event.meta.miasto}</Text>
                </View>
              )}
              {event.meta?.cena && (
                <View style={styles.infoKafelek}>
                  <View style={styles.infoIconWrap}><Tag size={22} color={theme.colors.primary} /></View>
                  <Text style={styles.infoTextSmall}>{event.meta.cena} zł</Text>
                </View>
              )}
            </ScrollView>
          </View>

          {/* Kategorie są teraz wyświetlane na zdjęciu */}

          {/* Description */}
          {event.meta?.['opis-wydarzenia'] && (
            <View style={styles.descriptionContainer}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text, fontFamily: 'Poppins_Bold' }]}>Opis</Text>
              <Text style={[styles.description, { color: theme.colors.text, fontFamily: 'Poppins_Regular' }]}>
                {he.decode(event.meta['opis-wydarzenia'].replace(/<[^>]*>/g, ''))}
              </Text>
            </View>
          )}

                                           {/* Artist Information */}
            {artist && (
              <View style={[styles.infoSection, { backgroundColor: theme.colors.card }]}>
                <View style={styles.sectionHeader}>
                  <View style={styles.iconContainer}>
                    <User size={18} color={theme.colors.primary} />
                  </View>
                  <Text style={[styles.sectionTitle, { color: theme.colors.text, fontFamily: 'Poppins_Bold' }]}>
                    {artist.meta?.['nazwa-artysty'] || artist.name}
                  </Text>
                </View>
                
                {/* Extract performers from event content if artist meta is empty */}
                 {(!artist.meta?.osoby || artist.meta.osoby.trim() === '') && event?.content?.rendered && (
                   <View style={styles.metaRow}>
                     <Text style={[styles.metaLabel, { color: theme.colors.textSecondary, fontFamily: 'Poppins_Medium' }]}>
                       Wykonawcy:
                     </Text>
                     <Text style={[styles.metaValue, { color: theme.colors.text, fontFamily: 'Poppins_Regular' }]}>
                       {extractPerformersFromContent(event.content.rendered)}
                     </Text>
                   </View>
                 )}
                
                {artist.meta?.osoby && artist.meta.osoby.trim() !== '' && (
                  <View style={styles.metaRow}>
                    <Text style={[styles.metaLabel, { color: theme.colors.textSecondary, fontFamily: 'Poppins_Medium' }]}>
                      Skład:
                    </Text>
                    <Text style={[styles.metaValue, { color: theme.colors.text, fontFamily: 'Poppins_Regular' }]}>
                      {artist.meta.osoby}
                    </Text>
                  </View>
                )}
                
                {artist.meta?.['opis-artysty'] && artist.meta['opis-artysty'].trim() !== '' && (
                  <View style={styles.metaRow}>
                    <Text style={[styles.metaLabel, { color: theme.colors.textSecondary, fontFamily: 'Poppins_Medium' }]}>
                      O artyście:
                    </Text>
                    <Text style={[styles.metaValue, { color: theme.colors.text, fontFamily: 'Poppins_Regular' }]}>
                      {he.decode(artist.meta['opis-artysty'].replace(/<[^>]*>/g, ''))}
                    </Text>
                  </View>
                )}
                
                {/* Fallback - show artist name if no meta fields */}
                {(!artist.meta?.osoby || artist.meta.osoby.trim() === '') && 
                 (!artist.meta?.['opis-artysty'] || artist.meta['opis-artysty'].trim() === '') && (
                  <View style={styles.metaRow}>
                    <Text style={[styles.metaValue, { color: theme.colors.textSecondary, fontFamily: 'Poppins_Regular', fontStyle: 'italic' }]}>
                      Brak dodatkowych informacji o artyście
                    </Text>
                  </View>
                )}
              </View>
            )}

                                           {/* Venue Information */}
            {venue && (
              <View style={[styles.infoSection, { backgroundColor: theme.colors.card }]}>
                <View style={styles.sectionHeader}>
                  <View style={styles.iconContainer}>
                    <Building size={18} color={theme.colors.primary} />
                  </View>
                  <Text style={[styles.sectionTitle, { color: theme.colors.text, fontFamily: 'Poppins_Bold' }]}>
                    {venue.name}
                  </Text>
                </View>
                
                {/* Address and postal code in one row */}
                {(venue.meta?.adres || venue.meta?.['kod-pocztowy']) && (
                  <View style={styles.metaRow}>
                    <Text style={[styles.metaLabel, { color: theme.colors.textSecondary, fontFamily: 'Poppins_Medium' }]}>
                      Lokalizacja:
                    </Text>
                    <Text style={[styles.metaValue, { color: theme.colors.text, fontFamily: 'Poppins_Regular' }]}>
                      {[venue.meta?.adres, venue.meta?.['kod-pocztowy']].filter(Boolean).join(', ')}
                    </Text>
                  </View>
                )}
                
                {venue.meta?.['opis-obiektu'] && venue.meta['opis-obiektu'].trim() !== '' && (
                  <View style={styles.metaRow}>
                    <Text style={[styles.metaLabel, { color: theme.colors.textSecondary, fontFamily: 'Poppins_Medium' }]}>
                      O obiekcie:
                    </Text>
                    <Text style={[styles.metaValue, { color: theme.colors.text, fontFamily: 'Poppins_Regular' }]}>
                      {he.decode(venue.meta['opis-obiektu'].replace(/<[^>]*>/g, ''))}
                    </Text>
                  </View>
                )}
                
                {/* OpenStreetMap Integration */}
                {venue.meta?.['dlugosc-i-szerokosc-geograficzna'] && venue.meta['dlugosc-i-szerokosc-geograficzna'].trim() !== '' && (
                  <View style={styles.mapContainer}>
                    <Text style={[styles.metaLabel, { color: theme.colors.textSecondary, fontFamily: 'Poppins_Medium', marginBottom: 8 }]}>
                      Mapa:
                    </Text>
                    <View style={styles.mapWrapper}>
                      <VenueMap
                        coordinates={venue.meta['dlugosc-i-szerokosc-geograficzna']}
                        address={venue.meta.adres}
                        postalCode={venue.meta['kod-pocztowy']}
                      />
                    </View>
                  </View>
                )}
                
                {/* Fallback - show venue name if no meta fields */}
                {(!venue.meta?.adres || venue.meta.adres.trim() === '') && 
                 (!venue.meta?.['kod-pocztowy'] || venue.meta['kod-pocztowy'].trim() === '') && 
                 (!venue.meta?.['opis-obiektu'] || venue.meta['opis-obiektu'].trim() === '') && (
                  <View style={styles.metaRow}>
                    <Text style={[styles.metaValue, { color: theme.colors.textSecondary, fontFamily: 'Poppins_Regular', fontStyle: 'italic' }]}>
                      Brak dodatkowych informacji o obiekcie
                    </Text>
                  </View>
                )}
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

          {/* Sprawdź również - Sekcja z powiązanymi wydarzeniami */}
          <View style={styles.relatedSection}>
            <View style={styles.relatedSectionHeader}>
              <View style={styles.relatedSectionTitleContainer}>
                <Text style={[styles.relatedSectionTitle, { color: theme.colors.text, fontFamily: 'Poppins_Bold' }]}>
                  Sprawdź również
                </Text>
                <View style={[styles.relatedSectionIcon, { backgroundColor: theme.colors.primary }]}>
                  <CalendarIcon size={16} color="#FFFFFF" />
                </View>
              </View>
              <View style={[styles.relatedSectionDivider, { backgroundColor: theme.colors.border }]} />
            </View>
            
            {loadingRelated ? (
              <View style={styles.relatedLoadingContainer}>
                <Text style={[styles.relatedLoadingText, { color: theme.colors.textSecondary }]}>
                  Ładowanie powiązanych wydarzeń...
                </Text>
              </View>
            ) : (relatedEvents.length > 0) ? (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.relatedEventsContainer}
                              >
                  {relatedEvents.map((relatedEvent, index) => (
                  <TouchableOpacity
                    key={relatedEvent.id || index}
                    style={[styles.relatedEventCard, { backgroundColor: theme.colors.card }]}
                    onPress={() => handleRelatedEventPress(relatedEvent)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.relatedEventImageContainer}>
                      {relatedEvent._embedded?.['wp:featuredmedia']?.[0]?.source_url ? (
                        <Image
                          source={{ uri: relatedEvent._embedded['wp:featuredmedia'][0].source_url }}
                          style={styles.relatedEventImage}
                          contentFit="cover"
                        />
                      ) : (
                        <View style={[styles.relatedEventPlaceholder, { backgroundColor: theme.colors.primary }]}>
                          <CalendarIcon size={24} color="#FFFFFF" />
                        </View>
                      )}
                    </View>
                    
                    <View style={styles.relatedEventContent}>
                      <Text 
                        style={[styles.relatedEventTitle, { color: theme.colors.text }]} 
                        numberOfLines={2}
                      >
                        {he.decode(relatedEvent.title.rendered)}
                      </Text>
                      
                      <View style={styles.relatedEventMeta}>
                        <View style={styles.relatedEventMetaRow}>
                          <Clock size={12} color={theme.colors.primary} />
                          <Text style={[styles.relatedEventMetaText, { color: theme.colors.textSecondary }]}>
                            {safeFormatDate(relatedEvent.meta?.['data-i-godzina'] || relatedEvent.meta?.['sama-data'] || relatedEvent.date)}
                          </Text>
                        </View>
                        
                        {relatedEvent.meta?.miasto && (
                          <View style={styles.relatedEventMetaRow}>
                            <MapPin size={12} color={theme.colors.textSecondary} />
                            <Text style={[styles.relatedEventMetaText, { color: theme.colors.textSecondary }]}>
                              {relatedEvent.meta.miasto}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.relatedLoadingContainer}>
                <Text style={[styles.relatedLoadingText, { color: theme.colors.textSecondary }]}>
                  Brak powiązanych wydarzeń
                </Text>
                <Text style={[styles.relatedLoadingText, { color: theme.colors.textSecondary, fontSize: 12, marginTop: 8 }]}>
                  (Sprawdzanie wydarzeń z tej samej kategorii i miasta...)
                </Text>
              </View>
            )}
          </View>
        </View>
        
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Global TabBar */}
      <GlobalTabBar activeTab="kalendarz" />
    </View>
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
    width: 90,
    height: 90,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: 'rgba(34, 74, 150, 0.2)',
  },
  dateOverlayInner: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateOverlayDay: {
    fontSize: 36,
    fontFamily: 'Poppins_Bold',
    color: '#000000',
    lineHeight: 36,
  },
  dateOverlayMonth: {
    fontSize: 14,
    fontFamily: 'Poppins_SemiBold',
    color: '000000',
    textTransform: 'uppercase',
    marginTop: 2,
    opacity: 0.9,
  },

  contentContainer: { 
    marginTop: -30, 
    borderTopLeftRadius: 30, 
    borderTopRightRadius: 30, 
    paddingHorizontal: 20, 
    paddingTop: 40, 
    paddingBottom: 40 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingTop: Platform.OS === 'ios' ? 60 : 50, 
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
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4
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
    fontFamily: 'Poppins_Bold',
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
    fontFamily: 'Poppins_Bold',
    color: '#ffffff',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  },
  title: { 
    fontSize: 28, 
    marginBottom: 24, 
    lineHeight: 36 
  },
  detailsContainer: {
    marginBottom: 40
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
    marginBottom: 12
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'left'
  },
  linkButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4
  },
  linkButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Poppins_Medium'
  },
  calendarButton: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  calendarButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_Medium'
  },

  infoScroll: { marginTop: 5, marginBottom: 25 },
  infoScrollContent: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8,
    paddingHorizontal: 0,
  },
  infoRowHorizontal: { flexDirection: 'row', alignItems: 'center', marginRight: 18 },
  infoKafelek: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
    borderRadius: 20, 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    marginRight: 12, 
    borderWidth: 1, 
    borderColor: '#E5E7EB', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.08, 
    shadowRadius: 4, 
    elevation: 3 
  },
  infoIconWrap: { 
    width: 32, 
    height: 32, 
    borderRadius: 16, 
    backgroundColor: '#F0F8FF', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 10 
  },
  infoTextSmall: { 
    fontSize: 15, 
    fontFamily: 'Poppins_Medium', 
    color: '#1F2937', 
    marginTop: 1 
  },

  // Style dla sekcji "Sprawdź również"
  relatedSection: {
    marginTop: 32,
    marginBottom: 16,
  },
  relatedSectionHeader: {
    marginBottom: 16,
  },
  relatedSectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  relatedSectionTitle: {
    fontSize: 20,
    marginRight: 8,
  },
  relatedSectionIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  relatedSectionDivider: {
    height: 1,
    marginTop: 8,
  },
  relatedSectionText: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.8,
  },

  // Style dla powiązanych wydarzeń
  relatedLoadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  relatedLoadingText: {
    fontSize: 14,
    fontFamily: 'Poppins_Regular',
  },
  relatedEventsContainer: {
    paddingHorizontal: 0,
    gap: 12,
  },
  relatedEventCard: {
    width: 200,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  relatedEventImageContainer: {
    width: '100%',
    height: 120,
    position: 'relative',
  },
  relatedEventImage: {
    width: '100%',
    height: '100%',
  },
  relatedEventPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  relatedEventContent: {
    padding: 12,
  },
  relatedEventTitle: {
    fontSize: 14,
    fontFamily: 'Poppins_Medium',
    marginBottom: 8,
    lineHeight: 18,
  },
  relatedEventMeta: {
    gap: 4,
  },
  relatedEventMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  relatedEventMetaText: {
    fontSize: 12,
    fontFamily: 'Poppins_Regular',
  },

  // New styles for artist and venue info
  infoSection: {
    marginBottom: 20,
    paddingVertical: 16,
    paddingHorizontal: 18,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
    gap: 12,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  metaRow: {
    marginBottom: 10,
  },
  metaLabel: {
    fontSize: 13,
    fontFamily: 'Poppins_Medium',
    marginBottom: 4,
    opacity: 0.8,
  },
  metaValue: {
    fontSize: 15,
    lineHeight: 20,
  },
  mapContainer: {
    marginTop: 8,
  },
  mapWrapper: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },

  // Skeleton loader styles
  headerSkeleton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
    zIndex: 10,
  },
  headerButtonSkeleton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  headerActionsSkeleton: {
    flexDirection: 'row',
    gap: 12,
  },
  imageSkeleton: {
    width: '100%',
    height: height * 0.5,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  contentSkeleton: {
    marginTop: -30,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 40,
    backgroundColor: '#F8FAFC',
  },
  titleSkeleton: {
    height: 32,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 8,
    marginBottom: 24,
    width: '90%',
  },
  metaSkeleton: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 40,
  },
  metaItemSkeleton: {
    width: 120,
    height: 50,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 20,
  },
  descriptionSkeleton: {
    height: 100,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 8,
    marginBottom: 24,
  },
  buttonSkeleton: {
    height: 56,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 16,
    marginBottom: 16,
  },

}); 