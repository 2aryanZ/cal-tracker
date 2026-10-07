import type { MealType } from '@/types/nutrition';

// Representative estimates per 100 g edible weight; cooked/raw basis is explicit.
// Brands and cooking methods vary. Calories are calculated from 4P + 4C + 9F.
// These are starter estimates, not laboratory-tested recipes or medical advice.
export const RECIPE_VERSION = 1;
type Food = {
  label: string;
  protein: number;
  carbs: number;
  fats: number;
  animal?: boolean;
  dairy?: boolean;
  grain?: boolean;
  legume?: boolean;
};
export const FOODS = {
  oats: {
    label: 'rolled oats (dry)',
    protein: 13,
    carbs: 68,
    fats: 7,
    grain: true,
  },
  yogurt: {
    label: 'plain Greek yogurt',
    protein: 10,
    carbs: 4,
    fats: 2,
    dairy: true,
  },
  soy: {
    label: 'unsweetened soy milk',
    protein: 3.3,
    carbs: 1,
    fats: 1.8,
    legume: true,
  },
  banana: { label: 'banana (peeled)', protein: 1.1, carbs: 23, fats: 0.3 },
  apple: { label: 'apple (raw)', protein: 0.3, carbs: 14, fats: 0.2 },
  berries: { label: 'strawberries (raw)', protein: 0.7, carbs: 8, fats: 0.3 },
  egg: {
    label: 'egg (cooked, shell removed)',
    protein: 13,
    carbs: 1.1,
    fats: 11,
    animal: true,
  },
  avocado: { label: 'avocado (flesh)', protein: 2, carbs: 8.5, fats: 15 },
  spinach: { label: 'spinach (raw)', protein: 2.9, carbs: 3.6, fats: 0.4 },
  mushroom: { label: 'mushrooms (raw)', protein: 3.1, carbs: 3.3, fats: 0.3 },
  tofu: {
    label: 'firm tofu (drained)',
    protein: 17,
    carbs: 3,
    fats: 9,
    legume: true,
  },
  lentils: {
    label: 'lentils (cooked)',
    protein: 9,
    carbs: 20,
    fats: 0.4,
    legume: true,
  },
  chickpeas: {
    label: 'chickpeas (cooked)',
    protein: 9,
    carbs: 27,
    fats: 2.6,
    legume: true,
  },
  bread: {
    label: 'whole wheat bread',
    protein: 12,
    carbs: 43,
    fats: 4,
    grain: true,
  },
  rice: {
    label: 'brown rice (cooked)',
    protein: 2.6,
    carbs: 26,
    fats: 0.9,
    grain: true,
  },
  quinoa: {
    label: 'quinoa (cooked)',
    protein: 4.4,
    carbs: 21,
    fats: 1.9,
    grain: true,
  },
  chicken: {
    label: 'chicken breast (cooked)',
    protein: 31,
    carbs: 0,
    fats: 3.6,
    animal: true,
  },
  salmon: {
    label: 'salmon (cooked)',
    protein: 22,
    carbs: 0,
    fats: 12,
    animal: true,
  },
  sweetPotato: {
    label: 'sweet potato (cooked)',
    protein: 1.6,
    carbs: 21,
    fats: 0.1,
  },
  broccoli: { label: 'broccoli (cooked)', protein: 2.4, carbs: 7, fats: 0.4 },
  cucumber: { label: 'cucumber (raw)', protein: 0.7, carbs: 3.6, fats: 0.1 },
  tomato: { label: 'tomato (raw)', protein: 0.9, carbs: 3.9, fats: 0.2 },
  paneer: { label: 'paneer', protein: 18, carbs: 3, fats: 20, dairy: true },
  feta: { label: 'feta', protein: 14, carbs: 4, fats: 21, dairy: true },
  almonds: { label: 'almonds', protein: 21, carbs: 22, fats: 50 },
  walnuts: { label: 'walnuts', protein: 15, carbs: 14, fats: 65 },
  chia: { label: 'chia seeds', protein: 17, carbs: 42, fats: 31 },
  oil: { label: 'olive oil', protein: 0, carbs: 0, fats: 100 },
} satisfies Record<string, Food>;
export type FoodKey = keyof typeof FOODS;
export interface MealRecipe {
  id: string;
  mealType: MealType;
  name: string;
  instructions: string;
  ingredients: [FoodKey, number][];
}
const recipe = (
  id: string,
  mealType: MealType,
  name: string,
  instructions: string,
  ingredients: [FoodKey, number][],
): MealRecipe => ({ id, mealType, name, instructions, ingredients });
export const MEAL_RECIPES: MealRecipe[] = [
  recipe(
    'b1',
    'breakfast',
    'Yogurt & banana oats',
    'Soak oats, then add yogurt and sliced banana.',
    [
      ['oats', 50],
      ['yogurt', 150],
      ['banana', 100],
    ],
  ),
  recipe(
    'b2',
    'breakfast',
    'Berry overnight oats',
    'Soak oats and chia in soy milk; top with strawberries.',
    [
      ['oats', 50],
      ['soy', 180],
      ['berries', 100],
      ['chia', 10],
    ],
  ),
  recipe(
    'b3',
    'breakfast',
    'Egg & avocado plate',
    'Serve cooked eggs with avocado and spinach.',
    [
      ['egg', 150],
      ['avocado', 100],
      ['spinach', 50],
      ['oil', 5],
    ],
  ),
  recipe(
    'b4',
    'breakfast',
    'Mushroom feta eggs',
    'Cook mushrooms and spinach in oil; serve with eggs and feta.',
    [
      ['egg', 150],
      ['mushroom', 80],
      ['spinach', 40],
      ['feta', 40],
      ['oil', 8],
    ],
  ),
  recipe(
    'b5',
    'breakfast',
    'Tofu & spinach scramble',
    'Warm drained tofu and spinach in oil; serve with avocado.',
    [
      ['tofu', 180],
      ['spinach', 40],
      ['avocado', 80],
      ['oil', 10],
    ],
  ),
  recipe(
    'b6',
    'breakfast',
    'Lentil toast',
    'Spoon warm lentils onto toast with tomato.',
    [
      ['lentils', 150],
      ['bread', 70],
      ['tomato', 80],
      ['oil', 5],
    ],
  ),
  recipe(
    'b7',
    'breakfast',
    'Apple almond oats',
    'Cook oats with soy milk; add apple and almonds.',
    [
      ['oats', 50],
      ['soy', 180],
      ['apple', 100],
      ['almonds', 20],
    ],
  ),
  recipe(
    'b8',
    'breakfast',
    'Chicken & sweet potato hash',
    'Warm cooked chicken and sweet potato with spinach in oil.',
    [
      ['chicken', 100],
      ['sweetPotato', 180],
      ['spinach', 50],
      ['oil', 10],
    ],
  ),
  recipe(
    'b9',
    'breakfast',
    'Tofu mushroom skillet',
    'Sauté mushrooms and tofu in oil; top with walnuts.',
    [
      ['tofu', 180],
      ['mushroom', 80],
      ['walnuts', 30],
      ['oil', 12],
    ],
  ),
  recipe(
    'l1',
    'lunch',
    'Dal & brown rice bowl',
    'Serve cooked lentils and rice with broccoli and olive oil.',
    [
      ['lentils', 180],
      ['rice', 150],
      ['broccoli', 100],
      ['oil', 8],
    ],
  ),
  recipe(
    'l2',
    'lunch',
    'Chickpea quinoa salad',
    'Toss chickpeas and quinoa with cucumber, tomato and oil.',
    [
      ['chickpeas', 150],
      ['quinoa', 150],
      ['cucumber', 80],
      ['tomato', 80],
      ['oil', 10],
    ],
  ),
  recipe(
    'l3',
    'lunch',
    'Tofu rice bowl',
    'Warm tofu and rice; serve with cooked broccoli.',
    [
      ['tofu', 150],
      ['rice', 180],
      ['broccoli', 100],
      ['oil', 8],
    ],
  ),
  recipe(
    'l4',
    'lunch',
    'Chicken quinoa bowl',
    'Combine cooked chicken, quinoa and broccoli with oil.',
    [
      ['chicken', 130],
      ['quinoa', 180],
      ['broccoli', 100],
      ['oil', 10],
    ],
  ),
  recipe(
    'l5',
    'lunch',
    'Salmon & sweet potato',
    'Serve cooked salmon with sweet potato and broccoli.',
    [
      ['salmon', 130],
      ['sweetPotato', 200],
      ['broccoli', 100],
      ['oil', 5],
    ],
  ),
  recipe(
    'l6',
    'lunch',
    'Egg avocado salad',
    'Combine cooked eggs, avocado and spinach; dress with oil.',
    [
      ['egg', 150],
      ['avocado', 100],
      ['spinach', 60],
      ['oil', 10],
    ],
  ),
  recipe(
    'l7',
    'lunch',
    'Paneer cucumber salad',
    'Toss paneer and cucumber with spinach, walnuts and oil.',
    [
      ['paneer', 130],
      ['cucumber', 50],
      ['spinach', 40],
      ['walnuts', 20],
      ['oil', 8],
    ],
  ),
  recipe(
    'l8',
    'lunch',
    'Tofu avocado salad',
    'Serve tofu and avocado on spinach; add walnuts and oil.',
    [
      ['tofu', 180],
      ['avocado', 100],
      ['spinach', 50],
      ['walnuts', 20],
      ['oil', 8],
    ],
  ),
  recipe(
    'l9',
    'lunch',
    'Chicken walnut greens',
    'Serve cooked chicken and walnuts on spinach with avocado.',
    [
      ['chicken', 140],
      ['walnuts', 30],
      ['spinach', 60],
      ['avocado', 80],
      ['oil', 8],
    ],
  ),
  recipe(
    'd1',
    'dinner',
    'Lentil quinoa supper',
    'Warm lentils, quinoa and broccoli; finish with oil.',
    [
      ['lentils', 180],
      ['quinoa', 180],
      ['broccoli', 120],
      ['oil', 10],
    ],
  ),
  recipe(
    'd2',
    'dinner',
    'Chickpea sweet potato bowl',
    'Combine cooked chickpeas, sweet potato and spinach.',
    [
      ['chickpeas', 160],
      ['sweetPotato', 200],
      ['spinach', 80],
      ['oil', 10],
    ],
  ),
  recipe(
    'd3',
    'dinner',
    'Paneer & rice plate',
    'Warm paneer with tomato; serve with rice and broccoli.',
    [
      ['paneer', 120],
      ['rice', 160],
      ['tomato', 80],
      ['broccoli', 100],
      ['oil', 5],
    ],
  ),
  recipe(
    'd4',
    'dinner',
    'Chicken rice supper',
    'Serve cooked chicken with rice and broccoli.',
    [
      ['chicken', 150],
      ['rice', 200],
      ['broccoli', 120],
      ['oil', 10],
    ],
  ),
  recipe(
    'd5',
    'dinner',
    'Salmon & avocado greens',
    'Serve cooked salmon on spinach with avocado and walnuts.',
    [
      ['salmon', 150],
      ['avocado', 100],
      ['spinach', 80],
      ['walnuts', 20],
      ['oil', 5],
    ],
  ),
  recipe(
    'd6',
    'dinner',
    'Mushroom egg skillet',
    'Cook mushrooms in oil; serve with eggs and avocado.',
    [
      ['egg', 180],
      ['mushroom', 100],
      ['avocado', 100],
      ['oil', 10],
    ],
  ),
  recipe(
    'd7',
    'dinner',
    'Tofu walnut sauté',
    'Sauté tofu and mushrooms in oil; add spinach and walnuts.',
    [
      ['tofu', 200],
      ['mushroom', 80],
      ['spinach', 60],
      ['walnuts', 30],
      ['oil', 12],
    ],
  ),
  recipe(
    'd8',
    'dinner',
    'Chicken avocado plate',
    'Serve cooked chicken with avocado, spinach and olive oil.',
    [
      ['chicken', 160],
      ['avocado', 120],
      ['spinach', 80],
      ['oil', 15],
    ],
  ),
  recipe(
    'd9',
    'dinner',
    'Tofu avocado supper',
    'Warm tofu in oil; serve with avocado and spinach.',
    [
      ['tofu', 200],
      ['avocado', 120],
      ['spinach', 50],
      ['oil', 15],
    ],
  ),
  recipe(
    's1',
    'snack',
    'Yogurt berry bowl',
    'Top yogurt with strawberries and almonds.',
    [
      ['yogurt', 150],
      ['berries', 100],
      ['almonds', 15],
    ],
  ),
  recipe('s2', 'snack', 'Apple & almonds', 'Serve sliced apple with almonds.', [
    ['apple', 150],
    ['almonds', 25],
  ]),
  recipe(
    's3',
    'snack',
    'Strawberries & walnuts',
    'Serve fresh strawberries with walnuts.',
    [
      ['berries', 120],
      ['walnuts', 30],
    ],
  ),
  recipe(
    's4',
    'snack',
    'Chickpea cucumber cup',
    'Toss cooked chickpeas and cucumber with olive oil.',
    [
      ['chickpeas', 100],
      ['cucumber', 80],
      ['oil', 5],
    ],
  ),
  recipe(
    's5',
    'snack',
    'Paneer walnut bites',
    'Serve paneer with walnuts and cucumber.',
    [
      ['paneer', 70],
      ['walnuts', 20],
      ['cucumber', 40],
    ],
  ),
  recipe(
    's6',
    'snack',
    'Egg avocado bites',
    'Serve cooked egg with sliced avocado.',
    [
      ['egg', 70],
      ['avocado', 70],
    ],
  ),
  recipe(
    's7',
    'snack',
    'Tofu walnut cup',
    'Warm tofu; serve with walnuts and cucumber.',
    [
      ['tofu', 100],
      ['walnuts', 25],
      ['cucumber', 30],
    ],
  ),
  recipe(
    's8',
    'snack',
    'Yogurt & banana',
    'Serve yogurt with sliced banana and chia seeds.',
    [
      ['yogurt', 150],
      ['banana', 80],
      ['chia', 10],
    ],
  ),
  recipe(
    's9',
    'snack',
    'Avocado walnut bowl',
    'Serve avocado with walnuts and a few spinach leaves.',
    [
      ['avocado', 80],
      ['walnuts', 30],
      ['spinach', 20],
    ],
  ),
];
