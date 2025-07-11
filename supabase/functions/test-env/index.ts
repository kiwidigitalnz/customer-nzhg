import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const envCheck = {
      PODIO_CLIENT_ID: Deno.env.get('PODIO_CLIENT_ID') ? 'Present' : 'Missing',
      PODIO_CLIENT_SECRET: Deno.env.get('PODIO_CLIENT_SECRET') ? 'Present' : 'Missing',
      SUPABASE_URL: Deno.env.get('SUPABASE_URL') ? 'Present' : 'Missing',
      SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ? 'Present' : 'Missing',
    };

    console.log('Environment variables check:', envCheck);

    return new Response(
      JSON.stringify(envCheck),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
