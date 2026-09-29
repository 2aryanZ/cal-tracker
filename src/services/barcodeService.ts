import { AiFoodDetectionResult } from '@/types/nutrition';

export interface BarcodeProductResult extends AiFoodDetectionResult {
  barcode: string;
  brand?: string;
}

// Built-in offline fallback database for popular packaged items
const OFFLINE_BARCODE_DATABASE: Record<string, Omit<BarcodeProductResult, 'barcode'>> = {
  // Coca-Cola Can 330ml
  '5449000000996': {
    foodName: 'Coca-Cola Classic (Can 330ml)',
    brand: 'Coca-Cola',
    calories: 139,
    protein: 0,
    carbs: 35,
    fats: 0,
    servingSize: '1 can (330ml)',
    confidence: 0.99,
    breakdown: [
      { item: 'Sugar & Carbonated Water', portion: '330ml', calories: 139 },
    ],
  },
  // Chobani Greek Yogurt Plain 170g
  '894700010045': {
    foodName: 'Chobani Non-Fat Plain Greek Yogurt',
    brand: 'Chobani',
    calories: 90,
    protein: 16,
    carbs: 6,
    fats: 0,
    servingSize: '1 container (170g)',
    confidence: 0.99,
    breakdown: [
      { item: 'Cultured Pasteurized Non-Fat Milk', portion: '170g', calories: 90 },
    ],
  },
  // Kind Bar Dark Chocolate Nuts & Sea Salt
  '602652171802': {
    foodName: 'Kind Bar Dark Chocolate Nuts & Sea Salt',
    brand: 'KIND',
    calories: 200,
    protein: 6,
    carbs: 16,
    fats: 15,
    servingSize: '1 bar (40g)',
    confidence: 0.99,
    breakdown: [
      { item: 'Almonds & Peanuts', portion: '25g', calories: 140 },
      { item: 'Dark Chocolate Coating', portion: '15g', calories: 60 },
    ],
  },
  // Quest Nutrition Chocolate Chip Cookie Dough Protein Bar
  '888849000196': {
    foodName: 'Quest Protein Bar - Chocolate Chip Cookie Dough',
    brand: 'Quest Nutrition',
    calories: 200,
    protein: 21,
    carbs: 22,
    fats: 9,
    servingSize: '1 bar (60g)',
    confidence: 0.99,
    breakdown: [
      { item: 'Whey & Milk Protein Isolate', portion: '35g', calories: 120 },
      { item: 'Soluble Corn Fiber & Almonds', portion: '25g', calories: 80 },
    ],
  },
  // Quaker Rolled Oats 40g
  '030000010204': {
    foodName: 'Quaker Old Fashioned Rolled Oats',
    brand: 'Quaker',
    calories: 150,
    protein: 5,
    carbs: 27,
    fats: 3,
    servingSize: '1/2 cup dry (40g)',
    confidence: 0.99,
    breakdown: [
      { item: 'Whole Grain Rolled Oats', portion: '40g', calories: 150 },
    ],
  },
};

export function productFromApi(barcode:string,p:Record<string,any>):BarcodeProductResult|null {
  const n=p.nutriments??{};
  const fields=['energy-kcal','proteins','carbohydrates','fat'];
  const valid=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)&&value>=0;
  // All nutrients must use one complete basis. A package's size is not a serving.
  const basis=p.serving_size&&fields.every(f=>valid(n[`${f}_serving`]))?'serving':fields.every(f=>valid(n[`${f}_100g`]))?'100g':null;
  if(!basis)return null;
  const serving=basis==='serving'?p.serving_size:`100 ${p.nutrition_data_per==='100ml'?'ml':'g'}`;
  return {barcode,foodName:String(p.product_name||p.product_name_en||p.generic_name||'Unnamed packaged food'),brand:p.brands||undefined,calories:Math.round(n[`energy-kcal_${basis}`]),protein:n[`proteins_${basis}`],carbs:n[`carbohydrates_${basis}`],fats:n[`fat_${basis}`],servingSize:serving,confidence:1,breakdown:[]};
}
export async function fetchProductByBarcode(barcode:string,signal?:AbortSignal):Promise<BarcodeProductResult|null> {
  const code=barcode.trim();
  if(!/^\d{8,14}$/.test(code))return null;
  if(OFFLINE_BARCODE_DATABASE[code])return {barcode:code,...OFFLINE_BARCODE_DATABASE[code]};
  const controller=new AbortController();const abort=()=>controller.abort();const timeout=setTimeout(abort,6000);signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)controller.abort();
  try {
    const response=await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json`,{headers:{Accept:'application/json'},signal:controller.signal});
    if(!response.ok)throw new Error('Product lookup is unavailable. Try scanning the nutrition label.');
    const data=await response.json();
    return data.status===1&&data.product?productFromApi(code,data.product):null;
  }catch(error){if(controller.signal.aborted)throw new Error(signal?.aborted?'Lookup cancelled.':'Product lookup timed out.');throw error;}
  finally{clearTimeout(timeout);signal?.removeEventListener('abort',abort);}
}
