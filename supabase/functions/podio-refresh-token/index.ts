
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Force redeploy 2025-07-09 to pick up updated environment variables

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
    // Get Podio credentials from environment
    const clientId = Deno.env.get('PODIO_CLIENT_ID');
    const clientSecret = Deno.env.get('PODIO_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({ error: 'Podio credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body to get refresh token
    const requestData = await req.json();
    const refreshToken = requestData.refresh_token;

    if (!refreshToken) {
      return new Response(
        JSON.stringify({ error: 'Refresh token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Podio API to refresh the token
    // As per Podio docs: https://developers.podio.com/authentication/server_side
    const podioResponse = await fetch('https://podio.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'grant_type': 'refresh_token',
        'client_id': clientId,
        'client_secret': clientSecret,
        'refresh_token': refreshToken,
      }),
    });

    // Forward the response from Podio
    const podioData = await podioResponse.json();
    
    // Add additional metadata to help with client-side token management
    const enhancedResponse = {
      ...podioData,
      received_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + (podioData.expires_in * 1000)).toISOString(),
    };

    return new Response(
      JSON.stringify(enhancedResponse),
      { 
        status: podioResponse.status, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error refreshing Podio token:', error);
    
    return new Response(
      JSON.stringify({ error: 'Failed to refresh token', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
