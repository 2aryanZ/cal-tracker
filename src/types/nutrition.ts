import { UserProfile, NutritionPlan } from '@/services/tdeeCalculator';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  avatarUri?: string;
  memberSince: string;
  isLoggedIn: boolean;
  tier: 'Free' | 'Pro' | 'Lifetime';
}

export interface FoodEntry {
  id: string;
  name: string;
  calories: number;
  protein: number; // in grams
  carbs: number;   // in grams
  fats: number;    // in grams
  mealType: MealType;
  timestamp: string; // ISO String
  date: string;      // YYYY-MM-DD
  imageUri?: string;
  portionSize?: string;
  confidence?: number;
  isAiGenerated?: boolean;
}

export interface WeightEntry {
  id: string;
  weightKg: number;
  weightLbs: number;
  date: string;      // YYYY-MM-DD
  timestamp: string; // ISO String
  note?: string;
}

export interface DailyWaterLog {
  date: string; // YYYY-MM-DD
  waterMl: number;
  updatedAt?: string;
}

export interface MacroTargets {
  calories: number;
  protein: number; // grams
  carbs: number;   // grams
  fats: number;    // grams
  waterMl?: number;
}

export interface DailySummary {
  date: string; // YYYY-MM-DD
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFats: number;
  entries: FoodEntry[];
  goalMet: boolean;
}

export interface UserStats {
  currentStreak: number;
  bestStreak: number;
  lastLoggedDate: string | null;
  totalMealsLogged: number;
  rankTitle: string;
}

export interface NotificationSettings {
  enabled: boolean;
  breakfastReminder: boolean;
  breakfastTime: string; // e.g. "08:30"
  lunchReminder: boolean;
  lunchTime: string; // e.g. "13:00"
  dinnerReminder: boolean;
  dinnerTime: string; // e.g. "19:30"
  streakReminder: boolean;
  streakTime: string; // e.g. "21:30"
}

export interface ToastNotification {
  id: string;
  title: string;
  message: string;
  icon?: string;
  timestamp?: number;
}

export interface AiFoodDetectionResult {
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  servingSize: string;
  confidence: number;
  breakdown?: {
    item: string;
    portion: string;
    calories: number;
  }[];
}

export type DietaryPreference =
  | 'balanced'
  | 'high_protein'
  | 'keto'
  | 'vegan'
  | 'vegetarian'
  | 'mediterranean'
  | 'paleo'
  | 'intermittent_fasting';

export interface FavoriteMeal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  mealType: MealType;
  portionSize?: string;
  imageUri?: string;
  createdAt: string;
}

export interface MilestoneBadge {
  id: string;
  title: string;
  description: string;
  category: 'streak' | 'nutrition' | 'scans' | 'weight' | 'water';
  icon: string;
  isUnlocked: boolean;
  unlockedAt?: string;
  progress: number; // 0.0 - 1.0
  progressText: string;
}

export interface HealthSyncSettings {
  appleHealthEnabled: boolean;
  googleFitEnabled: boolean;
  syncSteps: boolean;
  syncActiveCalories: boolean;
  syncWeight: boolean;
  syncWater: boolean;
  lastSyncedAt?: string;
}

export interface AiCoachInsight {
  id: string;
  greeting: string;
  badge: string;
  badgeType: 'success' | 'warning' | 'info' | 'streak';
  title: string;
  message: string;
  recommendation?: {
    title: string;
    actionText: string;
    mealType: MealType;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  macroPace: {
    proteinStatus: 'on_track' | 'needs_more' | 'surplus';
    proteinDeficitGrams: number;
    calorieStatus: 'deficit' | 'balanced' | 'surplus';
    calorieRemaining: number;
  };
}

export interface AiMealPlanItem {
  mealType: MealType;
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  portionSize: string;
  ingredients: string[];
}

export interface AiMealPlan {
  id: string;
  title: string;
  summary: string;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFats: number;
  preference: DietaryPreference;
  meals: AiMealPlanItem[];
  createdAt: string;
}

export interface CommunityGroup {
  id: string;
  name: string;
  description: string;
  emoji: string;
  category: 'strength' | 'deficit' | 'clean_eating' | 'hydration' | 'running';
  membersCount: number;
  activeTodayPct: number;
  isJoined: boolean;
  streakDays: number;
  dailyGoal: string;
  leaderboardRank?: number;
}

export type { UserProfile, NutritionPlan };

