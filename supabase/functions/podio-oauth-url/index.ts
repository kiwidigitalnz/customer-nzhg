import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

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
    console.log('=== PODIO OAUTH URL FUNCTION START ===');
    console.log('Request timestamp:', new Date().toISOString());
    console.log('Request method:', req.method);
    console.log('Request URL:', req.url);
    console.log('Request headers origin:', req.headers.get('origin'));
    console.log('Request headers referer:', req.headers.get('referer'));
    
    // Get Podio client ID from environment
    const clientId = Deno.env.get('PODIO_CLIENT_ID')?.trim();
    
    console.log('Environment check - Client ID available:', !!clientId);
    
    if (!clientId) {
      console.error('PODIO_CLIENT_ID not configured in environment');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Podio client ID not configured' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate random state for CSRF protection
    const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    console.log('Generated state for CSRF protection:', state);
    
    // Get the origin from the request to construct redirect URI
    const origin = req.headers.get('origin') || req.headers.get('referer')?.split('/').slice(0, 3).join('/');
    const redirectUri = `${origin}/podio-callback`;
    
    console.log('Constructed redirect URI:', redirectUri);
    console.log('Using client ID:', clientId.substring(0, 8) + '...');
    
    // Construct Podio OAuth authorization URL with global scope
    const authUrl = `https://podio.com/oauth/authorize?response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}&scope=${encodeURIComponent('global:all')}`;
    
    console.log('Generated OAuth URL (masked):', authUrl.replace(clientId, clientId.substring(0, 8) + '...'));
    console.log('OAuth URL generation successful');
    
    const response = {
      success: true,
      authUrl,
      state,
      redirectUri
    };
    
    console.log('=== PODIO OAUTH URL FUNCTION SUCCESS ===');
    
    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('=== PODIO OAUTH URL FUNCTION ERROR ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Failed to generate authorization URL',
        details: error.message,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});