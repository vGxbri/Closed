/**
 * Cliente Supabase
 * Instancia única con sesión persistente para la app móvil Closed (TFG).
 */

import { createClient, SupabaseClientOptions } from '@supabase/supabase-js';
import { Platform } from 'react-native';

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

const memoryStorage: Record<string, string> = {};

let asyncStorageInstance: any = null;

const getAsyncStorage = () => {
  if (asyncStorageInstance === null && Platform.OS !== 'web') {
    try {
      asyncStorageInstance = require('@react-native-async-storage/async-storage').default;
    } catch {
      asyncStorageInstance = false;
    }
  }
  return asyncStorageInstance;
};

const createUniversalStorage = () => {
  return {
    getItem: async (key: string): Promise<string | null> => {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      
      const asyncStorage = getAsyncStorage();
      if (asyncStorage) {
        return await asyncStorage.getItem(key);
      }
      
      return memoryStorage[key] || null;
    },
    
    setItem: async (key: string, value: string): Promise<void> => {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
      
      const asyncStorage = getAsyncStorage();
      if (asyncStorage) {
        await asyncStorage.setItem(key, value);
        return;
      }
      
      memoryStorage[key] = value;
    },
    
    removeItem: async (key: string): Promise<void> => {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
        return;
      }
      
      const asyncStorage = getAsyncStorage();
      if (asyncStorage) {
        await asyncStorage.removeItem(key);
        return;
      }
      
      delete memoryStorage[key];
    },
  };
};

const supabaseOptions: SupabaseClientOptions<'public'> = {
  auth: {
    storage: createUniversalStorage(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, supabaseOptions);

export type SupabaseClient = typeof supabase;
