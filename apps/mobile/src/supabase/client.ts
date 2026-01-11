/**
 * Supabase Client Configuration
 *
 * Provides a singleton Supabase client configured for React Native:
 * - Uses AsyncStorage for session persistence
 * - Auto-refreshes tokens
 * - Disables URL-based session detection (not applicable in mobile)
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null | undefined;

export function getSupabaseClient(): SupabaseClient | null {
  if (cached !== undefined) return cached;

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    cached = null;
    return cached;
  }

  cached = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });

  return cached;
}

/**
 * Clear the cached client (useful for testing)
 */
export function clearSupabaseClient(): void {
  cached = undefined;
}
