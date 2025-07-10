import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

interface PodioUserResponse {
  user_id: number;
  name: string;
  mail: string;
  username?: string;
  avatar?: string;
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

    // Get Podio OAuth configuration
    const clientId = Deno.env.get('PODIO_CLIENT_ID');
    const clientSecret = Deno.env.get('PODIO_CLIENT_SECRET');
    const redirectUri = `${new URL(req.url).origin}/podio-oauth-callback`;

    if (!clientId || !clientSecret) {
      console.error('Missing Podio OAuth configuration');
      return new Response(
        JSON.stringify({ error: 'OAuth configuration missing' }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse URL parameters
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (error) {
      console.error('OAuth error:', error);
      return new Response(
        JSON.stringify({ error: `OAuth error: ${error}` }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!code || !state) {
      console.error('Missing code or state parameter');
      return new Response(
        JSON.stringify({ error: 'Missing authorization code or state' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Verify state parameter
    const { data: stateData, error: stateError } = await supabase
      .from('podio_oauth_states')
      .select('*')
      .eq('state', state)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (stateError || !stateData) {
      console.error('Invalid or expired state:', stateError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired OAuth state' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Exchange code for tokens
    const tokenRequestBody = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code: code
    });

    const tokenResponse = await fetch('https://podio.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenRequestBody
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to exchange authorization code for tokens' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const tokenData: TokenResponse = await tokenResponse.json();
    console.log('Token exchange successful');

    // Get user info from Podio
    const userResponse = await fetch('https://api.podio.com/user', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!userResponse.ok) {
      console.error('Failed to fetch user info from Podio');
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user information' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const userData: PodioUserResponse = await userResponse.json();
    console.log('User info fetched successfully');

    // Calculate token expiry
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in);

    // If we have a user_id from the state, save the tokens
    if (stateData.user_id) {
      // Save/update OAuth tokens
      const { error: tokenError } = await supabase
        .from('podio_oauth_tokens')
        .upsert({
          user_id: stateData.user_id,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: expiresAt.toISOString(),
          token_type: tokenData.token_type,
          scope: tokenData.scope
        }, { onConflict: 'user_id' });

      if (tokenError) {
        console.error('Error saving OAuth tokens:', tokenError);
      }

      // Save/update Podio user data
      const { error: userError } = await supabase
        .from('podio_users')
        .upsert({
          user_id: stateData.user_id,
          podio_user_id: userData.user_id,
          name: userData.name,
          email: userData.mail,
          username: userData.username,
          avatar_url: userData.avatar
        }, { onConflict: 'user_id' });

      if (userError) {
        console.error('Error saving Podio user data:', userError);
      }
    }

    // Clean up the used state
    await supabase
      .from('podio_oauth_states')
      .delete()
      .eq('state', state);

    // Return success response with user and token info
    const response = {
      success: true,
      user: {
        podio_user_id: userData.user_id,
        name: userData.name,
        email: userData.mail,
        username: userData.username,
        avatar_url: userData.avatar
      },
      token_info: {
        expires_at: expiresAt.toISOString(),
        scope: tokenData.scope
      }
    };

    return new Response(
      JSON.stringify(response), 
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in podio-oauth-callback function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});