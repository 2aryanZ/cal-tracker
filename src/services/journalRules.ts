import type { FoodEntry, WeightEntry } from '@/types/nutrition';
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
