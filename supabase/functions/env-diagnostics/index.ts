import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('=== Environment Diagnostics Function Started ===');
    console.log('Request method:', req.method);
    console.log('Request URL:', req.url);
    console.log('Request headers:', Object.fromEntries(req.headers.entries()));

    // Get all environment variables
    const envObj = Deno.env.toObject();
    const envKeys = Object.keys(envObj);

    console.log('Total environment variables found:', envKeys.length);
    console.log('All environment variable keys:', envKeys);

    // Filter Podio-related keys
    const podioKeys = envKeys.filter(key => 
      key.toLowerCase().includes('podio')
    );

    console.log('Podio-related keys found:', podioKeys);

    // Filter Supabase-related keys
    const supabaseKeys = envKeys.filter(key => 
      key.toLowerCase().includes('supabase')
    );

    console.log('Supabase-related keys found:', supabaseKeys);

    // Check specific expected variables
    const expectedVars = [
      'PODIO_CLIENT_ID',
      'PODIO_CLIENT_SECRET', 
      'PODIO_CONTACTS_APP_ID',
      'PODIO_PACKING_SPEC_APP_ID',
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY'
    ];

    const varStatus = {};
    for (const varName of expectedVars) {
      const value = Deno.env.get(varName);
      varStatus[varName] = {
        exists: !!value,
        hasValue: value ? value.length > 0 : false,
        length: value ? value.length : 0,
        preview: value ? `${value.substring(0, 8)}...` : null,
        type: typeof value
      };
      
      console.log(`${varName}:`, {
        exists: !!value,
        length: value ? value.length : 0,
        preview: value ? `${value.substring(0, 8)}...` : null
      });
    }

    // Try alternative lookups
    const alternativeLookups = {};
    for (const varName of expectedVars) {
      // Case insensitive lookup
      const found = Object.keys(envObj).find(key => 
        key.toLowerCase() === varName.toLowerCase()
      );
      if (found && found !== varName) {
        alternativeLookups[varName] = {
          actualKey: found,
          value: envObj[found] ? `${envObj[found].substring(0, 8)}...` : null
        };
      }
    }

    console.log('Alternative key lookups:', alternativeLookups);

    // Check Deno version and permissions
    const denoInfo = {
      version: Deno.version,
      permissions: {
        env: await Deno.permissions.query({ name: 'env' })
      }
    };

    console.log('Deno info:', denoInfo);

    // Detailed Podio credentials check
    const podioClientId = Deno.env.get('PODIO_CLIENT_ID');
    const podioClientSecret = Deno.env.get('PODIO_CLIENT_SECRET');

    console.log('=== Detailed Podio Credentials Check ===');
    console.log('PODIO_CLIENT_ID raw check:', {
      fromDeno: !!podioClientId,
      length: podioClientId ? podioClientId.length : 0,
      startsWithLetter: podioClientId ? /^[a-zA-Z]/.test(podioClientId) : false,
      containsOnlyAlphanumeric: podioClientId ? /^[a-zA-Z0-9]+$/.test(podioClientId) : false
    });

    console.log('PODIO_CLIENT_SECRET raw check:', {
      fromDeno: !!podioClientSecret,
      length: podioClientSecret ? podioClientSecret.length : 0,
      startsWithLetter: podioClientSecret ? /^[a-zA-Z]/.test(podioClientSecret) : false,
      containsOnlyAlphanumeric: podioClientSecret ? /^[a-zA-Z0-9]+$/.test(podioClientSecret) : false
    });

    // Return comprehensive diagnostic information
    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: {
        totalVariables: envKeys.length,
        podioRelated: podioKeys,
        supabaseRelated: supabaseKeys,
        expectedVariables: varStatus,
        alternativeLookups: alternativeLookups
      },
      runtime: {
        deno: denoInfo,
        userAgent: req.headers.get('user-agent'),
        origin: req.headers.get('origin')
      },
      podioSpecific: {
        clientIdExists: !!podioClientId,
        clientSecretExists: !!podioClientSecret,
        bothExist: !!(podioClientId && podioClientSecret),
        credentialsReady: !!(podioClientId && podioClientSecret && 
                            podioClientId.length > 0 && podioClientSecret.length > 0)
      },
      troubleshooting: {
        commonIssues: [
          'Environment variables not properly set in Supabase dashboard',
          'Function deployment timing - variables set after deployment',
          'Typos in variable names (case sensitive)',
          'Variables set but empty/null values',
          'Permission issues accessing environment'
        ],
        nextSteps: [
          'Verify variables are set in Supabase Functions settings',
          'Redeploy functions after setting variables',
          'Check variable names for exact case match',
          'Validate variable values are not empty'
        ]
      }
    };

    console.log('=== Final Diagnostics Summary ===');
    console.log('Credentials ready:', diagnostics.podioSpecific.credentialsReady);
    console.log('Client ID exists:', diagnostics.podioSpecific.clientIdExists);
    console.log('Client Secret exists:', diagnostics.podioSpecific.clientSecretExists);

    return new Response(
      JSON.stringify(diagnostics, null, 2),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in diagnostics function:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Diagnostics function failed',
        details: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});