import { clearMealPlanCache } from './mealPlanCache';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FoodEntry, MacroTargets, UserStats, NotificationSettings, UserProfile, UserAccount, WeightEntry, DietaryPreference, FavoriteMeal, HealthSyncSettings, CommunityGroup, MilestoneBadge } from '@/types/nutrition';
import { assertDate, assertNumber, calculateStats, newId, validateGoals, validateMeal, validateProfile, validateWeight } from './nutritionRules';
export const DEFAULT_PROFILE: UserProfile = { gender: 'male', age: 26, heightCm: 178, weightKg: 78, targetWeightKg: 74, dailySteps: 8500, activityLevel: 'moderate', goal: 'fat_loss', unitSystem: 'metric' };
export const DEFAULT_GOALS: MacroTargets = { calories: 2200, protein: 150, carbs: 220, fats: 65, waterMl: 2000 };
export const DEFAULT_NOTIFICATIONS: NotificationSettings = { enabled: false, breakfastReminder: true, breakfastTime: '08:30', lunchReminder: true, lunchTime: '13:00', dinnerReminder: true, dinnerTime: '19:30', streakReminder: true, streakTime: '21:30' };
export const DEFAULT_STATS: UserStats = { currentStreak: 0, bestStreak: 0, lastLoggedDate: null, totalMealsLogged: 0, rankTitle: 'Calorie Starter' };
export const DEFAULT_ACCOUNT: UserAccount = { id: 'usr_guest', name: 'Guest User', email: '', memberSince: 'Today', isLoggedIn: false, tier: 'Free' };
export const DEFAULT_DIETARY_PREFERENCE: DietaryPreference = 'balanced';
export const DEFAULT_HEALTH_SYNC: HealthSyncSettings = { appleHealthEnabled: false, googleFitEnabled: false, syncSteps: false, syncActiveCalories: false, syncWeight: false, syncWater: false };
export const DEFAULT_COMMUNITY_GROUPS: CommunityGroup[] = [];
export const SEED_FAVORITES: FavoriteMeal[] = [];
export type SyncEntity = 'food' | 'weight' | 'water' | 'goals' | 'profile' | 'preferences';
export interface PendingChange {
    id: string;
    entity: SyncEntity;
    key: string;
    action: 'upsert' | 'delete';
    payload: unknown;
    expectedVersion: number;
}
export interface LocalSnapshot {
    entries: FoodEntry[];
    weights: WeightEntry[];
    waterLogs: Record<string, number>;
    goals: MacroTargets;
    profile: UserProfile;
    notifications: NotificationSettings;
    favorites: FavoriteMeal[];
    preference: DietaryPreference;
    health: HealthSyncSettings;
    groups: CommunityGroup[];
    onboardingDone: boolean;
    badges: Record<string, string>;
    celebratedDates: string[];
    outbox: PendingChange[];
    versions: Record<string, number>;
}
let scope = 'guest';
let tail: Promise<unknown> = Promise.resolve();
const keyFor = (owner: string) => `@cal_tracker_v2:${owner}`;
const defaults = (): LocalSnapshot => ({ entries: [], weights: [], waterLogs: {}, goals: { ...DEFAULT_GOALS }, profile: { ...DEFAULT_PROFILE }, notifications: { ...DEFAULT_NOTIFICATIONS }, favorites: [], preference: DEFAULT_DIETARY_PREFERENCE, health: { ...DEFAULT_HEALTH_SYNC }, groups: [], onboardingDone: false, badges: {}, celebratedDates: [], outbox: [], versions: {} });
// One document commits the data and its outbox together. All operations share a queue,
// including account changes, so failed writes cannot leave the UI ahead of disk.
function serial<T>(operation: () => Promise<T>): Promise<T> {
    const result = tail.then(operation);
    tail = result.catch(() => { });
    return result;
}
async function read(owner: string): Promise<LocalSnapshot> {
    const raw = await AsyncStorage.getItem(keyFor(owner));
    if (raw)
        return { ...defaults(), ...JSON.parse(raw) };
    const value = defaults();
    // Preserve existing real guest data. Never assign the old global store to an account.
    // Old keys stay intact as a recovery copy; identifiable demo meals are excluded.
    if (owner === 'guest') {
        const legacy: Record<string, keyof LocalSnapshot> = { food_entries: 'entries', weight_logs: 'weights', water_logs: 'waterLogs', macro_goals: 'goals', user_profile: 'profile', notifications: 'notifications', favorite_meals: 'favorites', health_sync: 'health', community_groups: 'groups' };
        for (const [old, field] of Object.entries(legacy)) {
            const stored = await AsyncStorage.getItem(`@cal_ai_${old}_v1`);
            if (stored)
                Object.assign(value, { [field]: JSON.parse(stored) });
        }
        value.entries = value.entries.filter(e => !e.id.startsWith('seed-'));
        value.groups = []; // Previous community records were demos, with no actual members.
        const pref = await AsyncStorage.getItem('@cal_ai_dietary_preference_v1');
        if (pref)
            value.preference = pref as DietaryPreference;
        value.onboardingDone = (await AsyncStorage.getItem('@cal_ai_onboarding_done_v1')) === 'true';
    }
    await AsyncStorage.setItem(keyFor(owner), JSON.stringify(value));
    return value;
}
function change(s: LocalSnapshot, owner: string, entity: SyncEntity, key: string, payload: unknown, action: 'upsert' | 'delete' = 'upsert') {
    if (owner === 'guest')
        return;
    const existing = s.outbox.find(c => c.entity === entity && c.key === key);
    s.outbox = s.outbox.filter(c => c !== existing);
    s.outbox.push({ id: newId('change'), entity, key, action, payload, expectedVersion: existing?.expectedVersion ?? s.versions[`${entity}:${key}`] ?? 0 });
}
export function getStorageScope(): string { return scope; }
export async function setStorageScope(userId: string | null): Promise<void> { return serial(async () => { scope = userId ?? 'guest'; await read(scope); }); }
export async function initializeStorage(): Promise<void> { return serial(async () => { await read(scope); }); }
export async function getSnapshot(): Promise<LocalSnapshot> { const owner = scope; return serial(() => read(owner)); }
async function mutate<T>(callback: (s: LocalSnapshot, owner: string) => T, owner = scope): Promise<T> {
    return serial(async () => { const s = await read(owner); const result = callback(s, owner); await AsyncStorage.setItem(keyFor(owner), JSON.stringify(s)); return result; });
}
export function toLocalDateString(d: Date): string { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
export function getTodayDateString(): string { return toLocalDateString(new Date()); }
export function formatDateLabel(value: string): string { if (value === getTodayDateString())
    return 'Today'; const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1); if (value === toLocalDateString(yesterday))
    return 'Yesterday'; const [y, m, d] = value.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); }
export async function getFoodEntries(): Promise<FoodEntry[]> { return (await getSnapshot()).entries; }
export async function getUserStats(): Promise<UserStats> { return calculateStats(await getFoodEntries(), getTodayDateString()); }
export async function saveFoodEntry(entry: FoodEntry) { return saveFoodEntriesBatch([entry]); }
export async function saveFoodEntriesBatch(entries: FoodEntry[]): Promise<{
    entries: FoodEntry[];
    stats: UserStats;
}> {
    entries.forEach(e => { validateMeal(e); assertDate(e.date); });
    return mutate((s, owner) => { const ids = new Set(entries.map(e => e.id)); s.entries = [...entries, ...s.entries.filter(e => !ids.has(e.id))]; entries.forEach(e => change(s, owner, 'food', e.id, e)); return { entries: s.entries, stats: calculateStats(s.entries, getTodayDateString()) }; });
}
export async function updateFoodEntry(entry: FoodEntry): Promise<FoodEntry[]> { validateMeal(entry); assertDate(entry.date); return mutate((s, owner) => { if (!s.entries.some(e => e.id === entry.id))
    throw new Error('This meal no longer exists.'); s.entries = s.entries.map(e => e.id === entry.id ? entry : e); change(s, owner, 'food', entry.id, entry); return s.entries; }); }
export async function deleteFoodEntry(id: string): Promise<FoodEntry[]> { return mutate((s, owner) => { s.entries = s.entries.filter(e => e.id !== id); change(s, owner, 'food', id, null, 'delete'); return s.entries; }); }
export async function getMacroGoals(): Promise<MacroTargets> { return (await getSnapshot()).goals; }
export async function saveMacroGoals(goals: MacroTargets): Promise<void> { validateGoals(goals); return mutate((s, owner) => { s.goals = { ...goals, waterMl: goals.waterMl ?? 2000 }; change(s, owner, 'goals', 'singleton', s.goals); }); }
export async function getUserProfile(): Promise<UserProfile> { return (await getSnapshot()).profile; }
export async function saveUserProfile(profile: UserProfile): Promise<void> { validateProfile(profile); return mutate((s, owner) => { s.profile = profile; change(s, owner, 'profile', 'singleton', profile); }); }
export async function getNotificationSettings(): Promise<NotificationSettings> { return (await getSnapshot()).notifications; }
function preferences(s: LocalSnapshot, owner: string) { change(s, owner, 'preferences', 'singleton', { favorites: s.favorites, preference: s.preference, notifications: s.notifications, badges: s.badges, onboardingDone: s.onboardingDone, celebratedDates: s.celebratedDates }); }
export async function saveNotificationSettings(settings: NotificationSettings): Promise<void> { for (const time of [settings.breakfastTime, settings.lunchTime, settings.dinnerTime, settings.streakTime])
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
        throw new Error('Use reminder times in HH:MM format.'); return mutate((s, o) => { s.notifications = settings; preferences(s, o); }); }
export async function hasCompletedOnboarding(): Promise<boolean> { return (await getSnapshot()).onboardingDone; }
export async function setOnboardingCompleted(value: boolean): Promise<void> { return mutate((s, o) => { s.onboardingDone = value; preferences(s, o); }); }
export async function getWeightLogs(): Promise<WeightEntry[]> { return (await getSnapshot()).weights; }
export function generateDefaultWeightLogs(): WeightEntry[] { return []; }
export async function addWeightLog(entry: {
    weightKg: number;
    weightLbs: number;
    date: string;
    note?: string;
}): Promise<WeightEntry[]> {
    validateWeight(entry);
    return mutate((s, owner) => { const previous = s.weights.find(w => w.date === entry.date); const value = { ...entry, id: previous?.id ?? newId('weight'), weightLbs: Math.round(entry.weightKg * 2.20462 * 10) / 10, timestamp: previous?.timestamp ?? new Date().toISOString() }; s.weights = [value, ...s.weights.filter(w => w.date !== entry.date)].sort((a, b) => b.date.localeCompare(a.date)); change(s, owner, 'weight', value.date, value); return s.weights; });
}
export async function deleteWeightLog(id: string): Promise<WeightEntry[]> { return mutate((s, owner) => { const found = s.weights.find(w => w.id === id); s.weights = s.weights.filter(w => w.id !== id); if (found)
    change(s, owner, 'weight', found.date, null, 'delete'); return s.weights; }); }
export async function getWaterLogs(): Promise<Record<string, number>> { return (await getSnapshot()).waterLogs; }
export async function getWaterForDate(date: string): Promise<number> { return (await getWaterLogs())[date] ?? 0; }
export async function saveWaterForDate(date: string, total: number): Promise<Record<string, number>> { assertDate(date); assertNumber(total, 'Water', 0, 20000); return mutate((s, owner) => { s.waterLogs[date] = Math.round(total); change(s, owner, 'water', date, { date, waterMl: s.waterLogs[date] }); return s.waterLogs; }); }
export async function incrementWaterForDate(date: string, amount: number): Promise<Record<string, number>> { assertDate(date); assertNumber(amount, 'Water amount', 0, 20000); return mutate((s, owner) => { const total = (s.waterLogs[date] ?? 0) + amount; assertNumber(total, 'Water', 0, 20000); s.waterLogs[date] = Math.round(total); change(s, owner, 'water', date, { date, waterMl: s.waterLogs[date] }); return s.waterLogs; }); }
export async function setAllFoodEntries(value: FoodEntry[]): Promise<void> { return mutate(s => { s.entries = value; }); }
export async function setAllWeightLogs(value: WeightEntry[]): Promise<void> { return mutate(s => { s.weights = value; }); }
export async function setAllWaterLogs(value: Record<string, number>): Promise<void> { return mutate(s => { s.waterLogs = value; }); }
// Account metadata is cosmetic. Session verification belongs to the auth service.
export async function getUserAccount(): Promise<UserAccount> { return DEFAULT_ACCOUNT; }
export async function saveUserAccount(_account: UserAccount): Promise<void> { }
export async function signOutUser(): Promise<UserAccount> { await setStorageScope(null); return DEFAULT_ACCOUNT; }
export async function getFavoriteMeals(): Promise<FavoriteMeal[]> { return (await getSnapshot()).favorites; }
export async function saveFavoriteMeal(meal: Omit<FavoriteMeal, 'id' | 'createdAt'> & {
    id?: string;
}): Promise<FavoriteMeal[]> { validateMeal(meal); return mutate((s, o) => { s.favorites = [{ ...meal, id: meal.id ?? newId('favorite'), createdAt: new Date().toISOString() }, ...s.favorites.filter(f => f.name.trim().toLowerCase() !== meal.name.trim().toLowerCase())]; preferences(s, o); return s.favorites; }); }
export async function removeFavoriteMeal(id: string): Promise<FavoriteMeal[]> { return mutate((s, o) => { s.favorites = s.favorites.filter(f => f.id !== id); preferences(s, o); return s.favorites; }); }
export async function getDietaryPreference(): Promise<DietaryPreference> { return (await getSnapshot()).preference; }
export async function saveDietaryPreference(value: DietaryPreference): Promise<void> { return mutate((s, o) => { s.preference = value; preferences(s, o); }); }
export async function getHealthSyncSettings(): Promise<HealthSyncSettings> { return (await getSnapshot()).health; }
export async function saveHealthSyncSettings(value: HealthSyncSettings): Promise<void> { return mutate(s => { s.health = value; }); }
export async function getCommunityGroups(): Promise<CommunityGroup[]> { return (await getSnapshot()).groups; }
export async function saveCommunityGroups(groups: CommunityGroup[]): Promise<void> { return mutate(s => { s.groups = groups; }); }
export const DEFAULT_API_KEY = '';
export async function getApiKey(): Promise<string> { return ''; }
export async function saveApiKey(_key: string): Promise<void> { await AsyncStorage.removeItem('@cal_ai_gemini_api_key_v1'); }
export async function recordBadges(badges: MilestoneBadge[]): Promise<Record<string, string>> { return mutate((s, o) => { let changed = false; for (const badge of badges)
    if (badge.isUnlocked && !s.badges[badge.id]) {
        s.badges[badge.id] = new Date().toISOString();
        changed = true;
    } if (changed)
    preferences(s, o); return s.badges; }); }
export async function markCelebrated(date: string): Promise<boolean> { return mutate((s, o) => { if (s.celebratedDates.includes(date))
    return false; s.celebratedDates.push(date); preferences(s, o); return true; }); }
export async function getPendingChanges(): Promise<PendingChange[]> { return (await getSnapshot()).outbox; }
export async function acknowledgeChange(owner: string, changeId: string, entity: SyncEntity, key: string, version: number): Promise<void> {
    return serial(async () => { const s = await read(owner); s.versions[`${entity}:${key}`] = version; const sent = s.outbox.find(c => c.id === changeId); s.outbox = s.outbox.filter(c => c.id !== changeId); if (!sent) {
        const successor = s.outbox.find(c => c.entity === entity && c.key === key);
        if (successor)
            successor.expectedVersion = version;
    } await AsyncStorage.setItem(keyFor(owner), JSON.stringify(s)); });
}
export async function applyCloudSnapshot(owner: string, cloud: Partial<LocalSnapshot>, versions: Record<string, number>): Promise<void> {
    return serial(async () => {
        if (scope !== owner)
            return;
        const s = await read(owner);
        const dirty = new Set(s.outbox.map(c => `${c.entity}:${c.key}`));
        if (cloud.entries) {
            const local = new Map(s.entries.map(e => [e.id, e]));
            s.entries = cloud.entries.filter(e => !dirty.has(`food:${e.id}`));
            for (const [id, e] of local)
                if (dirty.has(`food:${id}`))
                    s.entries.push(e);
        }
        if (cloud.weights) {
            const local = new Map(s.weights.map(e => [e.id, e]));
            s.weights = cloud.weights.filter(e => !dirty.has(`weight:${e.date}`));
            for (const e of local.values())
                if (dirty.has(`weight:${e.date}`))
                    s.weights.push(e);
            s.weights.sort((a, b) => b.date.localeCompare(a.date));
        }
        if (cloud.waterLogs) {
            const local = s.waterLogs;
            s.waterLogs = { ...cloud.waterLogs };
            for (const [date, value] of Object.entries(local))
                if (dirty.has(`water:${date}`))
                    s.waterLogs[date] = value;
        }
        if (cloud.goals && !dirty.has('goals:singleton'))
            s.goals = cloud.goals;
        if (cloud.profile && !dirty.has('profile:singleton'))
            s.profile = cloud.profile;
        if (!dirty.has('preferences:singleton'))
            for (const field of ['favorites', 'preference', 'notifications', 'badges', 'onboardingDone', 'celebratedDates'] as const)
                if (cloud[field] !== undefined)
                    Object.assign(s, { [field]: cloud[field] });
        for (const [key, version] of Object.entries(versions))
            if (!dirty.has(key))
                s.versions[key] = version;
        await AsyncStorage.setItem(keyFor(owner), JSON.stringify(s));
    });
}
export async function exportLocalData(): Promise<string> { const s = await getSnapshot(); return JSON.stringify({ format: 'cal-tracker', version: 2, exportedAt: new Date().toISOString(), ...s }, null, 2); }
export async function resetLocalData(): Promise<void> { const owner = scope; await clearMealPlanCache(owner); return mutate((s, o) => { for (const e of s.entries)
    change(s, o, 'food', e.id, null, 'delete'); for (const w of s.weights)
    change(s, o, 'weight', w.date, null, 'delete'); for (const date of Object.keys(s.waterLogs))
    change(s, o, 'water', date, { date, waterMl: 0 }); s.entries = []; s.weights = []; s.waterLogs = {}; s.favorites = []; s.badges = {}; s.celebratedDates = []; preferences(s, o); }, owner); }
export async function resolvePendingChange(changeId: string, version: number, keepLocal: boolean, expectedOwner = scope): Promise<void> { return mutate((s, owner) => { if (owner !== expectedOwner)
    throw new Error('The account changed. Review again.'); const value = s.outbox.find(c => c.id === changeId); if (!value)
    throw new Error('The record changed while you were reviewing it. Refresh and review again.'); if (keepLocal) {
    value.expectedVersion = version;
    value.id = newId('change');
}
else {
    s.outbox = s.outbox.filter(c => c.id !== changeId);
    s.versions[`${value.entity}:${value.key}`] = version;
} }); }
function updateProfileFromLatestWeight(s: LocalSnapshot, owner: string): void {
    const latest = s.weights.find(w => w.date <= getTodayDateString());
    if (latest && latest.weightKg !== s.profile.weightKg) {
        s.profile = { ...s.profile, weightKg: latest.weightKg };
        change(s, owner, 'profile', 'singleton', s.profile);
    }
}
export async function saveWeightAndProfile(entry: {
    weightKg: number;
    date: string;
    note?: string;
}): Promise<void> {
    validateWeight(entry);
    return mutate((s, owner) => { const prior = s.weights.find(w => w.date === entry.date); const weight: WeightEntry = { ...entry, id: prior?.id ?? newId('weight'), timestamp: prior?.timestamp ?? new Date().toISOString(), weightLbs: Math.round(entry.weightKg * 2.20462 * 10) / 10 }; s.weights = [weight, ...s.weights.filter(w => w.date !== weight.date)].sort((a, b) => b.date.localeCompare(a.date)); change(s, owner, 'weight', weight.date, weight); updateProfileFromLatestWeight(s, owner); });
}
export async function deleteWeightAndUpdateProfile(id: string): Promise<void> { return mutate((s, owner) => { const found = s.weights.find(w => w.id === id); s.weights = s.weights.filter(w => w.id !== id); if (found)
    change(s, owner, 'weight', found.date, null, 'delete'); updateProfileFromLatestWeight(s, owner); }); }
export async function saveProfileAndTargets(profile: UserProfile, goals: MacroTargets): Promise<void> {
    validateProfile(profile);
    validateGoals(goals);
    return mutate((s, owner) => { const weightChanged = profile.weightKg !== s.profile.weightKg; s.profile = profile; s.goals = { ...goals, waterMl: goals.waterMl ?? 2000 }; s.onboardingDone = true; change(s, owner, 'profile', 'singleton', profile); change(s, owner, 'goals', 'singleton', s.goals); if (!s.weights.length || weightChanged) {
        const date = getTodayDateString(), prior = s.weights.find(w => w.date === date);
        const weight: WeightEntry = { id: prior?.id ?? newId('weight'), weightKg: profile.weightKg, weightLbs: Math.round(profile.weightKg * 2.20462 * 10) / 10, date, timestamp: prior?.timestamp ?? new Date().toISOString(), note: 'Profile weight' };
        s.weights = [weight, ...s.weights.filter(w => w.date !== date)].sort((a, b) => b.date.localeCompare(a.date));
        change(s, owner, 'weight', date, weight);
    } preferences(s, owner); });
}
