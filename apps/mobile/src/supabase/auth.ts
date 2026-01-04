import AsyncStorage from '@react-native-async-storage/async-storage';

import { getSupabaseClient } from './client';

const SUPABASE_STORAGE_KEY_FRAGMENTS = ['supabase', 'sb-', 'auth-token'];

export async function clearSupabaseLocalSession(reason?: string) {
  if (reason) {
    console.log(`[Auth] Clearing Supabase session (${reason})`);
  } else {
    console.log('[Auth] Clearing Supabase session');
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.auth.signOut({ scope: 'local' });
      console.log('[Auth] Supabase signOut complete');
    } catch (err) {
      console.error('[Auth] Supabase signOut error:', err);
    }
  }

  try {
    const keys = await AsyncStorage.getAllKeys();
    console.log('[Auth] All AsyncStorage keys:', keys);
    const supabaseKeys = keys.filter(key =>
      SUPABASE_STORAGE_KEY_FRAGMENTS.some(fragment => key.includes(fragment))
    );
    if (supabaseKeys.length > 0) {
      console.log('[Auth] Clearing cached auth keys:', supabaseKeys);
      await AsyncStorage.multiRemove(supabaseKeys);
    }
  } catch (err) {
    console.warn('[Auth] Failed to clear AsyncStorage:', err);
  }
}
