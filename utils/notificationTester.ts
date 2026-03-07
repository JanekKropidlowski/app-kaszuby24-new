import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

export class NotificationTester {
  static async testNotificationPermissions(): Promise<boolean> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      console.log('🔔 Current notification permission status:', status);
      
      if (status !== 'granted') {
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        console.log('🔔 New notification permission status:', newStatus);
        return newStatus === 'granted';
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error testing permissions:', error);
      return false;
    }
  }
  
  static async testPushTokenGeneration(): Promise<string | null> {
    try {
      
      // Pobierz project ID z konfiguracji EAS
      const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
      
      if (!projectId) {
        console.error('❌ No project ID found in configuration');
        return null;
      }
      
      console.log('🔧 Using project ID:', projectId);
      
      const token = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      
      console.log('🎯 Generated push token:', token.data);
      return token.data;
    } catch (error) {
      console.error('❌ Error generating push token:', error);
      return null;
    }
  }
  
  static async sendTestNotification(): Promise<boolean> {
    try {
      
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🧪 Test powiadomienia',
          body: 'To jest testowe powiadomienie z aplikacji Kaszuby24',
          data: { testMessage: true },
        },
        trigger: null, // Wyślij natychmiast
      });
      
      console.log('📨 Test notification sent with ID:', identifier);
      return true;
    } catch (error) {
      console.error('❌ Error sending test notification:', error);
      return false;
    }
  }
  
  static async runFullTest(): Promise<void> {
    console.log('🚀 Starting notification system test...');
    
    const hasPermissions = await this.testNotificationPermissions();
    if (!hasPermissions) {
      console.log('❌ No permissions - stopping test');
      return;
    }
    
    const pushToken = await this.testPushTokenGeneration();
    if (!pushToken) {
      console.log('❌ No push token - stopping test');
      return;
    }
    
    const sentTest = await this.sendTestNotification();
    if (!sentTest) {
      console.log('❌ Failed to send test notification');
      return;
    }
    
    console.log('✅ All notification tests passed!');
  }
} 