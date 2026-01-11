// App configuration
// These values should be set via environment variables or .env file

export const SUPABASE_URL = process.env.SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

export const APP_CONFIG = {
  appName: 'Insight',
  version: '0.0.1',
  environment: __DEV__ ? 'development' : 'production',
} as const;
