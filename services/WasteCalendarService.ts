import * as Calendar from 'expo-calendar';
import { Platform, Alert } from 'react-native';

export const WasteCalendarService = {
    async requestPermissions() {
        if (Platform.OS === 'web') return false;

        const { status } = await Calendar.requestCalendarPermissionsAsync();
        if (status === 'granted') {
            const reminders = await Calendar.requestRemindersPermissionsAsync();
            return reminders.status === 'granted';
        }
        return false;
    },

    async getDefaultCalendarId() {
        const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
        const defaultCalendar =
            Platform.OS === 'ios'
                ? calendars.find((cal) => cal.source && cal.source.name === 'Default')
                : calendars.find((cal) => cal.accessLevel === Calendar.CalendarAccessLevel.OWNER) || calendars[0];

        return defaultCalendar ? defaultCalendar.id : null;
    },

    async createCalendar() {
        let sourceId: string | undefined;
        let source: Calendar.Source = { isLocalAccount: true, name: 'Kaszuby24', type: Calendar.SourceType.LOCAL };

        if (Platform.OS === 'ios') {
            const sources = await Calendar.getSourcesAsync();
            // Try to find iCloud or Local source first
            let validSource = sources.find(s => s.name === 'iCloud' || s.name === 'Default' || s.type === Calendar.SourceType.CALDAV || s.type === Calendar.SourceType.LOCAL);

            // If not found, find ANY source that is not Subscribed (read-only)
            if (!validSource) {
                validSource = sources.find(s => s.type !== Calendar.SourceType.SUBSCRIBED && s.type !== Calendar.SourceType.BIRTHDAYS);
            }

            if (validSource) {
                sourceId = validSource.id;
                // DO NOT overwrite the whole source object with what we get from getSourcesAsync
                // createCalendarAsync expects a specific structure for 'source' which is just { isLocalAccount: boolean, name: string, type?: string }
                // but for iOS it PRIMARILY needs sourceId. 
                // However, the types say we should pass sourceId. Let's act safe.
            } else {
                // Fallback: If absolutely no valid source found, try creating without specifying sourceId (might fail) or error out.
                console.log("No valid calendar source found on iOS.");
            }
        }

        const newCalendarID = await Calendar.createCalendarAsync({
            title: 'Harmonogram Odpadów (Kaszuby24)',
            color: '#16a34a',
            entityType: Calendar.EntityTypes.EVENT,
            sourceId: sourceId,
            source: source,
            name: 'kaszuby24_waste',
            ownerAccount: 'personal',
            accessLevel: Calendar.CalendarAccessLevel.OWNER,
        });
        return newCalendarID;
    },

    async exportToCalendar(schedule: { date: string; types: string[] }[]) {
        const hasPermission = await this.requestPermissions();
        if (!hasPermission) {
            Alert.alert('Brak uprawnień', 'Aplikacja potrzebuje dostępu do kalendarza, aby zapisać wydarzenia.');
            return 0;
        }

        try {
            // Find or create our calendar
            const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
            let calendarId = calendars.find(c => c.title === 'Harmonogram Odpadów (Kaszuby24)')?.id;

            if (!calendarId) {
                calendarId = await this.createCalendar();
            }

            let count = 0;
            const now = new Date();

            for (const item of schedule) {
                const date = new Date(item.date);
                // Skip past events
                if (date.getTime() < now.getTime() - 86400000) continue;

                // Start date: 6 AM
                const startDate = new Date(date);
                startDate.setHours(6, 0, 0, 0);

                // End date: 10 AM
                const endDate = new Date(date);
                endDate.setHours(10, 0, 0, 0);

                await Calendar.createEventAsync(calendarId, {
                    title: `🚛 Odbiór: ${item.types.join(', ')}`,
                    startDate,
                    endDate,
                    timeZone: 'Europe/Warsaw',
                    notes: `Pamiętaj o wystawieniu odpadów: ${item.types.join(', ')}`,
                    alarms: [{ relativeOffset: -60 * 12 }] // 12 hours before
                });
                count++;
            }
            return count;
        } catch (error: any) {
            console.error('Calendar export error:', error);
            Alert.alert('Błąd', 'Wystąpił błąd podczas zapisywania do kalendarza: ' + error.message);
            return 0;
        }
    }
};
