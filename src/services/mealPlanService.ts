import type { AiFoodDetectionResult, AiMealPlan, DietaryPreference, MacroTargets, MealType } from '@/types/nutrition';
import { requestNutrition, validateDetection } from './nutritionApi';
import { assertNumber, newId, validateMeal, validateGoals } from './nutritionRules';
export async function parseVoiceMealTranscript(transcript: string, mealType: MealType = 'lunch', signal?: AbortSignal): Promise<AiFoodDetectionResult> {
    if (!transcript.trim())
        throw new Error('Enter a meal description.');
    return validateDetection(await requestNutrition({ kind: 'text', transcript: transcript.trim(), mealType }, signal));
}
export function satisfiesDiet(ingredients: string[], preference: DietaryPreference): boolean {
    const text = ingredients.join(' ').toLowerCase();
    const meat = /\b(chicken|beef|pork|turkey|salmon|tuna|fish|shrimp|bacon|steak|ham|gelatin)\b/;
    const dairy = /\b(whey|cheese|yogurt|paneer|feta|parmesan|mozzarella|butter|cream|eggs?|milk)\b/;
    const withoutPlantMilk = text.replace(/(almond|soy|oat|coconut|cashew|rice) milk/g, 'plant drink').replace(/(peanut|almond|cashew) butter/g, 'nut spread').replace(/coconut cream/g, 'coconut');
    if (preference === 'vegan')
        return !meat.test(text) && !dairy.test(withoutPlantMilk) && !(/\bhoney\b/).test(text);
    if (preference === 'vegetarian')
        return !meat.test(text);
    if (preference === 'paleo')
        return !(/\b(rice|oats?|bread|pasta|quinoa|beans?|lentils?|chickpeas?|tofu|tempeh|soy|peanuts?)\b/).test(text) && !dairy.test(withoutPlantMilk);
    return true;
}
export function validateMealPlan(value: unknown, targets: MacroTargets, preference: DietaryPreference): AiMealPlan {
    if (!value || typeof value !== 'object')
        throw new Error('Invalid meal plan response.');
    const plan = value as AiMealPlan;
    if (!Array.isArray(plan.meals) || plan.meals.length !== 4)
        throw new Error('The plan must include four meals.');
    const types = new Set<MealType>();
    for (const meal of plan.meals) {
        validateMeal(meal);
        types.add(meal.mealType);
        if (!meal.portionSize?.trim() || !Array.isArray(meal.ingredients) || meal.ingredients.length === 0 || meal.ingredients.some(i => typeof i !== 'string' || !i.trim()))
            throw new Error('The plan is missing ingredient quantities.');
        if (!satisfiesDiet(meal.ingredients, preference))
            throw new Error('The plan does not match your dietary preference. Generate another plan.');
        const energy = meal.protein * 4 + meal.carbs * 4 + meal.fats * 9;
        if (Math.abs(energy - meal.calories) > Math.max(10, meal.calories * .05))
            throw new Error('The plan nutrition is inconsistent. Generate another plan.');
        if (preference === 'keto' && meal.carbs * 4 > meal.calories * .1)
            throw new Error('The plan exceeds the low carbohydrate budget.');
    }
    if (types.size !== 4)
        throw new Error('The plan must include each meal type once.');
    const calories = plan.meals.reduce((sum, m) => sum + m.calories, 0);
    assertNumber(calories, 'Plan calories', 1, 10000);
    if (Math.abs(calories - targets.calories) > targets.calories * .1)
        throw new Error('The plan does not match your calorie target. Generate another plan.');
    return { ...plan, id: newId('plan'), title: `${preference.replaceAll('_', ' ')} meal ideas`, summary: 'Estimated nutrition. Review portions and log each meal after you eat it.', targetCalories: targets.calories, targetProtein: targets.protein, targetCarbs: targets.carbs, targetFats: targets.fats, preference, createdAt: new Date().toISOString() };
}
export async function generateDailyMealPlan(targets: MacroTargets, preference: DietaryPreference = 'balanced', signal?: AbortSignal): Promise<AiMealPlan> {
    validateGoals(targets);
    return validateMealPlan(await requestNutrition({ kind: 'plan', targets, preference }, signal), targets, preference);
}
