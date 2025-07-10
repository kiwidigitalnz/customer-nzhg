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
    console.log('Handling CORS preflight request');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('=== PODIO OAUTH CALLBACK FUNCTION START ===');
    console.log('Request timestamp:', new Date().toISOString());
    console.log('Request method:', req.method);
    console.log('Request URL:', req.url);
    console.log('Request headers origin:', req.headers.get('origin'));
    console.log('Request headers referer:', req.headers.get('referer'));
    console.log('Deployment verification: Function is running and accessible');
    
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
    let body;
    try {
      body = await req.json();
      console.log('Successfully parsed request body');
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'invalid_request_body',
          error_description: 'Failed to parse JSON body'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { code, state, error, error_description: errorDescription } = body;
    
    console.log('Callback parameters received:', {
      hasCode: !!code,
      codeLength: code ? code.length : 0,
      state: state,
      error: error || 'none',
      errorDescription: errorDescription || 'none',
      bodyKeys: Object.keys(body)
    });

    // Handle test calls from debug panel
    if (code === 'test_auth_code_123' && state === 'test_state_456') {
      console.log('Debug panel test detected, validating function accessibility');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'token_exchange_failed',
          error_description: 'Test call successful - function is accessible and validating parameters',
          debug: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    // Validate required parameters
    if (!code || !state) {
      console.error('Missing required parameters in OAuth callback:', {
        hasCode: !!code,
        hasState: !!state,
        bodyKeys: Object.keys(body)
      });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'missing_params',
          error_description: 'Code and state parameters are required for OAuth callback',
          received_params: Object.keys(body)
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
    console.log('Token exchange request details:', {
      url: PODIO_TOKEN_URL,
      method: 'POST',
      contentType: 'application/x-www-form-urlencoded',
      formDataKeys: Array.from(formData.keys())
    });
    
    const tokenResponse = await fetch(PODIO_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });
    
    console.log('Token exchange response received:', {
      status: tokenResponse.status,
      statusText: tokenResponse.statusText,
      headers: Object.fromEntries(tokenResponse.headers.entries())
    });

    if (!tokenResponse.ok) {
      let tokenError;
      try {
        tokenError = await tokenResponse.text();
      } catch (readError) {
        tokenError = 'Failed to read error response';
      }
      
      console.error('Failed to exchange code for token:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        body: tokenError,
        headers: Object.fromEntries(tokenResponse.headers.entries())
      });
      
      // Handle specific Podio error cases
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
      
      if (tokenResponse.status === 400) {
        // Parse error if possible
        let errorDetails = tokenError;
        try {
          const parsedError = JSON.parse(tokenError);
          errorDetails = parsedError.error_description || parsedError.error || tokenError;
        } catch (parseError) {
          // Keep original error text
        }
        
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'invalid_grant',
            error_description: `Invalid authorization code or redirect URI: ${errorDetails}`,
            status: tokenResponse.status
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (tokenResponse.status === 401) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'invalid_client',
            error_description: 'Invalid client credentials',
            status: tokenResponse.status
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'token_exchange_failed',
          error_description: tokenError || 'Unknown error during token exchange',
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
      console.log('Database connection test - attempting to query podio_auth_tokens table');
      
      // First check if a token already exists and update it, otherwise insert
      const { data: existingTokens, error: fetchError } = await supabase
        .from('podio_auth_tokens')
        .select('id')
        .limit(1);
        
      console.log('Database query result:', {
        hasData: !!existingTokens,
        dataLength: existingTokens ? existingTokens.length : 0,
        hasError: !!fetchError,
        errorCode: fetchError?.code,
        errorMessage: fetchError?.message
      });

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
      console.log('=== PODIO OAUTH CALLBACK FUNCTION SUCCESS ===');

      // Return success response
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Podio tokens successfully stored',
          timestamp: new Date().toISOString()
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
    console.error('=== PODIO OAUTH CALLBACK FUNCTION ERROR ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error occurred at:', new Date().toISOString());
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'unexpected_error',
        error_description: error.message || 'Unknown error',
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
