import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WasteScheduleData } from './WasteScheduleService';
import { Platform } from 'react-native';

export type TestNotificationResult =
    | { ok: true }
    | { ok: false; reason: 'permission-denied' | 'schedule-error'; error?: string };

const NOTIFICATION_SETTINGS_KEY = '@kaszuby24_waste_notif_settings';

export interface NotificationSettings {
    enabled: boolean;
    hour: number;
    minute: number;
    reminderDayOffset: number; // 0 = same day, 1 = day before
    enabledTypes: string[]; // List of waste types to notify about
}

const DEFAULT_SETTINGS: NotificationSettings = {
    enabled: true,
    hour: 19,
    minute: 0,
    reminderDayOffset: 1, // Day before
    enabledTypes: [], // Empty means ALL (default behavior logic), but we will filter out specific ones in logic
};
// List of types to exclude by default if enabledTypes is empty (ALL)
export const EXCLUDED_TYPES_DEFAULT = ['Choinki'];

export const WasteNotificationService = {
    async ensureAndroidChannel() {
        if (Platform.OS !== 'android') return;
        try {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'Kaszuby24 Notifications',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
                sound: 'default',
                enableVibrate: true,
                enableLights: true,
            });
        } catch (e) {
            console.log('[WasteNotif] Android channel setup error (non-fatal):', e);
        }
    },

    async requestPermissions() {
        // Android 13+ explicitly requires POST_NOTIFICATIONS at runtime; iOS
        // always asks. Older Android — the existing-status read returns
        // 'granted' for free.
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync({
                ios: {
                    allowAlert: true,
                    allowBadge: false,
                    allowSound: true,
                },
            });
            finalStatus = status;
        }
        // Make sure the channel exists before scheduling on Android.
        if (finalStatus === 'granted') {
            await this.ensureAndroidChannel();
        }
        return finalStatus === 'granted';
    },

    async getSettings(): Promise<NotificationSettings> {
        try {
            const json = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
            if (json) {
                return { ...DEFAULT_SETTINGS, ...JSON.parse(json) };
            }
        } catch (e) { }
        return DEFAULT_SETTINGS;
    },

    async saveSettings(settings: NotificationSettings) {
        await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
    },

    async scheduleNotificationsForRegion(
        schedule: { date: string; types: string[] }[],
        settings?: NotificationSettings
    ) {
        // 1. Cancel all existing waste notifications
        // We need a way to identify ours. usually via category or just cancel all if we are the main source.
        // For safety, we rely on cancelling all for now or ID tracking. 
        // expo-notifications doesn't strictly support tagging easily without custom handling.
        await Notifications.cancelAllScheduledNotificationsAsync();

        const config = settings || await this.getSettings();
        if (!config.enabled) return;

        console.log('Scheduling notifications with config:', config);

        const now = new Date(); // Current time

        let scheduledCount = 0;
        const MAX_NOTIFICATIONS = 60; // iOS limit is 64

        for (const item of schedule) {
            if (scheduledCount >= MAX_NOTIFICATIONS) break;

            const collectionDate = new Date(item.date);

            // Check types
            // If enabledTypes is empty, we assume ALL are enabled MINUS default excluded
            let relevantTypes: string[] = [];

            if (config.enabledTypes.length === 0) {
                relevantTypes = item.types.filter(t => !EXCLUDED_TYPES_DEFAULT.includes(t));
            } else {
                relevantTypes = item.types.filter(t => config.enabledTypes.includes(t));
            }

            if (relevantTypes.length === 0) continue;

            // Calculate trigger date
            const triggerDate = new Date(collectionDate);
            triggerDate.setDate(triggerDate.getDate() - config.reminderDayOffset);
            triggerDate.setHours(config.hour, config.minute, 0, 0);

            // Skip if already past
            if (triggerDate.getTime() < now.getTime()) continue;

            const title = config.reminderDayOffset === 0
                ? 'Dziś odbiór odpadów! 🚛'
                : 'Jutro odbiór odpadów! 🗑️';

            const body = `Przygotuj: ${relevantTypes.join(', ')}`;

            await Notifications.scheduleNotificationAsync({
                content: {
                    title,
                    body,
                    data: { date: item.date, types: item.types },
                    sound: true,
                },
                trigger: {
                    type: SchedulableTriggerInputTypes.DATE,
                    date: triggerDate,
                    channelId: 'default',
                },
            });

            scheduledCount++;
        }

        console.log(`Scheduled ${scheduledCount} notifications.`);
        return scheduledCount;
    },

    async sendTestNotification(): Promise<TestNotificationResult> {
        const hasPermission = await this.requestPermissions();
        if (!hasPermission) {
            console.log('[WasteNotif] No notification permission');
            return { ok: false, reason: 'permission-denied' };
        }

        try {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: 'Jutro odbiór odpadów! 🗑️',
                    body: 'Przygotuj: Zmieszane, Plastik i metale, Makulatura',
                    data: { test: true },
                    sound: true,
                },
                trigger: {
                    type: SchedulableTriggerInputTypes.TIME_INTERVAL,
                    seconds: 2,
                    repeats: false,
                    channelId: 'default',
                },
            });
            return { ok: true };
        } catch (error: any) {
            console.error('[WasteNotificationService] Error scheduling test notification:', error);
            return { ok: false, reason: 'schedule-error', error: error?.message || String(error) };
        }
    }
};
