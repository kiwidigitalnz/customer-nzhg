import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Standardized redirect URI determination function (matches oauth-url function)
function determineRedirectUri(req: Request): string {
  const origin = req.headers.get('origin') || req.headers.get('referer')?.split('/').slice(0, 3).join('/');
  
  console.log('Determining redirect URI from origin:', origin);
  console.log('Request URL:', req.url);
  console.log('Request origin header:', req.headers.get('origin'));
  console.log('Request referer header:', req.headers.get('referer'));
  
  let redirectUri: string;
  
  // Check if we're in development or production environment
  if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('supabase.co')) {
    // For development or direct Supabase access, use the deployed domain
    redirectUri = 'https://customer.nzhg.com/podio-callback';
    console.log('Using deployed domain for development/supabase access');
  } else {
    // For production custom domains, construct the redirect URI
    redirectUri = `${origin}/podio-callback`;
    console.log('Using origin-based redirect URI for custom domain');
  }
  
  console.log('Final redirect URI:', redirectUri);
  return redirectUri;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate request method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (e) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Extract parameters from request body
    const { code, state, error: podioError } = requestBody;

    console.log('OAuth callback received:', { 
      hasCode: !!code, 
      hasState: !!state, 
      hasError: !!podioError 
    });

    // Handle errors returned by Podio
    if (podioError) {
      console.error('Podio OAuth error:', podioError);
      return new Response(
        JSON.stringify({ 
          error: 'Podio OAuth error', 
          details: podioError 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate required parameters
    if (!code || !state) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required parameters',
          details: 'Code and state are required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get Podio credentials from environment
    const podioClientId = Deno.env.get('PODIO_CLIENT_ID');
    const podioClientSecret = Deno.env.get('PODIO_CLIENT_SECRET');

    if (!podioClientId || !podioClientSecret) {
      console.error('Missing Podio credentials');
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error',
          details: 'Missing Podio credentials' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Use standardized redirect URI determination (same logic as oauth-url function)
    const redirectUri = determineRedirectUri(req);
    
    console.log('Using redirect URI:', redirectUri);
    
    // Validate that redirect URI is consistent with what would be generated
    if (!redirectUri || (!redirectUri.includes('customer.nzhg.com') && !redirectUri.includes('localhost'))) {
      console.error('Invalid redirect URI generated:', redirectUri);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid redirect URI',
          details: 'Could not determine a valid redirect URI from request headers' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Prepare form data for token exchange
    const formData = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: podioClientId,
      client_secret: podioClientSecret,
      code: code,
      redirect_uri: redirectUri
    });

    // Exchange authorization code for tokens
    console.log('Exchanging code for tokens...');
    const tokenResponse = await fetch('https://podio.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: formData.toString()
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', tokenData);
      
      // Handle specific error types
      if (tokenData.error === 'invalid_grant') {
        return new Response(
          JSON.stringify({ 
            error: 'Invalid authorization code',
            details: 'The authorization code has expired or is invalid' 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      if (tokenData.error === 'invalid_client') {
        return new Response(
          JSON.stringify({ 
            error: 'Invalid client credentials',
            details: 'The Podio client ID or secret is incorrect' 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      return new Response(
        JSON.stringify({ 
          error: 'Token exchange failed',
          details: tokenData.error_description || tokenData.error || 'Unknown error' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate token response
    if (!tokenData.access_token || !tokenData.refresh_token) {
      console.error('Invalid token response:', tokenData);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid token response',
          details: 'Missing access_token or refresh_token' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Calculate token expiry time
    const expiresIn = tokenData.expires_in || 3600; // Default to 1 hour
    const expiresAt = new Date(Date.now() + (expiresIn * 1000)).toISOString();

    console.log('Tokens received successfully, storing in database...');

    // Store tokens in database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Try to update existing token or insert new one
    const { data: existingToken } = await supabase
      .from('podio_auth_tokens')
      .select('id')
      .limit(1)
      .maybeSingle();

    let dbResult;
    if (existingToken) {
      // Update existing token
      dbResult = await supabase
        .from('podio_auth_tokens')
        .update({
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: expiresAt,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingToken.id);
    } else {
      // Insert new token
      dbResult = await supabase
        .from('podio_auth_tokens')
        .insert({
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: expiresAt
        });
    }

    if (dbResult.error) {
      console.error('Database error:', dbResult.error);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to store tokens',
          details: dbResult.error.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Tokens stored successfully');

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'OAuth callback processed successfully',
        expires_at: expiresAt
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error in OAuth callback:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});