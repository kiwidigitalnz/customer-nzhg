
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://qpswgrmvepttnfetpopk.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwc3dncm12ZXB0dG5mZXRwb3BrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQwNjIxNTEsImV4cCI6MjA1OTYzODE1MX0.cD1BEq4IFz_O8J26ELwsFxpcUGcv0fNuSvfJKx3Rw2Q";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
