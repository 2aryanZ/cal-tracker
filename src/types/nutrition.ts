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

export type { UserProfile, NutritionPlan };
