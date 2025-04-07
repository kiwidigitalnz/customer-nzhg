
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
    // Get Podio credentials from environment
    const clientId = Deno.env.get('PODIO_CLIENT_ID');
    const clientSecret = Deno.env.get('PODIO_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      console.error('Podio credentials not configured in environment variables');
      return new Response(
        JSON.stringify({ error: 'Podio credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const requestData = await req.json();
    const { app_id } = requestData;

    if (!app_id) {
      return new Response(
        JSON.stringify({ error: 'App ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Validating access to Podio app ID: ${app_id}`);

    // First, get an access token using client credentials
    const authResponse = await fetch('https://podio.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'grant_type': 'client_credentials',
        'client_id': clientId,
        'client_secret': clientSecret,
        'scope': 'global',
      }),
    });

    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      console.error(`Podio authentication failed with status ${authResponse.status}: ${errorText}`);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to authenticate with Podio API', 
          details: errorText 
        }),
        { status: authResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authData = await authResponse.json();
    const accessToken = authData.access_token;

    console.log('Successfully obtained access token for app validation');

    // Test access to the app by making a request to get app details
    const appResponse = await fetch(`https://api.podio.com/app/${app_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `OAuth2 ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    // Check if we have access to the app
    const hasAccess = appResponse.ok;
    let appDetails = null;
    
    if (hasAccess) {
      appDetails = await appResponse.json();
      console.log(`Successfully validated access to app: ${appDetails.name}`);
    } else {
      const errorText = await appResponse.text();
      console.error(`Failed to access app ${app_id}. Status: ${appResponse.status}, Error: ${errorText}`);
    }

    return new Response(
      JSON.stringify({ 
        hasAccess,
        appId: app_id,
        appDetails: hasAccess ? {
          name: appDetails.name,
          item_name: appDetails.item_name,
          app_id: appDetails.app_id,
        } : null,
        statusCode: appResponse.status
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error validating Podio app access:', error);
    
    return new Response(
      JSON.stringify({ error: 'Failed to validate app access', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
