
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.31.0';

// Constants for Podio OAuth flow
const PODIO_AUTH_URL = 'https://podio.com/oauth/authorize';
const PODIO_TOKEN_URL = 'https://podio.com/oauth/token';

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
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

    // Handle OAuth callback from Podio
    // Extract code and state from query parameters
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    // Handle errors from Podio
    if (error) {
      console.error('Podio OAuth error:', error, errorDescription);
      // Redirect to the setup page with error
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': `https://customer.nzhg.com/podio-setup?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(errorDescription || '')}`
        }
      });
    }

    // Check if code exists
    if (!code || !state) {
      console.error('Missing code or state in OAuth callback');
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': `https://customer.nzhg.com/podio-setup?error=missing_params&error_description=Code or state missing from OAuth callback`
        }
      });
    }

    // Get Podio credentials from environment
    const clientId = Deno.env.get('PODIO_CLIENT_ID');
    const clientSecret = Deno.env.get('PODIO_CLIENT_SECRET');
    const redirectUri = `${url.origin}/api/podio-oauth-callback`;

    if (!clientId || !clientSecret) {
      console.error('Missing Podio credentials');
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': `https://customer.nzhg.com/podio-setup?error=configuration_error&error_description=Podio credentials not configured`
        }
      });
    }

    // Exchange the code for an access token
    console.log('Exchanging code for access token');
    const tokenResponse = await fetch(PODIO_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'grant_type': 'authorization_code',
        'client_id': clientId,
        'client_secret': clientSecret,
        'code': code,
        'redirect_uri': redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const tokenError = await tokenResponse.text();
      console.error('Failed to exchange code for token:', tokenError);
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': `https://customer.nzhg.com/podio-setup?error=token_exchange_failed&error_description=${encodeURIComponent(tokenError)}`
        }
      });
    }

    const tokenData = await tokenResponse.json();
    console.log('Successfully obtained access token');

    // Calculate token expiry time
    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();

    // Store the token in the podio_tokens table
    // First check if a token already exists and update it, otherwise insert
    const { data: existingTokens, error: fetchError } = await supabase
      .from('podio_auth_tokens')
      .select('id')
      .limit(1);

    if (fetchError) {
      console.error('Error fetching existing tokens:', fetchError);
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': `https://customer.nzhg.com/podio-setup?error=database_error&error_description=${encodeURIComponent(fetchError.message)}`
        }
      });
    }

    let dbOperation;
    if (existingTokens && existingTokens.length > 0) {
      // Update existing token
      dbOperation = supabase
        .from('podio_auth_tokens')
        .update({
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: expiresAt,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingTokens[0].id);
    } else {
      // Insert new token
      dbOperation = supabase
        .from('podio_auth_tokens')
        .insert([{
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: expiresAt,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);
    }

    const { error: dbError } = await dbOperation;
    if (dbError) {
      console.error('Error storing token in database:', dbError);
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': `https://customer.nzhg.com/podio-setup?error=database_error&error_description=${encodeURIComponent(dbError.message)}`
        }
      });
    }

    console.log('Podio tokens successfully stored in the database');

    // Redirect back to the setup page with success message
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': `https://customer.nzhg.com/podio-setup?success=true`
      }
    });

  } catch (error) {
    console.error('Unexpected error in OAuth callback:', error);
    
    // Redirect to the setup page with error
    const url = new URL(req.url);
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': `https://customer.nzhg.com/podio-setup?error=unexpected_error&error_description=${encodeURIComponent(error.message)}`
      }
    });
  }
});
