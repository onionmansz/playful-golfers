import { createClient } from '@supabase/supabase-js';

// These values are provided by the Supabase integration
const supabaseUrl = 'https://your-project.supabase.co';
const supabaseAnonKey = 'your-anon-key';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase URL or Anonymous Key. Please check your Supabase connection.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);