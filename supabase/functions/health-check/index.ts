
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
    // Get full environment for diagnostic purposes
    const envObj = Deno.env.toObject();
    const envKeys = Object.keys(envObj).sort();
    
    // Basic response for GET requests
    if (req.method === 'GET') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          timestamp: new Date().toISOString(),
          environment: Deno.env.get('ENVIRONMENT') || 'development',
          // Add basic diagnostics to help identify issues
          available_keys_count: envKeys.length,
          podio_keys_count: envKeys.filter(key => key.includes('PODIO')).length
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Check for POST with specific checks
    if (req.method === 'POST') {
      const requestData = await req.json().catch(() => ({}));
      const response = {
        status: 'ok',
        timestamp: new Date().toISOString(),
      };
      
      // Check secrets configuration
      if (requestData.check_secrets) {
        // Show all environment keys (safely, without values)
        console.log(`Total environment variables available: ${envKeys.length}`);
        console.log('All environment keys:', envKeys);
        
        // Check for required Podio secrets - be case insensitive in our search
        const requiredSecrets = [
          'PODIO_CLIENT_ID',
          'PODIO_CLIENT_SECRET',
          'PODIO_CONTACTS_APP_TOKEN',
          'PODIO_PACKING_SPEC_APP_TOKEN',
          'PODIO_CONTACTS_APP_ID',
          'PODIO_PACKING_SPEC_APP_ID'
        ];
        
        // Try to find any key that might match our required secrets (case insensitive)
        const secretsLookup = {};
        envKeys.forEach(key => {
          // Match for similar keys regardless of case
          const keyLower = key.toLowerCase();
          requiredSecrets.forEach(requiredKey => {
            if (keyLower === requiredKey.toLowerCase()) {
              secretsLookup[requiredKey] = key;
            }
          });
        });
        
        console.log('Found matching Podio keys (with actual casing):', secretsLookup);
        
        // Check actual values by their real key names (from secretsLookup)
        const podioKeys = envKeys.filter(key => key.toLowerCase().includes('podio'));
        console.log('All Podio-related keys found (case preserved):', podioKeys);
        
        // Debug log values (safely)
        podioKeys.forEach(key => {
          const value = Deno.env.get(key);
          console.log(`Key: ${key}, Value present: ${Boolean(value)}, Length: ${value ? value.length : 0}`);
        });
        
        // Check if we have all required secrets with values
        const secretsStatus = {};
        requiredSecrets.forEach(requiredKey => {
          // Try to get the value using the actual key name from our lookup
          const actualKey = secretsLookup[requiredKey] || requiredKey;
          const value = Deno.env.get(actualKey);
          
          // Record detailed information about this secret's status
          secretsStatus[requiredKey] = {
            key_found: Boolean(secretsLookup[requiredKey]),
            actual_key: secretsLookup[requiredKey] || null,
            value_present: Boolean(value),
            value_length: value ? value.length : 0
          };
        });
        
        // Add to the response - simplified version for the frontend
        response['detailed_secrets'] = secretsStatus;
        
        // Simplified version for backwards compatibility
        const simpleSecretStatus = {};
        Object.entries(secretsStatus).forEach(([key, details]) => {
          simpleSecretStatus[key] = details.value_present;
        });
        response['secrets'] = simpleSecretStatus;
        
        response['available_keys'] = podioKeys;
        response['all_keys_count'] = envKeys.length;
      }

      // Try authentication against Podio API
      if (requestData.test_auth) {
        // Check both for the exact case and for a case-insensitive match
        let clientId = Deno.env.get('PODIO_CLIENT_ID');
        let clientSecret = Deno.env.get('PODIO_CLIENT_SECRET');
        
        // If not found by exact match, try to find it case-insensitively
        if (!clientId || !clientSecret) {
          const envObj = Deno.env.toObject();
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
        
        if (!clientId || !clientSecret) {
          response['auth_test'] = {
            success: false,
            error: 'Missing Podio client credentials',
            client_id_present: Boolean(clientId),
            client_secret_present: Boolean(clientSecret),
            debug_info: {
              all_keys: envKeys,
              podio_keys: envKeys.filter(key => key.toLowerCase().includes('podio'))
            }
          };
        } else {
          try {
            console.log('Attempting authentication with credentials');
            console.log(`Client ID length: ${clientId.length}`);
            console.log(`Client Secret length: ${clientSecret.length}`);
            
            // Test actual authentication
            const authResponse = await fetch('https://podio.com/oauth/token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: new URLSearchParams({
                'grant_type': 'client_credentials',
                'client_id': clientId,
                'client_secret': clientSecret,
                'scope': 'global',
              }),
            });
            
            if (!authResponse.ok) {
              let errorText = '';
              try {
                errorText = await authResponse.text();
              } catch (e) {
                errorText = 'Could not read error response';
              }
              
              response['auth_test'] = {
                success: false,
                error: errorText,
                status: authResponse.status,
                request_debug: {
                  client_id_length: clientId.length,
                  client_secret_length: clientSecret.length
                }
              };
            } else {
              const authData = await authResponse.json();
              response['auth_test'] = {
                success: true,
                token_type: authData.token_type,
                expires_in: authData.expires_in,
                scope: authData.scope || 'global'
              };
            }
          } catch (error) {
            response['auth_test'] = {
              success: false,
              error: error.message,
              stack: error.stack
            };
          }
        }
      }
      
      return new Response(
        JSON.stringify(response),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Fallback for unsupported methods
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
    
  } catch (error) {
    console.error('Health check error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Health check failed', 
        details: error.message,
        stack: error.stack
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
