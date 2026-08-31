import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserAccount, FoodEntry, WeightEntry } from '@/types/nutrition';

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
 * Sign up a new user with email & password directly into Supabase auth.users
 */
export async function supabaseSignUp(email: string, password?: string, fullName?: string): Promise<{ user: UserAccount | null; error?: string }> {
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
export async function supabaseSignIn(email: string, password?: string): Promise<{ user: UserAccount | null; error?: string }> {
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
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;
    if (!userId) return;

    await supabase.from('food_entries').upsert({
      id: entry.id,
      user_id: userId,
      name: entry.name,
      meal_type: entry.mealType,
      calories: entry.calories,
      protein: entry.protein,
      carbs: entry.carbs,
      fats: entry.fats,
      portion_size: entry.portionSize,
      image_uri: entry.imageUri,
      date_str: entry.date,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Supabase sync food entry notice:', err);
  }
}

/**
 * Sync weight log to Supabase
 */
export async function supabaseSyncWeightLog(log: WeightEntry): Promise<void> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;
    if (!userId) return;

    await supabase.from('weight_logs').upsert({
      id: log.id,
      user_id: userId,
      weight: log.weightKg,
      date_str: log.date,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Supabase sync weight log notice:', err);
  }
}
