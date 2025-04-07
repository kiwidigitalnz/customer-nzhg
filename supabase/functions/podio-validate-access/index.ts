
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

    // Log complete environment keys to better understand what's available
    console.log('All environment variables:');
    const envObj = Deno.env.toObject();
    const envKeys = Object.keys(envObj).sort();
    console.log('Available environment keys:', envKeys);

    // Specifically check for Podio-related keys
    const podioKeys = envKeys.filter(key => key.includes('PODIO'));
    console.log('Found Podio-related keys:', podioKeys);
    
    // Log full environment details for testing
    podioKeys.forEach(key => {
      const value = Deno.env.get(key);
      console.log(`Key: ${key}, Value: ${value ? 'present (length: ' + value.length + ')' : 'null or empty'}`);
    });

    if (!clientId || !clientSecret) {
      console.error('Podio credentials not configured in environment variables');
      console.log('Environment variable details:');
      console.log('PODIO_CLIENT_ID present:', Boolean(clientId));
      console.log('PODIO_CLIENT_SECRET present:', Boolean(clientSecret));
      
      // Log all environment variables that contain PODIO
      console.log('Found PODIO environment variables:', podioKeys);
      console.log('Expected secret names: PODIO_CLIENT_ID, PODIO_CLIENT_SECRET, PODIO_CONTACTS_APP_TOKEN, PODIO_PACKING_SPEC_APP_TOKEN, PODIO_CONTACTS_APP_ID, PODIO_PACKING_SPEC_APP_ID');

      return new Response(
        JSON.stringify({ 
          error: 'Podio credentials not configured', 
          details: {
            client_id_present: Boolean(clientId),
            client_secret_present: Boolean(clientSecret),
            all_podio_vars: podioKeys,
            expected_vars: ['PODIO_CLIENT_ID', 'PODIO_CLIENT_SECRET', 'PODIO_CONTACTS_APP_TOKEN', 'PODIO_PACKING_SPEC_APP_TOKEN', 'PODIO_CONTACTS_APP_ID', 'PODIO_PACKING_SPEC_APP_ID'],
            function_execution_time: new Date().toISOString()
          }
        }),
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
    console.log('Attempting to authenticate with Podio using client credentials');
    console.log(`Client ID length: ${clientId.length}, Client Secret length: ${clientSecret.length}`);
    
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
      let errorText = '';
      try {
        errorText = await authResponse.text();
      } catch (e) {
        errorText = 'Could not read error response';
      }
      
      console.error(`Podio authentication failed with status ${authResponse.status}: ${errorText}`);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to authenticate with Podio API', 
          details: errorText,
          status: authResponse.status,
          client_id_length: clientId ? clientId.length : 0,
          client_secret_length: clientSecret ? clientSecret.length : 0,
          request_info: {
            endpoint: 'https://podio.com/oauth/token',
            method: 'POST',
            content_type: 'application/x-www-form-urlencoded',
            grant_type: 'client_credentials',
            scope: 'global'
          }
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
      let errorText = '';
      try {
        errorText = await appResponse.text();
      } catch (e) {
        errorText = 'Could not read error response';
      }
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
        statusCode: appResponse.status,
        authSuccess: true,
        tokenType: authData.token_type,
        tokenExpiresIn: authData.expires_in
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error validating Podio app access:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to validate app access', 
        details: error.message,
        stack: error.stack
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
