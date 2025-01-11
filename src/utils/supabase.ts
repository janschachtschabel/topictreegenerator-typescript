import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

const supabaseConfig = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'supabase-auth',
    storage: window.localStorage
  },
  global: {
    fetch: async (url: string, options: RequestInit) => {
      let lastError;
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          const response = await window.fetch(url, options);
          
          // Handle auth-specific errors
          if (url.includes('/auth/v1/token')) {
            const data = await response.clone().json();
            if (!response.ok) {
              if (response.status === 400 && data.error_description?.includes('invalid')) {
                throw new Error('Ungültige Anmeldedaten. Bitte überprüfen Sie Ihre E-Mail und Ihr Passwort.');
              }
              throw new Error(data.error_description || 'Anmeldefehler');
            }
          }
          
          return response;
        } catch (error) {
          lastError = error;
          if (attempt < MAX_RETRIES - 1) {
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (attempt + 1)));
            continue;
          }
          throw error;
        }
      }
    }
  }
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, supabaseConfig);