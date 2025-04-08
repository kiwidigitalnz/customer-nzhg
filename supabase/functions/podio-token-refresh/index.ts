
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
      return new Response(
        JSON.stringify({ error: 'Supabase credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Podio credentials from environment
    const clientId = Deno.env.get('PODIO_CLIENT_ID');
    const clientSecret = Deno.env.get('PODIO_CLIENT_SECRET');
    
    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({ error: 'Podio credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the most recent token from the database
    const { data: tokens, error: fetchError } = await supabase
      .from('podio_auth_tokens')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error('Error fetching token:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch token from database', details: fetchError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No Podio token found. Admin must authenticate with Podio first.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = tokens[0];
    const refreshToken = token.refresh_token;

    // Check if token is expired and needs refresh
    const expiresAt = new Date(token.expires_at).getTime();
    const now = Date.now();
    const isExpired = expiresAt <= now;

    // If token is still valid, return it
    if (!isExpired) {
      return new Response(
        JSON.stringify({
          access_token: token.access_token,
          expires_at: token.expires_at,
          refreshed: false
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If token is expired, refresh it
    console.log('Token expired, refreshing...');
    const refreshResponse = await fetch('https://podio.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'grant_type': 'refresh_token',
        'client_id': clientId,
        'client_secret': clientSecret,
        'refresh_token': refreshToken,
      }),
    });

    if (!refreshResponse.ok) {
      const refreshError = await refreshResponse.text();
      console.error('Failed to refresh token:', refreshError);
      return new Response(
        JSON.stringify({ error: 'Failed to refresh Podio token', details: refreshError }),
        { status: refreshResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const refreshData = await refreshResponse.json();
    console.log('Token successfully refreshed');

    // Update token in database
    const expiresAt = new Date(Date.now() + (refreshData.expires_in * 1000)).toISOString();
    
    const { error: updateError } = await supabase
      .from('podio_auth_tokens')
      .update({
        access_token: refreshData.access_token,
        refresh_token: refreshData.refresh_token,
        expires_at: expiresAt,
        updated_at: new Date().toISOString()
      })
      .eq('id', token.id);

    if (updateError) {
      console.error('Error updating token in database:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update token in database', details: updateError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        access_token: refreshData.access_token,
        expires_at: expiresAt,
        refreshed: true
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error refreshing Podio token:', error);
    
    return new Response(
      JSON.stringify({ error: 'Failed to refresh token', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
