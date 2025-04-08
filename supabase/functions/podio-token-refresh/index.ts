
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.31.0';

const PODIO_TOKEN_URL = 'https://podio.com/oauth/token';

// CORS headers
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

    // Create Supabase client with service key for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Try to fetch the latest token from the database
    try {
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

      // If no tokens found, return 404 - client should redirect to auth flow
      if (!tokens || tokens.length === 0) {
        console.log('No tokens found in database');
        return new Response(
          JSON.stringify({ error: 'No Podio tokens found. Authorization required.' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const token = tokens[0];
      const now = new Date();
      const tokenExpiry = new Date(token.expires_at);
      let refreshed = false;

      // Check if token has expired or will expire soon (within 5 minutes)
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

        // Refresh the token
        const refreshResponse = await fetch(PODIO_TOKEN_URL, {
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
          const refreshError = await refreshResponse.text();
          console.error('Failed to refresh token:', refreshError);
          
          // If refresh fails, return the error but also include the original token
          // This allows the client to still use the token if it's not yet expired
          return new Response(
            JSON.stringify({ 
              error: 'Failed to refresh token', 
              details: refreshError,
              access_token: token.access_token,
              expires_at: token.expires_at
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Parse the new token data
        const newTokenData = await refreshResponse.json();
        console.log('Token refreshed successfully');
        
        // Calculate new expiry time
        const expiresAt = new Date(Date.now() + (newTokenData.expires_in * 1000)).toISOString();
        
        // Update the token in the database
        const { error: updateError } = await supabase
          .from('podio_auth_tokens')
          .update({
            access_token: newTokenData.access_token,
            refresh_token: newTokenData.refresh_token,
            expires_at: expiresAt,
            updated_at: new Date().toISOString()
          })
          .eq('id', token.id);
        
        if (updateError) {
          console.error('Error updating token in database:', updateError);
          return new Response(
            JSON.stringify({ error: updateError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Return the new token data
        refreshed = true;
        return new Response(
          JSON.stringify({
            access_token: newTokenData.access_token,
            expires_at: expiresAt,
            refreshed: refreshed
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        // Token is still valid, return it
        console.log('Token is still valid');
        return new Response(
          JSON.stringify({
            access_token: token.access_token,
            expires_at: token.expires_at,
            refreshed: refreshed
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } catch (error) {
      console.error('Error in token refresh process:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
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
