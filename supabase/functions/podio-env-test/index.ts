import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Minimal test function to isolate environment variable access issues
// This mirrors the exact variable access pattern from podio-authenticate

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  console.log('=== PODIO ENV TEST FUNCTION START ===');
  console.log('Request timestamp:', new Date().toISOString());
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // EXACT SAME environment variable access as podio-authenticate
    const envObj = Deno.env.toObject();
    const envKeys = Object.keys(envObj);
    const podioKeys = envKeys.filter(key => key.toLowerCase().includes('podio'));
    
    console.log('Environment diagnostics:', {
      totalEnvVars: envKeys.length,
      podioKeysFound: podioKeys.length,
      podioKeys: podioKeys,
      allKeys: envKeys.length < 50 ? envKeys : `${envKeys.length} keys (truncated for readability)`
    });
    
    // Check if we can find the client ID and secret (case insensitive) - EXACT SAME LOGIC
    let clientId = Deno.env.get('PODIO_CLIENT_ID');
    let clientSecret = Deno.env.get('PODIO_CLIENT_SECRET');
    
    console.log('Initial variable access results:', {
      clientIdDirect: Boolean(clientId),
      clientSecretDirect: Boolean(clientSecret),
      clientIdLength: clientId?.length || 0,
      clientSecretLength: clientSecret?.length || 0
    });
    
    // If not found by exact match, try to find it case-insensitively - EXACT SAME LOGIC
    if (!clientId || !clientSecret) {
      Object.keys(envObj).forEach(key => {
        if (key.toLowerCase() === 'podio_client_id'.toLowerCase() && !clientId) {
          clientId = envObj[key];
          console.log(`Found client ID with case-insensitive match: ${key}`);
        }
        if (key.toLowerCase() === 'podio_client_secret'.toLowerCase() && !clientSecret) {
          clientSecret = envObj[key];
          console.log(`Found client secret with case-insensitive match: ${key}`);
        }
      });
    }

    console.log('Final variable access results:', {
      clientIdExists: Boolean(clientId),
      clientSecretExists: Boolean(clientSecret),
      clientIdLength: clientId?.length || 0,
      clientSecretLength: clientSecret?.length || 0
    });

    // Return SUCCESS response with all diagnostic info (but no external API call)
    const testResults = {
      success: true,
      timestamp: new Date().toISOString(),
      environmentAccess: {
        totalEnvVars: envKeys.length,
        podioKeysFound: podioKeys.length,
        podioKeys: podioKeys
      },
      credentialAccess: {
        clientIdExists: Boolean(clientId),
        clientSecretExists: Boolean(clientSecret),
        clientIdLength: clientId?.length || 0,
        clientSecretLength: clientSecret?.length || 0
      },
      variableAccessPattern: 'identical_to_podio_authenticate',
      testType: 'environment_variable_access_only'
    };

    console.log('Test completed successfully, returning results:', testResults);

    return new Response(
      JSON.stringify(testResults),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in podio-env-test:', error);
    
    const errorResponse = {
      success: false,
      error: 'Environment variable access test failed',
      details: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    };
    
    return new Response(
      JSON.stringify(errorResponse),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});