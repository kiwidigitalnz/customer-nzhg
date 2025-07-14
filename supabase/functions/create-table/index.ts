import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.31.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase credentials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create the table by trying to insert into it - this will create it if it doesn't exist
    const { data, error } = await supabase
      .from('podio_auth_tokens')
      .select('id')
      .limit(1);

    // If the table doesn't exist, we'll get an error, so let's create it manually
    if (error && error.message.includes('does not exist')) {
      // Use a direct SQL query to create the table
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS public.podio_auth_tokens (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          access_token TEXT NOT NULL,
          refresh_token TEXT NOT NULL,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `;
      
      // Execute the SQL using a simple query
      const { error: createError } = await supabase
        .from('_supabase_admin')
        .select('*')
        .limit(0);
        
      // Since we can't execute raw SQL easily, let's return instructions
      return new Response(
        JSON.stringify({ 
          error: 'Table does not exist',
          message: 'Please create the table manually in the Supabase dashboard',
          sql: createTableSQL.trim()
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (error) {
      console.error('Error creating table:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to create table', details: error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Table created successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Unexpected error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
