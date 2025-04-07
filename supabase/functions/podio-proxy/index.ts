
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
    // Parse request body
    const requestData = await req.json();
    const { endpoint, options } = requestData;

    if (!endpoint) {
      return new Response(
        JSON.stringify({ error: 'Podio API endpoint is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract headers and options
    const method = options?.method || 'GET';
    const body = options?.body;
    const appToken = options?.appToken;

    // Get Podio access token from request headers or auth server
    let accessToken;
    const authHeader = req.headers.get('Authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      accessToken = authHeader.substring(7);
    } else {
      // Get one from client credentials
      const clientId = Deno.env.get('PODIO_CLIENT_ID');
      const clientSecret = Deno.env.get('PODIO_CLIENT_SECRET');
      
      if (!clientId || !clientSecret) {
        return new Response(
          JSON.stringify({ error: 'Podio credentials not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const authResponse = await fetch('https://podio.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          'grant_type': 'client_credentials',
          'client_id': clientId,
          'client_secret': clientSecret,
        }),
      });
      
      if (!authResponse.ok) {
        return new Response(
          JSON.stringify({ error: 'Failed to obtain authentication token' }),
          { status: authResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const authData = await authResponse.json();
      accessToken = authData.access_token;
    }

    // Prepare headers for the Podio API request
    const headers: HeadersInit = {
      'Authorization': `OAuth2 ${accessToken}`,
      'Content-Type': 'application/json',
    };

    // Add app token if provided
    if (appToken) {
      headers['X-Podio-App'] = appToken;
    }

    // Make the actual request to Podio API
    const podioResponse = await fetch(`https://api.podio.com${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(JSON.parse(body)) : undefined,
    });

    // Get response data
    const responseData = await podioResponse.json().catch(() => ({}));

    // Return the response from Podio
    return new Response(
      JSON.stringify(responseData),
      { 
        status: podioResponse.status, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error proxying Podio API request:', error);
    
    return new Response(
      JSON.stringify({ error: 'Failed to proxy Podio API request', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
