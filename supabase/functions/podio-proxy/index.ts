
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.31.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Helper function to refresh the Podio token
async function refreshPodioToken(supabase: any, token: any): Promise<{ success: boolean; newToken?: any; error?: string; needsReauth?: boolean }> {
  const clientId = Deno.env.get('PODIO_CLIENT_ID');
  const clientSecret = Deno.env.get('PODIO_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    return { success: false, error: 'Podio client credentials not configured', needsReauth: true };
  }

  try {
    console.log('Attempting to refresh expired token...');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const refreshResponse = await fetch('https://api.podio.com/oauth/token/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: token.refresh_token
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!refreshResponse.ok) {
      const errorText = await refreshResponse.text();
      console.error('Failed to refresh token:', errorText);

      // Check for invalid_grant error which means reauth is needed
      if (refreshResponse.status === 401 || errorText.includes('invalid_grant')) {
        return { success: false, error: 'Podio authentication has expired', needsReauth: true };
      }

      return { success: false, error: `Token refresh failed: ${errorText}` };
    }

    const refreshData = await refreshResponse.json();
    const now = Date.now();
    const newExpiryDate = new Date(now + (refreshData.expires_in * 1000));

    // Update token in database
    const { error: updateError } = await supabase
      .from('podio_auth_tokens')
      .update({
        access_token: refreshData.access_token,
        refresh_token: refreshData.refresh_token,
        expires_at: newExpiryDate.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', token.id);

    if (updateError) {
      console.error('Error updating token in database:', updateError);
      return { success: false, error: 'Failed to update token in database' };
    }

    console.log('Token refreshed successfully');

    return {
      success: true,
      newToken: {
        ...token,
        access_token: refreshData.access_token,
        refresh_token: refreshData.refresh_token,
        expires_at: newExpiryDate.toISOString()
      }
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      return { success: false, error: 'Token refresh request timed out' };
    }
    console.error('Error during token refresh:', error);
    return { success: false, error: error.message || 'Unknown refresh error' };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get Supabase URL and key from environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase credentials not configured');
      return new Response(
        JSON.stringify({ error: 'Supabase credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    // Get the latest valid token from the database
    console.log('Fetching latest token from database');
    const { data: tokens, error: fetchError } = await supabase
      .from('podio_auth_tokens')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error('Error fetching token:', fetchError);
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If no tokens found, return auth error
    if (!tokens || tokens.length === 0) {
      console.log('No tokens found in database');
      return new Response(
        JSON.stringify({ error: 'No authentication token available. Please connect to Podio first.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let token = tokens[0];
    const now = new Date();
    const tokenExpiry = new Date(token.expires_at);
    const tokenBuffer = 5 * 60 * 1000; // 5 minute buffer before expiry

    // Check if token is expired or expiring soon - automatically refresh it
    if (tokenExpiry.getTime() <= now.getTime() + tokenBuffer) {
      console.log('Token is expired or expiring soon. Attempting automatic refresh...');

      const refreshResult = await refreshPodioToken(supabase, token);

      if (!refreshResult.success) {
        console.error('Automatic token refresh failed:', refreshResult.error);

        // If reauth is needed, return 401 with needs_reauth flag
        if (refreshResult.needsReauth) {
          return new Response(
            JSON.stringify({
              error: 'Authentication token has expired and could not be refreshed. Please reconnect to Podio.',
              needs_reauth: true
            }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ error: refreshResult.error || 'Token refresh failed' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Use the new token for this request
      token = refreshResult.newToken;
      console.log('Token refreshed successfully, proceeding with API call');
    }

    // Prepare headers with OAuth2 authorization
    const headers = {
      'Authorization': `OAuth2 ${token.access_token}`,
      'Content-Type': 'application/json',
    };

    // Add app token if available
    if (appToken) {
      headers['X-Podio-App'] = appToken;
    }

    // Format the Podio API URL
    const apiUrl = `https://api.podio.com${normalizedEndpoint}`;
    console.log(`Calling Podio API: ${method} ${apiUrl}`);

    // Make the request to Podio API
    const requestOptions: RequestInit = {
      method,
      headers,
    };

    // Add body for non-GET requests if provided
    if (method !== 'GET' && body) {
      requestOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    try {
      const response = await fetch(apiUrl, requestOptions);
      
      // Log response status
      console.log(`Podio API response status: ${response.status}`);
      
      // Check for rate limiting
      if (response.status === 429) {
        console.error('Rate limit reached');
        
        // Get rate limit headers if available
        const rateLimit = response.headers.get('X-Rate-Limit-Limit');
        const rateRemaining = response.headers.get('X-Rate-Limit-Remaining');
        const rateReset = response.headers.get('X-Rate-Limit-Reset');
        
        return new Response(
          JSON.stringify({
            error: 'Rate limit reached',
            rateLimit: {
              limit: rateLimit,
              remaining: rateRemaining,
              reset: rateReset
            }
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Handle auth errors
      if (response.status === 401 || response.status === 403) {
        console.error('Authentication error');
        const responseBody = await response.text();
        
        return new Response(
          JSON.stringify({
            error: 'Authentication error',
            details: responseBody
          }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Parse response body based on content type
      let responseBody;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        responseBody = await response.json();
      } else {
        responseBody = await response.text();
      }

      // Return the response data
      return new Response(
        JSON.stringify(responseBody),
        { 
          status: response.status, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    } catch (fetchError) {
      console.error('Error making request to Podio API:', fetchError);
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
