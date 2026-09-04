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
  WeightEntry,
  MealType,
  DietaryPreference,
  FavoriteMeal,
  HealthSyncSettings,
  MilestoneBadge,
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
  addWeightLog,
  deleteWeightLog,
  getFavoriteMeals,
  saveFavoriteMeal,
  removeFavoriteMeal,
  getDietaryPreference,
  saveDietaryPreference,
  getHealthSyncSettings,
  saveHealthSyncSettings,
  DEFAULT_GOALS,
  DEFAULT_STATS,
  DEFAULT_NOTIFICATIONS,
  DEFAULT_PROFILE,
  DEFAULT_ACCOUNT,
  DEFAULT_DIETARY_PREFERENCE,
  DEFAULT_HEALTH_SYNC,
} from '@/services/storage';
import { scheduleMealReminders, sendInstantStreakCelebration } from '@/services/notificationService';
import {
  supabaseSignUp,
  supabaseSignOut,
  supabaseSignInWithGoogle,
  supabaseSignInWithApple,
  supabaseSyncFoodEntry,
  supabaseDeleteFoodEntry,
  supabaseSyncWaterLog,
  supabaseSyncWeightLog,
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
  weightLogs: WeightEntry[];
  favoriteMeals: FavoriteMeal[];
  recentMeals: FoodEntry[];
  dietaryPreference: DietaryPreference;
  healthSync: HealthSyncSettings;
  milestoneBadges: MilestoneBadge[];
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
  addWeight: (data: { weightKg: number; weightLbs: number; date?: string; note?: string }) => Promise<void>;
  deleteWeight: (id: string) => Promise<void>;
  toggleFavoriteMeal: (meal: { name: string; calories: number; protein: number; carbs: number; fats: number; mealType: any; portionSize?: string; imageUri?: string }) => Promise<boolean>;
  isFavoriteMeal: (name: string) => boolean;
  setDietaryPreference: (pref: DietaryPreference) => Promise<void>;
  updateHealthSync: (settings: Partial<HealthSyncSettings>) => Promise<void>;
  repeatYesterdayMeal: (mealType: import('@/types/nutrition').MealType) => Promise<number>;
  updateGoals: (goals: MacroTargets) => Promise<void>;
  saveProfile: (profile: UserProfile, newGoals: MacroTargets) => Promise<void>;
  updateNotifications: (settings: NotificationSettings) => Promise<void>;
  signIn: (email: string, name?: string, password?: string) => Promise<void>;
  signInWithGoogle: () => Promise<boolean>;
  signInWithApple: () => Promise<boolean>;
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
  const [weightLogs, setWeightLogsState] = useState<WeightEntry[]>([]);
  const [favoriteMeals, setFavoriteMealsState] = useState<FavoriteMeal[]>([]);
  const [dietaryPreference, setDietaryPreferenceState] = useState<DietaryPreference>(DEFAULT_DIETARY_PREFERENCE);
  const [healthSync, setHealthSyncState] = useState<HealthSyncSettings>(DEFAULT_HEALTH_SYNC);
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
        storedWeights,
        storedFavorites,
        storedPref,
        storedHealth,
        onboardingDone,
      ] = await Promise.all([
        getFoodEntries(),
        getMacroGoals(),
        getUserStats(),
        getNotificationSettings(),
        getUserProfile(),
        getUserAccount(),
        getWaterLogs(),
        getWeightLogs(),
        getFavoriteMeals(),
        getDietaryPreference(),
        getHealthSyncSettings(),
        hasCompletedOnboarding(),
      ]);

      setEntries(storedEntries);
      setGoals(storedGoals);
      setStats(storedStats);
      setNotificationSettings(storedNotifs);
      setUserProfile(storedProfile);
      setUserAccount(storedAccount);
      setWaterLogsState(storedWaterLogs);
      setWeightLogsState(storedWeights);
      setFavoriteMealsState(storedFavorites);
      setDietaryPreferenceState(storedPref);
      setHealthSyncState(storedHealth);

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

  // Weight Tracking Handlers
  const addWeight = async (data: { weightKg: number; weightLbs: number; date?: string; note?: string }) => {
    const targetDate = data.date || getTodayDateString();
    const updated = await addWeightLog({
      weightKg: data.weightKg,
      weightLbs: data.weightLbs,
      date: targetDate,
      note: data.note,
    });
    setWeightLogsState(updated);

    // Synchronize userProfile weight to match
    const updatedProfile: UserProfile = { ...userProfile, weightKg: data.weightKg };
    setUserProfile(updatedProfile);
    await saveUserProfile(updatedProfile);

    // Sync to Supabase
    supabaseSyncWeightLog({
      id: updated[0]?.id || `w_${Date.now()}`,
      weightKg: data.weightKg,
      weightLbs: data.weightLbs,
      date: targetDate,
      timestamp: new Date().toISOString(),
      note: data.note,
    });


    triggerLightImpact();
    const displayVal = userProfile.unitSystem === 'imperial' ? `${data.weightLbs} lbs` : `${data.weightKg} kg`;
    showToast('Weigh-In Saved', `${displayVal} recorded for ${targetDate}`, 'sparkles');
  };

  const deleteWeight = async (id: string) => {
    const updated = await deleteWeightLog(id);
    setWeightLogsState(updated);
    if (updated.length > 0) {
      const newActiveKg = updated[0].weightKg;
      const updatedProfile: UserProfile = { ...userProfile, weightKg: newActiveKg };
      setUserProfile(updatedProfile);
      await saveUserProfile(updatedProfile);
    }
    showToast('Log Removed', 'Weigh-in entry deleted.', 'sparkles');
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

  const signInWithGoogle = async (): Promise<boolean> => {
    setIsSyncing(true);
    try {
      const res = await supabaseSignInWithGoogle();
      if (res.error === 'cancelled') {
        return false;
      }
      if (res.error) {
        throw new Error(res.error);
      }
      if (res.user) {
        setUserAccount(res.user);
        await saveUserAccount(res.user);

        // Push local and pull cloud data
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

        showToast('Welcome back! 👋', `Signed in with Google as ${res.user.name}`, 'sparkles');
        return true;
      }
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  const signInWithApple = async (): Promise<boolean> => {
    setIsSyncing(true);
    try {
      const res = await supabaseSignInWithApple();
      if (res.error === 'cancelled') {
        return false;
      }
      if (res.error) {
        throw new Error(res.error);
      }
      if (res.user) {
        setUserAccount(res.user);
        await saveUserAccount(res.user);

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

        showToast('Welcome back! 👋', `Signed in with Apple as ${res.user.name}`, 'sparkles');
        return true;
      }
      return false;
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

    // Keep weight logs in 100% sync whenever profile weight changes
    if (newProfile.weightKg) {
      const lbs = Math.round(newProfile.weightKg * 2.20462 * 10) / 10;
      const updated = await addWeightLog({
        weightKg: newProfile.weightKg,
        weightLbs: lbs,
        date: getTodayDateString(),
        note: 'Updated profile baseline',
      });
      setWeightLogsState(updated);
    }

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

  // Distinct recent meals logged across all time
  const recentMeals = useMemo(() => {
    const seen = new Set<string>();
    const list: FoodEntry[] = [];
    for (const entry of entries) {
      const clean = entry.name.trim().toLowerCase();
      if (!seen.has(clean)) {
        seen.add(clean);
        list.push(entry);
      }
      if (list.length >= 8) break;
    }
    return list;
  }, [entries]);

  // Milestone Badges Computed State
  const milestoneBadges = useMemo<MilestoneBadge[]>(() => {
    const streak = stats.currentStreak || 0;
    const totalMeals = stats.totalMealsLogged || 0;
    const currentWeight = weightLogs[0]?.weightKg ?? userProfile.weightKg ?? 75;
    const targetWeight = userProfile.targetWeightKg || 74;
    const weightProgressPct = Math.min(1, Math.max(0, Math.abs(78 - currentWeight) / (Math.abs(78 - targetWeight) || 1)));

    return [
      {
        id: 'badge_streak_7',
        title: '7-Day Streak Beast',
        description: 'Log daily nutrition for 7 consecutive days',
        category: 'streak',
        icon: 'flame',
        isUnlocked: streak >= 7,
        unlockedAt: streak >= 7 ? 'Earned' : undefined,
        progress: Math.min(1, streak / 7),
        progressText: `${Math.min(streak, 7)}/7 Days`,
      },
      {
        id: 'badge_streak_30',
        title: '30-Day Master',
        description: 'Log daily nutrition for 30 consecutive days',
        category: 'streak',
        icon: 'trophy',
        isUnlocked: streak >= 30,
        unlockedAt: streak >= 30 ? 'Earned' : undefined,
        progress: Math.min(1, streak / 30),
        progressText: `${Math.min(streak, 30)}/30 Days`,
      },
      {
        id: 'badge_protein_master',
        title: 'Protein Master',
        description: 'Hit 100%+ of your daily protein target budget',
        category: 'nutrition',
        icon: 'target',
        isUnlocked: consumed.protein >= goals.protein && goals.protein > 0,
        unlockedAt: consumed.protein >= goals.protein ? 'Earned Today' : undefined,
        progress: goals.protein > 0 ? Math.min(1, consumed.protein / goals.protein) : 0,
        progressText: `${consumed.protein}/${goals.protein}g`,
      },
      {
        id: 'badge_hydration_hero',
        title: 'Hydration Hero',
        description: 'Drink and record at least 2.0L of water in a day',
        category: 'water',
        icon: 'droplet',
        isUnlocked: waterMl >= (goals.waterMl || 2000),
        unlockedAt: waterMl >= (goals.waterMl || 2000) ? 'Earned Today' : undefined,
        progress: Math.min(1, waterMl / (goals.waterMl || 2000)),
        progressText: `${(waterMl / 1000).toFixed(1)}L / ${((goals.waterMl || 2000) / 1000).toFixed(1)}L`,
      },
      {
        id: 'badge_ai_scanner',
        title: 'AI Vision Prodigy',
        description: 'Log 10 meals using the AI camera or barcode scanner',
        category: 'scans',
        icon: 'camera',
        isUnlocked: totalMeals >= 10,
        unlockedAt: totalMeals >= 10 ? 'Earned' : undefined,
        progress: Math.min(1, totalMeals / 10),
        progressText: `${Math.min(totalMeals, 10)}/10 Meals`,
      },
      {
        id: 'badge_weight_goal',
        title: 'Target Weight Crusher',
        description: 'Reach or surpass your target milestone body weight',
        category: 'weight',
        icon: 'scale',
        isUnlocked: Math.abs(currentWeight - targetWeight) <= 0.5,
        unlockedAt: Math.abs(currentWeight - targetWeight) <= 0.5 ? 'Earned' : undefined,
        progress: weightProgressPct,
        progressText: `${Math.round(weightProgressPct * 100)}% Progress`,
      },
    ];
  }, [stats, weightLogs, userProfile, consumed.protein, goals, waterMl]);

  // Favorites management
  const toggleFavoriteMeal = async (meal: {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    mealType: any;
    portionSize?: string;
    imageUri?: string;
  }): Promise<boolean> => {
    const isFav = favoriteMeals.some((f) => f.name.toLowerCase() === meal.name.toLowerCase());
    if (isFav) {
      const match = favoriteMeals.find((f) => f.name.toLowerCase() === meal.name.toLowerCase());
      if (match) {
        const updated = await removeFavoriteMeal(match.id);
        setFavoriteMealsState(updated);
        showToast('Removed from Favorites', `${meal.name} unbookmarked.`, 'star');
        return false;
      }
      return false;
    } else {
      const updated = await saveFavoriteMeal(meal);
      setFavoriteMealsState(updated);
      triggerSuccessFeedback();
      showToast('Added to Favorites ⭐', `${meal.name} saved for 1-tap quick logging.`, 'star');
      return true;
    }
  };

  const isFavoriteMeal = (name: string): boolean => {
    return favoriteMeals.some((f) => f.name.toLowerCase() === name.trim().toLowerCase());
  };

  const setDietaryPreference = async (pref: DietaryPreference) => {
    setDietaryPreferenceState(pref);
    await saveDietaryPreference(pref);
    showToast('Diet Preference Saved', `Set to ${pref.replace('_', ' ').toUpperCase()}`, 'sparkles');
  };

  const updateHealthSync = async (settings: Partial<HealthSyncSettings>) => {
    const updated: HealthSyncSettings = { ...healthSync, ...settings, lastSyncedAt: new Date().toISOString() };
    setHealthSyncState(updated);
    await saveHealthSyncSettings(updated);
    showToast('Health Sync Updated 🩺', 'Biometric sync settings updated.', 'sparkles');
  };

  // Repeat yesterday's specific meal slot into today
  const repeatYesterdayMeal = async (mealType: MealType): Promise<number> => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const yesterdayMeals = entries.filter((e) => e.date === yesterdayStr && e.mealType === mealType);
    if (yesterdayMeals.length === 0) {
      showToast('No Meals Found', `No ${mealType} entries found for yesterday.`, 'sparkles');
      return 0;
    }

    triggerSuccessFeedback();
    for (const item of yesterdayMeals) {
      await logMeal({
        name: item.name,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fats: item.fats,
        mealType: item.mealType,
        portionSize: item.portionSize,
        imageUri: item.imageUri,
        date: selectedDate || getTodayDateString(),
        isAiGenerated: false,
      });
    }

    showToast(
      `Repeated Yesterday's ${mealType.toUpperCase()} ⚡`,
      `Logged ${yesterdayMeals.length} meal(s) into today's ${mealType}.`,
      'sparkles'
    );
    return yesterdayMeals.length;
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


  const contextValue = useMemo<NutritionContextType>(
    () => ({
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
      weightLogs,
      favoriteMeals,
      recentMeals,
      dietaryPreference,
      healthSync,
      milestoneBadges,
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
      addWeight,
      deleteWeight,
      toggleFavoriteMeal,
      isFavoriteMeal,
      setDietaryPreference,
      updateHealthSync,
      repeatYesterdayMeal,
      updateGoals,
      saveProfile,
      updateNotifications,
      signIn,
      signInWithGoogle,
      signInWithApple,
      signOut,
      updateAccount,
      syncCloudNow,

      dismissReward,
      triggerManualReward,
      showToast,
      dismissToast,
      refreshData: loadData,
    }),
    [
      entries,
      selectedDate,
      goals,
      stats,
      userProfile,
      userAccount,
      notificationSettings,
      dailySummary,
      waterMl,
      waterLogs,
      weightLogs,
      favoriteMeals,
      recentMeals,
      dietaryPreference,
      healthSync,
      milestoneBadges,
      consumed,
      remaining,
      isLoading,
      isSyncing,
      rewardState,
      toastNotification,
      onboardingVisible,
    ]
  );

  return (
    <NutritionContext.Provider value={contextValue}>
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

