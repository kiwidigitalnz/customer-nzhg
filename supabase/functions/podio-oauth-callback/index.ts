import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.31.0';

// Force redeploy 2025-07-09-14:23:03 to pick up updated PODIO_CLIENT_SECRET

// Force redeploy 2025-07-09 to pick up updated environment variables

// Constants for Podio OAuth flow
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
    console.log('=== PODIO OAUTH CALLBACK FUNCTION START ===');
    console.log('Request timestamp:', new Date().toISOString());
    console.log('Request method:', req.method);
    
    // Get Supabase URL and key from environment variables
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

    // Create Supabase client with service key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // This function only handles POST requests from the frontend
    if (req.method !== 'POST') {
      console.error('Only POST method is supported');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'method_not_allowed',
          error_description: 'Only POST method is supported'
        }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract parameters from the POST body
    const body = await req.json();
    const { code, state, error, error_description: errorDescription } = body;
    
    console.log('Callback parameters:', {
      hasCode: !!code,
      state: state,
      error: error || 'none',
      errorDescription: errorDescription || 'none'
    });

    // Handle errors from Podio
    if (error) {
      console.error('Podio OAuth error:', error, errorDescription);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: error, 
          error_description: errorDescription 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if code exists
    if (!code || !state) {
      console.error('Missing code or state in OAuth callback');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'missing_params',
          error_description: 'Code or state missing from OAuth callback'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Podio credentials from environment
    const clientId = Deno.env.get('PODIO_CLIENT_ID')?.trim();
    const clientSecret = Deno.env.get('PODIO_CLIENT_SECRET')?.trim();
    
    if (!clientId || !clientSecret) {
      console.error('Missing Podio credentials');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'configuration_error',
          error_description: 'Podio credentials not configured'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the redirect URI - ensure consistency with OAuth URL generation
    const origin = req.headers.get('origin') || req.headers.get('referer')?.split('/').slice(0, 3).join('/');
    const redirectUri = `${origin}/podio-callback`;
    
    console.log('Using redirect URI for token exchange:', redirectUri);

    // Prepare URL-encoded form data for token exchange (Podio requires this format)
    const formData = new URLSearchParams();
    formData.append('grant_type', 'authorization_code');
    formData.append('client_id', clientId);
    formData.append('client_secret', clientSecret);
    formData.append('code', code);
    formData.append('redirect_uri', redirectUri);

    console.log('Exchanging code for access token with URL-encoded data');
    const tokenResponse = await fetch(PODIO_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!tokenResponse.ok) {
      const tokenError = await tokenResponse.text();
      console.error('Failed to exchange code for token:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        body: tokenError
      });
      
      // Handle rate limiting from Podio
      if (tokenResponse.status === 429) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'rate_limited',
            error_description: 'Too many requests to Podio API. Please try again later.',
            retryAfter: tokenResponse.headers.get('Retry-After')
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'token_exchange_failed',
          error_description: tokenError,
          status: tokenResponse.status
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tokenData = await tokenResponse.json();
    console.log('Successfully obtained access token');

    // Calculate token expiry time based on the expires_in value from Podio
    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();

    // Check if the podio_auth_tokens table exists
    try {
      // Try to insert the token data into the database
      console.log('Storing token in database');
      
      // First check if a token already exists and update it, otherwise insert
      const { data: existingTokens, error: fetchError } = await supabase
        .from('podio_auth_tokens')
        .select('id')
        .limit(1);

      if (fetchError) {
        console.error('Error fetching existing tokens:', fetchError);
        
        // Check if the error is because the table doesn't exist
        if (fetchError.message && fetchError.message.includes('relation "podio_auth_tokens" does not exist')) {
          console.error('Table podio_auth_tokens does not exist. Please run the migration.');
          
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'database_error',
              error_description: 'The podio_auth_tokens table does not exist. Please run the migration.'
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'database_error',
            error_description: fetchError.message
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let dbOperation;
      if (existingTokens && existingTokens.length > 0) {
        // Update existing token
        console.log('Updating existing token record');
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
        console.log('Inserting new token record');
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
        
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'database_error',
            error_description: dbError.message
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Podio tokens successfully stored in the database');

      // Return success response
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Podio tokens successfully stored'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
      
    } catch (dbError) {
      console.error('Unexpected database error:', dbError);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'database_error',
          error_description: dbError.message || 'Unknown database error'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Unexpected error in OAuth callback:', error);
    
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
