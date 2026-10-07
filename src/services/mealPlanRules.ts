import type {
  AiMealPlan,
  DietaryPreference,
  MacroTargets,
  MealType,
} from '@/types/nutrition';
import { assertNumber, newId, validateMeal } from './nutritionRules';
export function satisfiesDiet(
  ingredients: string[],
  preference: DietaryPreference,
): boolean {
  const text = ingredients.join(' ').toLowerCase();
  const meat =
    /\b(chicken|beef|pork|turkey|salmon|tuna|fish|shrimp|bacon|steak|ham|gelatin)\b/;
  const dairy =
    /\b(whey|cheese|yogurt|paneer|feta|parmesan|mozzarella|butter|cream|eggs?|milk)\b/;
  const withoutPlantMilk = text
    .replace(/(almond|soy|oat|coconut|cashew|rice) milk/g, 'plant drink')
    .replace(/(peanut|almond|cashew) butter/g, 'nut spread')
    .replace(/coconut cream/g, 'coconut');
  if (preference === 'vegan')
    return (
      !meat.test(text) &&
      !dairy.test(withoutPlantMilk) &&
      !/\bhoney\b/.test(text)
    );
  if (preference === 'vegetarian') return !meat.test(text);
  if (preference === 'paleo')
    return (
      !/\b(rice|oats?|bread|pasta|quinoa|beans?|lentils?|chickpeas?|tofu|tempeh|soy|peanuts?)\b/.test(
        text,
      ) && !dairy.test(withoutPlantMilk)
    );
  return true;
}
export function validateMealPlan(
  value: unknown,
  targets: MacroTargets,
  preference: DietaryPreference,
): AiMealPlan {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid meal plan response.');
  const plan = value as AiMealPlan;
  if (!Array.isArray(plan.meals) || plan.meals.length !== 4)
    throw new Error('The plan must include four meals.');
  const types = new Set<MealType>();
  for (const meal of plan.meals) {
    if (
      !meal ||
      typeof meal.name !== 'string' ||
      typeof meal.portionSize !== 'string' ||
      meal.name.length > 300 ||
      meal.portionSize.length > 300
    )
      throw new Error('The plan is missing a meal name or portion.');
    validateMeal(meal);
    types.add(meal.mealType);
    if (
      !meal.portionSize?.trim() ||
      !Array.isArray(meal.ingredients) ||
      meal.ingredients.length === 0 ||
      meal.ingredients.length > 20 ||
      meal.ingredients.some(
        (i) =>
          typeof i !== 'string' || !i.trim() || i.length > 300 || !/\d/.test(i),
      )
    )
      throw new Error('The plan is missing ingredient quantities.');
    if (!satisfiesDiet(meal.ingredients, preference))
      throw new Error(
        'The plan does not match your dietary preference. Generate another plan.',
      );
    const energy = meal.protein * 4 + meal.carbs * 4 + meal.fats * 9;
    if (Math.abs(energy - meal.calories) > Math.max(10, meal.calories * 0.05))
      throw new Error(
        'The plan nutrition is inconsistent. Generate another plan.',
      );
    if (preference === 'keto' && meal.carbs * 4 > meal.calories * 0.1)
      throw new Error('The plan exceeds the low carbohydrate budget.');
  }
  if (types.size !== 4)
    throw new Error('The plan must include each meal type once.');
  const calories = plan.meals.reduce((sum, m) => sum + m.calories, 0);
  assertNumber(calories, 'Plan calories', 1, 10000);
  if (Math.abs(calories - targets.calories) > targets.calories * 0.1)
    throw new Error(
      'The plan does not match your calorie target. Generate another plan.',
    );
  return {
    meals: plan.meals.map((meal) => ({
      mealType: meal.mealType,
      name: meal.name,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fats: meal.fats,
      portionSize: meal.portionSize,
      ingredients: [...meal.ingredients],
      description:
        typeof meal.description === 'string'
          ? meal.description.slice(0, 1500)
          : '',
    })),
    id: newId('plan'),
    title: `${preference.replaceAll('_', ' ')} meal ideas`,
    summary:
      'Estimated nutrition. Review portions and log each meal after you eat it.',
    targetCalories: targets.calories,
    targetProtein: targets.protein,
    targetCarbs: targets.carbs,
    targetFats: targets.fats,
    preference,
    createdAt: new Date().toISOString(),
  };
}
