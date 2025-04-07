
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
    const envKeys = Object.keys(Deno.env.toObject()).sort();
    
    // Basic response for GET requests
    if (req.method === 'GET') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          timestamp: new Date().toISOString(),
          environment: Deno.env.get('ENVIRONMENT') || 'development'
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
        // Check for required Podio secrets
        const requiredSecrets = [
          'PODIO_CLIENT_ID',
          'PODIO_CLIENT_SECRET',
          'PODIO_CONTACTS_APP_TOKEN',
          'PODIO_PACKING_SPEC_APP_TOKEN',
          'PODIO_CONTACTS_APP_ID',
          'PODIO_PACKING_SPEC_APP_ID'
        ];
        
        const podioKeys = envKeys.filter(key => key.includes('PODIO'));
        console.log('Found Podio-related keys:', podioKeys);
        
        // Debug log values (safely)
        podioKeys.forEach(key => {
          const value = Deno.env.get(key);
          console.log(`Key: ${key}, Value: ${value ? 'present (length: ' + value.length + ')' : 'null or empty'}`);
        });
        
        const secretsStatus = {};
        requiredSecrets.forEach(secret => {
          const value = Deno.env.get(secret);
          secretsStatus[secret] = Boolean(value);
        });
        
        response['secrets'] = secretsStatus;
        response['available_keys'] = podioKeys;
      }

      // Try authentication against Podio API
      if (requestData.test_auth) {
        const clientId = Deno.env.get('PODIO_CLIENT_ID');
        const clientSecret = Deno.env.get('PODIO_CLIENT_SECRET');
        
        if (!clientId || !clientSecret) {
          response['auth_test'] = {
            success: false,
            error: 'Missing Podio client credentials',
            client_id_present: Boolean(clientId),
            client_secret_present: Boolean(clientSecret)
          };
        } else {
          try {
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
              const errorText = await authResponse.text();
              response['auth_test'] = {
                success: false,
                error: errorText,
                status: authResponse.status
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
              error: error.message
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
      JSON.stringify({ error: 'Health check failed', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
