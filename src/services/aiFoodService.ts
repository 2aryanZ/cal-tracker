import { AiFoodDetectionResult } from '@/types/nutrition';
import { requestNutrition, validateDetection } from './nutritionApi';

export interface FoodDatabaseItem {
  name: string;
  category: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  servingSize: string;
  imageUri: string;
  breakdown: { item: string; portion: string; calories: number }[];
}

export const COMPREHENSIVE_FOOD_DATABASE: FoodDatabaseItem[] = [
  {
    name: 'Avocado Toast with Poached Eggs',
    category: 'breakfast',
    calories: 440,
    protein: 24,
    carbs: 32,
    fats: 25,
    servingSize: '2 slices + 2 eggs',
    imageUri: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=350&q=75&auto=format&fit=crop',
    breakdown: [
      { item: 'Sourdough Bread (2 slices)', portion: '80g', calories: 180 },
      { item: 'Mashed Avocado', portion: '60g', calories: 120 },
      { item: 'Poached Eggs (2 large)', portion: '100g', calories: 140 },
    ],
  },
  {
    name: 'Grilled Chicken Caesar Salad',
    category: 'lunch',
    calories: 520,
    protein: 46,
    carbs: 18,
    fats: 28,
    servingSize: '1 large bowl (350g)',
    imageUri: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=350&q=75&auto=format&fit=crop',
    breakdown: [
      { item: 'Grilled Chicken Breast', portion: '180g', calories: 290 },
      { item: 'Romaine Lettuce & Veggies', portion: '100g', calories: 30 },
      { item: 'Caesar Dressing & Olive Oil', portion: '30ml', calories: 140 },
      { item: 'Parmesan & Croutons', portion: '40g', calories: 60 },
    ],
  },
  {
    name: 'Double Cheeseburger with Brioche Bun',
    category: 'dinner',
    calories: 840,
    protein: 52,
    carbs: 48,
    fats: 49,
    servingSize: '1 burger (280g)',
    imageUri: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=350&q=75&auto=format&fit=crop',
    breakdown: [
      { item: 'Beef Patties (2x)', portion: '180g', calories: 460 },
      { item: 'Brioche Bun', portion: '70g', calories: 210 },
      { item: 'Cheddar Cheese & Sauce', portion: '30g', calories: 170 },
    ],
  },
  {
    name: 'Pan-Seared Salmon with Brown Rice',
    category: 'dinner',
    calories: 620,
    protein: 44,
    carbs: 56,
    fats: 24,
    servingSize: '1 plate (380g)',
    imageUri: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=350&q=75&auto=format&fit=crop',
    breakdown: [
      { item: 'Wild Atlantic Salmon', portion: '180g', calories: 360 },
      { item: 'Steamed Brown Rice', portion: '150g', calories: 210 },
      { item: 'Steamed Broccoli & Olive Oil', portion: '100g', calories: 50 },
    ],
  },
  {
    name: 'Acai Berry Protein Bowl with Granola',
    category: 'breakfast',
    calories: 490,
    protein: 26,
    carbs: 72,
    fats: 12,
    servingSize: '1 bowl (400g)',
    imageUri: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=350&q=75&auto=format&fit=crop',
    breakdown: [
      { item: 'Acai Puree + Whey Protein', portion: '250g', calories: 260 },
      { item: 'Crunchy Granola', portion: '50g', calories: 160 },
      { item: 'Banana Slices & Berries', portion: '100g', calories: 70 },
    ],
  },
  {
    name: 'Steak & Sweet Potato Bowl',
    category: 'dinner',
    calories: 680,
    protein: 55,
    carbs: 52,
    fats: 28,
    servingSize: '1 plate (400g)',
    imageUri: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=350&q=75&auto=format&fit=crop',
    breakdown: [
      { item: 'Sirloin Steak (Medium)', portion: '200g', calories: 420 },
      { item: 'Baked Sweet Potato', portion: '180g', calories: 200 },
      { item: 'Grilled Asparagus & Butter', portion: '80g', calories: 60 },
    ],
  },
  {
    name: 'Chicken Biryani with Raita',
    category: 'dinner',
    calories: 720,
    protein: 42,
    carbs: 85,
    fats: 24,
    servingSize: '1 plate (450g)',
    imageUri: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=350&q=75&auto=format&fit=crop',
    breakdown: [
      { item: 'Basmati Rice & Spices', portion: '250g', calories: 380 },
      { item: 'Marinated Chicken Thighs', portion: '150g', calories: 260 },
      { item: 'Cucumber Mint Raita', portion: '80g', calories: 80 },
    ],
  },
  {
    name: 'Paneer Tikka with Naan & Salad',
    category: 'lunch',
    calories: 610,
    protein: 32,
    carbs: 58,
    fats: 28,
    servingSize: '1 serving (350g)',
    imageUri: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=350&q=75&auto=format&fit=crop',
    breakdown: [
      { item: 'Grilled Paneer Cubes', portion: '150g', calories: 340 },
      { item: 'Tandoori Naan (1 pc)', portion: '80g', calories: 210 },
      { item: 'Mint Chutney & Onions', portion: '50g', calories: 60 },
    ],
  },
  {
    name: 'Margherita Pizza (3 Slices)',
    category: 'dinner',
    calories: 750,
    protein: 34,
    carbs: 88,
    fats: 28,
    servingSize: '3 standard slices (300g)',
    imageUri: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=350&q=75&auto=format&fit=crop',
    breakdown: [
      { item: 'Pizza Crust & Tomato Sauce', portion: '200g', calories: 460 },
      { item: 'Mozzarella Cheese', portion: '80g', calories: 240 },
      { item: 'Fresh Basil & Olive Oil', portion: '20g', calories: 50 },
    ],
  },
  {
    name: 'Classic Whey Protein Shake with Banana',
    category: 'snack',
    calories: 280,
    protein: 35,
    carbs: 28,
    fats: 4,
    servingSize: '1 shaker (400ml)',
    imageUri: 'https://images.unsplash.com/photo-1577805947697-89e18249d767?w=350&q=75&auto=format&fit=crop',
    breakdown: [
      { item: 'Whey Protein Isolate (1 scoop)', portion: '35g', calories: 130 },
      { item: 'Almond Milk (Unsweetened)', portion: '300ml', calories: 40 },
      { item: 'Medium Banana', portion: '110g', calories: 110 },
    ],
  },
  {
    name: 'Scrambled Eggs with Butter & Toast',
    category: 'breakfast',
    calories: 390,
    protein: 22,
    carbs: 26,
    fats: 22,
    servingSize: '3 eggs + 1 toast',
    imageUri: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=350&q=75&auto=format&fit=crop',
    breakdown: [
      { item: 'Whole Eggs (3 large)', portion: '150g', calories: 210 },
      { item: 'Butter (1 tbsp)', portion: '14g', calories: 100 },
      { item: 'Whole Wheat Toast (1 slice)', portion: '40g', calories: 80 },
    ],
  },
  {
    name: 'Chicken Burrito Bowl',
    category: 'lunch',
    calories: 680,
    protein: 48,
    carbs: 68,
    fats: 22,
    servingSize: '1 bowl (450g)',
    imageUri: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?w=350&q=75&auto=format&fit=crop',
    breakdown: [
      { item: 'Grilled Chicken & Black Beans', portion: '200g', calories: 310 },
      { item: 'Cilantro Lime Rice', portion: '150g', calories: 220 },
      { item: 'Guacamole & Salsa', portion: '80g', calories: 150 },
    ],
  },
  {
    name: 'Pasta Bolognese with Ground Beef',
    category: 'dinner',
    calories: 670,
    protein: 40,
    carbs: 76,
    fats: 22,
    servingSize: '1 plate (380g)',
    imageUri: 'https://images.unsplash.com/photo-1621996346565-e3d5d62810f2?w=350&q=75&auto=format&fit=crop',
    breakdown: [
      { item: 'Penne / Spaghetti Pasta', portion: '180g', calories: 340 },
      { item: 'Lean Ground Beef & Marinara', portion: '180g', calories: 280 },
      { item: 'Grated Parmesan Cheese', portion: '20g', calories: 50 },
    ],
  },
];

/**
 * Search the food database by query
 */
export function searchFoodDatabase(query: string): FoodDatabaseItem[] {
  if (!query || query.trim().length === 0) return COMPREHENSIVE_FOOD_DATABASE;
  const q = query.toLowerCase().trim();
  return COMPREHENSIVE_FOOD_DATABASE.filter(
    (item) =>
      item.name.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.breakdown.some((b) => b.item.toLowerCase().includes(q))
  );
}

async function imageData(uri:string,base64?:string,mimeType?:string):Promise<{base64:string;mimeType:string}> {
  if(base64) return {base64,mimeType:mimeType??'image/jpeg'};
  if(uri.startsWith('data:image/')) {const match=uri.match(/^data:(image\/[^;]+);base64,(.+)$/s);if(!match)throw new Error('Unsupported image format.');return {base64:match[2],mimeType:match[1]};}
  const response=await fetch(uri);if(!response.ok)throw new Error('Unable to read this image.');
  const blob=await response.blob();
  const value=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(new Error('Unable to read this image.'));reader.onload=()=>resolve(String(reader.result));reader.readAsDataURL(blob);});
  return imageData(value);
}
async function analyze(kind:'food'|'label',uri:string,base64?:string,mimeType?:string,signal?:AbortSignal,expectedOwner?:string):Promise<AiFoodDetectionResult> {
  const image=await imageData(uri,base64,mimeType);
  if(!['image/jpeg','image/png','image/webp'].includes(image.mimeType))throw new Error('Use a JPEG, PNG, or WebP image.');
  return validateDetection(await requestNutrition({kind,...image},signal,expectedOwner));
}
export function analyzeFoodImage(uri:string,base64?:string,mimeType?:string,signal?:AbortSignal,expectedOwner?:string):Promise<AiFoodDetectionResult> { return analyze('food',uri,base64,mimeType,signal,expectedOwner); }
export function analyzeNutritionLabelImage(uri:string,base64?:string,mimeType?:string,signal?:AbortSignal,expectedOwner?:string):Promise<AiFoodDetectionResult> { return analyze('label',uri,base64,mimeType,signal,expectedOwner); }
