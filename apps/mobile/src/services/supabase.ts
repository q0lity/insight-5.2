// Supabase client configuration
// TODO: Install @supabase/supabase-js and configure

import {SUPABASE_URL, SUPABASE_ANON_KEY} from '../utils/config';

// Placeholder for Supabase client
// import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = SUPABASE_URL;
export const supabaseAnonKey = SUPABASE_ANON_KEY;

// export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
//   auth: {
//     storage: AsyncStorage,
//     autoRefreshToken: true,
//     persistSession: true,
//     detectSessionInUrl: false,
//   },
// });

export const initSupabase = () => {
  console.log('Supabase client initialized');
};
