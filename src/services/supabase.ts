import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { UserAccount, FoodEntry, WeightEntry, MacroTargets, UserProfile } from '@/types/nutrition';

WebBrowser.maybeCompleteAuthSession();

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://vzsbjffwhjikeeanrzdb.supabase.co';

const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_qVR3e_UWc6uGpi_OCh0ozA_xbffe3JD';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/**
 * Get current active authenticated user ID if logged in
 */
export async function getSupabaseUserId(): Promise<string | null> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    return sessionData.session?.user?.id || null;
  } catch {
    return null;
  }
}

/**
 * Sign up a new user with email & password directly into Supabase auth.users
 */
export async function supabaseSignUp(
  email: string,
  password?: string,
  fullName?: string
): Promise<{ user: UserAccount | null; error?: string }> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password && password.length >= 6 ? password : 'CalTrackerPass2026!';

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: cleanPass,
      options: {
        data: {
          full_name: fullName || cleanEmail.split('@')[0],
        },
      },
    });

    if (error) {
      // If user already registered, automatically sign in with password
      if (error.message.toLowerCase().includes('already registered')) {
        return supabaseSignIn(cleanEmail, cleanPass);
      }
      return { user: null, error: error.message };
    }

    if (data.user) {
      const account: UserAccount = {
        id: data.user.id,
        email: data.user.email || cleanEmail,
        name: fullName || cleanEmail.split('@')[0],
        isLoggedIn: true,
        tier: 'Pro',
        memberSince: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      };

      // Create initial profile in public.user_profiles
      try {
        await supabase.from('user_profiles').upsert({
          id: data.user.id,
          email: cleanEmail,
          full_name: account.name,
          updated_at: new Date().toISOString(),
        });
      } catch (profileErr) {
        console.warn('Profile upsert notice:', profileErr);
      }

      return { user: account };
    }

    return { user: null, error: 'Registration incomplete' };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown auth error';
    return { user: null, error: errorMsg };
  }
}

/**
 * Sign in existing user with email & password
 */
export async function supabaseSignIn(
  email: string,
  password?: string
): Promise<{ user: UserAccount | null; error?: string }> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password && password.length >= 6 ? password : 'CalTrackerPass2026!';

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: cleanPass,
    });

    if (error) {
      return { user: null, error: error.message };
    }

    if (data.user) {
      const account: UserAccount = {
        id: data.user.id,
        email: data.user.email || cleanEmail,
        name: data.user.user_metadata?.full_name || cleanEmail.split('@')[0],
        isLoggedIn: true,
        tier: 'Pro',
        memberSince: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      };
      return { user: account };
    }

    return { user: null, error: 'Sign in failed' };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown auth error';
    return { user: null, error: errorMsg };
  }
}

/**
 * Sign in with Google OAuth via Supabase + Expo WebBrowser
 */
export async function supabaseSignInWithGoogle(): Promise<{ user: UserAccount | null; error?: string }> {
  try {
    const redirectUrl = Platform.OS === 'web' ? (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8081') : Linking.createURL('/');

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      return { user: null, error: error.message };
    }

    if (data?.url) {
      const res = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

      if (res.type === 'success' && res.url) {
        const url = res.url;
        const hash = url.includes('#') ? url.split('#')[1] : url.includes('?') ? url.split('?')[1] : '';
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          const { data: sessionData, error: sessionErr } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionErr) {
            return { user: null, error: sessionErr.message };
          }

          if (sessionData.user) {
            const account: UserAccount = {
              id: sessionData.user.id,
              email: sessionData.user.email || '',
              name:
                sessionData.user.user_metadata?.full_name ||
                sessionData.user.user_metadata?.name ||
                sessionData.user.email?.split('@')[0] ||
                'User',
              isLoggedIn: true,
              tier: 'Pro',
              memberSince: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            };
            return { user: account };
          }
        }
      } else if (res.type === 'cancel' || res.type === 'dismiss') {
        return { user: null, error: 'cancelled' };
      }
    }

    return { user: null, error: 'Could not open Google authentication page.' };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Google OAuth error';
    return { user: null, error: errorMsg };
  }
}

/**
 * Sign in with Apple OAuth via Supabase + Expo WebBrowser
 */
export async function supabaseSignInWithApple(): Promise<{ user: UserAccount | null; error?: string }> {
  try {
    const redirectUrl = Linking.createURL('/');

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      return { user: null, error: error.message };
    }

    if (data?.url) {
      const res = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

      if (res.type === 'success' && res.url) {
        const url = res.url;
        const hash = url.includes('#') ? url.split('#')[1] : url.includes('?') ? url.split('?')[1] : '';
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          const { data: sessionData, error: sessionErr } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionErr) {
            return { user: null, error: sessionErr.message };
          }

          if (sessionData.user) {
            const account: UserAccount = {
              id: sessionData.user.id,
              email: sessionData.user.email || '',
              name:
                sessionData.user.user_metadata?.full_name ||
                sessionData.user.user_metadata?.name ||
                sessionData.user.email?.split('@')[0] ||
                'User',
              isLoggedIn: true,
              tier: 'Pro',
              memberSince: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            };
            return { user: account };
          }
        }
      } else if (res.type === 'cancel' || res.type === 'dismiss') {
        return { user: null, error: 'cancelled' };
      }
    }

    return { user: null, error: 'Could not open Apple authentication page.' };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Apple OAuth error';
    return { user: null, error: errorMsg };
  }
}

/**
 * Sign out user from Supabase session
 */
export async function supabaseSignOut(): Promise<void> {
  try {
    await supabase.auth.signOut();

  } catch (err) {
    console.warn('Supabase sign out notice:', err);
  }
}

/**
 * Sync food entry to Supabase
 */
export async function supabaseSyncFoodEntry(entry: FoodEntry): Promise<void> {
  try {
    const userId = await getSupabaseUserId();
    if (!userId) return;

    await supabase.from('food_entries').upsert({
      id: entry.id,
      user_id: userId,
      name: entry.name,
      meal_type: entry.mealType,
      calories: Math.round(entry.calories),
      protein: Math.round(entry.protein * 10) / 10,
      carbs: Math.round(entry.carbs * 10) / 10,
      fats: Math.round(entry.fats * 10) / 10,
      portion_size: entry.portionSize || '1 serving',
      image_uri: entry.imageUri || null,
      date_str: entry.date,
      created_at: entry.timestamp || new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Supabase sync food entry notice:', err);
  }
}

/**
 * Delete food entry from Supabase
 */
export async function supabaseDeleteFoodEntry(entryId: string): Promise<void> {
  try {
    const userId = await getSupabaseUserId();
    if (!userId) return;

    await supabase.from('food_entries').delete().eq('id', entryId).eq('user_id', userId);
  } catch (err) {
    console.warn('Supabase delete food entry notice:', err);
  }
}

/**
 * Sync weight log to Supabase
 */
export async function supabaseSyncWeightLog(log: WeightEntry): Promise<void> {
  try {
    const userId = await getSupabaseUserId();
    if (!userId) return;

    await supabase.from('weight_logs').upsert({
      id: log.id,
      user_id: userId,
      weight: log.weightKg,
      date_str: log.date,
      created_at: log.timestamp || new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Supabase sync weight log notice:', err);
  }
}

/**
 * Delete weight log from Supabase
 */
export async function supabaseDeleteWeightLog(logId: string): Promise<void> {
  try {
    const userId = await getSupabaseUserId();
    if (!userId) return;

    await supabase.from('weight_logs').delete().eq('id', logId).eq('user_id', userId);
  } catch (err) {
    console.warn('Supabase delete weight log notice:', err);
  }
}

/**
 * Sync daily water log to Supabase
 */
export async function supabaseSyncWaterLog(dateStr: string, waterMl: number): Promise<void> {
  try {
    const userId = await getSupabaseUserId();
    if (!userId) return;

    await supabase.from('water_logs').upsert(
      {
        user_id: userId,
        date_str: dateStr,
        water_ml: Math.max(0, Math.round(waterMl)),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,date_str' }
    );
  } catch (err) {
    console.warn('Supabase sync water log notice:', err);
  }
}

/**
 * Sync Macro Targets to Supabase
 */
export async function supabaseSyncMacroTargets(goals: MacroTargets): Promise<void> {
  try {
    const userId = await getSupabaseUserId();
    if (!userId) return;

    await supabase.from('macro_targets').upsert({
      user_id: userId,
      calories: Math.round(goals.calories),
      protein: Math.round(goals.protein),
      carbs: Math.round(goals.carbs),
      fats: Math.round(goals.fats),
      water_ml: Math.round(goals.waterMl || 2000),
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Supabase sync macro targets notice:', err);
  }
}

/**
 * Sync User Profile to Supabase
 */
export async function supabaseSyncUserProfile(profile: UserProfile): Promise<void> {
  try {
    const userId = await getSupabaseUserId();
    if (!userId) return;

    await supabase.from('user_profiles').upsert({
      id: userId,
      age: profile.age,
      gender: profile.gender,
      height_cm: profile.heightCm,
      weight_kg: profile.weightKg,
      activity_level: profile.activityLevel,
      goal: profile.goal,
      target_weight_kg: profile.targetWeightKg,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Supabase sync user profile notice:', err);
  }
}

export interface CloudUserData {
  foodEntries: FoodEntry[];
  weightLogs: WeightEntry[];
  waterLogs: Record<string, number>;
  goals?: MacroTargets;
  profile?: UserProfile;
}

/**
 * Fetch all cloud records for the current user for seamless multi-device synchronization
 */
export async function supabaseFetchAllUserData(): Promise<CloudUserData | null> {
  try {
    const userId = await getSupabaseUserId();
    if (!userId) return null;

    const [entriesRes, weightsRes, waterRes, goalsRes, profileRes] = await Promise.all([
      supabase.from('food_entries').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('weight_logs').select('*').eq('user_id', userId).order('date_str', { ascending: false }),
      supabase.from('water_logs').select('*').eq('user_id', userId),
      supabase.from('macro_targets').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('user_profiles').select('*').eq('id', userId).maybeSingle(),
    ]);

    const foodEntries: FoodEntry[] = (entriesRes.data || []).map((row) => ({
      id: row.id,
      name: row.name,
      mealType: row.meal_type,
      calories: Number(row.calories) || 0,
      protein: Number(row.protein) || 0,
      carbs: Number(row.carbs) || 0,
      fats: Number(row.fats) || 0,
      portionSize: row.portion_size || '1 serving',
      imageUri: row.image_uri || undefined,
      date: row.date_str,
      timestamp: row.created_at,
      confidence: 0.95,
      isAiGenerated: false,
    }));

    const weightLogs: WeightEntry[] = (weightsRes.data || []).map((row) => ({
      id: row.id,
      weightKg: Number(row.weight) || 70,
      weightLbs: Math.round((Number(row.weight) || 70) * 2.20462),
      date: row.date_str,
      timestamp: row.created_at,
    }));

    const waterLogs: Record<string, number> = {};
    (waterRes.data || []).forEach((row) => {
      if (row.date_str) {
        waterLogs[row.date_str] = Number(row.water_ml) || 0;
      }
    });

    let goals: MacroTargets | undefined;
    if (goalsRes.data) {
      goals = {
        calories: Number(goalsRes.data.calories) || 2200,
        protein: Number(goalsRes.data.protein) || 150,
        carbs: Number(goalsRes.data.carbs) || 220,
        fats: Number(goalsRes.data.fats) || 65,
        waterMl: Number(goalsRes.data.water_ml) || 2000,
      };
    }

    let profile: UserProfile | undefined;
    if (profileRes.data) {
      profile = {
        gender: profileRes.data.gender || 'male',
        age: Number(profileRes.data.age) || 26,
        heightCm: Number(profileRes.data.height_cm) || 178,
        weightKg: Number(profileRes.data.weight_kg) || 78,
        targetWeightKg: Number(profileRes.data.target_weight_kg) || 74,
        dailySteps: 8500,
        activityLevel: profileRes.data.activity_level || 'moderate',
        goal: profileRes.data.goal || 'fat_loss',
        unitSystem: 'metric',
      };
    }

    return {
      foodEntries,
      weightLogs,
      waterLogs,
      goals,
      profile,
    };
  } catch (err) {
    console.warn('Supabase fetch all data notice:', err);
    return null;
  }
}

/**
 * Upload all current local records to Supabase when signing up or logging in from guest mode
 */
export async function supabasePushLocalData(data: {
  entries: FoodEntry[];
  weights: WeightEntry[];
  waterLogs: Record<string, number>;
  goals: MacroTargets;
  profile: UserProfile;
}): Promise<void> {
  try {
    const userId = await getSupabaseUserId();
    if (!userId) return;

    // Push goals & profile
    await Promise.all([
      supabaseSyncMacroTargets(data.goals),
      supabaseSyncUserProfile(data.profile),
    ]);

    // Push water logs
    const waterEntries = Object.entries(data.waterLogs);
    for (const [dateStr, waterMl] of waterEntries) {
      await supabaseSyncWaterLog(dateStr, waterMl);
    }

    // Push food entries (limit to 50 most recent to be network efficient)
    const recentEntries = data.entries.slice(0, 50);
    for (const entry of recentEntries) {
      await supabaseSyncFoodEntry(entry);
    }

    // Push weight logs
    for (const weight of data.weights) {
      await supabaseSyncWeightLog(weight);
    }
  } catch (err) {
    console.warn('Supabase push local data notice:', err);
  }
}

