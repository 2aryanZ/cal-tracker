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
  DEFAULT_GOALS,
  DEFAULT_STATS,
  DEFAULT_NOTIFICATIONS,
  DEFAULT_PROFILE,
  DEFAULT_ACCOUNT,
} from '@/services/storage';
import { scheduleMealReminders, sendInstantStreakCelebration } from '@/services/notificationService';
import { supabaseSignUp, supabaseSignOut, supabaseSyncFoodEntry } from '@/services/supabase';
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
  rewardState: RewardState;
  toastNotification: ToastNotification | null;
  onboardingVisible: boolean;
  setOnboardingVisible: (visible: boolean) => void;
  logMeal: (meal: Omit<FoodEntry, 'id' | 'timestamp' | 'date'> & { date?: string }) => Promise<void>;
  editMeal: (entry: FoodEntry) => Promise<void>;
  removeMeal: (id: string) => Promise<void>;
  updateGoals: (goals: MacroTargets) => Promise<void>;
  saveProfile: (profile: UserProfile, newGoals: MacroTargets) => Promise<void>;
  updateNotifications: (settings: NotificationSettings) => Promise<void>;
  signIn: (email: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateAccount: (account: Partial<UserAccount>) => Promise<void>;
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
  const [isLoading, setIsLoading] = useState<boolean>(false);
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
        onboardingDone,
      ] = await Promise.all([
        getFoodEntries(),
        getMacroGoals(),
        getUserStats(),
        getNotificationSettings(),
        getUserProfile(),
        getUserAccount(),
        hasCompletedOnboarding(),
      ]);

      setEntries(storedEntries);
      setGoals(storedGoals);
      setStats(storedStats);
      setNotificationSettings(storedNotifs);
      setUserProfile(storedProfile);
      setUserAccount(storedAccount);

      if (!onboardingDone) {
        setOnboardingVisible(true);
      }

      // Schedule notifications in background
      scheduleMealReminders(storedNotifs);
    } catch (err) {
      console.error('Failed to load nutrition state:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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

  // Authentication Handlers
  const signIn = async (email: string, name?: string) => {
    // 1. Sign up/in directly with Supabase Auth
    const res = await supabaseSignUp(email, undefined, name);
    const account: UserAccount = res.user || (await signInUser(email, name));

    setUserAccount(account);
    await saveUserAccount(account);
    showToast('Welcome back! 👋', `Signed in as ${account.name} (${account.email})`, 'sparkles');
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

  // Actions
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
      triggerLightImpact();
      showToast('Meal Deleted', 'Entry removed from daily log.', 'sparkles');
    } catch (error) {
      console.error('Error removing meal:', error);
    }
  };

  const updateGoals = async (newGoals: MacroTargets) => {
    setGoals(newGoals);
    await saveMacroGoals(newGoals);
    showToast('Goals Updated 🎯', `Daily budget: ${newGoals.calories} kcal`, 'sparkles');
  };

  const saveProfile = async (newProfile: UserProfile, newGoals: MacroTargets) => {
    setUserProfile(newProfile);
    setGoals(newGoals);
    await saveUserProfile(newProfile);
    await saveMacroGoals(newGoals);
    await setOnboardingCompleted(true);
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
        consumed,
        remaining,
        isLoading,
        rewardState,
        toastNotification,
        onboardingVisible,
        setOnboardingVisible,
        logMeal,
        editMeal,
        removeMeal,
        updateGoals,
        saveProfile,
        updateNotifications,
        signIn,
        signOut,
        updateAccount,
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
