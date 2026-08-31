import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { NotificationSettings } from '@/types/nutrition';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  } catch (error) {
    console.warn('Error requesting notification permissions:', error);
    return false;
  }
}

export async function scheduleMealReminders(settings: NotificationSettings): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    // Cancel all previously scheduled notifications
    await Notifications.cancelAllScheduledNotificationsAsync();

    if (!settings.enabled) return;

    const granted = await requestNotificationPermissions();
    if (!granted) return;

    // 1. Breakfast Reminder
    if (settings.breakfastReminder) {
      const [hour, minute] = settings.breakfastTime.split(':').map(Number);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '☀️ Time for Breakfast!',
          body: 'Have you tracked your morning fuel yet? Keep your streak active with Cal AI!',
          data: { screen: 'scan', mealType: 'breakfast' },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: hour || 8,
          minute: minute || 30,
        },
      });
    }

    // 2. Lunch Reminder
    if (settings.lunchReminder) {
      const [hour, minute] = settings.lunchTime.split(':').map(Number);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🥗 Lunch Check-in!',
          body: 'Snap a quick photo of your lunch to hit your protein target for the day.',
          data: { screen: 'scan', mealType: 'lunch' },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: hour || 13,
          minute: minute || 0,
        },
      });
    }

    // 3. Dinner Reminder
    if (settings.dinnerReminder) {
      const [hour, minute] = settings.dinnerTime.split(':').map(Number);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🍽️ What’s on the dinner plate?',
          body: 'Don’t forget to log your dinner and check your remaining macros!',
          data: { screen: 'scan', mealType: 'dinner' },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: hour || 19,
          minute: minute || 30,
        },
      });
    }

    // 4. Evening Streak Retention Hook
    if (settings.streakReminder) {
      const [hour, minute] = settings.streakTime.split(':').map(Number);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🔥 Daily Streak Check!',
          body: 'Review today’s calorie goals before midnight to lock in your daily streak!',
          data: { screen: 'history' },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: hour || 21,
          minute: minute || 30,
        },
      });
    }
  } catch (error) {
    console.warn('Failed to schedule notifications:', error);
  }
}

export async function sendInstantStreakCelebration(streakCount: number): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🔥 ${streakCount}-Day Streak Achieved!`,
        body: `Unbelievable consistency! You are dominating your nutrition targets.`,
        sound: true,
      },
      trigger: null, // trigger immediately
    });
  } catch (error) {
    console.warn('Error triggering streak celebration notification:', error);
  }
}
