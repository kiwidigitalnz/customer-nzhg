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
    console.log('=== Podio OAuth Callback Started ===');
    console.log('Request method:', req.method);
    console.log('Request URL:', req.url);
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Podio OAuth configuration
    const clientId = Deno.env.get('PODIO_CLIENT_ID');
    const clientSecret = Deno.env.get('PODIO_CLIENT_SECRET');
    const redirectUri = 'https://customer.nzhg.com/podio-oauth-callback';

    console.log('OAuth config check - Client ID exists:', !!clientId);
    console.log('OAuth config check - Client Secret exists:', !!clientSecret);
    console.log('Redirect URI:', redirectUri);

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

    // Parse parameters from request body (for POST requests from our frontend)
    let code: string | null = null;
    let state: string | null = null;
    let error: string | null = null;

    if (req.method === 'POST') {
      console.log('Processing POST request - reading from body');
      try {
        const body = await req.json();
        console.log('Request body received:', { code: !!body.code, state: !!body.state, error: !!body.error });
        code = body.code;
        state = body.state;
        error = body.error;
      } catch (bodyError) {
        console.error('Failed to parse request body:', bodyError);
        return new Response(
          JSON.stringify({ error: 'Invalid request body' }), 
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    } else {
      // Fallback to URL parameters for GET requests (direct Podio redirects)
      console.log('Processing GET request - reading from URL parameters');
      const url = new URL(req.url);
      code = url.searchParams.get('code');
      state = url.searchParams.get('state');
      error = url.searchParams.get('error');
      console.log('URL params received:', { code: !!code, state: !!state, error: !!error });
    }

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
      console.error('Missing required parameters:', { 
        hasCode: !!code, 
        hasState: !!state,
        codeLength: code?.length || 0,
        stateLength: state?.length || 0
      });
      return new Response(
        JSON.stringify({ 
          error: 'Missing authorization code or state',
          details: { hasCode: !!code, hasState: !!state }
        }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Parameters received successfully:', { 
      codeLength: code.length, 
      stateLength: state.length 
    });

    // Verify state parameter
    console.log('Verifying state parameter in database...');
    const { data: stateData, error: stateError } = await supabase
      .from('podio_oauth_states')
      .select('*')
      .eq('state', state)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (stateError || !stateData) {
      console.error('State verification failed:', {
        error: stateError,
        hasStateData: !!stateData,
        state: state
      });
      return new Response(
        JSON.stringify({ 
          error: 'Invalid or expired OAuth state',
          details: { errorCode: stateError?.code, message: stateError?.message }
        }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('State verification successful:', { 
      stateId: stateData.id, 
      expiresAt: stateData.expires_at 
    });

    // Exchange code for tokens
    console.log('Exchanging authorization code for tokens...');
    const tokenRequestBody = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code: code
    });

    console.log('Token request details:', {
      endpoint: 'https://podio.com/oauth/token',
      grant_type: 'authorization_code',
      client_id: clientId,
      redirect_uri: redirectUri,
      code_length: code.length
    });

    const tokenResponse = await fetch('https://podio.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenRequestBody
    });

    console.log('Token response status:', tokenResponse.status, tokenResponse.statusText);

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        errorText: errorText
      });
      return new Response(
        JSON.stringify({ 
          error: 'Failed to exchange authorization code for tokens',
          details: { status: tokenResponse.status, statusText: tokenResponse.statusText }
        }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const tokenData: TokenResponse = await tokenResponse.json();
    console.log('Token exchange successful:', {
      token_type: tokenData.token_type,
      expires_in: tokenData.expires_in,
      scope: tokenData.scope,
      has_access_token: !!tokenData.access_token,
      has_refresh_token: !!tokenData.refresh_token
    });

    // Get user info from Podio
    console.log('Fetching user info from Podio...');
    const userResponse = await fetch('https://api.podio.com/user', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('User info response status:', userResponse.status, userResponse.statusText);

    if (!userResponse.ok) {
      const userErrorText = await userResponse.text();
      console.error('Failed to fetch user info from Podio:', {
        status: userResponse.status,
        statusText: userResponse.statusText,
        errorText: userErrorText
      });
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch user information',
          details: { status: userResponse.status, statusText: userResponse.statusText }
        }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const userData: PodioUserResponse = await userResponse.json();
    console.log('User info fetched successfully:', {
      user_id: userData.user_id,
      name: userData.name,
      email: userData.mail,
      username: userData.username,
      has_avatar: !!userData.avatar
    });

    // Calculate token expiry
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in);
    console.log('Token expires at:', expiresAt.toISOString());

    // Save app-level OAuth tokens (no user_id)
    console.log('Saving OAuth tokens to database...');
    const { error: tokenError } = await supabase
      .from('podio_oauth_tokens')
      .upsert({
        user_id: null, // App-level tokens don't have a user_id
        app_level: true,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: expiresAt.toISOString(),
        token_type: tokenData.token_type,
        scope: tokenData.scope
      }, { onConflict: 'app_level' });

    if (tokenError) {
      console.error('Error saving OAuth tokens:', tokenError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to save OAuth tokens',
          details: { errorCode: tokenError.code, message: tokenError.message }
        }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('OAuth tokens saved successfully');

    // Clean up the used state
    console.log('Cleaning up OAuth state...');
    const { error: deleteError } = await supabase
      .from('podio_oauth_states')
      .delete()
      .eq('state', state);

    if (deleteError) {
      console.warn('Failed to delete OAuth state (non-critical):', deleteError);
    } else {
      console.log('OAuth state cleaned up successfully');
    }

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

    console.log('=== Podio OAuth Callback Completed Successfully ===');
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