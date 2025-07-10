import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getRedirectUri(req: Request): string {
  const origin = req.headers.get('origin') || req.headers.get('referer')?.split('/').slice(0, 3).join('/');
  return origin ? `${origin}/podio-callback` : 'https://customer.nzhg.com/podio-callback';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { code, state, error: podioError } = await req.json();

    if (podioError) {
      return new Response(
        JSON.stringify({ error: 'Podio OAuth error', details: podioError }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!code || !state) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const podioClientId = Deno.env.get('PODIO_CLIENT_ID');
    const podioClientSecret = Deno.env.get('PODIO_CLIENT_SECRET');

    if (!podioClientId || !podioClientSecret) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const redirectUri = getRedirectUri(req);
    
    const formData = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: podioClientId,
      client_secret: podioClientSecret,
      code: code,
      redirect_uri: redirectUri
    });

    const tokenResponse = await fetch('https://podio.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: formData.toString()
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Token exchange failed', details: tokenData.error || 'Unknown error' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!tokenData.access_token || !tokenData.refresh_token) {
      return new Response(
        JSON.stringify({ error: 'Invalid token response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const expiresIn = tokenData.expires_in || 3600;
    const expiresAt = new Date(Date.now() + (expiresIn * 1000)).toISOString();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Use UPSERT to simplify database operations
    const { error: dbError } = await supabase
      .from('podio_auth_tokens')
      .upsert({
        id: '1', // Single row approach - always use same ID
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: expiresAt,
        updated_at: new Date().toISOString()
      });

    if (dbError) {
      return new Response(
        JSON.stringify({ error: 'Failed to store tokens' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'OAuth callback processed successfully', expires_at: expiresAt }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});