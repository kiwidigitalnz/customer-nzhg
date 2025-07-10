import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.31.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'method_not_allowed',
        error_description: 'Only POST method is supported'
      }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    console.log('=== PODIO PROXY FUNCTION START ===');
    console.log('Request timestamp:', new Date().toISOString());

    // Get Supabase credentials
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase credentials not configured');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Supabase credentials not configured' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { method, url, headers: requestHeaders, body: requestBody } = await req.json();
    
    if (!method || !url) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'missing_parameters',
          error_description: 'Method and URL are required'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Proxy request:', { method, url: url.replace(/\/\d+/g, '/***') });

    // Get current access token
    const { data: tokens, error: tokenError } = await supabase
      .from('podio_auth_tokens')
      .select('access_token, expires_at')
      .order('created_at', { ascending: false })
      .limit(1);

    if (tokenError || !tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'no_auth_token',
          error_description: 'No valid authentication token found. Please complete OAuth first.'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = tokens[0];
    const now = new Date();
    const expiresAt = new Date(token.expires_at);

    // Check if token is expired
    if (now >= expiresAt) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'token_expired',
          error_description: 'Authentication token expired. Please re-authenticate.'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare headers for Podio API call
    const podioHeaders = {
      'Authorization': `Bearer ${token.access_token}`,
      'Content-Type': 'application/json',
      ...requestHeaders
    };

    // Make the proxied request to Podio API
    const podioResponse = await fetch(url, {
      method: method,
      headers: podioHeaders,
      body: requestBody ? JSON.stringify(requestBody) : undefined,
    });

    console.log('Podio API response:', {
      status: podioResponse.status,
      statusText: podioResponse.statusText
    });

    // Get response body
    let responseData;
    const contentType = podioResponse.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      try {
        responseData = await podioResponse.json();
      } catch (parseError) {
        responseData = { error: 'Failed to parse JSON response' };
      }
    } else {
      responseData = { text: await podioResponse.text() };
    }

    // Return the proxied response
    return new Response(
      JSON.stringify({
        success: podioResponse.ok,
        status: podioResponse.status,
        statusText: podioResponse.statusText,
        data: responseData,
        headers: Object.fromEntries(podioResponse.headers.entries())
      }),
      { 
        status: podioResponse.ok ? 200 : podioResponse.status, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('=== PODIO PROXY FUNCTION ERROR ===');
    console.error('Error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'unexpected_error',
        error_description: error.message || 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});