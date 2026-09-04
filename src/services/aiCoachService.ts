import {
  AiCoachInsight,
  DietaryPreference,
  FoodEntry,
  MacroTargets,
  MealType,
  UserProfile,
  UserStats,
} from '@/types/nutrition';
import { COMPREHENSIVE_FOOD_DATABASE } from './aiFoodService';

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

/**
 * Generates dynamic, context-aware personalized insights for the user based on:
 * - Time of day (breakfast, lunch, dinner, evening)
 * - Remaining vs consumed calories and protein
 * - Active streak and hydration level
 * - User goal (fat_loss, muscle_gain, maintenance)
 */
export function generateCoachInsight(params: CoachInputParams): AiCoachInsight {
  const { userName, consumed, goals, stats, userProfile, waterMl, preference, activeEntries } = params;

  const currentHour = new Date().getHours();
  const calRemaining = Math.max(0, goals.calories - consumed.calories);
  const proteinRemaining = Math.max(0, goals.protein - consumed.protein);
  const waterTarget = goals.waterMl || 2000;
  const waterRemaining = Math.max(0, waterTarget - waterMl);

  // Time-of-day greeting
  let greeting = 'Good morning';
  let timeSlot: 'morning' | 'afternoon' | 'evening' | 'night' = 'morning';
  if (currentHour >= 12 && currentHour < 17) {
    greeting = 'Good afternoon';
    timeSlot = 'afternoon';
  } else if (currentHour >= 17 && currentHour < 21) {
    greeting = 'Good evening';
    timeSlot = 'evening';
  } else if (currentHour >= 21 || currentHour < 5) {
    greeting = 'Late night check-in';
    timeSlot = 'night';
  }

  const namePart = userName && userName !== 'Guest User' ? `, ${userName.split(' ')[0]}` : '';

  // Determine Protein Pace
  const proteinPercent = goals.protein > 0 ? (consumed.protein / goals.protein) * 100 : 0;
  let proteinStatus: 'on_track' | 'needs_more' | 'surplus' = 'on_track';
  if (proteinPercent >= 100) {
    proteinStatus = 'surplus';
  } else if (
    (timeSlot === 'afternoon' && proteinPercent < 40) ||
    (timeSlot === 'evening' && proteinPercent < 70)
  ) {
    proteinStatus = 'needs_more';
  }

  // Determine Calorie Pace
  const calPercent = goals.calories > 0 ? (consumed.calories / goals.calories) * 100 : 0;
  let calorieStatus: 'deficit' | 'balanced' | 'surplus' = 'deficit';
  if (calPercent > 105) {
    calorieStatus = 'surplus';
  } else if (calPercent >= 85) {
    calorieStatus = 'balanced';
  }

  // Scenario 1: User met daily goal!
  if (calPercent >= 88 && calPercent <= 110 && proteinPercent >= 85) {
    return {
      id: 'coach_goal_met',
      greeting: `${greeting}${namePart} 🎯`,
      badge: 'Target Achieved',
      badgeType: 'success',
      title: 'Macro targets perfectly locked in!',
      message: `You fueled ${consumed.calories} kcal with ${consumed.protein}g protein today. Your ${stats.currentStreak}-day streak is fully secured!`,
      recommendation: undefined,
      macroPace: {
        proteinStatus: 'on_track',
        proteinDeficitGrams: 0,
        calorieStatus: 'balanced',
        calorieRemaining: calRemaining,
      },
    };
  }

  // Scenario 2: Morning Kickoff (0-1 meals logged)
  if (timeSlot === 'morning' || activeEntries.length === 0) {
    const targetMealType: MealType = 'breakfast';
    const recMeal =
      preference === 'vegan'
        ? {
            title: 'Tofu Scramble & Avocado Toast',
            calories: 380,
            protein: 26,
            carbs: 34,
            fats: 16,
          }
        : preference === 'keto'
        ? {
            title: '3-Egg Omelet with Spinach & Feta',
            calories: 420,
            protein: 30,
            carbs: 6,
            fats: 32,
          }
        : {
            title: 'High-Protein Oats & Greek Yogurt',
            calories: 430,
            protein: 34,
            carbs: 52,
            fats: 9,
          };

    return {
      id: 'coach_morning_kickoff',
      greeting: `${greeting}${namePart} ☀️`,
      badge: 'Morning Fuel',
      badgeType: 'info',
      title: `Start strong with ~${Math.round(goals.protein * 0.25)}g protein`,
      message: `You have ${calRemaining} kcal in your budget today. Fueling early stabilizes metabolic rate and curbs evening cravings.`,
      recommendation: {
        title: recMeal.title,
        actionText: 'Log Breakfast',
        mealType: targetMealType,
        calories: recMeal.calories,
        protein: recMeal.protein,
        carbs: recMeal.carbs,
        fats: recMeal.fats,
      },
      macroPace: {
        proteinStatus: 'on_track',
        proteinDeficitGrams: proteinRemaining,
        calorieStatus: 'deficit',
        calorieRemaining: calRemaining,
      },
    };
  }

  // Scenario 3: Afternoon / Lunch (High protein deficit alert)
  if (timeSlot === 'afternoon') {
    if (proteinStatus === 'needs_more') {
      return {
        id: 'coach_lunch_protein_boost',
        greeting: `${greeting}${namePart} 🥩`,
        badge: 'Protein Focus',
        badgeType: 'warning',
        title: `Need ${proteinRemaining}g more protein today`,
        message: `You've logged ${consumed.protein}g protein so far. Aim for a protein-dense lunch (chicken, salmon, or tofu bowl) to protect lean muscle.`,
        recommendation: {
          title: 'Grilled Chicken & Quinoa Bowl',
          actionText: 'Log High-Protein Lunch',
          mealType: 'lunch',
          calories: 540,
          protein: 48,
          carbs: 45,
          fats: 14,
        },
        macroPace: {
          proteinStatus: 'needs_more',
          proteinDeficitGrams: proteinRemaining,
          calorieStatus: calorieStatus,
          calorieRemaining: calRemaining,
        },
      };
    }

    return {
      id: 'coach_lunch_steady',
      greeting: `${greeting}${namePart} 🥗`,
      badge: 'Pacing Steady',
      badgeType: 'info',
      title: `${calRemaining} kcal remaining for today`,
      message: `You're tracking consistently. ${waterRemaining > 500 ? `Remember to drink ~${waterRemaining}ml water to hit your hydration goal.` : 'Hydration is on point!'}`,
      recommendation: {
        title: 'Turkey Avocado Wrap',
        actionText: 'Log Lunch',
        mealType: 'lunch',
        calories: 460,
        protein: 38,
        carbs: 38,
        fats: 16,
      },
      macroPace: {
        proteinStatus: 'on_track',
        proteinDeficitGrams: proteinRemaining,
        calorieStatus: calorieStatus,
        calorieRemaining: calRemaining,
      },
    };
  }

  // Scenario 4: Evening / Dinner
  if (timeSlot === 'evening') {
    if (calRemaining > 400 && proteinRemaining > 20) {
      return {
        id: 'coach_evening_dinner',
        greeting: `${greeting}${namePart} 🍽️`,
        badge: 'Dinner Opportunity',
        badgeType: 'streak',
        title: `Room for a nutritious ${calRemaining} kcal dinner`,
        message: `Hitting ${proteinRemaining}g protein with dinner will complete your daily plan with 100% adherence.`,
        recommendation: {
          title: 'Pan-Seared Salmon with Sweet Potato',
          actionText: 'Log Dinner',
          mealType: 'dinner',
          calories: Math.min(calRemaining, 620),
          protein: Math.min(proteinRemaining, 45),
          carbs: 40,
          fats: 20,
        },
        macroPace: {
          proteinStatus: proteinStatus,
          proteinDeficitGrams: proteinRemaining,
          calorieStatus: calorieStatus,
          calorieRemaining: calRemaining,
        },
      };
    }

    return {
      id: 'coach_evening_wrap',
      greeting: `${greeting}${namePart} ✨`,
      badge: 'Evening Wrap',
      badgeType: 'success',
      title: `Excellent adherence (${calPercent.toFixed(0)}% of goal)`,
      message: `You've locked in ${consumed.calories} kcal. Great work staying disciplined towards your ${userProfile.goal === 'fat_loss' ? 'fat loss' : 'fitness'} target.`,
      recommendation: undefined,
      macroPace: {
        proteinStatus: 'on_track',
        proteinDeficitGrams: proteinRemaining,
        calorieStatus: calorieStatus,
        calorieRemaining: calRemaining,
      },
    };
  }

  // Scenario 5: Late night check-in
  return {
    id: 'coach_night_review',
    greeting: `${greeting}${namePart} 🌙`,
    badge: `${stats.currentStreak} Day Streak`,
    badgeType: 'streak',
    title: `Daily Summary: ${consumed.calories} / ${goals.calories} kcal`,
    message: `Sleep is critical for muscle protein synthesis and fat loss. Rest well and crush tomorrow!`,
    recommendation: undefined,
    macroPace: {
      proteinStatus: proteinStatus,
      proteinDeficitGrams: proteinRemaining,
      calorieStatus: calorieStatus,
      calorieRemaining: calRemaining,
    },
  };
}

/**
 * Returns contextual smart suggestions matching remaining macros
 */
export function getSmartSuggestions(remainingCalories: number, remainingProtein: number, preference?: DietaryPreference) {
  const suggestions = COMPREHENSIVE_FOOD_DATABASE.map((item) => {
    const calDiff = Math.abs(item.calories - remainingCalories);
    const proteinScore = Math.abs(item.protein - remainingProtein);
    const fitnessScore = calDiff * 0.6 + proteinScore * 4;
    return { item, fitnessScore };
  });

  suggestions.sort((a, b) => a.fitnessScore - b.fitnessScore);
  return suggestions.slice(0, 4).map((s) => s.item);
}
