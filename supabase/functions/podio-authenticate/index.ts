
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.31.0';

// Updated 2025-07-09 - Replaced client credentials with proper OAuth flow

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('=== PODIO AUTHENTICATE FUNCTION START ===');
    console.log('Request timestamp:', new Date().toISOString());
    console.log('Request method:', req.method);
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase credentials not configured');
      return new Response(
        JSON.stringify({ 
          error: 'Supabase credentials not configured',
          needs_setup: true
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check for stored OAuth tokens first
    console.log('Checking for stored OAuth tokens...');
    const { data: tokenData, error: tokenError } = await supabase
      .from('podio_auth_tokens')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (tokenError) {
      console.error('Error fetching tokens from database:', tokenError);
      
      // Check if table doesn't exist
      if (tokenError.message.includes('relation "podio_auth_tokens" does not exist')) {
        return new Response(
          JSON.stringify({ 
            error: 'OAuth tokens table not found. Please complete OAuth setup first.',
            needs_oauth_setup: true,
            setup_url: '/podio-setup'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'Database error while fetching tokens',
          details: tokenError.message,
          needs_oauth_setup: true
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!tokenData || tokenData.length === 0) {
      console.log('No OAuth tokens found in database');
      return new Response(
        JSON.stringify({ 
          error: 'No OAuth tokens found. Please complete OAuth setup first.',
          needs_oauth_setup: true,
          setup_url: '/podio-setup'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = tokenData[0];
    const now = new Date();
    const expiresAt = new Date(token.expires_at);
    
    console.log('Token status:', {
      hasToken: !!token.access_token,
      expiresAt: token.expires_at,
      isExpired: now >= expiresAt,
      timeUntilExpiry: expiresAt.getTime() - now.getTime()
    });

    // Check if token is expired and needs refresh
    if (now >= expiresAt) {
      console.log('Token is expired, attempting refresh...');
      
      if (!token.refresh_token) {
        console.error('No refresh token available');
        return new Response(
          JSON.stringify({ 
            error: 'Token expired and no refresh token available. Please re-authenticate.',
            needs_oauth_setup: true,
            setup_url: '/podio-setup'
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get Podio credentials for token refresh
      const clientId = Deno.env.get('PODIO_CLIENT_ID');
      const clientSecret = Deno.env.get('PODIO_CLIENT_SECRET');
      
      if (!clientId || !clientSecret) {
        console.error('Podio credentials not configured for token refresh');
        return new Response(
          JSON.stringify({ 
            error: 'Podio credentials not configured',
            needs_setup: true
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

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
        const errorText = await refreshResponse.text();
        console.error('Token refresh failed:', errorText);
        
        return new Response(
          JSON.stringify({ 
            error: 'Token refresh failed. Please re-authenticate.',
            details: errorText,
            needs_oauth_setup: true,
            setup_url: '/podio-setup'
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const refreshData = await refreshResponse.json();
      const newExpiresAt = new Date(Date.now() + (refreshData.expires_in * 1000)).toISOString();
      
      // Update token in database
      const { error: updateError } = await supabase
        .from('podio_auth_tokens')
        .update({
          access_token: refreshData.access_token,
          refresh_token: refreshData.refresh_token,
          expires_at: newExpiresAt,
          updated_at: new Date().toISOString()
        })
        .eq('id', token.id);

      if (updateError) {
        console.error('Error updating refreshed token:', updateError);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to store refreshed token',
            details: updateError.message
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Token refreshed successfully');
      
      // Return the refreshed token
      return new Response(
        JSON.stringify({
          success: true,
          access_token: refreshData.access_token,
          token_type: refreshData.token_type || 'bearer',
          expires_in: refreshData.expires_in,
          expires_at: newExpiresAt,
          received_at: new Date().toISOString(),
          refreshed: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.log('Token is still valid, returning current token');
      
      // Return the current valid token
      return new Response(
        JSON.stringify({
          success: true,
          access_token: token.access_token,
          token_type: 'bearer',
          expires_in: Math.floor((expiresAt.getTime() - now.getTime()) / 1000),
          expires_at: token.expires_at,
          received_at: new Date().toISOString(),
          refreshed: false
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in authentication:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Authentication failed', 
        details: error.message,
        stack: error.stack
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
