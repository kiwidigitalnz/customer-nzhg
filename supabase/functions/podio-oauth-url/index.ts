import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

function getRedirectUri(req: Request): string {
  const origin = req.headers.get('origin') || req.headers.get('referer')?.split('/').slice(0, 3).join('/');
  return origin ? `${origin}/podio-callback` : 'https://customer.nzhg.com/podio-callback';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const clientId = Deno.env.get('PODIO_CLIENT_ID')?.trim();
    
    if (!clientId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Podio client ID not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const redirectUri = getRedirectUri(req);
    
    const authUrl = `https://podio.com/oauth/authorize?response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}&scope=${encodeURIComponent('global:all')}`;
    
    return new Response(
      JSON.stringify({ success: true, authUrl, state, redirectUri }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to generate authorization URL' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});