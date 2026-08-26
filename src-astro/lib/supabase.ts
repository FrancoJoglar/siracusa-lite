import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || 'https://kqbegxcepoyfdxolocea.supabase.co';
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxYmVneGNlcG95ZmR4b2xvY2VhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0NzU4NTIsImV4cCI6MjEwMjA1MTg1Mn0.obyalkzjstnfBXT1ubUZwCsfasxH0pmtfXoMzqy4V20';

export const supabase = createClient(supabaseUrl, supabaseKey);
