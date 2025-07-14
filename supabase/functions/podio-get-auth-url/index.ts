
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get Podio credentials from environment variables
    const clientId = Deno.env.get('PODIO_CLIENT_ID');
    
    if (!clientId) {
      console.error('Podio client ID not configured');
      return new Response(
        JSON.stringify({ error: 'Podio client ID not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate a random state for CSRF protection
    const state = Math.random().toString(36).substring(2, 15) + 
                  Math.random().toString(36).substring(2, 15);
    
    // Use the registered domain with specific callback route for Podio OAuth
    const redirectUri = 'https://customer.nzhg.com/podio-callback';
    
    // Build the Podio authorization URL
    const authUrl = `https://podio.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
    
    // Return the auth URL to the client
    return new Response(
      JSON.stringify({ 
        authUrl: authUrl,
        state: state
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating auth URL:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
