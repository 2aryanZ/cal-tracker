import 'react-native-url-polyfill/auto';
import { requireAuthCrypto } from './authCrypto';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { UserAccount, FoodEntry, WeightEntry, MacroTargets, UserProfile } from '@/types/nutrition';
import { getStorageScope, getPendingChanges, resolvePendingChange, acknowledgeChange, applyCloudSnapshot, type LocalSnapshot, type PendingChange, type SyncEntity } from './storage';
if (Platform.OS !== 'web' || typeof window !== 'undefined')
    WebBrowser.maybeCompleteAuthSession();
const serverRendering = Platform.OS === 'web' && typeof window === 'undefined';
const sessionStorage = serverRendering ? { getItem: async () => null, setItem: async () => { }, removeItem: async () => { } } : AsyncStorage;
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://vzsbjffwhjikeeanrzdb.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    'sb_publishable_qVR3e_UWc6uGpi_OCh0ozA_xbffe3JD';
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        storage: sessionStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === 'web' && !serverRendering,
        flowType: 'pkce',
    },
});
export async function getSupabaseUserId(): Promise<string | null> {
    const { data, error } = await supabase.auth.getSession();
    if (error)
        throw error;
    return data.session?.user.id ?? null;
}
async function accountClient() {
    const { data, error } = await supabase.auth.getSession();
    if (error)
        throw error;
    if (!data.session)
        return null;
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { headers: { Authorization: `Bearer ${data.session.access_token}` } } });
    return { owner: data.session.user.id, client };
}
export interface AuthResult {
    user: UserAccount | null;
    error?: string;
    confirmationRequired?: boolean;
}
export function accountFromAuthUser(user: {
    id: string;
    email?: string;
    created_at?: string;
    user_metadata?: Record<string, unknown>;
}): UserAccount {
    return {
        id: user.id,
        email: user.email ?? '',
        name: String(user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User'),
        isLoggedIn: true,
        tier: 'Free',
        memberSince: user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Today',
    };
}
function validateCredentials(email: string, password?: string): string | undefined {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
        return 'Enter a valid email address.';
    if (!password || password.length < 6)
        return 'Enter a password with at least 6 characters.';
}
export function authenticationErrorMessage(error: unknown, fallback: string): string {
    const message = error instanceof Error ? error.message :
        error && typeof error === 'object' && 'message' in error ? String(error.message) : '';
    if (/fetch failed|failed to fetch|network request failed|load failed|ENOTFOUND|ERR_NAME_NOT_RESOLVED/i.test(message))
        return 'Unable to reach the sign-in server. Check your internet connection. If other apps work, the Supabase project may be unavailable or its URL in .env may need updating.';
    return message || fallback;
}
export async function supabaseSignIn(email: string, password?: string, _fullName?: string): Promise<AuthResult> {
    const validation = validateCredentials(email, password);
    if (validation)
        return { user: null, error: validation };
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: password! });
        if (error)
            return { user: null, error: authenticationErrorMessage(error, 'Unable to sign in. Please try again.') };
        if (!data.session?.user)
            return { user: null, error: 'Sign in did not create an authenticated session.' };
        return { user: accountFromAuthUser(data.session.user) };
    }
    catch (error) {
        return { user: null, error: authenticationErrorMessage(error, 'Unable to sign in. Please try again.') };
    }
}
export async function supabaseSignUp(email: string, password?: string, fullName?: string): Promise<AuthResult> {
    const validation = validateCredentials(email, password);
    if (validation)
        return { user: null, error: validation };
    try {
        requireAuthCrypto();
        const { data, error } = await supabase.auth.signUp({
            email: email.trim().toLowerCase(), password: password!,
            options: { data: { full_name: fullName?.trim() || email.trim().split('@')[0] } },
        });
        if (error)
            return { user: null, error: authenticationErrorMessage(error, 'Unable to create account. Please try again.') };
        if (!data.session?.user)
            return { user: null, confirmationRequired: true };
        return { user: accountFromAuthUser(data.session.user) };
    }
    catch (error) {
        return { user: null, error: authenticationErrorMessage(error, 'Unable to create account. Please try again.') };
    }
}
async function signInWithProvider(provider: 'google' | 'apple'): Promise<AuthResult> {
    try {
        const redirectUrl = Platform.OS === 'web' ? window.location.origin : Linking.createURL('/');
        if (Platform.OS !== 'web' && /^exps?:\/\//i.test(redirectUrl))
            return { user: null, error: 'Google and Apple sign-in need a development or installed build of Cal Tracker. In Expo Go, use the Email & Password tab instead.' };
        requireAuthCrypto();
        const { data, error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: redirectUrl, skipBrowserRedirect: true } });
        if (error)
            throw error;
        if (!data.url)
            throw new Error('The provider did not return a sign-in URL.');
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        if (result.type !== 'success')
            return { user: null, error: 'cancelled' };
        const callback = new URL(result.url);
        const query = callback.searchParams;
        const hash = new URLSearchParams(callback.hash.slice(1));
        const failure = query.get('error_description') || hash.get('error_description') || query.get('error') || hash.get('error');
        if (failure)
            throw new Error(failure);
        const code = query.get('code');
        const access_token = hash.get('access_token');
        const refresh_token = hash.get('refresh_token');
        const sessionResult = code ? await supabase.auth.exchangeCodeForSession(code) : access_token && refresh_token ? await supabase.auth.setSession({ access_token, refresh_token }) : await supabase.auth.getSession();
        if (sessionResult.error)
            throw sessionResult.error;
        const user = sessionResult.data.session?.user;
        if (!user)
            throw new Error('Sign in did not create an authenticated session.');
        return { user: accountFromAuthUser(user) };
    }
    catch (error) {
        return { user: null, error: authenticationErrorMessage(error, `Unable to sign in with ${provider}.`) };
    }
}
export function supabaseSignInWithGoogle(): Promise<AuthResult> { return signInWithProvider('google'); }
export function supabaseSignInWithApple(): Promise<AuthResult> { return signInWithProvider('apple'); }
export async function supabaseSignOut(): Promise<void> {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error)
        throw error;
}
// Versioned cloud records coexist with the original tables during migration.
// Only the authenticated owner's pending changes are sent. No guest data is uploaded.
export async function supabaseFetchAllUserData() {
    const context = await accountClient();
    if (!context)
        return null;
    const { owner: userId, client } = context;
    const page = async (table: string, ownerColumn = 'user_id') => {
        const rows: Record<string, any>[] = [];
        for (let start = 0;; start += 500) {
            const { data, error } = await client.from(table).select('*').eq(ownerColumn, userId).order(table === 'tracker_records' ? 'entity' : table === 'water_logs' ? 'date_str' : table === 'macro_targets' ? 'user_id' : 'id').order(table === 'tracker_records' ? 'record_key' : table === 'water_logs' ? 'id' : table === 'macro_targets' ? 'user_id' : 'id').range(start, start + 499);
            if (error)
                throw new Error(`${table}: ${error.message}`);
            rows.push(...(data ?? []));
            if (!data || data.length < 500)
                return rows;
        }
    };
    const [foods, weights, water, targets, profiles, records] = await Promise.all([
        page('food_entries'), page('weight_logs'), page('water_logs'), page('macro_targets'), page('user_profiles', 'id'), page('tracker_records'),
    ]);
    const snapshot: Partial<LocalSnapshot> = {
        entries: foods.map(row => ({ id: row.id, name: row.name, mealType: row.meal_type, calories: Number(row.calories), protein: Number(row.protein), carbs: Number(row.carbs), fats: Number(row.fats), portionSize: row.portion_size, imageUri: /^https:\/\//.test(row.image_uri ?? '') ? row.image_uri : undefined, date: row.date_str, timestamp: row.created_at, isAiGenerated: false })),
        weights: weights.map(row => ({ id: row.id, weightKg: Number(row.weight), weightLbs: Math.round(Number(row.weight) * 2.20462 * 10) / 10, date: row.date_str, timestamp: row.created_at, note: row.note })),
        waterLogs: Object.fromEntries(water.map(row => [row.date_str, Number(row.water_ml)])),
    };
    if (targets[0])
        snapshot.goals = { calories: Number(targets[0].calories), protein: Number(targets[0].protein), carbs: Number(targets[0].carbs), fats: Number(targets[0].fats), waterMl: Number(targets[0].water_ml ?? 2000) };
    if (profiles[0]) {
        const p = profiles[0];
        snapshot.profile = { gender: p.gender, age: Number(p.age), heightCm: Number(p.height_cm), weightKg: Number(p.weight_kg), targetWeightKg: Number(p.target_weight_kg), dailySteps: Number(p.daily_steps ?? 8500), activityLevel: p.activity_level, goal: p.goal === 'maintain' ? 'maintenance' : p.goal, unitSystem: p.unit_system ?? 'metric' };
    }
    const versions: Record<string, number> = {};
    for (const record of records) {
        const entity = record.entity as SyncEntity, key = record.record_key;
        versions[`${entity}:${key}`] = record.version;
        if (entity === 'food') {
            snapshot.entries = snapshot.entries!.filter(e => e.id !== key);
            if (!record.deleted)
                snapshot.entries.push(record.payload as FoodEntry);
        }
        else if (entity === 'weight') {
            snapshot.weights = snapshot.weights!.filter(e => e.date !== key);
            if (!record.deleted)
                snapshot.weights.push(record.payload as WeightEntry);
        }
        else if (entity === 'water') {
            if (!record.deleted)
                snapshot.waterLogs![key] = record.payload.waterMl;
            else
                delete snapshot.waterLogs![key];
        }
        else if (entity === 'goals' && !record.deleted)
            snapshot.goals = record.payload as MacroTargets;
        else if (entity === 'profile' && !record.deleted)
            snapshot.profile = record.payload as UserProfile;
        else if (entity === 'preferences' && !record.deleted) {
            const p = record.payload;
            for (const field of ['favorites', 'preference', 'notifications', 'badges', 'onboardingDone', 'celebratedDates'] as const)
                if (p[field] !== undefined)
                    Object.assign(snapshot, { [field]: p[field] });
        }
    }
    snapshot.entries!.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    snapshot.weights!.sort((a, b) => b.date.localeCompare(a.date));
    await resolvePhotoPaths(snapshot, client);
    return { owner: userId, snapshot, versions };
}
let syncing: Promise<void> | null = null;
let syncingOwner: string | null = null;
export async function syncAccount(): Promise<void> {
    const requestedOwner = getStorageScope();
    if (syncing) {
        if (syncingOwner === requestedOwner)
            return syncing;
        await syncing.catch(() => { });
        return syncAccount();
    }
    syncingOwner = requestedOwner;
    syncing = (async () => {
        const owner = getStorageScope();
        if (owner === 'guest')
            return;
        if (await getSupabaseUserId() !== owner)
            throw new Error('The account session changed. Sign in again to sync.');
        const context = await accountClient();
        if (!context || context.owner !== owner)
            throw new Error('The account changed.');
        for (const change of await getPendingChanges()) {
            if (getStorageScope() !== owner || await getSupabaseUserId() !== owner)
                throw new Error('The account changed during sync. Pending changes were retained.');
            const payload = await prepareCloudPayload(change, owner, context.client);
            const { data, error } = await context.client.rpc('apply_tracker_change', { p_entity: change.entity, p_key: change.key, p_payload: payload, p_deleted: change.action === 'delete', p_expected_version: change.expectedVersion, p_change_id: change.id });
            if (error)
                throw new Error(error.message.includes('conflict') ? 'This record was changed on another device. Your local changes are kept; resolve the conflict before syncing.' : `Cloud sync failed: ${error.message}. Apply the database migration if this is a new setup.`);
            if (!Number.isSafeInteger(Number(data)) || Number(data) < 1)
                throw new Error('Cloud acknowledgement was invalid. Pending changes were retained.');
            await acknowledgeChange(owner, change.id, change.entity, change.key, Number(data));
        }
        const cloud = await supabaseFetchAllUserData();
        if (cloud)
            await applyCloudSnapshot(owner, cloud.snapshot, cloud.versions);
    })();
    try {
        await syncing;
    }
    finally {
        syncing = null;
        syncingOwner = null;
    }
}
async function prepareCloudPayload(change: PendingChange, owner: string, client: typeof supabase): Promise<unknown> {
    if (change.action === 'delete' || (change.entity !== 'food' && change.entity !== 'preferences'))
        return change.payload;
    // Device file URIs are kept locally. Uploaded photos use owner-protected storage.
    const upload = async (meal: FoodEntry | {
        imageUri?: string;
        id: string;
    }) => {
        if ((meal as {
            imagePath?: string;
        }).imagePath)
            return { ...meal, imageUri: undefined };
        if (!meal.imageUri || /^https:\/\//.test(meal.imageUri))
            return meal;
        const response = await fetch(meal.imageUri);
        if (!response.ok)
            throw new Error('Unable to read the meal photo. Choose the photo again before syncing.');
        const body = await response.arrayBuffer();
        const contentType = response.headers.get('content-type')?.split(';')[0] || 'image/jpeg';
        const path = `${owner}/${meal.id}/${change.id}`;
        const { error } = await client.storage.from('meal-photos').upload(path, body, { contentType, upsert: true });
        if (error)
            throw new Error(`Photo upload failed: ${error.message}`);
        return { ...meal, imageUri: undefined, imagePath: path };
    };
    if (change.entity === 'food')
        return upload(change.payload as FoodEntry);
    const preferences = change.payload as {
        favorites: ({
            id: string;
            imageUri?: string;
        })[];
    };
    return { ...preferences, favorites: await Promise.all(preferences.favorites.map(upload)) };
}
// Read-only signed URLs are refreshed on each pull; the database stores private paths.
export async function resolvePhotoPaths(snapshot: Partial<LocalSnapshot>, client: typeof supabase = supabase): Promise<Partial<LocalSnapshot>> {
    const resolve = async <T extends {
        imageUri?: string;
    }>(meal: T): Promise<T> => {
        const path = (meal as T & {
            imagePath?: string;
        }).imagePath;
        if (!path)
            return meal;
        const { data, error } = await client.storage.from('meal-photos').createSignedUrl(path, 60 * 60 * 24);
        if (error)
            throw error;
        return { ...meal, imageUri: data.signedUrl };
    };
    if (snapshot.entries)
        snapshot.entries = await Promise.all(snapshot.entries.map(resolve));
    if (snapshot.favorites)
        snapshot.favorites = await Promise.all(snapshot.favorites.map(resolve));
    return snapshot;
}
export async function reviewPendingChanges() {
    const owner = getStorageScope(), cloud = await supabaseFetchAllUserData();
    if (!cloud || cloud.owner !== owner)
        throw new Error('Sign in to review cloud changes.');
    const changes = await getPendingChanges();
    return changes.map(change => {
        const cloudVersion = cloud.versions[`${change.entity}:${change.key}`] ?? 0;
        const remote = change.entity === 'food' ? cloud.snapshot.entries?.find(e => e.id === change.key) : change.entity === 'weight' ? cloud.snapshot.weights?.find(w => w.date === change.key) : change.entity === 'water' ? { waterMl: cloud.snapshot.waterLogs?.[change.key] ?? 0 } : change.entity === 'goals' ? cloud.snapshot.goals : change.entity === 'profile' ? cloud.snapshot.profile : undefined;
        return { change, cloudVersion, remote, conflict: cloudVersion !== change.expectedVersion };
    });
}
export async function resolveCloudConflict(changeId: string, keepLocal: boolean): Promise<void> {
    const owner = getStorageScope(), cloud = await supabaseFetchAllUserData();
    if (!cloud || cloud.owner !== owner)
        throw new Error('The account changed. Review the conflict again.');
    const change = (await getPendingChanges()).find(c => c.id === changeId);
    if (!change)
        throw new Error('The pending change no longer exists.');
    await resolvePendingChange(changeId, cloud.versions[`${change.entity}:${change.key}`] ?? 0, keepLocal, owner);
    await applyCloudSnapshot(owner, cloud.snapshot, cloud.versions);
    if (keepLocal)
        await syncAccount();
}
