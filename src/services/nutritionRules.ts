import type { FoodEntry, MacroTargets, UserStats, WeightEntry, UserProfile } from '@/types/nutrition';
export function assertDate(value: string): void {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
        throw new Error('Choose a valid date.');
    const [y, m, d] = value.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d)
        throw new Error('Choose a valid date.');
}
export function assertNumber(value: number, label: string, min = 0, max = 100000): void {
    if (!Number.isFinite(value) || value < min || value > max)
        throw new Error(`${label} must be between ${min} and ${max}.`);
}
export function validateMeal(meal: Pick<FoodEntry, 'name' | 'calories' | 'protein' | 'carbs' | 'fats' | 'mealType'>): void {
    if (!meal.name.trim())
        throw new Error('Enter a meal name.');
    if (!['breakfast', 'lunch', 'dinner', 'snack'].includes(meal.mealType))
        throw new Error('Choose a meal type.');
    assertNumber(meal.calories, 'Calories', 0, 10000);
    for (const key of ['protein', 'carbs', 'fats'] as const)
        assertNumber(meal[key], key, 0, 2000);
}
export function validateGoals(goals: MacroTargets): void {
    assertNumber(goals.calories, 'Calorie target', 1, 10000);
    for (const key of ['protein', 'carbs', 'fats'] as const)
        assertNumber(goals[key], key, 0, 2000);
    assertNumber(goals.waterMl ?? 2000, 'Water target', 1, 20000);
    if (goals.protein * 4 + goals.carbs * 4 + goals.fats * 9 > goals.calories * 1.2)
        throw new Error('Macro targets exceed your calorie budget. Adjust the targets before saving.');
}
export function validateProfile(profile: UserProfile): void {
    assertNumber(profile.age, 'Age', 18, 120);
    assertNumber(profile.heightCm, 'Height', 100, 250);
    assertNumber(profile.weightKg, 'Weight', 30, 400);
    assertNumber(profile.targetWeightKg, 'Target weight', 30, 400);
    assertNumber(profile.dailySteps, 'Daily steps', 0, 100000);
    if (!['male', 'female'].includes(profile.gender) || !['sedentary', 'light', 'moderate', 'very_active'].includes(profile.activityLevel) || !['fat_loss', 'muscle_gain', 'maintenance', 'recomposition'].includes(profile.goal) || !['metric', 'imperial'].includes(profile.unitSystem))
        throw new Error('Choose valid profile options.');
}
export function validateWeight(entry: Pick<WeightEntry, 'date' | 'weightKg'>): void { assertDate(entry.date); assertNumber(entry.weightKg, 'Weight', 30, 400); }
export function isCalorieGoalMet(calories: number, target: number): boolean { return target > 0 && calories >= target * .9 && calories <= target * 1.1; }
export function weightProgress(start: number, current: number, target: number): number {
    if (start === target)
        return Math.abs(current - target) <= .5 ? 1 : 0;
    return Math.max(0, Math.min(1, (current - start) / (target - start)));
}
function previousDate(value: string): string {
    const [y, m, d] = value.split('-').map(Number);
    const date = new Date(y, m - 1, d - 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function calculateStats(entries: FoodEntry[], today: string): UserStats {
    const dates = [...new Set(entries.map(e => e.date).filter(d => d <= today))].sort();
    let best = 0, run = 0, last: string | null = null;
    for (const date of dates) {
        run = last === previousDate(date) ? run + 1 : 1;
        best = Math.max(best, run);
        last = date;
    }
    let current = 0, cursor = dates.includes(today) ? today : previousDate(today);
    const logged = new Set(dates);
    while (logged.has(cursor)) {
        current++;
        cursor = previousDate(cursor);
    }
    const count = entries.length;
    const rank = current >= 30 ? 'Legendary Nutritionist' : current >= 14 ? 'Macro Prodigy' : current >= 7 ? 'Streak Beast' : current >= 3 ? 'Macro Master' : count >= 5 ? 'Calorie Crusher' : 'Calorie Starter';
    return { currentStreak: current, bestStreak: best, lastLoggedDate: last, totalMealsLogged: count, rankTitle: rank };
}
export function newId(prefix: string): string { return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`; }
