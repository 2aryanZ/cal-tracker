import { supabase } from './supabase';
import { assertNumber, validateMeal } from './nutritionRules';
import type { AiFoodDetectionResult } from '@/types/nutrition';
export function validateDetection(value: unknown): AiFoodDetectionResult {
  if (!value || typeof value !== 'object')
    throw new Error('The nutrition service returned an invalid result.');
  const result = value as AiFoodDetectionResult;
  if (
    typeof result.foodName !== 'string' ||
    !result.foodName.trim() ||
    typeof result.servingSize !== 'string' ||
    !result.servingSize.trim()
  )
    throw new Error('The result is missing a food name or serving size.');
  validateMeal({
    name: result.foodName,
    mealType: 'lunch',
    calories: result.calories,
    protein: result.protein,
    carbs: result.carbs,
    fats: result.fats,
  });
  assertNumber(result.confidence, 'Confidence', 0, 1);
  if (result.breakdown)
    for (const item of result.breakdown) {
      if (!item.item?.trim() || !item.portion?.trim())
        throw new Error('Invalid ingredient breakdown.');
      assertNumber(item.calories, 'Ingredient calories', 0, 10000);
    }
  return result;
}
export class NutritionRequestError extends Error {
  constructor(
    public code: 'session' | 'unavailable' | 'quota' | 'timeout' | 'cancelled',
    message: string,
  ) {
    super(message);
  }
}
export function mealIdeaError(error: unknown): string {
  if (error instanceof NutritionRequestError) {
    if (error.code === 'session')
      return 'Sign in again for AI ideas. Everyday ideas are still available.';
    if (error.code === 'quota')
      return 'The AI request limit has been reached. Use everyday ideas or your saved ideas and try again later.';
    if (error.code === 'timeout')
      return 'AI took too long. Your current ideas are still available; you can try again.';
    return 'AI is unavailable right now. Your current ideas are still available; you can try again.';
  }
  return 'AI could not prepare a reliable plan for these targets and preference. Your current ideas are still available.';
}
export async function requestNutrition(
  body: Record<string, unknown>,
  signal?: AbortSignal,
  expectedOwner?: string,
): Promise<unknown> {
  if (signal?.aborted)
    throw new NutritionRequestError('cancelled', 'Analysis cancelled.');
  const { data, error } = await supabase.auth.getSession();
  if (error)
    throw new NutritionRequestError(
      'session',
      'Your session could not be checked. Sign in again.',
    );
  if (
    !data.session ||
    (expectedOwner && data.session.user.id !== expectedOwner)
  )
    throw new NutritionRequestError(
      'session',
      'Sign in to use nutrition analysis. You can also enter a meal manually.',
    );
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) controller.abort();
  const timeout = setTimeout(abort, 25000);
  try {
    if (controller.signal.aborted) throw new Error('Cancelled.');
    const result = await supabase.functions.invoke('nutrition-analysis', {
      body,
      signal: controller.signal,
    });
    if (controller.signal.aborted) throw new Error('Cancelled.');
    if (result.error) {
      const context = result.error.context;
      if (context instanceof Response) {
        const message = await context.json().catch(() => null);
        const code =
          context.status === 401 || context.status === 403
            ? 'session'
            : context.status === 429
              ? 'quota'
              : context.status === 504
                ? 'timeout'
                : 'unavailable';
        const safeMessage =
          typeof message?.error === 'string' && message.error.length <= 1000
            ? message.error
            : 'Nutrition analysis is unavailable. Try again or enter the values manually.';
        throw new NutritionRequestError(code, safeMessage);
      }
      throw new NutritionRequestError(
        'unavailable',
        'Nutrition analysis is unavailable. Try again or enter the values manually.',
      );
    }
    if (typeof result.data?.error === 'string')
      throw new Error(result.data.error);
    return result.data;
  } catch (error) {
    if (controller.signal.aborted)
      throw new NutritionRequestError(
        signal?.aborted ? 'cancelled' : 'timeout',
        signal?.aborted
          ? 'Analysis cancelled.'
          : 'Analysis timed out. Try again.',
      );
    if (error instanceof NutritionRequestError) throw error;
    throw new NutritionRequestError(
      'unavailable',
      error instanceof Error
        ? error.message
        : 'Nutrition analysis is unavailable.',
    );
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}
