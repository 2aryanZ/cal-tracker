import { Platform } from 'react-native';
import { NotificationSettings } from '@/types/nutrition';

/**
 * Unified Notification Service for Cal Tracker
 * Safely handles push & local notifications with graceful fallback for Expo Go on Android.
 */

// Dynamically and safely load expo-notifications to prevent module crash in Expo Go on Android
let Notifications: any = null;
try {
  // Expo Go on Android removed remote notification functionality in SDK 53+, throwing on load
  Notifications = require('expo-notifications');
  if (Notifications?.setNotificationHandler) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
        priority: Notifications.AndroidNotificationPriority?.HIGH,
      }),
    });
  }
} catch (e) {
  // Gracefully fallback when running inside Expo Go on Android
  Notifications = null;
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web' || !Notifications?.getPermissionsAsync) {
    return false;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  } catch (error) {
    console.warn('Notification permissions notice:', error);
    return false;
  }
}

export async function scheduleMealReminders(settings: NotificationSettings): Promise<void> {
  if (Platform.OS === 'web' || !Notifications?.cancelAllScheduledNotificationsAsync) {
    return;
  }

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!settings.enabled) return;

    const granted = await requestNotificationPermissions();
    if (!granted) return;

    // 1. Breakfast Motivational Reminder
    if (settings.breakfastReminder && settings.breakfastTime) {
      const [hour, minute] = settings.breakfastTime.split(':').map(Number);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⚠️ You have not done this: Breakfast!',
          body: 'Breakfast is still unlogged. Fuel up and track your morning calories to stay ahead!',
          data: { screen: 'scan', mealType: 'breakfast' },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes?.DAILY || 'daily',
          hour: hour || 8,
          minute: minute || 30,
        },
      });
    }

    // 2. Midday Motivational Boost
    if (settings.lunchReminder && settings.lunchTime) {
      const [hour, minute] = settings.lunchTime.split(':').map(Number);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '💪 You can do this!',
          body: 'You are crushing your progress. Snap your lunch now to keep your protein on point.',
          data: { screen: 'scan', mealType: 'lunch' },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes?.DAILY || 'daily',
          hour: hour || 13,
          minute: minute || 0,
        },
      });
    }

    // 3. Evening Pending Meal Reminder
    if (settings.dinnerReminder && settings.dinnerTime) {
      const [hour, minute] = settings.dinnerTime.split(':').map(Number);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🍽️ This is also not done: Dinner is pending!',
          body: 'Log your evening dinner before you wind down so you lock in today’s nutrition targets.',
          data: { screen: 'scan', mealType: 'dinner' },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes?.DAILY || 'daily',
          hour: hour || 19,
          minute: minute || 30,
        },
      });
    }

    // 4. Night Streak & Goal Completion Push
    if (settings.streakReminder && settings.streakTime) {
      const [hour, minute] = settings.streakTime.split(':').map(Number);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🔥 You can do this: Close your daily goals!',
          body: 'Check your remaining macros and hydration before midnight to maintain your streak!',
          data: { screen: 'index' },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes?.DAILY || 'daily',
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
  if (Platform.OS === 'web' || !Notifications?.scheduleNotificationAsync) {
    return;
  }

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🏆 Goal Completed: ${streakCount}-Day Streak!`,
        body: `You did it! Perfect macro balance locked in for today.`,
        sound: true,
      },
      trigger: null,
    });
  } catch (error) {
    console.warn('Error triggering streak celebration notification:', error);
  }
}

export async function sendMotivationalGoalReminder(
  type: 'unlogged' | 'almost_done' | 'hydration' | 'protein',
  detail?: string
): Promise<void> {
  if (Platform.OS === 'web' || !Notifications?.scheduleNotificationAsync) {
    return;
  }

  try {
    let title = '💪 You can do this!';
    let body = 'Take a second to log your progress and hit your daily goal.';

    if (type === 'unlogged') {
      title = '⚠️ You have not done this!';
      body = detail ? `Your ${detail} is still unlogged. Tap to record it in 5 seconds.` : 'You have unlogged meals pending today!';
    } else if (type === 'almost_done') {
      title = '🎯 You are almost there!';
      body = detail ? `Only ${detail} left to hit your daily calorie target. You got this!` : 'Just a few calories left to hit your goal!';
    } else if (type === 'hydration') {
      title = '💧 This is also not done: Hydration!';
      body = detail ? `You still need ${detail} of water today. Stay hydrated!` : 'Don’t forget to log your water intake.';
    } else if (type === 'protein') {
      title = '🥩 Protein target pending!';
      body = detail ? `Only ${detail} of protein left to lock in muscle recovery.` : 'Hit your protein goal before the day ends.';
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
      },
      trigger: null,
    });
  } catch (error) {
    console.warn('Error triggering motivational goal reminder:', error);
  }
}
