import { Platform } from 'react-native';
import type { NotificationSettings, FoodEntry } from '@/types/nutrition';
import { toLocalDateString, getTodayDateString } from './storage';
// Native notifications are unavailable on the web and in some Expo Go builds.
let Notifications: typeof import('expo-notifications') | null = null;
if (Platform.OS !== 'web')
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        Notifications = require('expo-notifications');
        Notifications?.setNotificationHandler({ handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }) });
    }
    catch {
        Notifications = null;
    }
export async function requestNotificationPermissions(): Promise<boolean> {
    if (!Notifications)
        return false;
    const current = await Notifications.getPermissionsAsync();
    if (current.granted)
        return true;
    if (!current.canAskAgain)
        return false;
    return (await Notifications.requestPermissionsAsync()).granted;
}
let scheduling: Promise<unknown> = Promise.resolve();
export async function scheduleMealReminders(settings: NotificationSettings, entries: FoodEntry[] = []): Promise<void> {
    const job = scheduling.then(async () => {
        if (!Notifications)
            return;
        await Notifications.cancelAllScheduledNotificationsAsync();
        if (!settings.enabled)
            return;
        if (!await requestNotificationPermissions())
            throw new Error('Notifications are disabled for Cal Tracker in your device settings.');
        const now = new Date(), today = getTodayDateString();
        const reminders = [['breakfast', settings.breakfastReminder, settings.breakfastTime], ['lunch', settings.lunchReminder, settings.lunchTime], ['dinner', settings.dinnerReminder, settings.dinnerTime], ['daily', settings.streakReminder, settings.streakTime]] as const;
        // Seven days of one-shot reminders let us suppress logged meals today.
        for (let offset = 0; offset < 7; offset++)
            for (const [meal, enabled, time] of reminders) {
                if (!enabled)
                    continue;
                if (offset === 0 && meal !== 'daily' && entries.some(e => e.date === today && e.mealType === meal))
                    continue;
                if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
                    throw new Error('Enter reminder times as HH:MM.');
                const [hour, minute] = time.split(':').map(Number), date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, hour, minute);
                if (date <= now)
                    continue;
                await Notifications.scheduleNotificationAsync({ content: { title: meal === 'daily' ? 'Your daily check-in' : `Time to check your ${meal} log`, body: meal === 'daily' ? 'Review your meals and water for today.' : 'Record this meal if you had it, or review your log.', data: { screen: meal === 'daily' ? 'index' : 'scan', mealType: meal, date: toLocalDateString(date) }, sound: true }, trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date } });
            }
    });
    scheduling = job.catch(() => { });
    return job;
}
export async function sendInstantStreakCelebration(streak: number): Promise<void> {
    if (!Notifications)
        return;
    await Notifications.scheduleNotificationAsync({ content: { title: 'Daily calorie target reached', body: `${streak} day logging streak.`, data: { screen: 'index' }, sound: true }, trigger: null });
}
export function subscribeToReminderTaps(callback: (data: Record<string, unknown>) => void): () => void {
    if (!Notifications)
        return () => { };
    const subscription = Notifications.addNotificationResponseReceivedListener(response => callback(response.notification.request.content.data ?? {}));
    void Notifications.getLastNotificationResponseAsync().then(response => { if (response) {
        callback(response.notification.request.content.data ?? {});
        void Notifications?.clearLastNotificationResponseAsync();
    } }).catch(() => { });
    return () => subscription.remove();
}
