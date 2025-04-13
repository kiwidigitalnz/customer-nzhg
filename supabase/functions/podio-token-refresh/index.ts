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
      console.error('Missing Supabase configuration');
      return new Response(
        JSON.stringify({
          error: 'Supabase credentials not configured',
          status: 500,
          details: 'Missing required environment variables'
        }),
        { 
          status: 500, 
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
          error: 'Podio client credentials not configured',
          status: 500,
          details: 'Missing Podio API credentials',
          needs_setup: true
        }),
        { 
          status: 500, 
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
          error: 'Failed to retrieve Podio token',
          status: 500,
          details: fetchError
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!tokens || tokens.length === 0) {
      console.error('No Podio tokens found');
      return new Response(
        JSON.stringify({
          error: 'No Podio token found',
          status: 404,
          details: 'Admin must authenticate with Podio first',
          needs_setup: true
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const token = tokens[0];
    const refreshToken = token.refresh_token;
    
    // Check if token is expired
    const expiresAt = new Date(token.expires_at).getTime();
    const now = Date.now();
    const tokenBuffer = 10 * 60 * 1000; // 10 minutes
    
    // If token is not expiring soon, return it
    if (expiresAt > now + tokenBuffer) {
      console.log('Token still valid, not refreshing');
      return new Response(
        JSON.stringify({
          access_token: token.access_token,
          refresh_token: token.refresh_token,
          expires_at: token.expires_at,
          message: 'Using existing valid token'
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
      const refreshResponse = await fetch('https://podio.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: refreshParams.toString()
      });

      if (!refreshResponse.ok) {
        const errorText = await refreshResponse.text();
        console.error('Failed to refresh token:', errorText);
        
        // Try to parse the error text as JSON
        let errorDetails;
        try {
          errorDetails = JSON.parse(errorText);
        } catch (e) {
          errorDetails = errorText;
        }
        
        return new Response(
          JSON.stringify({
            error: 'Failed to refresh Podio token',
            status: refreshResponse.status,
            details: errorDetails,
            needs_reauth: refreshResponse.status === 401
          }),
          { 
            status: refreshResponse.status, 
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
            error: 'Failed to update token in database',
            details: updateError,
            status: 500
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Return the new token
      return new Response(
        JSON.stringify({
          access_token: refreshData.access_token,
          refresh_token: refreshData.refresh_token,
          expires_at: newExpiryDate.toISOString(),
          message: 'Token refreshed successfully'
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } catch (refreshError) {
      console.error('Error during token refresh:', refreshError);
      return new Response(
        JSON.stringify({
          error: 'Error during token refresh',
          details: refreshError.message || 'Unknown error',
          status: 500
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({
        error: 'Unexpected error',
        details: error.message || 'Unknown error',
        status: 500
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
