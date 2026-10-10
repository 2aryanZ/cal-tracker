import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import {
  AppState,
  ActivityIndicator,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { JOURNAL } from '@/constants/theme';
import {
  recentJournalMeals,
  recordedWeightsThrough,
  indexJournal,
} from '@/services/journalRules';
import type { IndexedDay } from '@/services/journalRules';
import type {
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
import { SyncScheduler } from '@/services/syncScheduler';
import * as storage from '@/services/storage';
import {
  supabase,
  accountFromAuthUser,
  supabaseSignIn,
  supabaseSignUp,
  supabaseSignInWithGoogle,
  supabaseSignInWithApple,
  supabaseSignOut,
  syncAccount,
} from '@/services/supabase';
import {
  calculateStats,
  isCalorieGoalMet,
  newId,
  weightProgress,
} from '@/services/nutritionRules';
import {
  scheduleMealReminders,
  sendInstantStreakCelebration,
} from '@/services/notificationService';
import {
  triggerSuccessFeedback,
  triggerLightImpact,
} from '@/services/hapticsService';
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
  journalDays: Readonly<Record<string, IndexedDay>>;
  onboardingVisible: boolean;
  hasCompletedOnboarding: boolean;
  setOnboardingVisible: (visible: boolean) => void;
  logMeal: (
    meal: Omit<FoodEntry, 'id' | 'timestamp' | 'date'> & {
      date?: string;
    },
  ) => Promise<void>;
  editMeal: (entry: FoodEntry) => Promise<void>;
  removeMeal: (id: string) => Promise<void>;
  logWater: (amountMl: number, date?: string) => Promise<void>;
  setWater: (totalMl: number, date?: string) => Promise<void>;
  addWeight: (data: {
    weightKg: number;
    weightLbs: number;
    date?: string;
    note?: string;
  }) => Promise<void>;
  deleteWeight: (id: string) => Promise<void>;
  toggleFavoriteMeal: (
    meal: Omit<FavoriteMeal, 'id' | 'createdAt'>,
  ) => Promise<boolean>;
  isFavoriteMeal: (name: string) => boolean;
  setDietaryPreference: (pref: DietaryPreference) => Promise<void>;
  updateHealthSync: (settings: Partial<HealthSyncSettings>) => Promise<void>;
  repeatYesterdayMeal: (
    mealType: import('@/types/nutrition').MealType,
  ) => Promise<number>;
  updateGoals: (goals: MacroTargets) => Promise<void>;
  saveProfile: (profile: UserProfile, newGoals: MacroTargets) => Promise<void>;
  updateNotifications: (settings: NotificationSettings) => Promise<void>;
  signIn: (
    email: string,
    name?: string,
    password?: string,
    isSignUpMode?: boolean,
  ) => Promise<boolean>;
  signInWithGoogle: () => Promise<boolean>;
  signInWithApple: () => Promise<boolean>;
  signOut: () => Promise<void>;
  updateAccount: (account: Partial<UserAccount>) => Promise<void>;
  syncCloudNow: () => Promise<void>;
  triggerManualReward: () => void;
  showToast: (title: string, message: string, icon?: string) => void;
  refreshData: () => Promise<void>;
  exportData: () => Promise<string>;
  resetData: () => Promise<void>;
}
interface NutritionFeedbackType {
  rewardState: RewardState;
  toastNotification: ToastNotification | null;
  dismissReward: () => void;
  dismissToast: () => void;
}
const NutritionFeedbackContext = createContext<NutritionFeedbackType | undefined>(undefined);
const NutritionContext = createContext<NutritionContextType | undefined>(
  undefined,
);
const EMPTY_ENTRIES: FoodEntry[] = [];
export function NutritionProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<storage.LocalSnapshot | null>(null);
  const [userAccount, setUserAccount] = useState(storage.DEFAULT_ACCOUNT);
  const [selectedDate, setSelectedDate] = useState(
    storage.getTodayDateString(),
  );
  const [today, setToday] = useState(storage.getTodayDateString());
  const todayRef = useRef(today);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [onboardingVisible, setOnboardingVisible] = useState(false);
  const [toastNotification, setToastNotification] =
    useState<ToastNotification | null>(null);
  const [rewardState, setRewardState] = useState<RewardState>({
    visible: false,
    streak: 0,
    title: '',
    subtitle: '',
    caloriesAdded: 0,
  });
  const ownerRef = useRef('guest');
  const retryAccountRef = useRef(storage.DEFAULT_ACCOUNT);
  const generation = useRef(0);
  const alive = useRef(true);
  const authTail = useRef<Promise<unknown>>(Promise.resolve());
  const snapshotRef = useRef<storage.LocalSnapshot | null>(null);
  const showToast = useCallback(
    (title: string, message: string, icon?: string) =>
      setToastNotification({
        id: newId('toast'),
        title,
        message,
        icon,
        timestamp: Date.now(),
      }),
    [],
  );
  const refreshLocal = useCallback(async (owner = ownerRef.current) => {
    const value = await storage.getSnapshot();
    if (
      alive.current &&
      ownerRef.current === owner &&
      storage.getStorageScope() === owner
    ) {
      snapshotRef.current = value;
      setSnapshot(value);
    }
    return value;
  }, []);
  const syncCloudNow = useCallback(async () => {
    if (ownerRef.current === 'guest') {
      showToast('Guest mode', 'Sign in to sync your own account.');
      return;
    }
    const owner = ownerRef.current;
    setIsSyncing(true);
    try {
      await syncAccount();
      if (ownerRef.current === owner) {
        await refreshLocal(owner);
        showToast('Sync complete', 'Your account data is up to date.');
      }
    } catch (error) {
      if (ownerRef.current === owner)
        showToast(
          'Changes kept on this device',
          error instanceof Error
            ? error.message
            : 'Cloud sync failed. Try again.',
        );
    } finally {
      if (alive.current) setIsSyncing(false);
    }
  }, [refreshLocal, showToast]);
  const syncScheduler = useRef(new SyncScheduler());
  const foreground = useRef(!AppState?.currentState || AppState.currentState === 'active');
  const backgroundSync = useCallback((edit = false) => {
    const owner = ownerRef.current;
    syncScheduler.current.request(owner, foreground.current, edit, async () => {
      try {
        await syncAccount();
        await refreshLocal(owner);
      } catch (error) {
        if (ownerRef.current === owner)
          showToast('Cloud sync pending', error instanceof Error ? error.message : 'Your changes are kept on this device.');
        throw error;
      }
    });
  }, [refreshLocal, showToast]);
  const activateAccount = useCallback(
    (account: UserAccount): Promise<void> => {
      const job = authTail.current.then(async () => {
        const owner = account.isLoggedIn ? account.id : 'guest';
        if (ownerRef.current === owner && snapshotRef.current) {
          setUserAccount(account);
          return;
        }
        retryAccountRef.current = account;
        const token = ++generation.current;
        setIsLoading(true);
        setOnboardingVisible(false);
        setRewardState((r) => ({ ...r, visible: false }));
        setSnapshot(null);
        snapshotRef.current = null;
        await storage.setStorageScope(account.isLoggedIn ? account.id : null);
        ownerRef.current = owner;
        if (account.isLoggedIn) {
          try {
            await syncAccount();
            syncScheduler.current.completed(owner);
          } catch (error) {
            showToast(
              'Cloud sync pending',
              error instanceof Error
                ? error.message
                : 'Your device data was retained.',
            );
          }
        }
        const value = await storage.getSnapshot();
        if (!alive.current || token !== generation.current) return;
        snapshotRef.current = value;
        setSnapshot(value);
        setUserAccount(account);
        setSelectedDate(storage.getTodayDateString());
        setOnboardingVisible(!value.onboardingDone);
        setIsLoading(false);
        void scheduleMealReminders(value.notifications, value.entries).catch(
          (error) => showToast('Reminder setup failed', error.message),
        );

      });
      authTail.current = job.catch((error) => {
        if (alive.current) {
          setIsLoading(false);
          showToast(
            'Unable to load account',
            error instanceof Error ? error.message : 'Please try again.',
          );
        }
      });
      return job;
    },
    [showToast],
  );
  useEffect(() => {
    alive.current = true;
    const scheduler = syncScheduler.current;
    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) throw error;
        return activateAccount(
          data.session?.user
            ? accountFromAuthUser(data.session.user)
            : storage.DEFAULT_ACCOUNT,
        );
      })
      .catch((error) => {
        showToast('Session unavailable', String(error.message ?? error));
        void activateAccount(storage.DEFAULT_ACCOUNT);
      });
    // Supabase callbacks must return immediately rather than waiting on auth methods.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => {
        if (alive.current)
          void activateAccount(
            session?.user
              ? accountFromAuthUser(session.user)
              : storage.DEFAULT_ACCOUNT,
          ).catch(() => {});
      }, 0);
    });
    const app = AppState.addEventListener('change', (state) => {
      foreground.current = state === 'active';
      if (state === 'active') {
        supabase.auth.startAutoRefresh();
        backgroundSync();
      } else {
        supabase.auth.stopAutoRefresh();
        syncScheduler.current.cancel();
      }
    });
    const interval = setInterval(() => {
      const date = storage.getTodayDateString();
      const previous = todayRef.current;
      if (date !== previous) {
        todayRef.current = date;
        setToday(date);
        setSelectedDate((selected) =>
          selected === previous ? date : selected,
        );
      }
      backgroundSync();
    }, 60000);
    return () => {
      alive.current = false;
      subscription.unsubscribe();
      app.remove();
      clearInterval(interval);
      scheduler.cancel();
      supabase.auth.stopAutoRefresh();
    };
  }, [activateAccount, backgroundSync, showToast]);
  const entries = snapshot?.entries ?? EMPTY_ENTRIES;
  const journal = useMemo(() => indexJournal(entries), [entries]);
  const goals = snapshot?.goals ?? storage.DEFAULT_GOALS;
  const userProfile = snapshot?.profile ?? storage.DEFAULT_PROFILE;
  const notificationSettings =
    snapshot?.notifications ?? storage.DEFAULT_NOTIFICATIONS;
  const waterLogs = snapshot?.waterLogs ?? {};
  const weightLogs = useMemo(
    () => snapshot?.weights ?? [],
    [snapshot?.weights],
  );
  const favoriteMeals = snapshot?.favorites ?? [];
  const dietaryPreference =
    snapshot?.preference ?? storage.DEFAULT_DIETARY_PREFERENCE;
  const healthSync = snapshot?.health ?? storage.DEFAULT_HEALTH_SYNC;
  const stats = useMemo(() => calculateStats(entries, today), [entries, today]);
  const active = useMemo(
    () => journal.days[selectedDate]?.entries ?? EMPTY_ENTRIES,
    [journal, selectedDate],
  );
  const consumed = useMemo(() => {
    const day = journal.days[selectedDate];
    return {
      calories: day?.calories ?? 0,
      protein: day?.protein ?? 0,
      carbs: day?.carbs ?? 0,
      fats: day?.fats ?? 0,
    };
  }, [journal, selectedDate]);
  const remaining = useMemo(
    () => ({
      calories: goals.calories - consumed.calories,
      protein: goals.protein - consumed.protein,
      carbs: goals.carbs - consumed.carbs,
      fats: goals.fats - consumed.fats,
    }),
    [goals, consumed],
  );
  const waterMl = waterLogs[selectedDate] ?? 0;
  const dailySummary: DailySummary = useMemo(
    () => ({
      date: selectedDate,
      totalCalories: consumed.calories,
      totalProtein: consumed.protein,
      totalCarbs: consumed.carbs,
      totalFats: consumed.fats,
      entries: active,
      goalMet: isCalorieGoalMet(consumed.calories, goals.calories),
    }),
    [selectedDate, consumed, active, goals.calories],
  );
  const renderedOwner = userAccount.isLoggedIn ? userAccount.id : 'guest';
  const persist = async <T,>(
    operation: () => Promise<T>,
    owner = renderedOwner,
  ): Promise<T> => {
    if (isLoading) throw new Error('Wait for your account to finish loading.');
    if (owner !== ownerRef.current || owner !== storage.getStorageScope())
      throw new Error(
        'The account changed. Review this action in the current account.',
      );
    const result = await operation();
    if (ownerRef.current === owner) {
      await refreshLocal(owner);
      backgroundSync(true);
    }
    return result;
  };
  const logMeal: NutritionContextType['logMeal'] = async (meal) => {
    const owner = renderedOwner,
      targetDate = meal.date ?? selectedDate;
    const before = (await storage.getFoodEntries())
      .filter((e) => e.date === targetDate)
      .reduce((sum, e) => sum + e.calories, 0);
    const value: FoodEntry = {
      ...meal,
      id: newId('meal'),
      timestamp: new Date().toISOString(),
      date: targetDate,
    };
    const result = await persist(() => storage.saveFoodEntry(value), owner);
    if (ownerRef.current !== owner) return;
    const total = result.entries
      .filter((e) => e.date === targetDate)
      .reduce((sum, e) => sum + e.calories, 0);
    if (
      targetDate === storage.getTodayDateString() &&
      !isCalorieGoalMet(before, goals.calories) &&
      isCalorieGoalMet(total, goals.calories) &&
      (await storage.markCelebrated(targetDate))
    ) {
      setRewardState({
        visible: true,
        streak: result.stats.currentStreak,
        title: 'Daily target reached',
        subtitle: `${total} kcal logged today.`,
        caloriesAdded: meal.calories,
      });
      if (notificationSettings.enabled)
        void sendInstantStreakCelebration(result.stats.currentStreak).catch(
          () => {},
        );
    } else {
      triggerSuccessFeedback();
      showToast('Meal saved', `${meal.name} · ${meal.calories} kcal`);
    }
    void scheduleMealReminders(notificationSettings, result.entries).catch(
      (error) => showToast('Reminder setup failed', error.message),
    );
  };
  const editMeal: NutritionContextType['editMeal'] = async (entry) => {
    await persist(() => storage.updateFoodEntry(entry));
    showToast('Meal updated', entry.name);
  };
  const removeMeal: NutritionContextType['removeMeal'] = async (id) => {
    await persist(() => storage.deleteFoodEntry(id));
    showToast('Meal deleted', 'Your daily totals have been updated.');
  };
  const logWater: NutritionContextType['logWater'] = async (amount, date) => {
    const value = await persist(() =>
      storage.incrementWaterForDate(date ?? selectedDate, amount),
    );
    triggerLightImpact();
    showToast('Water saved', `${value[date ?? selectedDate]} ml logged.`);
  };
  const setWater: NutritionContextType['setWater'] = async (total, date) => {
    await persist(() => storage.saveWaterForDate(date ?? selectedDate, total));
  };
  const addWeight: NutritionContextType['addWeight'] = async (data) => {
    await persist(() =>
      storage.saveWeightAndProfile({
        ...data,
        date: data.date ?? selectedDate,
      }),
    );
    showToast('Weight saved', 'Your weight history has been updated.');
  };
  const deleteWeight: NutritionContextType['deleteWeight'] = async (id) => {
    await persist(() => storage.deleteWeightAndUpdateProfile(id));
  };
  const updateGoals: NutritionContextType['updateGoals'] = async (value) => {
    await persist(() => storage.saveMacroGoals(value));
    showToast('Targets saved', `${value.calories} kcal per day.`);
  };
  const saveProfile: NutritionContextType['saveProfile'] = async (
    profile,
    newGoals,
  ) => {
    await persist(() => storage.saveProfileAndTargets(profile, newGoals));
    setOnboardingVisible(false);
    showToast('Profile saved', 'Your profile and daily plan have been saved.');
  };
  const updateNotifications: NutritionContextType['updateNotifications'] =
    async (settings) => {
      await persist(() => storage.saveNotificationSettings(settings));
      await scheduleMealReminders(settings, entries);
    };
  const signIn: NutritionContextType['signIn'] = async (
    email,
    name,
    password,
    isSignUpMode = false,
  ) => {
    const result = await (isSignUpMode ? supabaseSignUp : supabaseSignIn)(
      email,
      password,
      name,
    );
    if (result.error) throw new Error(result.error);
    if (result.confirmationRequired) return false;
    if (!result.user) throw new Error('No authenticated session was created.');
    await activateAccount(result.user);
    return true;
  };
  const provider = async (method: typeof supabaseSignInWithGoogle) => {
    const result = await method();
    if (result.error === 'cancelled') return false;
    if (result.error) throw new Error(result.error);
    if (!result.user) throw new Error('Sign in failed.');
    await activateAccount(result.user);
    return true;
  };
  const signInWithGoogle = () => provider(supabaseSignInWithGoogle);
  const signInWithApple = () => provider(supabaseSignInWithApple);
  const signOut = async () => {
    await supabaseSignOut();
    await activateAccount(storage.DEFAULT_ACCOUNT);
    showToast('Signed out', 'Your account data is separate from guest data.');
  };
  const updateAccount = async (partial: Partial<UserAccount>) => {
    if (!userAccount.isLoggedIn)
      throw new Error('Sign in before editing your account.');
    const { data, error } = await supabase.auth.updateUser({
      data: { full_name: partial.name ?? userAccount.name },
    });
    if (error) throw error;
    if (data.user) setUserAccount(accountFromAuthUser(data.user));
  };
  const toggleFavoriteMeal: NutritionContextType['toggleFavoriteMeal'] = async (
    meal,
  ) => {
    const found = favoriteMeals.find(
      (f) => f.name.trim().toLowerCase() === meal.name.trim().toLowerCase(),
    );
    await persist(() =>
      found
        ? storage.removeFavoriteMeal(found.id)
        : storage.saveFavoriteMeal(meal),
    );
    return !found;
  };
  const isFavoriteMeal = (name: string) =>
    favoriteMeals.some(
      (f) => f.name.trim().toLowerCase() === name.trim().toLowerCase(),
    );
  const setDietaryPreference: NutritionContextType['setDietaryPreference'] =
    async (preference) => {
      await persist(() => storage.saveDietaryPreference(preference));
    };
  const updateHealthSync: NutritionContextType['updateHealthSync'] = async (
    settings,
  ) => {
    if (settings.appleHealthEnabled || settings.googleFitEnabled)
      throw new Error('Health integration is not available in this build.');
    await persist(() =>
      storage.saveHealthSyncSettings({
        ...healthSync,
        ...settings,
        lastSyncedAt: undefined,
      }),
    );
  };
  const repeatYesterdayMeal: NutritionContextType['repeatYesterdayMeal'] =
    async (mealType) => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const meals = entries.filter(
        (e) =>
          e.date === storage.toLocalDateString(yesterday) &&
          e.mealType === mealType,
      );
      const copies = meals.map((e) => ({
        ...e,
        id: newId('meal'),
        timestamp: new Date().toISOString(),
        date: selectedDate,
        isAiGenerated: false,
      }));
      if (copies.length)
        await persist(() => storage.saveFoodEntriesBatch(copies));
      showToast(
        copies.length ? 'Meals copied' : 'No meals to copy',
        `${copies.length} ${mealType} entries.`,
      );
      return copies.length;
    };
  const recentMeals = useMemo(() => recentJournalMeals(entries), [entries]);
  const recordedWeights = useMemo(
    () => recordedWeightsThrough(weightLogs, today),
    [weightLogs, today],
  );
  const start = recordedWeights[0]?.weightKg ?? userProfile.weightKg,
    current = recordedWeights.at(-1)?.weightKg ?? userProfile.weightKg;
  const progress = weightProgress(start, current, userProfile.targetWeightKg);
  const scans = journal.scans;
  const proteinDays = useMemo(
    () => Object.values(journal.days).map((day) => day.protein),
    [journal],
  );
  const todayProtein = useMemo(
    () => journal.days[today]?.protein ?? 0,
    [journal, today],
  );
  const todayWater = waterLogs[today] ?? 0;
  const waterBest = Math.max(0, ...Object.values(waterLogs));
  const milestoneBadges: MilestoneBadge[] = useMemo(
    () =>
      [
        {
          id: 'badge_streak_7',
          title: 'Seven days',
          description: 'Log meals for seven consecutive days.',
          category: 'streak',
          icon: 'flame',
          isUnlocked: stats.bestStreak >= 7,
          progress: Math.min(1, stats.bestStreak / 7),
          progressText: `${stats.bestStreak}/7 days`,
        },
        {
          id: 'badge_streak_30',
          title: 'Thirty days',
          description: 'Log meals for thirty consecutive days.',
          category: 'streak',
          icon: 'flame',
          isUnlocked: stats.bestStreak >= 30,
          progress: Math.min(1, stats.bestStreak / 30),
          progressText: `${stats.bestStreak}/30 days`,
        },
        {
          id: 'badge_protein',
          title: 'Protein target',
          description: 'Reach your protein target on a logged day.',
          category: 'nutrition',
          icon: 'zap',
          isUnlocked:
            proteinDays.some((p) => p >= goals.protein) && goals.protein > 0,
          progress:
            goals.protein > 0
              ? Math.min(1, Math.max(0, ...proteinDays) / goals.protein)
              : 0,
          progressText: `${todayProtein}g today`,
        },
        {
          id: 'badge_water',
          title: 'Water target',
          description: 'Reach your recorded water target.',
          category: 'water',
          icon: 'droplet',
          isUnlocked: waterBest >= (goals.waterMl ?? 2000),
          progress: Math.min(1, waterBest / (goals.waterMl ?? 2000)),
          progressText: `${todayWater} ml today`,
        },
        {
          id: 'badge_ai_scanner',
          title: 'Ten scans',
          description: 'Log ten meals from scans.',
          category: 'scans',
          icon: 'camera',
          isUnlocked: scans >= 10,
          progress: Math.min(1, scans / 10),
          progressText: `${scans}/10 scans`,
        },
        {
          id: 'badge_weight_goal',
          title: 'Weight target',
          description: 'Record a weigh-in within 0.5 kg of your target.',
          category: 'weight',
          icon: 'scale',
          isUnlocked:
            recordedWeights.length > 0 &&
            Math.abs(current - userProfile.targetWeightKg) <= 0.5,
          progress,
          progressText: `${Math.round(progress * 100)}%`,
        },
      ].map((b) => ({
        ...b,
        isUnlocked: b.isUnlocked || Boolean(snapshot?.badges[b.id]),
        unlockedAt: snapshot?.badges[b.id],
      })) as MilestoneBadge[],
    [
      stats,
      proteinDays,
      goals,
      waterBest,
      todayWater,
      scans,
      recordedWeights.length,
      current,
      userProfile.targetWeightKg,
      progress,
      todayProtein,
      snapshot?.badges,
    ],
  );
  useEffect(() => {
    if (!snapshot) return;
    const unrecorded = milestoneBadges.filter(
      (b) => b.isUnlocked && !snapshot.badges[b.id],
    );
    if (unrecorded.length)
      void storage
        .recordBadges(unrecorded)
        .then(() => refreshLocal())
        .catch((error) =>
          showToast('Badge save failed', String(error.message ?? error)),
        );
  }, [snapshot, milestoneBadges, refreshLocal, showToast]);
  const dismissToast = useCallback(() => setToastNotification(null), []);
  const dismissReward = useCallback(
    () => setRewardState((r) => ({ ...r, visible: false })),
    [],
  );
  const triggerManualReward = () => {
    if (!dailySummary.goalMet) {
      showToast('Target in progress', 'Keep logging your meals.');
      return;
    }
    setRewardState({
      visible: true,
      streak: stats.currentStreak,
      title: 'Daily target reached',
      subtitle: `${consumed.calories} kcal logged.`,
      caloriesAdded: 0,
    });
  };
  const refreshData = async () => {
    await refreshLocal();
  };
  const exportData = () => storage.exportLocalData();
  const resetData = async () => {
    await persist(() => storage.resetLocalData());
  };
  const contextValue: NutritionContextType = {
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
    journalDays: journal.days,
    onboardingVisible,
    hasCompletedOnboarding: snapshot?.onboardingDone ?? false,
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
    triggerManualReward,
    showToast,
    refreshData,
    exportData,
    resetData,
  };
  const feedbackValue = useMemo(() => ({ rewardState, toastNotification, dismissReward, dismissToast }),
    [rewardState, toastNotification, dismissReward, dismissToast]);
  return (
    <NutritionFeedbackContext.Provider value={feedbackValue}>
    <NutritionContext.Provider value={contextValue}>
      {/* Render the journal after local hydration. Static HTML cannot know a device's records, locale or current date. */}
      {snapshot ? (
        <React.Fragment key={userAccount.id}>{children}</React.Fragment>
      ) : !isLoading ? (
        <View
          style={{
            flex: 1,
            backgroundColor: JOURNAL.paper,
            padding: 24,
            justifyContent: 'center',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <Text
            accessibilityRole="alert"
            style={{ color: JOURNAL.ink, fontSize: 20 }}
          >
            Unable to open your journal
          </Text>
          <Text
            style={{ color: JOURNAL.muted, fontSize: 15, textAlign: 'center' }}
          >
            {toastNotification?.message ??
              'Please try loading your account again.'}
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() =>
              void activateAccount(retryAccountRef.current).catch(() => {})
            }
            style={{
              minHeight: 48,
              padding: 16,
              backgroundColor: JOURNAL.accent,
              borderRadius: 12,
            }}
          >
            <Text style={{ color: JOURNAL.surface, fontSize: 16 }}>
              Try again
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {isLoading && (
        <View
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: JOURNAL.paper,
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          accessibilityLabel="Loading your account"
        >
          <ActivityIndicator />
        </View>
      )}
    </NutritionContext.Provider>
    </NutritionFeedbackContext.Provider>
  );
}
export function useNutrition(): NutritionContextType {
  const context = useContext(NutritionContext);
  if (!context)
    throw new Error('useNutrition must be used within NutritionProvider');
  return context;
}

export function useNutritionFeedback(): NutritionFeedbackType {
  const context = useContext(NutritionFeedbackContext);
  if (!context) throw new Error('useNutritionFeedback must be used within NutritionProvider');
  return context;
}
