// Supabase client — DB + Storage only. Auth is handled entirely by Clerk.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

// Single shared Supabase client — always import from here, never create your own
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Disable Supabase Auth — we use Clerk instead
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
