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

  // 5. Evidence-Based Daily Water Target (integrated weight, height, activity & goal)
  const waterData = calculatePersonalizedWaterIntake(weightKg, heightCm, gender, activityLevel, goal);
  const dailyWaterMl = waterData.dailyWaterMl;

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

export interface HydrationBreakdown {
  weightMl: number;
  heightMl: number;
  genderMl: number;
  activityMl: number;
  goalMl: number;
}

export interface PersonalizedHydration {
  dailyWaterMl: number;
  recommendedGlasses: number;
  formulaSummary: string;
  breakdown: HydrationBreakdown;
}

/**
 * Clinical Evidence-Based Daily Water Intake Calculation:
 * Synthesizes guidelines from:
 * 1. NASEM (National Academies of Sciences, Engineering, and Medicine) & Mayo Clinic:
 *    - Average adult baseline: 3.7L total fluid for men, 2.7L for women;
 *    - ~80% directly from beverages (~3,000 ml for men, ~2,200 ml for women), 20% from food moisture.
 * 2. EFSA (European Food Safety Authority): 2.5L for men, 2.0L for women from beverages.
 * 3. Anthropometric Scaling:
 *    - Weight component: 25 ml/kg covers cellular metabolism & solute renal clearance.
 *    - Height component: 3.5 ml/cm covers respiratory tidal loss and body surface area (BSA) insensible perspiration.
 *    - Male lean mass offset: +100 ml (higher lean muscle water storage vs adipose tissue).
 *    - Exercise perspiration factor: +0 to +550 ml based on step count / training intensity.
 *    - Goal metabolic factor: +200 ml for fat loss (ketone clearance/thermogenesis), +250 ml for muscle gain (glycogen hydration).
 *    - Clamped safely between 1,800 ml (minimum healthy baseline) and 4,500 ml.
 */
export function calculatePersonalizedWaterIntake(
  weightKg: number,
  heightCm: number,
  gender: Gender = 'male',
  activityLevel: ActivityLevel = 'moderate',
  goal: FitnessGoal = 'maintenance'
): PersonalizedHydration {
  const safeWeight = Math.max(30, Math.min(250, weightKg || 75));
  const safeHeight = Math.max(120, Math.min(230, heightCm || 175));

  // Weight component: 25 ml per kg
  const weightMl = Math.round(safeWeight * 25);

  // Height component: 3.5 ml per cm (accounting for body surface area & pulmonary insensible fluid loss)
  const heightMl = Math.round(safeHeight * 3.5);

  // Lean mass offset: males carry higher fat-free mass (~73% water) vs females
  const genderMl = gender === 'male' ? 100 : 0;

  // Activity & perspiration factor
  const activityMap: Record<ActivityLevel, number> = {
    sedentary: 0,
    light: 200,
    moderate: 350,
    very_active: 550,
  };
  const activityMl = activityMap[activityLevel] ?? 250;

  // Metabolic goal factor
  let goalMl = 0;
  if (goal === 'fat_loss') {
    goalMl = 200; // Flushes metabolic waste & supports lipolysis
  } else if (goal === 'muscle_gain') {
    goalMl = 250; // Supports glycogen storage (1g glycogen binds 3-4g water) & intracellular volume
  } else if (goal === 'recomposition') {
    goalMl = 100;
  }

  const rawTotal = weightMl + heightMl + genderMl + activityMl + goalMl;
  // Round to nearest 50 ml
  const rounded = Math.round(rawTotal / 50) * 50;
  // Clinically clamped safe range
  const dailyWaterMl = Math.max(1800, Math.min(4500, rounded));
  const recommendedGlasses = Math.round(dailyWaterMl / 250);

  const formulaSummary = `${safeWeight}kg (weight) + ${safeHeight}cm (height/BSA) + ${activityLevel.replace('_', ' ')} activity`;

  return {
    dailyWaterMl,
    recommendedGlasses,
    formulaSummary,
    breakdown: {
      weightMl,
      heightMl,
      genderMl,
      activityMl,
      goalMl,
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
