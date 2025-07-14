import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.31.0';

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
    console.log('Received OAuth callback request');
    
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

    // Create Supabase client with service key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if this is a direct POST request from the frontend
    let code, state, error, errorDescription;
    
    if (req.method === 'POST') {
      // Extract parameters from the POST body
      const body = await req.json();
      code = body.code;
      state = body.state;
      error = body.error;
      errorDescription = body.error_description;
      
      console.log(`Received callback parameters via POST: code: ${code ? 'present' : 'missing'}, state: ${state}, error: ${error || 'none'}`);
    } else {
      // Handle direct URL callback (the traditional way)
      const url = new URL(req.url);
      code = url.searchParams.get('code');
      state = url.searchParams.get('state');
      error = url.searchParams.get('error');
      errorDescription = url.searchParams.get('error_description');
      
      console.log(`Received callback with code: ${code ? 'present' : 'missing'}, state: ${state}, error: ${error || 'none'}`);
    }

    // Handle errors from Podio
    if (error) {
      console.error('Podio OAuth error:', error, errorDescription);
      
      // Return error as JSON for POST requests, redirect for GET requests
      if (req.method === 'POST') {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: error, 
            error_description: errorDescription 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Redirect to the setup page with error for GET requests
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
      
      // Return error as JSON for POST requests, redirect for GET requests
      if (req.method === 'POST') {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'missing_params',
            error_description: 'Code or state missing from OAuth callback'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
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
    // Use the registered domain with specific callback route for Podio OAuth
    const redirectUri = 'https://customer.nzhg.com/podio-callback';

    if (!clientId || !clientSecret) {
      console.error('Missing Podio credentials');
      
      // Return error as JSON for POST requests, redirect for GET requests
      if (req.method === 'POST') {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'configuration_error',
            error_description: 'Podio credentials not configured'
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': `https://customer.nzhg.com/podio-setup?error=configuration_error&error_description=Podio credentials not configured`
        }
      });
    }

    // Exchange the code for an access token - use form-encoded data as Podio expects
    console.log('Exchanging code for access token');
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      redirect_uri: redirectUri,
    });
    
    const tokenResponse = await fetch(PODIO_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams.toString(),
    });

    if (!tokenResponse.ok) {
      const tokenError = await tokenResponse.text();
      console.error('Failed to exchange code for token:', tokenError);
      
      // Return error as JSON for POST requests, redirect for GET requests
      if (req.method === 'POST') {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'token_exchange_failed',
            error_description: tokenError
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
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
          
          // Return error as JSON for POST requests, redirect for GET requests
          if (req.method === 'POST') {
            return new Response(
              JSON.stringify({ 
                success: false, 
                error: 'database_error',
                error_description: 'The podio_auth_tokens table does not exist. Please run the migration.'
              }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          return new Response(null, {
            status: 302,
            headers: {
              ...corsHeaders,
              'Location': `https://customer.nzhg.com/podio-setup?error=database_error&error_description=The podio_auth_tokens table does not exist. Please run the migration.`
            }
          });
        }
        
        // Return error as JSON for POST requests, redirect for GET requests
        if (req.method === 'POST') {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'database_error',
              error_description: fetchError.message
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
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
        
        // Return error as JSON for POST requests, redirect for GET requests
        if (req.method === 'POST') {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'database_error',
              error_description: dbError.message
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        return new Response(null, {
          status: 302,
          headers: {
            ...corsHeaders,
            'Location': `https://customer.nzhg.com/podio-setup?error=database_error&error_description=${encodeURIComponent(dbError.message)}`
          }
        });
      }

      console.log('Podio tokens successfully stored in the database');

      // Return success as JSON for POST requests, redirect for GET requests
      if (req.method === 'POST') {
        return new Response(
          JSON.stringify({ 
            success: true,
            message: 'Podio tokens successfully stored',
            tokenInfo: {
              expires_at: expiresAt,
              expires_in: tokenData.expires_in,
              stored_at: new Date().toISOString()
            }
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Redirect back to the setup page with success message
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': `https://customer.nzhg.com/podio-setup?success=true`
        }
      });
    } catch (dbError) {
      console.error('Unexpected database error:', dbError);
      
      // Return error as JSON for POST requests, redirect for GET requests
      if (req.method === 'POST') {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'database_error',
            error_description: dbError.message || 'Unknown database error'
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': `https://customer.nzhg.com/podio-setup?error=database_error&error_description=${encodeURIComponent(dbError.message || 'Unknown database error')}`
        }
      });
    }
  } catch (error) {
    console.error('Unexpected error in OAuth callback:', error);
    
    // Return error as JSON for POST requests, redirect for GET requests
    if (req.method === 'POST') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'unexpected_error',
          error_description: error.message || 'Unknown error'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Redirect to the setup page with error
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': `https://customer.nzhg.com/podio-setup?error=unexpected_error&error_description=${encodeURIComponent(error.message)}`
      }
    });
  }
});
