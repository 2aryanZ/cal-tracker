import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import {
  FoodEntry,
  MacroTargets,
  UserStats,
  DailySummary,
  NotificationSettings,
  UserProfile,
  ToastNotification,
  UserAccount,
} from '@/types/nutrition';
import {
  initializeStorage,
  getFoodEntries,
  saveFoodEntry,
  updateFoodEntry,
  deleteFoodEntry,
  getMacroGoals,
  saveMacroGoals,
  getUserStats,
  getNotificationSettings,
  saveNotificationSettings,
  getUserProfile,
  saveUserProfile,
  hasCompletedOnboarding,
  setOnboardingCompleted,
  getTodayDateString,
  getUserAccount,
  saveUserAccount,
  signInUser,
  signOutUser,
  getWaterLogs,
  saveWaterForDate,
  setAllWaterLogs,
  setAllFoodEntries,
  getWeightLogs,
  DEFAULT_GOALS,
  DEFAULT_STATS,
  DEFAULT_NOTIFICATIONS,
  DEFAULT_PROFILE,
  DEFAULT_ACCOUNT,
} from '@/services/storage';
import { scheduleMealReminders, sendInstantStreakCelebration } from '@/services/notificationService';
import {
  supabaseSignUp,
  supabaseSignOut,
  supabaseSyncFoodEntry,
  supabaseDeleteFoodEntry,
  supabaseSyncWaterLog,
  supabaseSyncMacroTargets,
  supabaseSyncUserProfile,
  supabaseFetchAllUserData,
  supabasePushLocalData,
} from '@/services/supabase';

import { playGoalChime } from '@/services/soundService';
import { triggerGoalCelebrationHaptic, triggerSuccessFeedback, triggerLightImpact } from '@/services/hapticsService';

interface RewardState {
  visible: boolean;
  streak: number;
  title: string;
  subtitle: string;
  caloriesAdded: number;
}

interface NutritionContextType {
  entries: FoodEntry[];
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  goals: MacroTargets;
  stats: UserStats;
  userProfile: UserProfile;
  userAccount: UserAccount;
  notificationSettings: NotificationSettings;
  dailySummary: DailySummary;
  waterMl: number;
  waterLogs: Record<string, number>;
  consumed: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  remaining: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  isLoading: boolean;
  isSyncing: boolean;
  rewardState: RewardState;
  toastNotification: ToastNotification | null;
  onboardingVisible: boolean;
  setOnboardingVisible: (visible: boolean) => void;
  logMeal: (meal: Omit<FoodEntry, 'id' | 'timestamp' | 'date'> & { date?: string }) => Promise<void>;
  editMeal: (entry: FoodEntry) => Promise<void>;
  removeMeal: (id: string) => Promise<void>;
  logWater: (amountMl: number, date?: string) => Promise<void>;
  setWater: (totalMl: number, date?: string) => Promise<void>;
  updateGoals: (goals: MacroTargets) => Promise<void>;
  saveProfile: (profile: UserProfile, newGoals: MacroTargets) => Promise<void>;
  updateNotifications: (settings: NotificationSettings) => Promise<void>;
  signIn: (email: string, name?: string, password?: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateAccount: (account: Partial<UserAccount>) => Promise<void>;
  syncCloudNow: () => Promise<void>;
  dismissReward: () => void;
  triggerManualReward: () => void;
  showToast: (title: string, message: string, icon?: string) => void;
  dismissToast: () => void;
  refreshData: () => Promise<void>;
}

const NutritionContext = createContext<NutritionContextType | undefined>(undefined);

export function NutritionProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [goals, setGoals] = useState<MacroTargets>(DEFAULT_GOALS);
  const [stats, setStats] = useState<UserStats>(DEFAULT_STATS);
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [userAccount, setUserAccount] = useState<UserAccount>(DEFAULT_ACCOUNT);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATIONS);
  const [waterLogs, setWaterLogsState] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [onboardingVisible, setOnboardingVisible] = useState<boolean>(false);
  const [toastNotification, setToastNotification] = useState<ToastNotification | null>(null);

  const [rewardState, setRewardState] = useState<RewardState>({
    visible: false,
    streak: 1,
    title: '',
    subtitle: '',
    caloriesAdded: 0,
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      await initializeStorage();
      const [
        storedEntries,
        storedGoals,
        storedStats,
        storedNotifs,
        storedProfile,
        storedAccount,
        storedWaterLogs,
        onboardingDone,
      ] = await Promise.all([
        getFoodEntries(),
        getMacroGoals(),
        getUserStats(),
        getNotificationSettings(),
        getUserProfile(),
        getUserAccount(),
        getWaterLogs(),
        hasCompletedOnboarding(),
      ]);

      setEntries(storedEntries);
      setGoals(storedGoals);
      setStats(storedStats);
      setNotificationSettings(storedNotifs);
      setUserProfile(storedProfile);
      setUserAccount(storedAccount);
      setWaterLogsState(storedWaterLogs);

      if (!onboardingDone) {
        setOnboardingVisible(true);
      }

      // Schedule notifications in background
      scheduleMealReminders(storedNotifs);

      // If user is signed in with Supabase, pull cloud updates in background
      if (storedAccount.isLoggedIn && storedAccount.email) {
        syncCloudBackground(storedEntries, storedGoals, storedProfile, storedWaterLogs);
      }
    } catch (err) {
      console.error('Failed to load nutrition state:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Background Cloud Sync to keep data updated across devices
  const syncCloudBackground = async (
    currentEntries: FoodEntry[],
    currentGoals: MacroTargets,
    currentProfile: UserProfile,
    currentWaterLogs: Record<string, number>
  ) => {
    try {
      const cloudData = await supabaseFetchAllUserData();
      if (!cloudData) return;

      // Merge food entries (combine unique IDs)
      if (cloudData.foodEntries && cloudData.foodEntries.length > 0) {
        const entryMap = new Map<string, FoodEntry>();
        cloudData.foodEntries.forEach((e) => entryMap.set(e.id, e));
        currentEntries.forEach((e) => {
          if (!entryMap.has(e.id)) entryMap.set(e.id, e);
        });
        const mergedEntries = Array.from(entryMap.values()).sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        setEntries(mergedEntries);
        setAllFoodEntries(mergedEntries);
      }

      // Merge water logs
      if (cloudData.waterLogs && Object.keys(cloudData.waterLogs).length > 0) {
        const mergedWater = { ...currentWaterLogs, ...cloudData.waterLogs };
        setWaterLogsState(mergedWater);
        setAllWaterLogs(mergedWater);
      }

      // Merge goals & profile if present in cloud
      if (cloudData.goals) {
        setGoals(cloudData.goals);
        saveMacroGoals(cloudData.goals);
      }
      if (cloudData.profile) {
        setUserProfile(cloudData.profile);
        saveUserProfile(cloudData.profile);
      }
    } catch (err) {
      console.warn('Background sync notice:', err);
    }
  };

  // Initial mount data load
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // Compute water consumed for currently selected date
  const waterMl = useMemo(() => {
    return waterLogs[selectedDate] ?? (selectedDate === getTodayDateString() ? 1500 : 0);
  }, [waterLogs, selectedDate]);

  // Filter entries for active selected date
  const activeDateEntries = useMemo(() => {
    return entries.filter((e) => e.date === selectedDate);
  }, [entries, selectedDate]);

  // Compute consumed totals for selected date
  const consumed = useMemo(() => {
    return activeDateEntries.reduce(
      (acc, item) => ({
        calories: acc.calories + (Number(item.calories) || 0),
        protein: acc.protein + (Number(item.protein) || 0),
        carbs: acc.carbs + (Number(item.carbs) || 0),
        fats: acc.fats + (Number(item.fats) || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );
  }, [activeDateEntries]);

  // Compute remaining against daily goal
  const remaining = useMemo(() => {
    return {
      calories: Math.max(goals.calories - consumed.calories, 0),
      protein: Math.max(goals.protein - consumed.protein, 0),
      carbs: Math.max(goals.carbs - consumed.carbs, 0),
      fats: Math.max(goals.fats - consumed.fats, 0),
    };
  }, [goals, consumed]);

  const dailySummary: DailySummary = useMemo(() => {
    const goalMet =
      consumed.calories >= goals.calories * 0.85 &&
      consumed.calories <= goals.calories * 1.15;

    return {
      date: selectedDate,
      totalCalories: consumed.calories,
      totalProtein: consumed.protein,
      totalCarbs: consumed.carbs,
      totalFats: consumed.fats,
      entries: activeDateEntries,
      goalMet,
    };
  }, [selectedDate, consumed, goals, activeDateEntries]);

  // Water Tracking Handlers
  const logWater = async (amountMl: number, date?: string) => {
    const targetDate = date || selectedDate;
    const current = waterLogs[targetDate] ?? (targetDate === getTodayDateString() ? 1500 : 0);
    const newTotal = Math.max(0, current + amountMl);
    const updated = await saveWaterForDate(targetDate, newTotal);
    setWaterLogsState(updated);

    // Sync water log to Supabase in background
    supabaseSyncWaterLog(targetDate, newTotal);

    triggerLightImpact();
    showToast(
      'Water Intake Logged 💧',
      `+${amountMl} ml logged (${(newTotal / 1000).toFixed(2)}L / ${((goals.waterMl || 2000) / 1000).toFixed(1)}L)`,
      'droplet'
    );
  };

  const setWater = async (totalMl: number, date?: string) => {
    const targetDate = date || selectedDate;
    const newTotal = Math.max(0, Math.round(totalMl));
    const updated = await saveWaterForDate(targetDate, newTotal);
    setWaterLogsState(updated);

    // Sync water log to Supabase
    supabaseSyncWaterLog(targetDate, newTotal);

    triggerSuccessFeedback();
    showToast('Hydration Updated 💧', `Set to ${(newTotal / 1000).toFixed(2)}L for ${targetDate}`, 'droplet');
  };

  // Authentication Handlers
  const signIn = async (email: string, name?: string, password?: string) => {
    setIsSyncing(true);
    try {
      // 1. Sign up/in directly with Supabase Auth
      const res = await supabaseSignUp(email, password, name);
      const account: UserAccount = res.user || (await signInUser(email, name));

      setUserAccount(account);
      await saveUserAccount(account);

      // 2. Push current local data up to Supabase
      const currentWeights = await getWeightLogs();
      await supabasePushLocalData({
        entries,
        weights: currentWeights,
        waterLogs,
        goals,
        profile: userProfile,
      });

      // 3. Pull all merged cloud history down
      const cloudData = await supabaseFetchAllUserData();
      if (cloudData) {
        if (cloudData.foodEntries && cloudData.foodEntries.length > 0) {
          setEntries(cloudData.foodEntries);
          await setAllFoodEntries(cloudData.foodEntries);
        }
        if (cloudData.waterLogs) {
          const mergedWater = { ...waterLogs, ...cloudData.waterLogs };
          setWaterLogsState(mergedWater);
          await setAllWaterLogs(mergedWater);
        }
        if (cloudData.goals) {
          setGoals(cloudData.goals);
          await saveMacroGoals(cloudData.goals);
        }
        if (cloudData.profile) {
          setUserProfile(cloudData.profile);
          await saveUserProfile(cloudData.profile);
        }
      }

      showToast('Welcome back! 👋', `Multi-device cloud sync active for ${account.name}`, 'sparkles');
    } catch (err) {
      console.error('Sign in error:', err);
      showToast('Sign In Notice', 'Signed in locally. Cloud sync will retry.', 'sparkles');
    } finally {
      setIsSyncing(false);
    }
  };

  const signOut = async () => {
    await supabaseSignOut();
    const account = await signOutUser();
    setUserAccount(account);
    showToast('Signed Out', 'You are now browsing in guest mode.', 'sparkles');
  };

  const updateAccount = async (partial: Partial<UserAccount>) => {
    const updated = { ...userAccount, ...partial };
    setUserAccount(updated);
    await saveUserAccount(updated);
    showToast('Profile Updated', 'Account details saved successfully.', 'sparkles');
  };

  // Manual Trigger Full Cloud Sync
  const syncCloudNow = async () => {
    if (!userAccount.isLoggedIn) {
      showToast('Guest Mode', 'Sign in to sync your data to the cloud.', 'sparkles');
      return;
    }

    setIsSyncing(true);
    try {
      const currentWeights = await getWeightLogs();
      await supabasePushLocalData({
        entries,
        weights: currentWeights,
        waterLogs,
        goals,
        profile: userProfile,
      });

      const cloudData = await supabaseFetchAllUserData();
      if (cloudData) {
        if (cloudData.foodEntries) {
          setEntries(cloudData.foodEntries);
          await setAllFoodEntries(cloudData.foodEntries);
        }
        if (cloudData.waterLogs) {
          setWaterLogsState(cloudData.waterLogs);
          await setAllWaterLogs(cloudData.waterLogs);
        }
        if (cloudData.goals) {
          setGoals(cloudData.goals);
          await saveMacroGoals(cloudData.goals);
        }
        if (cloudData.profile) {
          setUserProfile(cloudData.profile);
          await saveUserProfile(cloudData.profile);
        }
      }
      triggerSuccessFeedback();
      showToast('Cloud Sync Complete ☁️', 'All meals, targets, weights, and water logs are up to date.', 'sparkles');
    } catch (err) {
      console.error('Manual sync failed:', err);
      showToast('Sync Error', 'Could not sync with Supabase. Check your connection.', 'sparkles');
    } finally {
      setIsSyncing(false);
    }
  };

  // Food Logging Actions
  const logMeal = async (meal: Omit<FoodEntry, 'id' | 'timestamp' | 'date'> & { date?: string }) => {
    try {
      const targetDate = meal.date || selectedDate;
      const newEntry: FoodEntry = {
        ...meal,
        id: `entry_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toISOString(),
        date: targetDate,
      };

      const { entries: updatedEntries, stats: updatedStats } = await saveFoodEntry(newEntry);
      setEntries(updatedEntries);
      setStats(updatedStats);

      // Non-blocking sync to Supabase PostgreSQL database
      supabaseSyncFoodEntry(newEntry);

      // Trigger Haptic feedback on device
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      // Check if this action triggers a milestone/reward celebration
      const totalDayCal = updatedEntries
        .filter((e) => e.date === targetDate)
        .reduce((sum, e) => sum + (Number(e.calories) || 0), 0);

      const isGoalHit = totalDayCal >= goals.calories * 0.9 && totalDayCal <= goals.calories * 1.1;

      if (isGoalHit) {
        // 🎵 Play success chime and trigger multi-stage celebration haptic
        playGoalChime();
        triggerGoalCelebrationHaptic();

        setRewardState({
          visible: true,
          streak: stats.currentStreak + 1,
          title: 'Macro Target Met! 🎯',
          subtitle: `You locked in ${totalDayCal} kcal and hit your daily nutrition goal.`,
          caloriesAdded: meal.calories,
        });
        sendInstantStreakCelebration(stats.currentStreak + 1);
      } else {
        triggerSuccessFeedback();
        showToast(
          `Logged ${meal.name}`,
          `+${meal.calories} kcal • ${meal.protein}g Protein added to ${meal.mealType.toUpperCase()}`,
          'flame'
        );
      }
    } catch (error) {
      console.error('Error logging meal:', error);
    }
  };

  const editMeal = async (entry: FoodEntry) => {
    try {
      const updated = await updateFoodEntry(entry);
      setEntries(updated);
      supabaseSyncFoodEntry(entry);
      triggerSuccessFeedback();
      showToast('Meal Updated', `${entry.name} adjusted to ${entry.calories} kcal.`, 'sparkles');
    } catch (error) {
      console.error('Error editing meal:', error);
    }
  };

  const removeMeal = async (id: string) => {
    try {
      const updated = await deleteFoodEntry(id);
      setEntries(updated);
      supabaseDeleteFoodEntry(id);
      triggerLightImpact();
      showToast('Meal Deleted', 'Entry removed from daily log.', 'sparkles');
    } catch (error) {
      console.error('Error removing meal:', error);
    }
  };

  const updateGoals = async (newGoals: MacroTargets) => {
    setGoals(newGoals);
    await saveMacroGoals(newGoals);
    supabaseSyncMacroTargets(newGoals);
    showToast('Goals Updated 🎯', `Daily budget: ${newGoals.calories} kcal • ${((newGoals.waterMl || 2000) / 1000).toFixed(1)}L Water`, 'sparkles');
  };

  const saveProfile = async (newProfile: UserProfile, newGoals: MacroTargets) => {
    setUserProfile(newProfile);
    setGoals(newGoals);
    await saveUserProfile(newProfile);
    await saveMacroGoals(newGoals);
    await setOnboardingCompleted(true);
    supabaseSyncUserProfile(newProfile);
    supabaseSyncMacroTargets(newGoals);
    showToast('Nutrition Plan Activated 🎯', `${newGoals.calories} kcal • ${newGoals.protein}g Protein Target`, 'sparkles');
  };

  const updateNotifications = async (newSettings: NotificationSettings) => {
    setNotificationSettings(newSettings);
    await saveNotificationSettings(newSettings);
    await scheduleMealReminders(newSettings);
  };

  const showToast = (title: string, message: string, icon?: string) => {
    setToastNotification({
      id: String(Date.now()),
      title,
      message,
      icon,
      timestamp: Date.now(),
    });
  };

  const dismissToast = () => {
    setToastNotification(null);
  };

  const dismissReward = () => {
    setRewardState((prev) => ({ ...prev, visible: false }));
  };

  const triggerManualReward = () => {
    playGoalChime();
    triggerGoalCelebrationHaptic();
    setRewardState({
      visible: true,
      streak: stats.currentStreak,
      title: 'Daily Goal Achieved! 🏆',
      subtitle: 'Perfect macro balance today! Keep the momentum going.',
      caloriesAdded: 0,
    });
  };

  return (
    <NutritionContext.Provider
      value={{
        entries,
        selectedDate,
        setSelectedDate,
        goals,
        stats,
        userProfile,
        userAccount,
        notificationSettings,
        dailySummary,
        waterMl,
        waterLogs,
        consumed,
        remaining,
        isLoading,
        isSyncing,
        rewardState,
        toastNotification,
        onboardingVisible,
        setOnboardingVisible,
        logMeal,
        editMeal,
        removeMeal,
        logWater,
        setWater,
        updateGoals,
        saveProfile,
        updateNotifications,
        signIn,
        signOut,
        updateAccount,
        syncCloudNow,
        dismissReward,
        triggerManualReward,
        showToast,
        dismissToast,
        refreshData: loadData,
      }}>
      {children}
    </NutritionContext.Provider>
  );
}

export function useNutrition() {
  const context = useContext(NutritionContext);
  if (!context) {
    throw new Error('useNutrition must be used within a NutritionProvider');
  }
  return context;
}

