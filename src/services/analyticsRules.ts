import type { FoodEntry, MacroTargets, WeightEntry } from '@/types/nutrition';
import { isCalorieGoalMet } from './nutritionRules';
import { toLocalDateString } from './storage';
export function trailingDates(end: string, count: number): string[] { const [y, m, d] = end.split('-').map(Number); return Array.from({ length: count }, (_, i) => toLocalDateString(new Date(y, m - 1, d - (count - 1 - i)))); }
export function summarizePeriod(entries: FoodEntry[], dates: string[], goals: MacroTargets) {
    const totals = Object.fromEntries(dates.map(date => [date, { calories: 0, protein: 0, carbs: 0, fats: 0, count: 0 }]));
    for (const entry of entries) {
        const day = totals[entry.date];
        if (day) {
            day.calories += entry.calories;
            day.protein += entry.protein;
            day.carbs += entry.carbs;
            day.fats += entry.fats;
            day.count++;
        }
    }
    const days = Object.values(totals), sum = days.reduce((n, day) => n + day.calories, 0), met = days.filter(day => isCalorieGoalMet(day.calories, goals.calories)).length;
    return { totals, averageCalories: dates.length ? Math.round(sum / dates.length) : 0, loggedDays: days.filter(day => day.count > 0).length, goalDays: met, adherence: dates.length ? Math.round(met / dates.length * 100) : 0 };
}
export function weightChart(logs: WeightEntry[], targetKg: number, width: number, height: number, imperial = false) {
    if (!logs.length)
        return { points: [], goalY: height / 2 };
    const factor = imperial ? 2.20462 : 1, target = targetKg * factor;
    const values = logs.map(w => w.weightKg * factor), min = Math.min(target, ...values) - factor * .5, max = Math.max(target, ...values) + factor * .5;
    const times = logs.map(w => { const [y, m, d] = w.date.split('-').map(Number); return new Date(y, m - 1, d).getTime(); });
    const first = Math.min(...times), last = Math.max(...times), padding = 20;
    const y = (value: number) => height - padding - (value - min) / (max - min) * (height - 2 * padding);
    return { goalY: y(target), points: logs.map((log, index) => ({ log, value: Math.round(values[index] * 10) / 10, x: first === last ? width / 2 : padding + (times[index] - first) / (last - first) * (width - 2 * padding), y: y(values[index]) })) };
}
