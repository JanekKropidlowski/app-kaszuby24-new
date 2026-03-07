import { Platform, Linking, Alert } from 'react-native';
import * as Calendar from 'expo-calendar';
import * as Haptics from 'expo-haptics';

export interface CalendarEvent {
  title: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  description?: string;
  url?: string;
}

class CalendarService {
  private hasPermission: boolean = false;

  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      this.hasPermission = status === 'granted';
      return this.hasPermission;
    } catch (error) {
      console.error('Error requesting calendar permissions:', error);
      return false;
    }
  }

  async checkPermissions(): Promise<boolean> {
    try {
      const { status } = await Calendar.getCalendarPermissionsAsync();
      this.hasPermission = status === 'granted';
      return this.hasPermission;
    } catch (error) {
      console.error('Error checking calendar permissions:', error);
      return false;
    }
  }

  async addEventToCalendar(event: CalendarEvent): Promise<boolean> {
    try {
      // Check permissions first
      const hasPermission = await this.checkPermissions();
      if (!hasPermission) {
        const granted = await this.requestPermissions();
        if (!granted) {
          Alert.alert(
            'Brak uprawnień',
            'Aby dodać wydarzenie do kalendarza, potrzebujemy dostępu do kalendarza. Możesz to zmienić w ustawieniach aplikacji.',
            [
              { text: 'Anuluj', style: 'cancel' },
              { text: 'Ustawienia', onPress: () => this.openAppSettings() }
            ]
          );
          return false;
        }
      }

      // Get default calendar
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const defaultCalendar = calendars.find(cal => cal.isPrimary) || calendars[0];

      if (!defaultCalendar) {
        throw new Error('Nie znaleziono kalendarza');
      }

      // Create event details
      const eventDetails = {
        title: event.title,
        startDate: event.startDate,
        endDate: event.endDate,
        location: event.location || '',
        notes: event.description || '',
        url: event.url || '',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };

      // Add event to calendar
      const eventId = await Calendar.createEventAsync(defaultCalendar.id, eventDetails);

      if (eventId) {
        // Haptic feedback
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        
        Alert.alert(
          'Sukces',
          'Wydarzenie zostało dodane do kalendarza',
          [{ text: 'OK' }]
        );
        
        return true;
      } else {
        throw new Error('Nie udało się utworzyć wydarzenia');
      }
    } catch (error) {
      console.error('Error adding event to calendar:', error);
      
      // Fallback to web calendar
      return this.addEventToWebCalendar(event);
    }
  }

  private async addEventToWebCalendar(event: CalendarEvent): Promise<boolean> {
    try {
      // Format dates for Google Calendar
      const startDate = event.startDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const endDate = event.endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      
      // Create Google Calendar URL
      const googleUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${startDate}/${endDate}&details=${encodeURIComponent(event.description || '')}&location=${encodeURIComponent(event.location || '')}&sf=true&output=xml`;
      
      // Try to open in default browser
      const canOpen = await Linking.canOpenURL(googleUrl);
      if (canOpen) {
        await Linking.openURL(googleUrl);
        
        // Haptic feedback
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        
        Alert.alert(
          'Kalendarz online',
          'Otwieram kalendarz Google w przeglądarce. Możesz tam dodać wydarzenie.',
          [{ text: 'OK' }]
        );
        
        return true;
      } else {
        throw new Error('Nie można otworzyć kalendarza');
      }
    } catch (error) {
      console.error('Error opening web calendar:', error);
      Alert.alert(
        'Błąd',
        'Nie udało się dodać wydarzenia do kalendarza. Spróbuj ponownie.',
        [{ text: 'OK' }]
      );
      return false;
    }
  }

  private openAppSettings(): void {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  }

  // Helper method to create event from event data
  createEventFromEventData(eventData: any): CalendarEvent {
    // Safe date parsing
    let startDate: Date;
    try {
      startDate = new Date(eventData.date);
      if (isNaN(startDate.getTime())) {
        startDate = new Date();
      }
    } catch {
      startDate = new Date();
    }
    
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // +2 hours default
    
    // Decode HTML entities in title
    let title = eventData.title?.rendered || eventData.title || 'Wydarzenie';
    try {
      title = this.decodeHTMLEntities(title);
    } catch {
      // Keep original title if decoding fails
    }
    
    // Clean description
    let description = eventData.meta?.['opis-wydarzenia'] || '';
    try {
      description = this.decodeHTMLEntities(description.replace(/<[^>]*>/g, ''));
    } catch {
      description = description.replace(/<[^>]*>/g, '');
    }
    
    return {
      title,
      startDate,
      endDate,
      location: eventData.meta?.miasto || '',
      description,
      url: eventData.meta?.['link-do-wydarzenia'] || '',
    };
  }

  // Helper function to decode HTML entities
  private decodeHTMLEntities(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&#8220;/g, '"')
      .replace(/&#8221;/g, '"')
      .replace(/&#8216;/g, "'")
      .replace(/&#8217;/g, "'")
      .replace(/&#8211;/g, '–')
      .replace(/&#8212;/g, '—')
      .replace(/&#8230;/g, '…')
      .replace(/&#160;/g, ' ')
      .replace(/&#xa0;/g, ' ')
      .replace(/&ldquo;/g, '"')
      .replace(/&rdquo;/g, '"')
      .replace(/&lsquo;/g, "'")
      .replace(/&rsquo;/g, "'")
      .replace(/&ndash;/g, '–')
      .replace(/&mdash;/g, '—')
      .replace(/&hellip;/g, '…')
      .replace(/&apos;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&#x22;/g, '"')
      .replace(/&#x26;/g, '&')
      .replace(/&#x3C;/g, '<')
      .replace(/&#x3E;/g, '>');
  }
}

export default new CalendarService(); 