import { createClient, SupabaseClientOptions } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// ⚠️ IMPORTANT: Replace these with your actual Supabase project credentials
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

// Validate configuration
if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
  console.warn(
    '⚠️ Supabase credentials not configured!\n' +
    'Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY\n' +
    'in your .env file or directly in lib/supabase.ts'
  );
}

// Simple memory storage as fallback
const memoryStorage: Record<string, string> = {};

// Lazy-loaded AsyncStorage for native platforms
let asyncStorageInstance: any = null;

const getAsyncStorage = () => {
  if (asyncStorageInstance === null && Platform.OS !== 'web') {
    try {
      asyncStorageInstance = require('@react-native-async-storage/async-storage').default;
    } catch {
      asyncStorageInstance = false; // Mark as unavailable
    }
  }
  return asyncStorageInstance;
};

// Create a universal storage adapter
const createUniversalStorage = () => {
  return {
    getItem: async (key: string): Promise<string | null> => {
      // Web browser
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      
      // React Native
      const asyncStorage = getAsyncStorage();
      if (asyncStorage) {
        return await asyncStorage.getItem(key);
      }
      
      // Fallback to memory (SSR or unavailable)
      return memoryStorage[key] || null;
    },
    
    setItem: async (key: string, value: string): Promise<void> => {
      // Web browser
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
      
      // React Native
      const asyncStorage = getAsyncStorage();
      if (asyncStorage) {
        await asyncStorage.setItem(key, value);
        return;
      }
      
      // Fallback to memory
      memoryStorage[key] = value;
    },
    
    removeItem: async (key: string): Promise<void> => {
      // Web browser
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
        return;
      }
      
      // React Native
      const asyncStorage = getAsyncStorage();
      if (asyncStorage) {
        await asyncStorage.removeItem(key);
        return;
      }
      
      // Fallback to memory
      delete memoryStorage[key];
    },
  };
};

// Supabase client options
const supabaseOptions: SupabaseClientOptions<'public'> = {
  auth: {
    storage: createUniversalStorage(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
};

// Create Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, supabaseOptions);

// Export typed helpers
export type SupabaseClient = typeof supabase;
