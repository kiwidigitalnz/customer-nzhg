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

function getAppRedirectUrl(req: Request, success: boolean, error?: string): string {
  const origin = req.headers.get('origin') || req.headers.get('referer')?.split('/').slice(0, 3).join('/');
  const baseUrl = origin || 'https://customer.nzhg.com';
  if (success) {
    return `${baseUrl}/podio-callback?podio_auth=success`;
  } else {
    const errorParam = error ? `&error=${encodeURIComponent(error)}` : '';
    return `${baseUrl}/podio-callback?podio_auth=error${errorParam}`;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'GET') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const podioError = url.searchParams.get('error');

    if (podioError) {
      const redirectUrl = getAppRedirectUrl(req, false, `Podio OAuth error: ${podioError}`);
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, 'Location': redirectUrl }
      });
    }

    if (!code || !state) {
      const redirectUrl = getAppRedirectUrl(req, false, 'Missing required parameters');
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, 'Location': redirectUrl }
      });
    }

    const podioClientId = Deno.env.get('PODIO_CLIENT_ID');
    const podioClientSecret = Deno.env.get('PODIO_CLIENT_SECRET');

    if (!podioClientId || !podioClientSecret) {
      const redirectUrl = getAppRedirectUrl(req, false, 'Server configuration error');
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, 'Location': redirectUrl }
      });
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
      const redirectUrl = getAppRedirectUrl(req, false, `Token exchange failed: ${tokenData.error || 'Unknown error'}`);
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, 'Location': redirectUrl }
      });
    }

    if (!tokenData.access_token || !tokenData.refresh_token) {
      const redirectUrl = getAppRedirectUrl(req, false, 'Invalid token response');
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, 'Location': redirectUrl }
      });
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
      const redirectUrl = getAppRedirectUrl(req, false, 'Failed to store tokens');
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, 'Location': redirectUrl }
      });
    }

    const redirectUrl = getAppRedirectUrl(req, true);
    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, 'Location': redirectUrl }
    });

  } catch (error) {
    const redirectUrl = getAppRedirectUrl(req, false, 'Internal server error');
    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, 'Location': redirectUrl }
    });
  }
});