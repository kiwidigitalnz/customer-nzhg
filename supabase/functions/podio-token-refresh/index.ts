
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
    console.log('Podio token refresh request received');
    
    // Get Supabase URL and key from environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase configuration', {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey
      });
      
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Supabase credentials not configured',
          status: 500,
          details: 'Missing required environment variables'
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get Podio client credentials from environment
    const clientId = Deno.env.get('PODIO_CLIENT_ID');
    const clientSecret = Deno.env.get('PODIO_CLIENT_SECRET');
    
    if (!clientId || !clientSecret) {
      console.error('Missing Podio client configuration', {
        hasClientId: !!clientId,
        hasClientSecret: !!clientSecret
      });
      
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Podio client credentials not configured',
          status: 500,
          details: 'Missing Podio API credentials',
          needs_setup: true
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create Supabase client with service key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the latest token from our database
    const { data: tokens, error: fetchError } = await supabase
      .from('podio_auth_tokens')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error('Error fetching Podio token:', fetchError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to retrieve Podio token',
          status: 500,
          details: fetchError
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!tokens || tokens.length === 0) {
      console.error('No Podio tokens found in database');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No Podio authentication found',
          status: 404,
          details: 'Podio OAuth authentication must be completed first',
          needs_setup: true,
          debug_info: {
            timestamp: new Date().toISOString(),
            tokens_found: 0
          }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const token = tokens[0];
    const refreshToken = token.refresh_token;
    
    // Validate the token expiry date
    const expiryDate = new Date(token.expires_at);
    if (isNaN(expiryDate.getTime())) {
      console.error('Invalid expiry date in stored token:', token.expires_at);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid token expiry date in database',
          status: 500,
          details: 'Token data corruption detected',
          needs_reauth: true,
          debug_info: {
            stored_expires_at: token.expires_at,
            timestamp: new Date().toISOString()
          }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Check if token is expired
    const expiresAt = expiryDate.getTime();
    const now = Date.now();
    const tokenBuffer = 20 * 60 * 1000; // 20 minutes buffer
    
    // If token is not expiring soon, return it
    if (expiresAt > now + tokenBuffer) {
      console.log('Token still valid, not refreshing. Expires at:', new Date(expiresAt).toISOString());
      return new Response(
        JSON.stringify({
          success: true,
          access_token: token.access_token,
          refresh_token: token.refresh_token,
          expires_at: token.expires_at,
          message: 'Using existing valid token',
          time_remaining_ms: expiresAt - now,
          debug_info: {
            now: new Date(now).toISOString(),
            expires_at: new Date(expiresAt).toISOString(),
            buffer_minutes: tokenBuffer / (60 * 1000)
          }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Token expired or expiring soon. Refreshing...');
    
    // Otherwise refresh the token
    // Prepare the request to refresh the token
    const refreshParams = new URLSearchParams();
    refreshParams.append('grant_type', 'refresh_token');
    refreshParams.append('client_id', clientId);
    refreshParams.append('client_secret', clientSecret);
    refreshParams.append('refresh_token', refreshToken);

    try {
      // Use fetch with timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const refreshResponse = await fetch('https://podio.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: refreshParams.toString(),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!refreshResponse.ok) {
        const errorText = await refreshResponse.text();
        console.error('Failed to refresh token:', errorText, {
          status: refreshResponse.status,
          statusText: refreshResponse.statusText
        });
        
        // Try to parse the error text as JSON
        let errorDetails;
        try {
          errorDetails = JSON.parse(errorText);
        } catch (e) {
          errorDetails = errorText;
        }
        
        // Special handling for common oauth errors
        if (refreshResponse.status === 401 || 
            (errorDetails && errorDetails.error === 'invalid_grant')) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Podio authentication has expired',
              status: 401,
              details: errorDetails,
              needs_reauth: true
            }),
            { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        
        // Rate limit handling
        if (refreshResponse.status === 429) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Podio API rate limit exceeded',
              status: 429,
              details: errorDetails,
              retry_after: refreshResponse.headers.get('Retry-After') || '60'
            }),
            { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Failed to refresh Podio token',
            status: refreshResponse.status,
            details: errorDetails,
            needs_reauth: refreshResponse.status === 401
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const refreshData = await refreshResponse.json();
      
      // Calculate new expiry time: current time + expires_in seconds
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
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Failed to update token in database',
            details: updateError,
            status: 500
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      console.log('Token refreshed successfully');
      
      // Return the new token with additional metadata
      return new Response(
        JSON.stringify({
          success: true,
          access_token: refreshData.access_token,
          refresh_token: refreshData.refresh_token,
          expires_at: newExpiryDate.toISOString(),
          refreshed: true,
          message: 'Token refreshed successfully',
          time_remaining_ms: refreshData.expires_in * 1000,
          debug_info: {
            old_expires_at: token.expires_at,
            new_expires_at: newExpiryDate.toISOString(),
            refreshed_at: new Date().toISOString(),
            expires_in_seconds: refreshData.expires_in
          }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } catch (refreshError) {
      // Check for AbortController timeout
      if (refreshError.name === 'AbortError') {
        console.error('Token refresh request timed out');
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Token refresh request timed out',
            details: 'Request to Podio API exceeded timeout limit',
            status: 408
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      console.error('Error during token refresh:', refreshError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Error during token refresh',
          details: refreshError.message || 'Unknown error',
          status: 500
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Unexpected error',
        details: error.message || 'Unknown error',
        status: 500
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
