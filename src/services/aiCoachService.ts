import type { AiCoachInsight, DietaryPreference, FoodEntry, MacroTargets, UserProfile, UserStats } from '@/types/nutrition';
import { COMPREHENSIVE_FOOD_DATABASE } from './aiFoodService';
import { satisfiesDiet } from './mealPlanService';
import { isCalorieGoalMet } from './nutritionRules';
interface CoachInputParams {
    userName: string;
    consumed: {
        calories: number;
        protein: number;
        carbs: number;
        fats: number;
    };
    goals: MacroTargets;
    stats: UserStats;
    userProfile: UserProfile;
    waterMl: number;
    preference: DietaryPreference;
    activeEntries: FoodEntry[];
}
export function generateCoachInsight({ userName, consumed, goals, stats, waterMl }: CoachInputParams): AiCoachInsight {
    const remaining = goals.calories - consumed.calories, proteinRemaining = Math.max(0, goals.protein - consumed.protein), waterRemaining = Math.max(0, (goals.waterMl ?? 2000) - waterMl), met = isCalorieGoalMet(consumed.calories, goals.calories);
    return { id: 'daily-summary', greeting: userName === 'Guest User' ? 'Your daily log' : `${userName.split(' ')[0]}’s daily log`, badge: met ? 'Calorie target reached' : `${stats.currentStreak} day streak`, badgeType: met ? 'success' : remaining < 0 ? 'warning' : 'info', title: `${consumed.calories} / ${goals.calories} kcal logged`, message: `${remaining >= 0 ? `${remaining} kcal remaining` : `${Math.abs(remaining)} kcal above target`} · ${proteinRemaining}g protein remaining · ${waterRemaining} ml water remaining. Totals reflect your selected day’s records.`, macroPace: { proteinStatus: proteinRemaining > 0 ? 'needs_more' : consumed.protein > goals.protein ? 'surplus' : 'on_track', proteinDeficitGrams: proteinRemaining, calorieStatus: remaining < 0 ? 'surplus' : met ? 'balanced' : 'deficit', calorieRemaining: remaining } };
}
export function getSmartSuggestions(remainingCalories: number, remainingProtein: number, preference: DietaryPreference = 'balanced') {
    return COMPREHENSIVE_FOOD_DATABASE.filter(item => satisfiesDiet(item.breakdown.map(b => b.item), preference) && (preference !== 'keto' || item.carbs * 4 <= item.calories * .1)).map(item => ({ item, score: Math.abs(item.calories - remainingCalories) * .6 + Math.abs(item.protein - remainingProtein) * 4 })).sort((a, b) => a.score - b.score).slice(0, 4).map(s => s.item);
}
