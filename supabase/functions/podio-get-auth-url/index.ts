
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Force redeploy 2025-07-09 to pick up updated environment variables

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Auth URL request received', {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries())
    });

    // Get Podio credentials from environment variables
    const clientId = Deno.env.get('PODIO_CLIENT_ID');
    const clientSecret = Deno.env.get('PODIO_CLIENT_SECRET');
    
    console.log('Environment check:', {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      clientIdLength: clientId ? clientId.length : 0,
      clientSecretLength: clientSecret ? clientSecret.length : 0
    });
    
    if (!clientId || !clientSecret) {
      const error = 'Podio client credentials not configured';
      console.error(error, {
        missingClientId: !clientId,
        missingClientSecret: !clientSecret
      });
      return new Response(
        JSON.stringify({ 
          error: error,
          details: 'Missing PODIO_CLIENT_ID or PODIO_CLIENT_SECRET environment variables',
          needs_setup: true
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate a random state for CSRF protection
    const state = Math.random().toString(36).substring(2, 15) + 
                  Math.random().toString(36).substring(2, 15);
    
    // Determine the redirect URI based on the request origin
    const url = new URL(req.url);
    let redirectUri = url.origin;
    
    console.log('OAuth URL generation:', {
      clientId: clientId.substring(0, 8) + '...',
      redirectUri,
      state
    });
    
    // Build the Podio authorization URL
    const authUrl = `https://podio.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
    
    console.log('Auth URL generated successfully', {
      authUrlLength: authUrl.length,
      redirectUri
    });
    
    // Return the auth URL to the client
    return new Response(
      JSON.stringify({ 
        authUrl: authUrl,
        state: state,
        success: true
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating auth URL:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error occurred',
        stack: error.stack
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
