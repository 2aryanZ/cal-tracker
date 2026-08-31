import { MacroTargets } from '@/types/nutrition';

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very_active';
export type FitnessGoal = 'fat_loss' | 'muscle_gain' | 'maintenance' | 'recomposition';
export type Gender = 'male' | 'female';

export interface UserProfile {
  gender: Gender;
  age: number;
  heightCm: number;
  weightKg: number;
  targetWeightKg: number;
  dailySteps: number;
  activityLevel: ActivityLevel;
  goal: FitnessGoal;
  unitSystem: 'metric' | 'imperial';
}

export interface NutritionPlan {
  bmr: number;
  tdee: number;
  targetCalories: number;
  macros: MacroTargets;
  deficitOrSurplus: number;
  estimatedWeeksToGoal: number;
  dailyWaterMl: number;
  proteinPerKg: number;
}

/**
 * Activity Multipliers based on daily step count & activity level
 */
const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,      // < 5,000 steps/day (desk job)
  light: 1.375,        // 5,000 - 8,000 steps/day (light exercise 1-3 days/wk)
  moderate: 1.55,      // 8,000 - 12,000 steps/day (moderate exercise 3-5 days/wk)
  very_active: 1.725,  // 12,000+ steps/day (hard exercise 6-7 days/wk)
};

/**
 * Derives activity level from average daily step count
 */
export function getActivityLevelFromSteps(steps: number): ActivityLevel {
  if (steps >= 12000) return 'very_active';
  if (steps >= 8000) return 'moderate';
  if (steps >= 5000) return 'light';
  return 'sedentary';
}

/**
 * Scientific Mifflin-St Jeor Calculation:
 * BMR (Men) = 10 * weight(kg) + 6.25 * height(cm) - 5 * age + 5
 * BMR (Women) = 10 * weight(kg) + 6.25 * height(cm) - 5 * age - 161
 */
export function calculateBMR(gender: Gender, weightKg: number, heightCm: number, age: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(gender === 'male' ? base + 5 : base - 161);
}

/**
 * Calculate full Evidence-Based Nutrition Plan
 */
export function calculateNutritionPlan(profile: UserProfile): NutritionPlan {
  const { gender, weightKg, heightCm, age, goal, activityLevel, targetWeightKg } = profile;

  // 1. Calculate Basal Metabolic Rate
  const bmr = calculateBMR(gender, weightKg, heightCm, age);

  // 2. Calculate Total Daily Energy Expenditure
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] || 1.375;
  const tdee = Math.round(bmr * multiplier);

  // 3. Caloric Adjustment based on Goal
  let deficitOrSurplus = 0;
  let proteinPerKg = 1.8; // 1.8g / kg standard high-protein baseline

  switch (goal) {
    case 'fat_loss':
      // Safe, sustainable 500 kcal deficit (~0.5kg / 1.1 lbs fat loss per week)
      deficitOrSurplus = -500;
      proteinPerKg = 2.0; // Higher protein to spare lean muscle mass during a deficit
      break;
    case 'muscle_gain':
      // Controlled lean surplus of +300 kcal (maximizes muscle protein synthesis while minimizing fat gain)
      deficitOrSurplus = 300;
      proteinPerKg = 1.8;
      break;
    case 'recomposition':
      // Slight deficit of -200 kcal with maximum protein
      deficitOrSurplus = -200;
      proteinPerKg = 2.2;
      break;
    case 'maintenance':
    default:
      deficitOrSurplus = 0;
      proteinPerKg = 1.6;
      break;
  }

  const targetCalories = Math.max(1200, Math.round(tdee + deficitOrSurplus));

  // 4. Evidence-Based Macronutrient Split
  // Protein: (weightKg * proteinPerKg) * 4 kcal/g
  const targetProteinGrams = Math.round(weightKg * proteinPerKg);
  const proteinCalories = targetProteinGrams * 4;

  // Fats: 28% of total calories (essential hormonal baseline)
  const fatCalories = Math.round(targetCalories * 0.28);
  const targetFatGrams = Math.round(fatCalories / 9);

  // Carbs: Remaining calories / 4 kcal/g
  const remainingCaloriesForCarbs = Math.max(0, targetCalories - (proteinCalories + targetFatGrams * 9));
  const targetCarbGrams = Math.round(remainingCaloriesForCarbs / 4);

  // 5. Daily Water Target (35ml per kg bodyweight)
  const dailyWaterMl = Math.round(weightKg * 35);

  // 6. Estimated weeks to reach goal
  const weightDiffKg = Math.abs(targetWeightKg - weightKg);
  let estimatedWeeksToGoal = 0;
  if (goal === 'fat_loss' && weightDiffKg > 0) {
    estimatedWeeksToGoal = Math.ceil(weightDiffKg / 0.5); // ~0.5kg per week
  } else if (goal === 'muscle_gain' && weightDiffKg > 0) {
    estimatedWeeksToGoal = Math.ceil(weightDiffKg / 0.25); // ~0.25kg lean mass per week
  } else {
    estimatedWeeksToGoal = 4;
  }

  return {
    bmr,
    tdee,
    targetCalories,
    deficitOrSurplus,
    estimatedWeeksToGoal,
    dailyWaterMl,
    proteinPerKg,
    macros: {
      calories: targetCalories,
      protein: targetProteinGrams,
      carbs: targetCarbGrams,
      fats: targetFatGrams,
      waterMl: dailyWaterMl,
    },
  };
}

/**
 * Unit conversion helpers
 */
export function lbsToKg(lbs: number): number {
  return Math.round(lbs * 0.453592 * 10) / 10;
}

export function kgToLbs(kg: number): number {
  return Math.round(kg * 2.20462);
}

export function ftInToCm(feet: number, inches: number): number {
  return Math.round((feet * 12 + inches) * 2.54);
}

export function cmToFtIn(cm: number): { feet: number; inches: number } {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return { feet, inches };
}
