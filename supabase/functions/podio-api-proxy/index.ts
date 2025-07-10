import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TokenRefreshResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

async function refreshPodioToken(refreshToken: string): Promise<TokenRefreshResponse | null> {
  const clientId = Deno.env.get('PODIO_CLIENT_ID');
  const clientSecret = Deno.env.get('PODIO_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    console.error('Missing Podio OAuth configuration for token refresh');
    return null;
  }

  try {
    const refreshRequestBody = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken
    });

    const response = await fetch('https://podio.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: refreshRequestBody
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Token refresh failed:', errorText);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error during token refresh:', error);
    return null;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get app-level Podio tokens (no user authentication required)
    const { data: tokenData, error: tokenError } = await supabase
      .from('podio_oauth_tokens')
      .select('*')
      .eq('app_level', true)
      .single();

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({ error: 'No Podio app-level tokens found. Please connect the app to Podio first.' }), 
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    let accessToken = tokenData.access_token;
    const expiresAt = new Date(tokenData.expires_at);
    const now = new Date();

    // Check if token needs refreshing (refresh if expires within 5 minutes)
    if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
      console.log('Token expires soon, refreshing...');
      const refreshedTokens = await refreshPodioToken(tokenData.refresh_token);
      
      if (refreshedTokens) {
        // Update the token in database
        const newExpiresAt = new Date();
        newExpiresAt.setSeconds(newExpiresAt.getSeconds() + refreshedTokens.expires_in);

        const { error: updateError } = await supabase
          .from('podio_oauth_tokens')
          .update({
            access_token: refreshedTokens.access_token,
            refresh_token: refreshedTokens.refresh_token,
            expires_at: newExpiresAt.toISOString(),
            token_type: refreshedTokens.token_type
          })
          .eq('app_level', true);

        if (updateError) {
          console.error('Error updating refreshed tokens:', updateError);
        } else {
          accessToken = refreshedTokens.access_token;
          console.log('Token refreshed successfully');
        }
      } else {
        return new Response(
          JSON.stringify({ error: 'Failed to refresh Podio token. Please reconnect your account.' }), 
          { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // Parse the API request
    const { endpoint, method = 'GET', body } = await req.json();

    if (!endpoint) {
      return new Response(
        JSON.stringify({ error: 'Missing endpoint parameter' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Build the full Podio API URL
    const apiUrl = endpoint.startsWith('http') 
      ? endpoint 
      : `https://api.podio.com${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    // Prepare request headers
    const requestHeaders: Record<string, string> = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };

    // Make the API request to Podio
    const requestOptions: RequestInit = {
      method,
      headers: requestHeaders
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      requestOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    console.log(`Making Podio API request: ${method} ${apiUrl}`);

    const podioResponse = await fetch(apiUrl, requestOptions);
    const responseText = await podioResponse.text();

    // Try to parse response as JSON, fall back to text if it fails
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { text: responseText };
    }

    console.log(`Podio API response status: ${podioResponse.status}`);

    return new Response(
      JSON.stringify({
        status: podioResponse.status,
        data: responseData,
        headers: Object.fromEntries(podioResponse.headers.entries())
      }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in podio-api-proxy function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});