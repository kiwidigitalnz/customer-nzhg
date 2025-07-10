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
    // Get Podio client ID from environment
    const clientId = Deno.env.get('PODIO_CLIENT_ID');
    
    if (!clientId) {
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
    
    // Get the origin from the request to construct redirect URI
    const origin = req.headers.get('origin') || req.headers.get('referer')?.split('/').slice(0, 3).join('/');
    const redirectUri = `${origin}/podio-callback`;
    
    // Construct Podio OAuth authorization URL
    const authUrl = `https://podio.com/oauth/authorize?response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`;
    
    return new Response(
      JSON.stringify({ 
        success: true,
        authUrl,
        state,
        redirectUri
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating OAuth URL:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Failed to generate authorization URL',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});