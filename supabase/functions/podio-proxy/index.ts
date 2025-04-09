
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

    // Ensure the endpoint starts with a slash
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    console.log(`Normalized endpoint: ${normalizedEndpoint}`);

    // Extract headers and options
    const method = options?.method || 'GET';
    const body = options?.body;
    const appToken = options?.appToken;

    // Get Podio access token from request headers or auth server
    let accessToken;
    const authHeader = req.headers.get('Authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      accessToken = authHeader.substring(7);
      console.log('Using provided access token from client');
    } else {
      // Get one from client credentials - this aligns with Podio server-side auth
      // https://developers.podio.com/authentication/server_side
      const clientId = Deno.env.get('PODIO_CLIENT_ID');
      const clientSecret = Deno.env.get('PODIO_CLIENT_SECRET');
      
      if (!clientId || !clientSecret) {
        return new Response(
          JSON.stringify({ error: 'Podio credentials not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('No token provided, getting one via client credentials');
      try {
        const authResponse = await fetch('https://podio.com/oauth/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            'grant_type': 'client_credentials',
            'client_id': clientId,
            'client_secret': clientSecret,
            'scope': 'global', // Default scope as per Podio docs
          }),
        });
        
        if (!authResponse.ok) {
          const errorText = await authResponse.text();
          console.error(`Authentication error (${authResponse.status}): ${errorText}`);
          return new Response(
            JSON.stringify({ 
              error: 'Failed to obtain authentication token',
              details: errorText,
              status: authResponse.status
            }),
            { status: authResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const authData = await authResponse.json();
        accessToken = authData.access_token;
        console.log('Successfully obtained access token via client credentials');
      } catch (authError) {
        console.error('Error authenticating with Podio:', authError);
        return new Response(
          JSON.stringify({ 
            error: 'Authentication error', 
            details: authError.message,
            status: 500
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Prepare headers for the Podio API request
    const headers: HeadersInit = {
      'Authorization': `OAuth2 ${accessToken}`,
      'Content-Type': 'application/json',
    };

    // Add app token if provided
    if (appToken) {
      headers['X-Podio-App'] = appToken;
      console.log(`Using app token: ${appToken}`);
    }

    // Construct full URL with the API base
    const fullUrl = `https://api.podio.com${normalizedEndpoint}`;
    console.log(`Full URL: ${fullUrl}`);
    console.log(`Method: ${method}`);
    
    // Debug log the request details
    if (body) {
      try {
        const parsedBody = JSON.parse(body);
        console.log(`Request body:`, JSON.stringify(parsedBody, null, 2));
      } catch (e) {
        console.log(`Body: ${body.substring(0, 200) + (body.length > 200 ? '...' : '')}`);
      }
    } else {
      console.log(`Body: None`);
    }
    
    console.log(`App Token: ${appToken ? 'Provided' : 'Not provided'}`);

    // Make the actual request to Podio API
    const podioResponse = await fetch(fullUrl, {
      method,
      headers,
      body: body ? JSON.stringify(JSON.parse(body)) : undefined,
    });

    // Get response data
    let responseData;
    const contentType = podioResponse.headers.get('Content-Type') || '';
    
    if (contentType.includes('application/json')) {
      responseData = await podioResponse.json().catch(() => ({}));
    } else {
      const text = await podioResponse.text();
      responseData = { text };
    }

    // Log response details for debugging
    console.log(`Podio API response status: ${podioResponse.status}`);
    console.log(`Response content type: ${contentType}`);
    
    if (podioResponse.status >= 400) {
      console.error('Podio API error response:', JSON.stringify(responseData));
    } else {
      // Debug log a sample of the response for successful calls
      console.log('Podio API successful response snippet:', 
        JSON.stringify(responseData).substring(0, 300) + 
        (JSON.stringify(responseData).length > 300 ? '...' : '')
      );
    }

    // Check for rate limiting
    if (podioResponse.status === 429) {
      const rateLimitReset = podioResponse.headers.get('X-Rate-Limit-Reset');
      console.warn(`Rate limit reached. Reset at: ${rateLimitReset}`);
      
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit reached', 
          details: 'Too many requests to Podio API',
          reset: rateLimitReset
        }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check for auth errors
    if (podioResponse.status === 401 || podioResponse.status === 403) {
      console.warn(`Authentication error: ${podioResponse.status}`);
      
      return new Response(
        JSON.stringify({ 
          error: podioResponse.status === 401 ? 'Authentication failed' : 'Access denied',
          details: responseData,
          status: podioResponse.status
        }),
        { 
          status: podioResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

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
