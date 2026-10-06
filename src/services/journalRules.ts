import type { FavoriteMeal, FoodEntry, WeightEntry } from '@/types/nutrition';

export interface IndexedDay {
  entries: FoodEntry[];
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}
// Build once per record change; day navigation and badges reuse the same totals.
export function indexJournal(entries: FoodEntry[]) {
  const days: Record<string, IndexedDay> = Object.create(null);
  let scans = 0;
  for (const entry of entries) {
    const day = (days[entry.date] ??= {
      entries: [],
      calories: 0,
      protein: 0,
      carbs: 0,
      fats: 0,
    });
    day.entries.push(entry);
    day.calories += entry.calories;
    day.protein += entry.protein;
    day.carbs += entry.carbs;
    day.fats += entry.fats;
    if (isScannedMeal(entry)) scans++;
  }
  return { days, scans };
}

export function savedMealChoices(
  favorites: FavoriteMeal[],
  recent: FoodEntry[],
): (FavoriteMeal | FoodEntry)[] {
  const choices = new Map<string, FavoriteMeal | FoodEntry>();
  for (const meal of [...favorites, ...recent]) {
    const name = meal.name.trim().toLowerCase();
    if (!choices.has(name)) choices.set(name, meal);
  }
  return [...choices.values()];
}
// Choose the newest instance of each meal name without mutating stored records.
export function recentJournalMeals(
  entries: FoodEntry[],
  limit = 8,
): FoodEntry[] {
  const newest = new Map<string, FoodEntry>();
  for (const entry of entries) {
    const key = entry.name.trim().toLowerCase();
    const previous = newest.get(key);
    if (!previous || entry.timestamp > previous.timestamp)
      newest.set(key, entry);
  }
  return [...newest.values()]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, Math.max(0, limit));
}
export function recordedWeightsThrough(
  logs: WeightEntry[],
  date: string,
): WeightEntry[] {
  return logs
    .filter((log) => log.date <= date)
    .sort((a, b) => a.date.localeCompare(b.date));
}
export function isScannedMeal(entry: FoodEntry): boolean {
  return (
    entry.source === 'photo' ||
    entry.source === 'barcode' ||
    entry.source === 'label'
  );
}
