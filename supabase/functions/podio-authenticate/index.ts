
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get Podio credentials from Supabase environment
    const clientId = Deno.env.get('PODIO_CLIENT_ID');
    const clientSecret = Deno.env.get('PODIO_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      console.error('Podio credentials not configured in environment variables');
      return new Response(
        JSON.stringify({ error: 'Podio credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body to get any additional parameters (scope, etc.)
    const requestData = await req.json().catch(() => ({}));
    const scope = requestData.scope || 'global';

    console.log(`Authenticating with Podio using client credentials. Scope: ${scope}`);

    // Call Podio API to authenticate with client credentials
    // As per Podio docs: https://developers.podio.com/authentication/server_side
    const podioResponse = await fetch('https://podio.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'grant_type': 'client_credentials',
        'client_id': clientId,
        'client_secret': clientSecret,
        'scope': scope, // Added scope parameter as per Podio docs
      }),
    });

    if (!podioResponse.ok) {
      const errorText = await podioResponse.text();
      console.error(`Podio authentication failed with status ${podioResponse.status}: ${errorText}`);
      return new Response(
        JSON.stringify({ 
          error: `Podio authentication failed with status ${podioResponse.status}`, 
          details: errorText 
        }),
        { status: podioResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the response from Podio
    const podioData = await podioResponse.json();
    console.log('Successfully authenticated with Podio');

    // Add additional metadata to help with client-side token management
    const enhancedResponse = {
      ...podioData,
      received_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + (podioData.expires_in * 1000)).toISOString(),
    };

    return new Response(
      JSON.stringify(enhancedResponse),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error authenticating with Podio:', error);
    
    return new Response(
      JSON.stringify({ error: 'Failed to authenticate with Podio', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
