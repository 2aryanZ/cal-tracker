import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  FoodEntry,
  MacroTargets,
  UserStats,
  NotificationSettings,
  UserProfile,
  DietaryPreference,
  FavoriteMeal,
  HealthSyncSettings,
  CommunityGroup,
} from '@/types/nutrition';

const STORAGE_KEYS = {
  ENTRIES: '@cal_ai_food_entries_v1',
  GOALS: '@cal_ai_macro_goals_v1',
  STATS: '@cal_ai_user_stats_v1',
  NOTIFICATIONS: '@cal_ai_notifications_v1',
  API_KEY: '@cal_ai_gemini_api_key_v1',
  INITIALIZED: '@cal_ai_has_seeded_v1',
  USER_PROFILE: '@cal_ai_user_profile_v1',
  ONBOARDING_DONE: '@cal_ai_onboarding_done_v1',
  WEIGHT_LOGS: '@cal_ai_weight_logs_v1',
  ACCOUNT: '@cal_ai_user_account_v1',
  WATER_LOGS: '@cal_ai_water_logs_v1',
  FAVORITES: '@cal_ai_favorite_meals_v1',
  DIETARY_PREFERENCE: '@cal_ai_dietary_preference_v1',
  HEALTH_SYNC: '@cal_ai_health_sync_v1',
  COMMUNITY_GROUPS: '@cal_ai_community_groups_v1',
};


export const DEFAULT_PROFILE: UserProfile = {
  gender: 'male',
  age: 26,
  heightCm: 178,
  weightKg: 78,
  targetWeightKg: 74,
  dailySteps: 8500,
  activityLevel: 'moderate',
  goal: 'fat_loss',
  unitSystem: 'metric',
};

export const DEFAULT_GOALS: MacroTargets = {
  calories: 2200,
  protein: 150,
  carbs: 220,
  fats: 65,
  waterMl: 2000,
};

export const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  enabled: true,
  breakfastReminder: true,
  breakfastTime: '08:30',
  lunchReminder: true,
  lunchTime: '13:00',
  dinnerReminder: true,
  dinnerTime: '19:30',
  streakReminder: true,
  streakTime: '21:30',
};

export const DEFAULT_STATS: UserStats = {
  currentStreak: 3,
  bestStreak: 7,
  lastLoggedDate: getTodayDateString(),
  totalMealsLogged: 12,
  rankTitle: 'Macro Master',
};

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateLabel(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (dateStr === getTodayDateString()) return 'Today';
  if (
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear()
  ) {
    return 'Yesterday';
  }

  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function calculateRank(streak: number, totalMeals: number): string {
  if (streak >= 30) return 'Legendary Nutritionist';
  if (streak >= 14) return 'Macro Prodigy';
  if (streak >= 7) return 'Streak Beast';
  if (streak >= 3) return 'Macro Master';
  if (totalMeals >= 5) return 'Calorie Crusher';
  return 'Calorie Starter';
}

// Generate realistic mock history for the past 6 days so user sees analytics immediately
function generateSeedEntries(): FoodEntry[] {
  const entries: FoodEntry[] = [];
  const today = new Date();

  // Create entries for past 5 days
  for (let i = 5; i >= 1; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];

    entries.push(
      {
        id: `seed-bf-${i}`,
        name: 'Oatmeal with Berries & Whey',
        calories: 420,
        protein: 32,
        carbs: 54,
        fats: 8,
        mealType: 'breakfast',
        timestamp: `${dateStr}T08:30:00.000Z`,
        date: dateStr,
        portionSize: '1 bowl',
        confidence: 0.95,
        isAiGenerated: true,
      },
      {
        id: `seed-lu-${i}`,
        name: 'Grilled Chicken Rice Bowl with Avocado',
        calories: 680,
        protein: 52,
        carbs: 65,
        fats: 22,
        mealType: 'lunch',
        timestamp: `${dateStr}T13:15:00.000Z`,
        date: dateStr,
        portionSize: '1 large bowl',
        confidence: 0.93,
        isAiGenerated: true,
      },
      {
        id: `seed-dn-${i}`,
        name: 'Salmon Fillet with Sweet Potato & Asparagus',
        calories: 720,
        protein: 48,
        carbs: 58,
        fats: 28,
        mealType: 'dinner',
        timestamp: `${dateStr}T19:45:00.000Z`,
        date: dateStr,
        portionSize: '1 plate',
        confidence: 0.96,
        isAiGenerated: true,
      },
      {
        id: `seed-sn-${i}`,
        name: 'Greek Yogurt with Almonds',
        calories: 240,
        protein: 20,
        carbs: 14,
        fats: 10,
        mealType: 'snack',
        timestamp: `${dateStr}T16:30:00.000Z`,
        date: dateStr,
        portionSize: '1 cup',
        confidence: 0.91,
        isAiGenerated: true,
      }
    );
  }

  // Today's initial breakfast
  const todayStr = getTodayDateString();
  entries.push({
    id: 'seed-today-bf',
    name: 'Scrambled Eggs & Avocado Toast',
    calories: 460,
    protein: 28,
    carbs: 34,
    fats: 22,
    mealType: 'breakfast',
    timestamp: `${todayStr}T08:45:00.000Z`,
    date: todayStr,
    portionSize: '2 slices + 2 eggs',
    confidence: 0.94,
    isAiGenerated: true,
  });

  return entries;
}

export async function initializeStorage(): Promise<void> {
  try {
    const isInitialized = await AsyncStorage.getItem(STORAGE_KEYS.INITIALIZED);
    if (!isInitialized) {
      const seedEntries = generateSeedEntries();
      await AsyncStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(seedEntries));
      await AsyncStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(DEFAULT_GOALS));
      await AsyncStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(DEFAULT_STATS));
      await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(DEFAULT_NOTIFICATIONS));
      await AsyncStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
    }
  } catch (error) {
    console.error('Failed to initialize storage:', error);
  }
}

// In-memory hot cache for instant zero-latency UI hydration
let cachedEntries: FoodEntry[] | null = null;
let cachedWeightLogs: import('@/types/nutrition').WeightEntry[] | null = null;

export async function getFoodEntries(): Promise<FoodEntry[]> {
  if (cachedEntries) return cachedEntries;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.ENTRIES);
    cachedEntries = raw ? JSON.parse(raw) : [];
    return cachedEntries!;
  } catch (error) {
    console.error('Error fetching food entries:', error);
    return [];
  }
}

export async function saveFoodEntry(entry: FoodEntry): Promise<{ entries: FoodEntry[]; stats: UserStats }> {
  try {
    const entries = await getFoodEntries();
    const updatedEntries = [entry, ...entries];
    cachedEntries = updatedEntries;
    AsyncStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(updatedEntries)).catch(console.error);

    // Update stats
    const stats = await getUserStats();
    const today = getTodayDateString();

    let newStreak = stats.currentStreak;
    if (stats.lastLoggedDate !== today) {
      // Check if last logged was yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (stats.lastLoggedDate === yesterdayStr) {
        newStreak += 1;
      } else if (!stats.lastLoggedDate) {
        newStreak = 1;
      } else {
        newStreak = 1;
      }
    }

    const updatedStats: UserStats = {
      ...stats,
      currentStreak: newStreak,
      bestStreak: Math.max(stats.bestStreak, newStreak),
      lastLoggedDate: today,
      totalMealsLogged: stats.totalMealsLogged + 1,
      rankTitle: calculateRank(newStreak, stats.totalMealsLogged + 1),
    };

    AsyncStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(updatedStats)).catch(console.error);
    return { entries: updatedEntries, stats: updatedStats };
  } catch (error) {
    console.error('Error saving food entry:', error);
    throw error;
  }
}

export async function getMacroGoals(): Promise<MacroTargets> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.GOALS);
    return raw ? JSON.parse(raw) : DEFAULT_GOALS;
  } catch (error) {
    console.error('Error fetching goals:', error);
    return DEFAULT_GOALS;
  }
}

export async function saveMacroGoals(goals: MacroTargets): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));
  } catch (error) {
    console.error('Error saving goals:', error);
  }
}

export async function getUserStats(): Promise<UserStats> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.STATS);
    return raw ? JSON.parse(raw) : DEFAULT_STATS;
  } catch (error) {
    console.error('Error fetching stats:', error);
    return DEFAULT_STATS;
  }
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    return raw ? JSON.parse(raw) : DEFAULT_NOTIFICATIONS;
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    return DEFAULT_NOTIFICATIONS;
  }
}

export async function saveNotificationSettings(settings: NotificationSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving notification settings:', error);
  }
}

export const DEFAULT_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

export async function getApiKey(): Promise<string> {
  try {
    const key = await AsyncStorage.getItem(STORAGE_KEYS.API_KEY);
    return (key && key.trim().length > 10) ? key : (process.env.EXPO_PUBLIC_GEMINI_API_KEY || '');
  } catch {
    return process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
  }
}

export async function saveApiKey(key: string): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.API_KEY, key);
  } catch (error) {
    console.error('Error saving api key:', error);
  }
}

export async function updateFoodEntry(updated: FoodEntry): Promise<FoodEntry[]> {
  try {
    const entries = await getFoodEntries();
    const updatedList = entries.map((e) => (e.id === updated.id ? updated : e));
    cachedEntries = updatedList;
    AsyncStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(updatedList)).catch(console.error);
    return updatedList;
  } catch (error) {
    console.error('Error updating food entry:', error);
    throw error;
  }
}

export async function deleteFoodEntry(id: string): Promise<FoodEntry[]> {
  try {
    const entries = await getFoodEntries();
    const updatedList = entries.filter((e) => e.id !== id);
    cachedEntries = updatedList;
    AsyncStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(updatedList)).catch(console.error);
    return updatedList;
  } catch (error) {
    console.error('Error deleting food entry:', error);
    throw error;
  }
}

export async function getUserProfile(): Promise<UserProfile> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    return raw ? JSON.parse(raw) : DEFAULT_PROFILE;
  } catch {
    return DEFAULT_PROFILE;
  }
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
  } catch (error) {
    console.error('Error saving user profile:', error);
  }
}

export async function hasCompletedOnboarding(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_DONE);
    return raw === 'true';
  } catch {
    return false;
  }
}

export async function setOnboardingCompleted(status: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_DONE, status ? 'true' : 'false');
  } catch (error) {
    console.error('Error setting onboarding status:', error);
  }
}

export function generateDefaultWeightLogs(startingWeightKg?: number): import('@/types/nutrition').WeightEntry[] {
  const today = new Date();
  const weight = startingWeightKg || DEFAULT_PROFILE.weightKg || 75;
  const lbs = Math.round(weight * 2.20462 * 10) / 10;
  
  const formatDateOffset = (daysAgo: number) => {
    const d = new Date(today);
    d.setDate(today.getDate() - daysAgo);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return [
    {
      id: 'w_today',
      weightKg: weight,
      weightLbs: lbs,
      date: formatDateOffset(0), // Today (e.g. 2026-09-01)
      timestamp: new Date().toISOString(),
      note: 'Starting weigh-in',
    },
  ];
}

export async function getWeightLogs(): Promise<import('@/types/nutrition').WeightEntry[]> {
  if (cachedWeightLogs) return cachedWeightLogs;
  try {
    const profile = await getUserProfile();
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.WEIGHT_LOGS);
    if (!raw) {
      const initial = generateDefaultWeightLogs(profile?.weightKg);
      await AsyncStorage.setItem(STORAGE_KEYS.WEIGHT_LOGS, JSON.stringify(initial));
      cachedWeightLogs = initial;
      return initial;
    }
    const parsed: import('@/types/nutrition').WeightEntry[] = JSON.parse(raw);

    // Auto-migrate legacy 2025 test dates if detected
    const hasOutdated2025Dates = parsed.some((l) => l.date && l.date.startsWith('2025-'));
    if (hasOutdated2025Dates) {
      const freshLogs = generateDefaultWeightLogs(profile?.weightKg);
      await AsyncStorage.setItem(STORAGE_KEYS.WEIGHT_LOGS, JSON.stringify(freshLogs));
      cachedWeightLogs = freshLogs;
      return freshLogs;
    }

    cachedWeightLogs = parsed;
    return cachedWeightLogs!;
  } catch (error) {
    console.error('Error fetching weight logs:', error);
    return generateDefaultWeightLogs();
  }
}



export async function addWeightLog(entry: {
  weightKg: number;
  weightLbs: number;
  date: string;
  note?: string;
}): Promise<import('@/types/nutrition').WeightEntry[]> {
  try {
    const logs = await getWeightLogs();
    const newEntry: import('@/types/nutrition').WeightEntry = {
      id: `w_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };
    // Sort descending by date
    const updated = [newEntry, ...logs.filter((l) => l.date !== entry.date)].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    cachedWeightLogs = updated;
    AsyncStorage.setItem(STORAGE_KEYS.WEIGHT_LOGS, JSON.stringify(updated)).catch(console.error);
    return updated;
  } catch (error) {
    console.error('Error saving weight log:', error);
    throw error;
  }
}

export async function deleteWeightLog(id: string): Promise<import('@/types/nutrition').WeightEntry[]> {
  try {
    const logs = await getWeightLogs();
    const updated = logs.filter((l) => l.id !== id);
    cachedWeightLogs = updated;
    AsyncStorage.setItem(STORAGE_KEYS.WEIGHT_LOGS, JSON.stringify(updated)).catch(console.error);
    return updated;
  } catch (error) {
    console.error('Error deleting weight log:', error);
    throw error;
  }
}

export const DEFAULT_ACCOUNT: import('@/types/nutrition').UserAccount = {
  id: 'usr_guest',
  name: 'Guest User',
  email: '',
  memberSince: 'Today',
  isLoggedIn: false,
  tier: 'Free',
};

export async function getUserAccount(): Promise<import('@/types/nutrition').UserAccount> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.ACCOUNT);
    if (!raw) return DEFAULT_ACCOUNT;
    const parsed = JSON.parse(raw);
    // Reset legacy mock email if present so user sees proper guest/sign-in status
    if (parsed.email === 'aryan@example.com') {
      return DEFAULT_ACCOUNT;
    }
    return parsed;
  } catch {
    return DEFAULT_ACCOUNT;
  }
}

export async function saveUserAccount(account: import('@/types/nutrition').UserAccount): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.ACCOUNT, JSON.stringify(account));
  } catch (error) {
    console.error('Error saving user account:', error);
  }
}

export async function signInUser(email: string, name?: string): Promise<import('@/types/nutrition').UserAccount> {
  const account: import('@/types/nutrition').UserAccount = {
    id: `usr_${Date.now()}`,
    name: name?.trim() || email.split('@')[0] || 'User',
    email: email.trim().toLowerCase(),
    memberSince: 'Today',
    isLoggedIn: true,
    tier: 'Pro',
  };
  await saveUserAccount(account);
  return account;
}

export async function signOutUser(): Promise<import('@/types/nutrition').UserAccount> {
  const account: import('@/types/nutrition').UserAccount = {
    id: 'usr_guest',
    name: 'Guest User',
    email: '',
    memberSince: 'Today',
    isLoggedIn: false,
    tier: 'Free',
  };
  await saveUserAccount(account);
  return account;
}

// In-memory cache for daily water logs { [dateStr]: waterMl }
let cachedWaterLogs: Record<string, number> | null = null;

const INITIAL_WATER_LOGS: Record<string, number> = {
  [getTodayDateString()]: 1500,
};

export async function getWaterLogs(): Promise<Record<string, number>> {
  if (cachedWaterLogs) return cachedWaterLogs;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.WATER_LOGS);
    if (!raw) {
      cachedWaterLogs = INITIAL_WATER_LOGS;
      await AsyncStorage.setItem(STORAGE_KEYS.WATER_LOGS, JSON.stringify(INITIAL_WATER_LOGS));
      return INITIAL_WATER_LOGS;
    }
    cachedWaterLogs = JSON.parse(raw);
    return cachedWaterLogs || {};
  } catch (error) {
    console.error('Error fetching water logs:', error);
    return INITIAL_WATER_LOGS;
  }
}

export async function getWaterForDate(dateStr: string): Promise<number> {
  const logs = await getWaterLogs();
  return logs[dateStr] ?? (dateStr === getTodayDateString() ? 1500 : 0);
}

export async function saveWaterForDate(dateStr: string, waterMl: number): Promise<Record<string, number>> {
  try {
    const logs = await getWaterLogs();
    const updated = {
      ...logs,
      [dateStr]: Math.max(0, waterMl),
    };
    cachedWaterLogs = updated;
    AsyncStorage.setItem(STORAGE_KEYS.WATER_LOGS, JSON.stringify(updated)).catch(console.error);
    return updated;
  } catch (error) {
    console.error('Error saving water for date:', error);
    throw error;
  }
}

export async function setAllWaterLogs(logs: Record<string, number>): Promise<void> {
  cachedWaterLogs = logs;
  await AsyncStorage.setItem(STORAGE_KEYS.WATER_LOGS, JSON.stringify(logs));
}

export async function setAllFoodEntries(entries: FoodEntry[]): Promise<void> {
  cachedEntries = entries;
  await AsyncStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(entries));
}

export async function setAllWeightLogs(logs: import('@/types/nutrition').WeightEntry[]): Promise<void> {
  cachedWeightLogs = logs;
  await AsyncStorage.setItem(STORAGE_KEYS.WEIGHT_LOGS, JSON.stringify(logs));
}

export const DEFAULT_DIETARY_PREFERENCE: DietaryPreference = 'high_protein';

export const DEFAULT_HEALTH_SYNC: HealthSyncSettings = {
  appleHealthEnabled: false,
  googleFitEnabled: false,
  syncSteps: true,
  syncActiveCalories: true,
  syncWeight: true,
  syncWater: true,
  lastSyncedAt: undefined,
};

export const SEED_FAVORITES: FavoriteMeal[] = [
  {
    id: 'fav_oatmeal_whey',
    name: 'Oatmeal with Berries & Whey',
    calories: 420,
    protein: 32,
    carbs: 54,
    fats: 8,
    mealType: 'breakfast',
    portionSize: '1 bowl',
    imageUri: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=350&q=75&auto=format&fit=crop',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'fav_chicken_bowl',
    name: 'Grilled Chicken Rice Bowl',
    calories: 680,
    protein: 52,
    carbs: 65,
    fats: 22,
    mealType: 'lunch',
    portionSize: '1 large bowl',
    imageUri: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?w=350&q=75&auto=format&fit=crop',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'fav_salmon_asparagus',
    name: 'Salmon Fillet with Sweet Potato',
    calories: 720,
    protein: 48,
    carbs: 58,
    fats: 28,
    mealType: 'dinner',
    portionSize: '1 plate',
    imageUri: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=350&q=75&auto=format&fit=crop',
    createdAt: new Date().toISOString(),
  },
];

let cachedFavorites: FavoriteMeal[] | null = null;

export async function getFavoriteMeals(): Promise<FavoriteMeal[]> {
  if (cachedFavorites) return cachedFavorites;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.FAVORITES);
    if (!raw) {
      cachedFavorites = SEED_FAVORITES;
      await AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(SEED_FAVORITES));
      return SEED_FAVORITES;
    }
    cachedFavorites = JSON.parse(raw);
    return cachedFavorites || [];
  } catch (err) {
    console.error('Error fetching favorites:', err);
    return SEED_FAVORITES;
  }
}

export async function saveFavoriteMeal(meal: Omit<FavoriteMeal, 'id' | 'createdAt'> & { id?: string }): Promise<FavoriteMeal[]> {
  try {
    const list = await getFavoriteMeals();
    const newFav: FavoriteMeal = {
      id: meal.id || `fav_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: meal.name,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fats: meal.fats,
      mealType: meal.mealType,
      portionSize: meal.portionSize,
      imageUri: meal.imageUri,
      createdAt: new Date().toISOString(),
    };
    // Don't add duplicate names
    const filtered = list.filter((f) => f.name.toLowerCase() !== meal.name.toLowerCase());
    const updated = [newFav, ...filtered];
    cachedFavorites = updated;
    await AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Error saving favorite meal:', err);
    throw err;
  }
}

export async function removeFavoriteMeal(id: string): Promise<FavoriteMeal[]> {
  try {
    const list = await getFavoriteMeals();
    const updated = list.filter((f) => f.id !== id && f.name !== id);
    cachedFavorites = updated;
    await AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Error removing favorite meal:', err);
    throw err;
  }
}

export async function getDietaryPreference(): Promise<DietaryPreference> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.DIETARY_PREFERENCE);
    return (raw as DietaryPreference) || DEFAULT_DIETARY_PREFERENCE;
  } catch {
    return DEFAULT_DIETARY_PREFERENCE;
  }
}

export async function saveDietaryPreference(pref: DietaryPreference): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.DIETARY_PREFERENCE, pref);
  } catch (err) {
    console.error('Error saving dietary preference:', err);
  }
}

export async function getHealthSyncSettings(): Promise<HealthSyncSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.HEALTH_SYNC);
    return raw ? JSON.parse(raw) : DEFAULT_HEALTH_SYNC;
  } catch {
    return DEFAULT_HEALTH_SYNC;
  }
}

export async function saveHealthSyncSettings(settings: HealthSyncSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.HEALTH_SYNC, JSON.stringify(settings));
  } catch (err) {
    console.error('Error saving health sync settings:', err);
  }
}

export const DEFAULT_COMMUNITY_GROUPS: CommunityGroup[] = [
  {
    id: 'grp_protein_beasts',
    name: 'High Protein Bulk & Cut',
    description: 'Crush 160g+ daily protein targets with fellow lifters & athletes.',
    emoji: '🥩',
    category: 'strength',
    membersCount: 3840,
    activeTodayPct: 92,
    isJoined: true,
    streakDays: 14,
    dailyGoal: '160g+ Protein',
    leaderboardRank: 4,
  },
  {
    id: 'grp_summer_cut',
    name: '100-Day Calorie Cutters',
    description: 'Disciplined 500 kcal daily deficit to drop body fat cleanly.',
    emoji: '🔥',
    category: 'deficit',
    membersCount: 2150,
    activeTodayPct: 88,
    isJoined: true,
    streakDays: 8,
    dailyGoal: '-500 kcal Deficit',
    leaderboardRank: 12,
  },
  {
    id: 'grp_clean_eating',
    name: 'Clean Whole Foods Squad',
    description: 'Zero ultra-processed foods. Focus on natural, anti-inflammatory meals.',
    emoji: '🥑',
    category: 'clean_eating',
    membersCount: 1420,
    activeTodayPct: 85,
    isJoined: false,
    streakDays: 21,
    dailyGoal: '100% Whole Foods',
  },
  {
    id: 'grp_hydration_hero',
    name: '3L Hydration & Fasting',
    description: 'Hit 3,000ml water daily and power through 16:8 intermittent fasting.',
    emoji: '💧',
    category: 'hydration',
    membersCount: 960,
    activeTodayPct: 79,
    isJoined: false,
    streakDays: 5,
    dailyGoal: '3.0L Water',
  },
  {
    id: 'grp_10k_runners',
    name: '10k Daily Steps & Cardio',
    description: 'Consistent daily movement, steps, and aerobic conditioning.',
    emoji: '🏃',
    category: 'running',
    membersCount: 1890,
    activeTodayPct: 91,
    isJoined: false,
    streakDays: 11,
    dailyGoal: '10,000 Steps',
  },
];

export async function getCommunityGroups(): Promise<CommunityGroup[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.COMMUNITY_GROUPS);
    if (!raw) {
      await saveCommunityGroups(DEFAULT_COMMUNITY_GROUPS);
      return DEFAULT_COMMUNITY_GROUPS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_COMMUNITY_GROUPS;
  }
}

export async function saveCommunityGroups(groups: CommunityGroup[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.COMMUNITY_GROUPS, JSON.stringify(groups));
  } catch (err) {
    console.error('Error saving community groups:', err);
  }
}



