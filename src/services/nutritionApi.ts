import { supabase } from './supabase';
import { assertNumber, validateMeal } from './nutritionRules';
import type { AiFoodDetectionResult } from '@/types/nutrition';
export function validateDetection(value: unknown): AiFoodDetectionResult {
    if (!value || typeof value !== 'object')
        throw new Error('The nutrition service returned an invalid result.');
    const result = value as AiFoodDetectionResult;
    if (typeof result.foodName !== 'string' || !result.foodName.trim() || typeof result.servingSize !== 'string' || !result.servingSize.trim())
        throw new Error('The result is missing a food name or serving size.');
    validateMeal({ name: result.foodName, mealType: 'lunch', calories: result.calories, protein: result.protein, carbs: result.carbs, fats: result.fats });
    assertNumber(result.confidence, 'Confidence', 0, 1);
    if (result.breakdown)
        for (const item of result.breakdown) {
            if (!item.item?.trim() || !item.portion?.trim())
                throw new Error('Invalid ingredient breakdown.');
            assertNumber(item.calories, 'Ingredient calories', 0, 10000);
        }
    return result;
}
export async function requestNutrition(body: Record<string, unknown>, signal?: AbortSignal): Promise<unknown> {
    const { data, error } = await supabase.auth.getSession();
    if (error)
        throw error;
    if (!data.session)
        throw new Error('Sign in to use nutrition analysis. You can also enter a meal manually.');
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted)
        controller.abort();
    const timeout = setTimeout(abort, 25000);
    try {
        const result = await supabase.functions.invoke('nutrition-analysis', { body, signal: controller.signal });
        if (result.error) {
            const context = result.error.context;
            if (context instanceof Response) {
                const message = await context.json().catch(() => null);
                if (message?.error)
                    throw new Error(message.error);
            }
            throw new Error('Nutrition analysis is unavailable. Try again or enter the values manually.');
        }
        if (result.data?.error)
            throw new Error(result.data.error);
        return result.data;
    }
    catch (error) {
        if (controller.signal.aborted)
            throw new Error(signal?.aborted ? 'Analysis cancelled.' : 'Analysis timed out. Try again.');
        throw error;
    }
    finally {
        clearTimeout(timeout);
        signal?.removeEventListener('abort', abort);
    }
}
