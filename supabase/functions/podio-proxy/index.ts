
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
    
    // Determine which app token to use based on the endpoint
    let appToken = null;
    
    // Check if this is a Packing Spec API call
    if (normalizedEndpoint.includes('/app/29797638/')) {
      appToken = Deno.env.get('PODIO_PACKING_SPEC_APP_TOKEN');
      console.log('Using Packing Spec app token');
    }
    // Check if this is a Contacts API call
    else if (normalizedEndpoint.includes('/app/26969025/')) {
      appToken = Deno.env.get('PODIO_CONTACTS_APP_TOKEN');
      console.log('Using Contacts app token');
    }

    // First try to get token from the request Authorization header
    let accessToken;
    const authHeader = req.headers.get('Authorization');
    let tokenSource = '';
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      accessToken = authHeader.substring(7);
      tokenSource = 'request header';
      console.log('Using access token from client request headers');
    } else {
      // If no token in request header, try client credentials authentication
      const clientId = Deno.env.get('PODIO_CLIENT_ID');
      const clientSecret = Deno.env.get('PODIO_CLIENT_SECRET');
      
      if (!clientId || !clientSecret) {
        console.error('Podio credentials not configured. Missing client ID or secret.');
        return new Response(
          JSON.stringify({ 
            error: 'Podio credentials not configured',
            details: 'Client ID or Client Secret missing in environment variables'
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('No token in request header, getting one via client credentials');
      tokenSource = 'client credentials';
      
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
              status: authResponse.status,
              requestInfo: {
                endpoint: 'https://podio.com/oauth/token',
                method: 'POST',
                grantType: 'client_credentials'
              }
            }),
            { status: authResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const authData = await authResponse.json();
        accessToken = authData.access_token;
        console.log(`Successfully obtained access token via client credentials (expires in: ${authData.expires_in} seconds)`);
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

    if (!accessToken) {
      console.error('Failed to obtain access token from any source');
      return new Response(
        JSON.stringify({ 
          error: 'Access token not available',
          details: 'Could not obtain a valid token from request header or client credentials' 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare headers for the Podio API request
    const headers: HeadersInit = {
      'Authorization': `OAuth2 ${accessToken}`,
      'Content-Type': 'application/json',
    };

    // Add app token if detected from endpoint
    if (appToken) {
      headers['X-Podio-App'] = appToken;
      console.log(`Using app token for this endpoint`);
    } else {
      console.log('No app token required for this endpoint');
    }

    // Construct full URL with the API base
    const fullUrl = `https://api.podio.com${normalizedEndpoint}`;
    console.log(`Full URL: ${fullUrl}`);
    console.log(`Method: ${method}`);
    console.log(`Token source: ${tokenSource}`);
    
    // Debug log the request details
    if (body) {
      try {
        const parsedBody = JSON.parse(body);
        console.log(`Request body:`, JSON.stringify(parsedBody, null, 2));
        
        // Special logging for filter requests to debug packing specs issue
        if (normalizedEndpoint.includes('/filter') && parsedBody.filters) {
          console.log('Filter structure:', JSON.stringify(parsedBody.filters, null, 2));
        } else if (normalizedEndpoint.includes('/filter') && parsedBody.fields) {
          console.log('Using fields filter structure:', JSON.stringify(parsedBody.fields, null, 2));
        }
      } catch (e) {
        console.log(`Body: ${body.substring(0, 200) + (body.length > 200 ? '...' : '')}`);
      }
    } else {
      console.log(`Body: None`);
    }

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
      responseData = await podioResponse.json().catch((e) => {
        console.error('Error parsing JSON response:', e);
        return { error: 'Invalid JSON response from Podio API' };
      });
    } else {
      const text = await podioResponse.text();
      responseData = { text };
    }

    // Log response details for debugging
    console.log(`Podio API response status: ${podioResponse.status}`);
    console.log(`Response content type: ${contentType}`);
    
    if (podioResponse.status >= 400) {
      console.error('Podio API error response:', JSON.stringify(responseData, null, 2));
      
      // Enhanced error logging
      console.error('Request details that caused error:', {
        endpoint: normalizedEndpoint,
        method,
        hasBody: !!body,
        hasAppToken: !!appToken,
        tokenSource,
        statusCode: podioResponse.status
      });
      
      // Return error response with original status code and detailed information
      return new Response(
        JSON.stringify({
          error: `Podio API error (${podioResponse.status})`,
          details: responseData,
          requestInfo: {
            endpoint: normalizedEndpoint,
            method
          }
        }),
        { 
          status: podioResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } else {
      // Debug log a sample of the response for successful calls
      console.log('Podio API successful response snippet:', 
        JSON.stringify(responseData).substring(0, 300) + 
        (JSON.stringify(responseData).length > 300 ? '...' : '')
      );
      
      // If this is a filter call for packing specs, log the item count
      if (normalizedEndpoint.includes('/app/29797638/filter')) {
        const itemCount = responseData?.items?.length || 0;
        console.log(`Packing specs filter returned ${itemCount} items`);
        
        if (itemCount === 0 && responseData) {
          console.log('Filter response structure:', JSON.stringify(Object.keys(responseData), null, 2));
        }
      }
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
    
    // Create a more detailed error response
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      name: error.name,
      time: new Date().toISOString()
    };
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to proxy Podio API request', 
        details: errorDetails
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
