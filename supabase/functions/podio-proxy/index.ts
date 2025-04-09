import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.31.0';

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

    // Get the latest valid token from the database, regardless of client's authorization header
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

    // If no tokens found, try client credentials flow
    if (!tokens || tokens.length === 0) {
      console.log('No tokens found in database. Will attempt client credentials');
      
      // Get Podio credentials from environment
      const clientId = Deno.env.get('PODIO_CLIENT_ID');
      const clientSecret = Deno.env.get('PODIO_CLIENT_SECRET');
      
      if (!clientId || !clientSecret) {
        console.error('Podio credentials not configured');
        return new Response(
          JSON.stringify({ 
            error: 'Podio credentials not configured',
            details: 'Client ID or Client Secret missing in environment variables'
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
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
            'scope': 'global',
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
        const accessToken = authData.access_token;
        
        // Calculate new expiry time
        const expiresAt = new Date(Date.now() + (authData.expires_in * 1000)).toISOString();
        
        // Store the new token in the database
        const { error: insertError } = await supabase
          .from('podio_auth_tokens')
          .insert([{
            access_token: authData.access_token,
            refresh_token: authData.refresh_token,
            expires_at: expiresAt,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]);
          
        if (insertError) {
          console.error('Error storing new token in database:', insertError);
        }
        
        console.log(`Successfully obtained new access token via client credentials`);
        
        // Use this token for the current request
        const headers: HeadersInit = {
          'Authorization': `OAuth2 ${accessToken}`,
          'Content-Type': 'application/json',
        };
        
        if (appToken) {
          headers['X-Podio-App'] = appToken;
        }
        
        // Make the actual request to Podio API
        const fullUrl = `https://api.podio.com${normalizedEndpoint}`;
        console.log(`Full URL: ${fullUrl}`);
        
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
            return { error: 'Invalid JSON response from Podio API' };
          });
        } else {
          const text = await podioResponse.text();
          responseData = { text };
        }
        
        // Return the response
        return new Response(
          JSON.stringify(responseData),
          { 
            status: podioResponse.status, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      } catch (authError) {
        console.error('Error in client credentials flow:', authError);
        return new Response(
          JSON.stringify({ 
            error: 'Authentication error', 
            details: authError.message
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // Token exists in database
    const token = tokens[0];
    const now = new Date();
    const tokenExpiry = new Date(token.expires_at);
    
    // Check if token has expired or will expire soon (within 5 minutes)
    let accessToken = token.access_token;
    if (tokenExpiry.getTime() - now.getTime() < 5 * 60 * 1000) {
      console.log('Token expired or expiring soon. Refreshing...');
      
      // Get Podio credentials from environment
      const clientId = Deno.env.get('PODIO_CLIENT_ID');
      const clientSecret = Deno.env.get('PODIO_CLIENT_SECRET');
      
      if (!clientId || !clientSecret) {
        console.error('Podio credentials not configured');
        return new Response(
          JSON.stringify({ error: 'Podio credentials not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      try {
        // Refresh the token
        const refreshResponse = await fetch('https://podio.com/oauth/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            'grant_type': 'refresh_token',
            'client_id': clientId,
            'client_secret': clientSecret,
            'refresh_token': token.refresh_token,
          }),
        });
        
        if (!refreshResponse.ok) {
          console.error('Failed to refresh token, trying client credentials instead');
          
          // Fall back to client credentials if refresh fails
          const clientCredResponse = await fetch('https://podio.com/oauth/token', {
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
          
          if (!clientCredResponse.ok) {
            const errorText = await clientCredResponse.text();
            console.error(`Client credentials auth error: ${errorText}`);
            return new Response(
              JSON.stringify({ 
                error: 'Failed to authenticate with Podio', 
                details: errorText
              }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          const newTokenData = await clientCredResponse.json();
          accessToken = newTokenData.access_token;
          
          // Calculate new expiry time
          const expiresAt = new Date(Date.now() + (newTokenData.expires_in * 1000)).toISOString();
          
          // Update the token in the database
          await supabase
            .from('podio_auth_tokens')
            .update({
              access_token: newTokenData.access_token,
              refresh_token: newTokenData.refresh_token || token.refresh_token, // Keep old refresh token if none provided
              expires_at: expiresAt,
              updated_at: new Date().toISOString()
            })
            .eq('id', token.id);
            
          console.log('Token updated with client credentials response');
        } else {
          // Process normal refresh response
          const newTokenData = await refreshResponse.json();
          accessToken = newTokenData.access_token;
          
          // Calculate new expiry time
          const expiresAt = new Date(Date.now() + (newTokenData.expires_in * 1000)).toISOString();
          
          // Update the token in the database
          await supabase
            .from('podio_auth_tokens')
            .update({
              access_token: newTokenData.access_token,
              refresh_token: newTokenData.refresh_token,
              expires_at: expiresAt,
              updated_at: new Date().toISOString()
            })
            .eq('id', token.id);
            
          console.log('Token refreshed successfully');
        }
      } catch (refreshError) {
        console.error('Error during token refresh:', refreshError);
        // Continue with the current token even if refresh failed
        console.log('Using existing token despite refresh failure');
      }
    }

    // Prepare headers for the Podio API request with the DB token
    const headers: HeadersInit = {
      'Authorization': `OAuth2 ${accessToken}`,
      'Content-Type': 'application/json',
    };

    // Add app token if detected from endpoint
    if (appToken) {
      headers['X-Podio-App'] = appToken;
    }

    // Construct full URL
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
    
    if (podioResponse.status >= 400) {
      console.error('Podio API error response:', JSON.stringify(responseData, null, 2));
      console.error('Request details that caused error:', {
        endpoint: normalizedEndpoint,
        method,
        hasBody: !!body,
        hasAppToken: !!appToken,
        statusCode: podioResponse.status
      });
      
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
