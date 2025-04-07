
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
    // If it's a POST request, assume we're doing more than a basic health check
    if (req.method === 'POST') {
      const requestData = await req.json().catch(() => ({}));
      
      // Check Podio environment variables if requested
      if (requestData.check_secrets) {
        console.log('Checking Podio secrets configuration...');
        
        // Get all secrets - directly access the secrets
        const clientId = Deno.env.get('PODIO_CLIENT_ID');
        const clientSecret = Deno.env.get('PODIO_CLIENT_SECRET');
        const contactsAppId = Deno.env.get('PODIO_CONTACTS_APP_ID');
        const packingSpecAppId = Deno.env.get('PODIO_PACKING_SPEC_APP_ID');
        const contactsAppToken = Deno.env.get('PODIO_CONTACTS_APP_TOKEN');
        const packingSpecAppToken = Deno.env.get('PODIO_PACKING_SPEC_APP_TOKEN');
        
        // Log full environment variable names to check for exact matches
        console.log('Environment variable names in Deno.env:');
        for (const key of Object.keys(Deno.env.toObject())) {
          if (key.includes('PODIO')) {
            console.log(`Found variable: ${key}`);
          }
        }
        
        // Log raw values (first few characters for secrets)
        console.log('Raw values check:');
        console.log('PODIO_CLIENT_ID raw value:', clientId === null ? 'null' : (clientId === undefined ? 'undefined' : `present (${clientId.length} chars)`));
        console.log('PODIO_CLIENT_SECRET raw value:', clientSecret === null ? 'null' : (clientSecret === undefined ? 'undefined' : `present (${clientSecret.length} chars)`));
        console.log('PODIO_CONTACTS_APP_ID raw value:', contactsAppId);
        console.log('PODIO_PACKING_SPEC_APP_ID raw value:', packingSpecAppId);
        console.log('PODIO_CONTACTS_APP_TOKEN raw value:', contactsAppToken === null ? 'null' : (contactsAppToken === undefined ? 'undefined' : `present (${contactsAppToken.length} chars)`));
        console.log('PODIO_PACKING_SPEC_APP_TOKEN raw value:', packingSpecAppToken === null ? 'null' : (packingSpecAppToken === undefined ? 'undefined' : `present (${packingSpecAppToken.length} chars)`));
        
        // Convert to boolean for the response
        const secretsCheck = {
          PODIO_CLIENT_ID: Boolean(clientId),
          PODIO_CLIENT_SECRET: Boolean(clientSecret),
          PODIO_CONTACTS_APP_ID: Boolean(contactsAppId),
          PODIO_PACKING_SPEC_APP_ID: Boolean(packingSpecAppId),
          PODIO_CONTACTS_APP_TOKEN: Boolean(contactsAppToken),
          PODIO_PACKING_SPEC_APP_TOKEN: Boolean(packingSpecAppToken),
        };
        
        // Test authentication if requested and all credentials are available
        let authTest = null;
        if (requestData.test_auth && clientId && clientSecret) {
          console.log('Testing Podio authentication...');
          try {
            // Call Podio API to authenticate with client credentials
            const podioResponse = await fetch('https://podio.com/oauth/token', {
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
            
            console.log('Podio auth response status:', podioResponse.status);
            
            if (podioResponse.ok) {
              const authData = await podioResponse.json();
              authTest = {
                success: true,
                token_type: authData.token_type,
                expires_in: authData.expires_in,
                scope: authData.scope
              };
              console.log('Authentication test successful');
            } else {
              let errorText = '';
              try {
                errorText = await podioResponse.text();
              } catch (e) {
                errorText = 'Could not read error response';
              }
              authTest = {
                success: false,
                status: podioResponse.status,
                error: errorText
              };
              console.error('Authentication test failed:', podioResponse.status, errorText);
            }
          } catch (error) {
            console.error('Error testing authentication:', error);
            authTest = {
              success: false,
              error: error.message
            };
          }
        }
        
        return new Response(
          JSON.stringify({
            status: 'ok',
            timestamp: new Date().toISOString(),
            environment: Deno.env.get('ENVIRONMENT') || 'development',
            secrets: secretsCheck,
            auth_test: authTest,
            diagnostics: {
              envKeys: Object.keys(Deno.env.toObject()).filter(key => key.includes('PODIO')),
              functionDeployTime: new Date().toISOString()
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // Default health check response
    return new Response(
      JSON.stringify({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: Deno.env.get('ENVIRONMENT') || 'development'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in health check function:', error);
    return new Response(
      JSON.stringify({
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
