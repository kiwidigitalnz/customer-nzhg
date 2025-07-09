
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
    // Basic health check response
    const responseData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: Deno.env.get('ENVIRONMENT') || 'production',
    };

    // For security, only check secrets when explicitly requested
    // and only for admin-type operations
    if (req.method === 'POST') {
      try {
        const requestData = await req.json();
        
        // Only provide secret check info when explicitly requested
        // and when proper auth is provided
        if (requestData.check_secrets) {
          const authHeader = req.headers.get('Authorization');
          
          // This should be a more robust check in production
          if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new Error('Unauthorized');
          }
          
          // Sanitized secrets info - only shows if they exist, not their values
          responseData.secrets = {
            podio_client_id: Boolean(Deno.env.get('PODIO_CLIENT_ID')),
            podio_client_secret: Boolean(Deno.env.get('PODIO_CLIENT_SECRET')),
            podio_contacts_app_id: Boolean(Deno.env.get('PODIO_CONTACTS_APP_ID')),
            podio_packing_spec_app_id: Boolean(Deno.env.get('PODIO_PACKING_SPEC_APP_ID')),
            podio_contacts_app_token: Boolean(Deno.env.get('PODIO_CONTACTS_APP_TOKEN')),
            podio_packing_spec_app_token: Boolean(Deno.env.get('PODIO_PACKING_SPEC_APP_TOKEN')),
          };
        }
      } catch (error) {
        // Simply ignore invalid JSON or unauthorized requests
        // but don't expose any error details
      }
    }

    return new Response(
      JSON.stringify(responseData),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    // Generic error without exposing details
    return new Response(
      JSON.stringify({ status: 'error', message: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
