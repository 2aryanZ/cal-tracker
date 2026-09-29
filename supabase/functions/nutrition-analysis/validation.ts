const preferences = ['balanced', 'high_protein', 'keto', 'vegan', 'vegetarian', 'mediterranean', 'paleo', 'intermittent_fasting'];
const number = (value: unknown, max: number, min = 0): value is number => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const text = (value: unknown): value is string => typeof value === 'string' && !!value.trim() && value.length <= 3000;
const nutrients = (value: Record<string, unknown>) => number(value.calories, 10000) && ['protein', 'carbs', 'fats'].every(key => number(value[key], 2000));
export function validRequest(value: unknown): value is Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const body = value as Record<string, any>;
  if (!['food', 'label', 'text', 'plan'].includes(body.kind)) return false;
  if (body.kind === 'food' || body.kind === 'label') return ['image/jpeg', 'image/png', 'image/webp'].includes(body.mimeType) && typeof body.base64 === 'string' && body.base64.length > 0 && body.base64.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(body.base64);
  if (body.kind === 'text') return text(body.transcript) && body.base64 === undefined;
  const t = body.targets;
  return body.base64 === undefined && !!t && nutrients(t) && t.calories > 0 && (t.waterMl === undefined || number(t.waterMl, 20000, 1)) && t.protein * 4 + t.carbs * 4 + t.fats * 9 <= t.calories * 1.2 && preferences.includes(body.preference);
}
export function validOutput(value: unknown, kind: string): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const result = value as Record<string, any>;
  if (text(result.error)) return true;
  if (kind === 'plan') {
    return Array.isArray(result.meals) && result.meals.length === 4 && new Set(result.meals.map((m: any) => m?.mealType)).size === 4 && result.meals.every((m: any) => m && nutrients(m) && text(m.name) && text(m.portionSize) && ['breakfast', 'lunch', 'dinner', 'snack'].includes(m.mealType) && Array.isArray(m.ingredients) && m.ingredients.length > 0 && m.ingredients.every(text) && Math.abs(m.protein * 4 + m.carbs * 4 + m.fats * 9 - m.calories) <= Math.max(10, m.calories * .05));
  }
  return nutrients(result) && text(result.foodName) && text(result.servingSize) && number(result.confidence, 1) && (result.breakdown === undefined || Array.isArray(result.breakdown) && result.breakdown.every((i: any) => i && text(i.item) && text(i.portion) && number(i.calories, 10000)));
}
export async function readRequest(req: Request, signal: AbortSignal): Promise<unknown> {
  if (Number(req.headers.get('content-length')) > 8000000) throw new RangeError('Choose a smaller photo.');
  const reader = req.body?.getReader();
  if (!reader) throw new Error('Missing request body.');
  const cancel = () => { void reader.cancel(); };
  signal.addEventListener('abort', cancel, { once: true });
  let length = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      if (signal.aborted) throw new Error('Request timed out.');
      const { value, done } = await reader.read();
      if (signal.aborted) throw new Error('Request timed out.');
      if (done) break;
      length += value.byteLength;
      if (length > 8000000) { await reader.cancel(); throw new RangeError('Choose a smaller photo.'); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return JSON.parse(new TextDecoder().decode(bytes));
  } finally { signal.removeEventListener('abort', cancel); reader.releaseLock(); }
}
