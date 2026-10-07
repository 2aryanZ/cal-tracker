import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  AiMealPlan,
  DietaryPreference,
  MacroTargets,
} from '@/types/nutrition';
import { RECIPE_VERSION } from '@/data/mealRecipes';
import { validateMealPlan } from './mealPlanRules';

export const mealPlanCacheKey = (owner: string) =>
  `@cal_tracker_meal_ideas_v1:${owner}`;
const dayKey = (date: Date) =>
  `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
const signature = (targets: MacroTargets, preference: DietaryPreference) =>
  JSON.stringify([
    RECIPE_VERSION,
    preference,
    targets.calories,
    targets.protein,
    targets.carbs,
    targets.fats,
  ]);
interface CachedPlan {
  key: string;
  savedAt: number;
  plan: AiMealPlan;
}
const queues = new Map<string, Promise<unknown>>();
function serial<T>(owner: string, operation: () => Promise<T>): Promise<T> {
  const result = (queues.get(owner) ?? Promise.resolve())
    .catch(() => {})
    .then(operation);
  queues.set(owner, result);
  void result
    .catch(() => {})
    .finally(() => {
      if (queues.get(owner) === result) queues.delete(owner);
    });
  return result;
}
async function records(owner: string): Promise<CachedPlan[]> {
  const raw = await AsyncStorage.getItem(mealPlanCacheKey(owner));
  if (!raw || raw.length > 200000) return [];
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value.slice(0, 8) : [];
  } catch {
    return [];
  }
}
function fresh(record: CachedPlan, now: number): boolean {
  return (
    !!record &&
    Number.isFinite(record.savedAt) &&
    record.savedAt <= now &&
    now - record.savedAt < 24 * 60 * 60 * 1000 &&
    dayKey(new Date(record.savedAt)) === dayKey(new Date(now))
  );
}
export async function readMealPlanCache(
  owner: string,
  targets: MacroTargets,
  preference: DietaryPreference,
  now = Date.now(),
): Promise<AiMealPlan | null> {
  if (!owner || owner === 'guest') return null;
  return serial(owner, async () => {
    const match = (await records(owner)).find(
      (r) => fresh(r, now) && r.key === signature(targets, preference),
    );
    if (!match) return null;
    try {
      const plan = validateMealPlan(match.plan, targets, preference);
      if (
        typeof match.plan.id !== 'string' ||
        typeof match.plan.createdAt !== 'string' ||
        !Number.isFinite(Date.parse(match.plan.createdAt))
      )
        return null;
      return { ...plan, id: match.plan.id, createdAt: match.plan.createdAt };
    } catch {
      return null;
    }
  });
}
export async function saveMealPlanCache(
  owner: string,
  targets: MacroTargets,
  preference: DietaryPreference,
  plan: AiMealPlan,
  now = Date.now(),
): Promise<void> {
  if (!owner || owner === 'guest') return;
  if (
    typeof plan.id !== 'string' ||
    plan.id.length > 100 ||
    typeof plan.createdAt !== 'string' ||
    !Number.isFinite(Date.parse(plan.createdAt))
  )
    throw new Error('Invalid saved plan metadata.');
  const checked = validateMealPlan(plan, targets, preference);
  const value = { ...checked, id: plan.id, createdAt: plan.createdAt };
  return serial(owner, async () => {
    const key = signature(targets, preference);
    const previous = (await records(owner)).filter(
      (r) => fresh(r, now) && r.key !== key,
    );
    const next = [{ key, savedAt: now, plan: value }, ...previous].slice(0, 8);
    while (JSON.stringify(next).length > 200000) next.pop();
    await AsyncStorage.setItem(mealPlanCacheKey(owner), JSON.stringify(next));
  });
}
export async function clearMealPlanCache(owner: string): Promise<void> {
  return serial(owner, () => AsyncStorage.removeItem(mealPlanCacheKey(owner)));
}
