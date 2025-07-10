import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.31.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('=== PODIO AUTHENTICATE FUNCTION START ===');
    console.log('Request method:', req.method);
    console.log('Request timestamp:', new Date().toISOString());

    // Get Supabase credentials
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase credentials not configured');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Supabase credentials not configured' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check for existing tokens
    const { data: tokens, error: fetchError } = await supabase
      .from('podio_auth_tokens')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error('Error fetching tokens:', fetchError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'database_error',
          error_description: fetchError.message
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!tokens || tokens.length === 0) {
      console.log('No tokens found in database');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'no_tokens',
          error_description: 'No authentication tokens found. Please complete OAuth flow.'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = tokens[0];
    const now = new Date();
    const expiresAt = new Date(token.expires_at);
    
    console.log('Token status:', {
      expires_at: token.expires_at,
      current_time: now.toISOString(),
      is_expired: now >= expiresAt,
      minutes_until_expiry: Math.round((expiresAt.getTime() - now.getTime()) / 60000)
    });

    // If token is expired and we have a refresh token, try to refresh
    if (now >= expiresAt && token.refresh_token) {
      console.log('Token expired, attempting refresh...');
      
      const clientId = Deno.env.get('PODIO_CLIENT_ID')?.trim();
      const clientSecret = Deno.env.get('PODIO_CLIENT_SECRET')?.trim();
      
      if (!clientId || !clientSecret) {
        console.error('Missing Podio credentials for token refresh');
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'configuration_error',
            error_description: 'Podio credentials not configured'
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const refreshData = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: token.refresh_token
      });

      const refreshResponse = await fetch('https://podio.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: refreshData.toString(),
      });

      if (refreshResponse.ok) {
        const newTokenData = await refreshResponse.json();
        const newExpiresAt = new Date(Date.now() + (newTokenData.expires_in * 1000)).toISOString();
        
        // Update tokens in database
        const { error: updateError } = await supabase
          .from('podio_auth_tokens')
          .update({
            access_token: newTokenData.access_token,
            refresh_token: newTokenData.refresh_token || token.refresh_token,
            expires_at: newExpiresAt,
            updated_at: new Date().toISOString()
          })
          .eq('id', token.id);

        if (updateError) {
          console.error('Error updating refreshed tokens:', updateError);
          return new Response(
            JSON.stringify({ 
              success: false,
              error: 'database_error',
              error_description: updateError.message
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('Token successfully refreshed');
        return new Response(
          JSON.stringify({ 
            success: true,
            authenticated: true,
            token_refreshed: true,
            expires_at: newExpiresAt
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        console.error('Failed to refresh token:', refreshResponse.status, refreshResponse.statusText);
        // If refresh fails, we need to re-authenticate
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'refresh_failed',
            error_description: 'Token refresh failed. Re-authentication required.'
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Token is valid
    if (now < expiresAt) {
      console.log('Valid token found');
      return new Response(
        JSON.stringify({ 
          success: true,
          authenticated: true,
          expires_at: token.expires_at,
          time_until_expiry: Math.round((expiresAt.getTime() - now.getTime()) / 60000)
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Token expired and no refresh token
    console.log('Token expired and no refresh available');
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'token_expired',
        error_description: 'Authentication token expired. Re-authentication required.'
      }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('=== PODIO AUTHENTICATE FUNCTION ERROR ===');
    console.error('Error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'unexpected_error',
        error_description: error.message || 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});