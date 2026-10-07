import type {
  AiMealPlan,
  AiMealPlanItem,
  DietaryPreference,
  MacroTargets,
  MealType,
} from '@/types/nutrition';
import {
  FOODS,
  MEAL_RECIPES,
  RECIPE_VERSION,
  type MealRecipe,
} from '@/data/mealRecipes';
import { validateGoals } from './nutritionRules';

const round = (value: number) => Math.round(value * 10) / 10;
export function recipeMeal(recipe: MealRecipe, scale = 1): AiMealPlanItem {
  const quantities = recipe.ingredients.map(([key, grams]) => ({
    food: FOODS[key],
    grams: Math.max(1, Math.round(grams * scale)),
  }));
  const protein = round(
    quantities.reduce((n, i) => n + (i.food.protein * i.grams) / 100, 0),
  );
  const carbs = round(
    quantities.reduce((n, i) => n + (i.food.carbs * i.grams) / 100, 0),
  );
  const fats = round(
    quantities.reduce((n, i) => n + (i.food.fats * i.grams) / 100, 0),
  );
  return {
    mealType: recipe.mealType,
    name: recipe.name,
    description: recipe.instructions,
    calories: Math.round(4 * protein + 4 * carbs + 9 * fats),
    protein,
    carbs,
    fats,
    portionSize: `1 portion · ${quantities.reduce((sum, i) => sum + i.grams, 0)} g ingredients`,
    ingredients: quantities.map((i) => `${i.grams} g ${i.food.label}`),
  };
}
export function recipeMatches(
  recipe: MealRecipe,
  preference: DietaryPreference,
): boolean {
  const foods = recipe.ingredients.map(
    ([key]) =>
      FOODS[key] as {
        animal?: boolean;
        dairy?: boolean;
        grain?: boolean;
        legume?: boolean;
      },
  );
  if (preference === 'vegan') return foods.every((f) => !f.animal && !f.dairy);
  if (preference === 'vegetarian')
    return recipe.ingredients.every(
      ([key]) => key !== 'chicken' && key !== 'salmon',
    );
  if (preference === 'paleo')
    return foods.every((f) => !f.dairy && !f.grain && !f.legume);
  if (preference === 'keto') {
    const meal = recipeMeal(recipe);
    return meal.carbs * 4 <= meal.calories * 0.1;
  }
  if (preference === 'mediterranean')
    return !recipe.ingredients.some(([key]) => key === 'paneer');
  return true;
}
export function mealPlanTotals(plan: AiMealPlan) {
  return plan.meals.reduce(
    (total, meal) => ({
      calories: total.calories + meal.calories,
      protein: round(total.protein + meal.protein),
      carbs: round(total.carbs + meal.carbs),
      fats: round(total.fats + meal.fats),
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 },
  );
}
export function everydayMealPlan(
  targets: MacroTargets,
  preference: DietaryPreference,
  revision = 0,
  day = new Date().toDateString(),
): AiMealPlan {
  validateGoals(targets);
  const seed = [...day].reduce((n, ch) => n + ch.charCodeAt(0), 0) + revision;
  const slots: [MealType, number][] = [
    ['breakfast', 0.25],
    ['lunch', 0.3],
    ['dinner', 0.3],
    ['snack', 0.15],
  ];
  const meals = slots.map(([slot, share]) => {
    const available = MEAL_RECIPES.filter(
      (r) => r.mealType === slot && recipeMatches(r, preference),
    );
    const ranked = available
      .map((recipe) => {
        const base = recipeMeal(recipe);
        const scale = Math.max(
          0.75,
          Math.min(1.5, (targets.calories * share) / base.calories),
        );
        const meal = recipeMeal(recipe, scale);
        const energyScore =
          Math.abs(meal.calories - targets.calories * share) / targets.calories;
        const proteinScore =
          (Math.abs(meal.protein - targets.protein * share) * 4) /
          targets.calories;
        const carbsScore =
          (Math.abs(meal.carbs - targets.carbs * share) * 4) / targets.calories;
        const fatsScore =
          (Math.abs(meal.fats - targets.fats * share) * 9) / targets.calories;
        return {
          recipe,
          meal,
          score:
            energyScore +
            proteinScore * (preference === 'high_protein' ? 1.5 : 1) +
            carbsScore +
            fatsScore,
        };
      })
      .sort((a, b) => a.score - b.score);
    // Rotate among sensible candidates; never stretch a recipe into an unrealistic serving.
    const candidates = ranked
      .filter((item) => item.score <= ranked[0].score + 0.15)
      .slice(0, 3);
    const choice = candidates[seed % candidates.length];
    if (!choice) throw new Error('No everyday recipe matches this preference.');
    return choice.meal;
  });
  return {
    id: `local-${RECIPE_VERSION}-${preference}-${seed}-${targets.calories}-${targets.protein}-${targets.carbs}-${targets.fats}`,
    title: 'Everyday meal ideas',
    summary:
      'Ingredient-based estimates. Review portions and allergens before logging. Suggestions are not a prescribed diet.',
    targetCalories: targets.calories,
    targetProtein: targets.protein,
    targetCarbs: targets.carbs,
    targetFats: targets.fats,
    preference,
    meals,
    createdAt: new Date().toISOString(),
  };
}
