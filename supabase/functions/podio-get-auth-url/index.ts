
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Force redeploy 2025-07-09-14:23:05 to pick up updated PODIO_CLIENT_SECRET

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
    console.log('=== PODIO GET AUTH URL FUNCTION START ===');
    console.log('Request details:', {
      method: req.method,
      url: req.url,
      timestamp: new Date().toISOString(),
      headers: Object.fromEntries(req.headers.entries())
    });

    // ENHANCED: Comprehensive environment variable debugging
    const envObj = Deno.env.toObject();
    const envKeys = Object.keys(envObj);
    const podioKeys = envKeys.filter(key => key.toLowerCase().includes('podio'));
    
    console.log('Environment diagnostics:', {
      totalEnvVars: envKeys.length,
      podioRelatedKeys: podioKeys,
      allKeys: envKeys.length < 50 ? envKeys : envKeys.slice(0, 50) // Limit output for readability
    });

    // Get Podio credentials from environment variables with detailed logging
    const clientId = Deno.env.get('PODIO_CLIENT_ID')?.trim();
    const clientSecret = Deno.env.get('PODIO_CLIENT_SECRET')?.trim();
    
    console.log('Credential check details:', {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      clientIdLength: clientId ? clientId.length : 0,
      clientSecretLength: clientSecret ? clientSecret.length : 0,
      clientIdPreview: clientId ? `${clientId.substring(0, 8)}...` : 'NULL/UNDEFINED',
      clientSecretPreview: clientSecret ? `${clientSecret.substring(0, 8)}...` : 'NULL/UNDEFINED',
      clientIdType: typeof clientId,
      clientSecretType: typeof clientSecret
    });

    // Try alternative lookup methods
    let foundClientId = clientId;
    let foundClientSecret = clientSecret;
    
    if (!foundClientId || !foundClientSecret) {
      console.log('Attempting alternative environment variable lookups...');
      
      // Case-insensitive search
      Object.keys(envObj).forEach(key => {
        if (key.toLowerCase() === 'podio_client_id' && !foundClientId) {
          foundClientId = envObj[key];
          console.log(`Found client ID with alternative key: ${key}`);
        }
        if (key.toLowerCase() === 'podio_client_secret' && !foundClientSecret) {
          foundClientSecret = envObj[key];
          console.log(`Found client secret with alternative key: ${key}`);
        }
      });
    }

    console.log('Final credential status:', {
      originalClientId: !!clientId,
      originalClientSecret: !!clientSecret,
      foundClientId: !!foundClientId,
      foundClientSecret: !!foundClientSecret,
      willProceed: !!(foundClientId && foundClientSecret)
    });
    
    // Use found credentials (including alternative lookups)
    if (!foundClientId || !foundClientSecret) {
      const error = 'Podio client credentials not configured';
      console.error('=== CREDENTIAL ERROR DETAILS ===');
      console.error('Missing credentials:', {
        originalClientId: !!clientId,
        originalClientSecret: !!clientSecret,
        foundClientId: !!foundClientId,
        foundClientSecret: !!foundClientSecret,
        podioKeysInEnv: podioKeys,
        totalEnvVars: envKeys.length
      });
      
      return new Response(
        JSON.stringify({ 
          error: error,
          details: 'Missing PODIO_CLIENT_ID or PODIO_CLIENT_SECRET environment variables',
          needs_setup: true,
          debug: {
            foundPodioKeys: podioKeys,
            totalEnvVars: envKeys.length,
            checkedAlternatives: true,
            timestamp: new Date().toISOString()
          }
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
      clientId: foundClientId.substring(0, 8) + '...',
      redirectUri,
      state
    });
    
    // Build the Podio authorization URL using found credentials
    const authUrl = `https://podio.com/oauth/authorize?client_id=${foundClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
    
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
