import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';

// Safely import SecureStore - it will fail in Node.js/SSR
let SecureStore: typeof import('expo-secure-store') | null = null;
try {
  SecureStore = require('expo-secure-store');
} catch {
  // SecureStore not available (Node.js SSR environment)
}

const isWeb = Platform.OS === 'web';

const ExpoSecureStoreAdapter = {
  getItem: (key: string): Promise<string | null> => {
    if (isWeb) {
      try {
        if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
          return Promise.resolve(localStorage.getItem(key));
        }
      } catch {
        // SSR or restricted environment
      }
      return Promise.resolve(null);
    }
    if (SecureStore) {
      return SecureStore.getItemAsync(key);
    }
    return Promise.resolve(null);
  },
  setItem: (key: string, value: string): Promise<void> => {
    if (isWeb) {
      try {
        if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
          localStorage.setItem(key, value);
        }
      } catch {
        // SSR or restricted environment
      }
      return Promise.resolve();
    }
    if (SecureStore) {
      return SecureStore.setItemAsync(key, value) as Promise<void>;
    }
    return Promise.resolve();
  },
  removeItem: (key: string): Promise<void> => {
    if (isWeb) {
      try {
        if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
          localStorage.removeItem(key);
        }
      } catch {
        // SSR or restricted environment
      }
      return Promise.resolve();
    }
    if (SecureStore) {
      return SecureStore.deleteItemAsync(key) as Promise<void>;
    }
    return Promise.resolve();
  },
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing. Check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
