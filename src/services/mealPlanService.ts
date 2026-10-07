import type {
  AiFoodDetectionResult,
  AiMealPlan,
  DietaryPreference,
  MacroTargets,
  MealType,
} from '@/types/nutrition';
import { requestNutrition, validateDetection } from './nutritionApi';
import { validateGoals } from './nutritionRules';
import { validateMealPlan } from './mealPlanRules';
export { validateMealPlan, satisfiesDiet } from './mealPlanRules';
export async function parseVoiceMealTranscript(
  transcript: string,
  mealType: MealType = 'lunch',
  signal?: AbortSignal,
): Promise<AiFoodDetectionResult> {
  if (!transcript.trim()) throw new Error('Enter a meal description.');
  return validateDetection(
    await requestNutrition(
      { kind: 'text', transcript: transcript.trim(), mealType },
      signal,
    ),
  );
}
export async function generateDailyMealPlan(
  targets: MacroTargets,
  preference: DietaryPreference = 'balanced',
  signal?: AbortSignal,
  expectedOwner?: string,
): Promise<AiMealPlan> {
  validateGoals(targets);
  return validateMealPlan(
    await requestNutrition(
      { kind: 'plan', targets, preference },
      signal,
      expectedOwner,
    ),
    targets,
    preference,
  );
}
