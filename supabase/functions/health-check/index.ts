
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Force redeploy 2025-07-09-14:23:01 to pick up updated PODIO_CLIENT_SECRET

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('=== HEALTH CHECK FUNCTION CALLED ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    
    // Check environment variables
    const envChecks = {
      SUPABASE_URL: !!Deno.env.get('SUPABASE_URL'),
      SUPABASE_SERVICE_ROLE_KEY: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      PODIO_CLIENT_ID: !!Deno.env.get('PODIO_CLIENT_ID'),
      PODIO_CLIENT_SECRET: !!Deno.env.get('PODIO_CLIENT_SECRET'),
    };
    
    console.log('Environment variables check:', envChecks);
    
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: envChecks,
      deno: {
        version: Deno.version.deno,
        runtime: 'deno'
      },
      functionCheck: 'Health check function is deployed and accessible'
    };
    
    console.log('Health check complete, returning data:', healthData);
    
    return new Response(
      JSON.stringify(healthData),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Health check error:', error);
    
    return new Response(
      JSON.stringify({ 
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
