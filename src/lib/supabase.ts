import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kqbegxcepoyfdxolocea.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxYmVneGNlcG95ZmR4b2xvY2VhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0NzU4NTIsImV4cCI6MjEwMjA1MTg1Mn0.obyalkzjstnfBXT1ubUZwCsfasxH0pmtfXoMzqy4V20';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseKey);
  }
  return supabaseInstance;
}

// Export for backward compatibility
export const supabase = typeof window !== 'undefined' 
  ? createClient(supabaseUrl, supabaseKey)
  : createClient(supabaseUrl, supabaseKey);
