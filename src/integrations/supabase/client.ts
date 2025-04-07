
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Get Supabase URL and key from environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://qpswgrmvepttnfetpopk.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwc3dncm12ZXB0dG5mZXRwb3BrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQwNjIxNTEsImV4cCI6MjA1OTYzODE1MX0.cD1BEq4IFz_O8J26ELwsFxpcUGcv0fNuSvfJKx3Rw2Q";

// Create and export the Supabase client
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: false, // We're handling auth ourselves through Podio
    autoRefreshToken: false,
  }
});

// Export functions to help with Supabase edge functions
export const getSupabaseUrl = () => SUPABASE_URL;
