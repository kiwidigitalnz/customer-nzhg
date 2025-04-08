
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
    console.log('Podio authenticate function called');
    
    // Get environment variables for diagnostics
    const envObj = Deno.env.toObject();
    const envKeys = Object.keys(envObj);
    const podioKeys = envKeys.filter(key => key.toLowerCase().includes('podio'));
    
    console.log(`Found ${podioKeys.length} Podio-related keys:`, podioKeys);
    
    // Check if we can find the client ID and secret (case insensitive)
    let clientId = Deno.env.get('PODIO_CLIENT_ID');
    let clientSecret = Deno.env.get('PODIO_CLIENT_SECRET');
    
    // If not found by exact match, try to find it case-insensitively
    if (!clientId || !clientSecret) {
      Object.keys(envObj).forEach(key => {
        if (key.toLowerCase() === 'podio_client_id'.toLowerCase() && !clientId) {
          clientId = envObj[key];
          console.log(`Found client ID with case-insensitive match: ${key}`);
        }
        if (key.toLowerCase() === 'podio_client_secret'.toLowerCase() && !clientSecret) {
          clientSecret = envObj[key];
          console.log(`Found client secret with case-insensitive match: ${key}`);
        }
      });
    }

    if (!clientId || !clientSecret) {
      console.error('Podio credentials not configured in environment variables');
      console.log('Available Podio keys:', podioKeys);
      console.log('PODIO_CLIENT_ID found:', Boolean(clientId));
      console.log('PODIO_CLIENT_SECRET found:', Boolean(clientSecret));
      
      return new Response(
        JSON.stringify({ 
          error: 'Podio credentials not configured', 
          available_keys: podioKeys,
          all_keys_count: envKeys.length,
          expected_keys: ['PODIO_CLIENT_ID', 'PODIO_CLIENT_SECRET']
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log credential lengths for debugging
    console.log(`Client ID length: ${clientId.length}`);
    console.log(`Client Secret length: ${clientSecret.length}`);

    // Parse request body to get any additional parameters (but not using scope anymore)
    const requestData = await req.json().catch(() => ({}));
    
    console.log('Authenticating with Podio using client credentials');

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
        // Removed scope parameter as it's not supported by Podio
      }),
    });

    if (!podioResponse.ok) {
      let errorText = '';
      try {
        errorText = await podioResponse.text();
      } catch (e) {
        errorText = 'Could not read error response';
      }
      
      console.error(`Podio authentication failed with status ${podioResponse.status}: ${errorText}`);
      return new Response(
        JSON.stringify({ 
          error: `Podio authentication failed with status ${podioResponse.status}`, 
          details: errorText,
          client_id_length: clientId ? clientId.length : 0,
          client_secret_length: clientSecret ? clientSecret.length : 0
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
      JSON.stringify({ 
        error: 'Failed to authenticate with Podio', 
        details: error.message,
        stack: error.stack
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
