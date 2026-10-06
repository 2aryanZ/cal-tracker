import type { FoodEntry, MacroTargets, WeightEntry } from '@/types/nutrition';
import { isCalorieGoalMet } from './nutritionRules';
import { shiftDay } from './calendarRules';
import { indexJournal } from './journalRules';
import type { IndexedDay } from './journalRules';
export function trailingDates(end: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => shiftDay(end, i - count + 1));
}
export function calendarTime(date: string): number {
  const [year, month, day] = date.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}
export function analyticsDates(
  entries: Pick<FoodEntry, 'date'>[],
  weights: Pick<WeightEntry, 'date'>[],
  today: string,
  range: number,
): string[] {
  let first = today;
  if (!range) {
    for (const entry of entries) if (entry.date < first) first = entry.date;
    for (const weight of weights) if (weight.date < first) first = weight.date;
  }
  const count =
    range ||
    Math.max(
      1,
      Math.round((calendarTime(today) - calendarTime(first)) / 86400000) + 1,
    );
  return trailingDates(today, count);
}
export function summarizePeriod(
  entries: FoodEntry[],
  dates: string[],
  goals: MacroTargets,
) {
  return summarizeJournalPeriod(indexJournal(entries).days, dates, goals.calories);
}
// Reuse the provider's date index: changing the range scans dates, not every meal.
export function summarizeJournalPeriod(
  days: Readonly<Record<string, IndexedDay>>,
  dates: string[],
  calorieTarget: number,
) {
  const totals: Record<string, { calories: number; protein: number; carbs: number; fats: number; count: number }> = Object.create(null);
  let sum = 0, loggedDays = 0, goalDays = 0;
  for (const date of dates) {
    if (totals[date]) continue;
    const day = days[date];
    const count = day?.entries.length ?? 0;
    totals[date] = {
      calories: day?.calories ?? 0, protein: day?.protein ?? 0,
      carbs: day?.carbs ?? 0, fats: day?.fats ?? 0, count,
    };
    if (count) {
      sum += day.calories;
      loggedDays++;
      if (isCalorieGoalMet(day.calories, calorieTarget)) goalDays++;
    }
  }
  return {
    totals,
    averageCalories: loggedDays ? Math.round(sum / loggedDays) : null,
    loggedDays, goalDays,
    adherence: loggedDays ? Math.round((goalDays / loggedDays) * 100) : null,
  };
}
// Keep endpoints and each bucket's extrema. Full records remain in the weigh-in list.
export function sampleWeights(logs: WeightEntry[], limit = 180): WeightEntry[] {
  if (logs.length <= limit || limit < 4) return logs;
  const bucketCount = Math.floor((limit - 2) / 2);
  const size = (logs.length - 2) / bucketCount;
  const selected = [logs[0]];
  for (let bucket = 0; bucket < bucketCount; bucket++) {
    const first = 1 + Math.floor(bucket * size),
      end = 1 + Math.floor((bucket + 1) * size);
    let min = first,
      max = first;
    for (let i = first + 1; i < end; i++) {
      if (logs[i].weightKg < logs[min].weightKg) min = i;
      if (logs[i].weightKg > logs[max].weightKg) max = i;
    }
    selected.push(logs[Math.min(min, max)]);
    if (min !== max) selected.push(logs[Math.max(min, max)]);
  }
  selected.push(logs.at(-1)!);
  return selected;
}
export function weightChart(
  logs: WeightEntry[],
  targetKg: number,
  width: number,
  height: number,
  imperial = false,
) {
  if (!logs.length) return { points: [], goalY: height / 2 };
  const factor = imperial ? 2.20462 : 1,
    target = targetKg * factor;
  let min = target,
    max = target,
    first = Infinity,
    last = -Infinity;
  for (const log of logs) {
    min = Math.min(min, log.weightKg * factor);
    max = Math.max(max, log.weightKg * factor);
    const time = calendarTime(log.date);
    first = Math.min(first, time);
    last = Math.max(last, time);
  }
  min -= factor * 0.5;
  max += factor * 0.5;
  const padding = 20;
  const y = (value: number) =>
    height - padding - ((value - min) / (max - min)) * (height - 2 * padding);
  return {
    goalY: y(target),
    points: sampleWeights(logs).map((log) => {
      const value = log.weightKg * factor;
      return {
        log,
        value: Math.round(value * 10) / 10,
        x:
          first === last
            ? width / 2
            : padding +
              ((calendarTime(log.date) - first) / (last - first)) *
                (width - 2 * padding),
        y: y(value),
      };
    }),
  };
}
