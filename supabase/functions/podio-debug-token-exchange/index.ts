import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, redirectUri } = await req.json();
    
    if (!code) {
      return new Response(JSON.stringify({ 
        error: 'Missing authorization code',
        success: false 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('🔍 Starting manual token exchange test');
    console.log('Code:', code);
    console.log('Redirect URI:', redirectUri);

    // Get environment variables
    const clientId = Deno.env.get('PODIO_CLIENT_ID');
    const clientSecret = Deno.env.get('PODIO_CLIENT_SECRET');

    console.log('Environment check:');
    console.log('Client ID exists:', !!clientId);
    console.log('Client Secret exists:', !!clientSecret);

    if (!clientId || !clientSecret) {
      return new Response(JSON.stringify({ 
        error: 'Missing Podio credentials in environment',
        success: false,
        details: {
          hasClientId: !!clientId,
          hasClientSecret: !!clientSecret
        }
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prepare the token exchange request
    const tokenUrl = 'https://podio.com/oauth/token';
    
    // Ensure consistent redirect URI - default to the deployed domain
    const finalRedirectUri = redirectUri || 'https://customer.nzhg.com/podio-callback';
    
    const formData = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      redirect_uri: finalRedirectUri
    });

    console.log('🚀 Making token exchange request to Podio');
    console.log('URL:', tokenUrl);
    console.log('Form data keys:', Array.from(formData.keys()));
    console.log('Using redirect URI:', finalRedirectUri);

    const startTime = Date.now();
    
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Podio-Debug-Tool/1.0'
      },
      body: formData.toString()
    });

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    console.log('📊 Response details:');
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    console.log('Response Time:', responseTime + 'ms');
    console.log('Headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('Response body:', responseText);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse response as JSON:', e);
      responseData = { rawResponse: responseText };
    }

    const result = {
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      responseTime: responseTime,
      headers: Object.fromEntries(response.headers.entries()),
      data: responseData,
      timestamp: new Date().toISOString()
    };

    if (response.ok) {
      console.log('✅ Token exchange successful');
      if (responseData.access_token) {
        console.log('Access token received (length):', responseData.access_token.length);
        console.log('Refresh token received:', !!responseData.refresh_token);
        console.log('Expires in:', responseData.expires_in);
      }
    } else {
      console.log('❌ Token exchange failed');
      console.log('Error details:', responseData);
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('🚨 Exception in debug token exchange:', error);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});