
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

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
    // If it's a POST request, assume we're doing more than a basic health check
    if (req.method === 'POST') {
      const requestData = await req.json().catch(() => ({}));
      
      // Check Podio environment variables if requested
      if (requestData.check_secrets) {
        const secretsCheck = {
          PODIO_CLIENT_ID: Boolean(Deno.env.get('PODIO_CLIENT_ID')),
          PODIO_CLIENT_SECRET: Boolean(Deno.env.get('PODIO_CLIENT_SECRET')),
          PODIO_CONTACTS_APP_ID: Boolean(Deno.env.get('PODIO_CONTACTS_APP_ID')),
          PODIO_PACKING_SPEC_APP_ID: Boolean(Deno.env.get('PODIO_PACKING_SPEC_APP_ID')),
          PODIO_CONTACTS_APP_TOKEN: Boolean(Deno.env.get('PODIO_CONTACTS_APP_TOKEN')),
          PODIO_PACKING_SPEC_APP_TOKEN: Boolean(Deno.env.get('PODIO_PACKING_SPEC_APP_TOKEN')),
        };
        
        return new Response(
          JSON.stringify({
            status: 'ok',
            timestamp: new Date().toISOString(),
            environment: Deno.env.get('ENVIRONMENT') || 'development',
            secrets: secretsCheck
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // Default health check response
    return new Response(
      JSON.stringify({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: Deno.env.get('ENVIRONMENT') || 'development'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
