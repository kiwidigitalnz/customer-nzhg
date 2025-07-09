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
    console.log('=== Podio Connection Test Started ===');
    
    // Step 1: Environment Variable Check
    const clientId = Deno.env.get('PODIO_CLIENT_ID');
    const clientSecret = Deno.env.get('PODIO_CLIENT_SECRET');
    
    console.log('Environment Check:', {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      clientIdLength: clientId ? clientId.length : 0,
      clientSecretLength: clientSecret ? clientSecret.length : 0,
      clientIdPreview: clientId ? `${clientId.substring(0, 8)}...` : 'NOT_FOUND',
      clientSecretPreview: clientSecret ? `${clientSecret.substring(0, 8)}...` : 'NOT_FOUND'
    });

    const testResults = {
      timestamp: new Date().toISOString(),
      tests: {},
      summary: {
        passed: 0,
        failed: 0,
        total: 0
      }
    };

    // Test 1: Environment Variables Present
    const envTest = {
      name: 'Environment Variables Present',
      passed: !!(clientId && clientSecret),
      details: {
        clientIdExists: !!clientId,
        clientSecretExists: !!clientSecret,
        clientIdValid: !!(clientId && clientId.length > 10),
        clientSecretValid: !!(clientSecret && clientSecret.length > 10)
      }
    };
    testResults.tests.environmentVariables = envTest;
    testResults.summary.total++;
    if (envTest.passed) testResults.summary.passed++;
    else testResults.summary.failed++;

    console.log('Test 1 - Environment Variables:', envTest);

    // Test 2: Podio API Connectivity (if credentials exist)
    let connectivityTest = {
      name: 'Podio API Connectivity',
      passed: false,
      skipped: false,
      details: {}
    };

    if (clientId && clientSecret) {
      try {
        console.log('Testing Podio API connectivity...');
        
        const podioResponse = await fetch('https://podio.com/oauth/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            'grant_type': 'client_credentials',
            'client_id': clientId,
            'client_secret': clientSecret,
          }),
        });

        connectivityTest.details = {
          status: podioResponse.status,
          statusText: podioResponse.statusText,
          headers: Object.fromEntries(podioResponse.headers.entries())
        };

        if (podioResponse.ok) {
          const tokenData = await podioResponse.json();
          connectivityTest.passed = true;
          connectivityTest.details.tokenReceived = !!tokenData.access_token;
          connectivityTest.details.tokenType = tokenData.token_type;
          connectivityTest.details.expiresIn = tokenData.expires_in;
          console.log('Podio API test successful:', connectivityTest.details);
        } else {
          const errorText = await podioResponse.text();
          connectivityTest.details.error = errorText;
          console.log('Podio API test failed:', connectivityTest.details);
        }
      } catch (error) {
        connectivityTest.details.error = error.message;
        connectivityTest.details.stack = error.stack;
        console.error('Podio API test error:', error);
      }
    } else {
      connectivityTest.skipped = true;
      connectivityTest.details.reason = 'Missing credentials - skipping API test';
      console.log('Skipping Podio API test - missing credentials');
    }

    testResults.tests.connectivity = connectivityTest;
    testResults.summary.total++;
    if (connectivityTest.passed) testResults.summary.passed++;
    else if (!connectivityTest.skipped) testResults.summary.failed++;

    // Test 3: Network Configuration
    const networkTest = {
      name: 'Network Configuration',
      passed: true,
      details: {
        canReachPodio: false,
        dnsResolution: 'unknown',
        sslHandshake: 'unknown'
      }
    };

    try {
      // Simple connectivity test to podio.com
      const simpleResponse = await fetch('https://podio.com', { 
        method: 'HEAD',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      networkTest.details.canReachPodio = simpleResponse.ok;
      networkTest.details.podioStatus = simpleResponse.status;
      console.log('Network test - can reach Podio:', networkTest.details);
    } catch (error) {
      networkTest.passed = false;
      networkTest.details.error = error.message;
      console.error('Network test failed:', error);
    }

    testResults.tests.network = networkTest;
    testResults.summary.total++;
    if (networkTest.passed) testResults.summary.passed++;
    else testResults.summary.failed++;

    // Generate recommendations
    const recommendations = [];
    
    if (!envTest.passed) {
      recommendations.push({
        priority: 'HIGH',
        issue: 'Missing environment variables',
        action: 'Set PODIO_CLIENT_ID and PODIO_CLIENT_SECRET in Supabase Functions settings',
        url: 'https://supabase.com/dashboard/project/qpswgrmvepttnfetpopk/settings/functions'
      });
    }

    if (!connectivityTest.passed && !connectivityTest.skipped) {
      recommendations.push({
        priority: 'HIGH',
        issue: 'Podio API authentication failed',
        action: 'Verify credentials are correct in Podio developer console',
        details: connectivityTest.details
      });
    }

    if (!networkTest.passed) {
      recommendations.push({
        priority: 'MEDIUM',
        issue: 'Network connectivity issues',
        action: 'Check firewall and DNS settings'
      });
    }

    if (testResults.summary.passed === testResults.summary.total) {
      recommendations.push({
        priority: 'INFO',
        issue: 'All tests passed',
        action: 'Podio integration should be working correctly'
      });
    }

    testResults.recommendations = recommendations;
    testResults.summary.health = testResults.summary.failed === 0 ? 'HEALTHY' : 'ISSUES_DETECTED';

    console.log('=== Test Summary ===');
    console.log(`Passed: ${testResults.summary.passed}/${testResults.summary.total}`);
    console.log('Health:', testResults.summary.health);
    console.log('Recommendations:', recommendations.length);

    return new Response(
      JSON.stringify(testResults, null, 2),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Connection test function error:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Connection test failed',
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