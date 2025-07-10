import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function getRedirectUri(): string {
  // Use the registered domain from Podio OAuth app settings - must match OAuth URL
  return 'https://customer.nzhg.com/podio-callback';
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
    let code: string | null = null;
    let state: string | null = null;
    let podioError: string | null = null;

    if (req.method === 'GET') {
      // Handle direct OAuth callback from Podio
      const url = new URL(req.url);
      code = url.searchParams.get('code');
      state = url.searchParams.get('state');
      podioError = url.searchParams.get('error');
    } else if (req.method === 'POST') {
      // Handle token exchange request from frontend
      const body = await req.json();
      code = body.code;
      state = body.state;
    } else {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (podioError) {
      if (req.method === 'POST') {
        return new Response(
          JSON.stringify({ error: `Podio OAuth error: ${podioError}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        const redirectUrl = getAppRedirectUrl(req, false, `Podio OAuth error: ${podioError}`);
        return new Response(null, {
          status: 302,
          headers: { ...corsHeaders, 'Location': redirectUrl }
        });
      }
    }

    if (!code || !state) {
      if (req.method === 'POST') {
        return new Response(
          JSON.stringify({ error: 'Missing required parameters' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        const redirectUrl = getAppRedirectUrl(req, false, 'Missing required parameters');
        return new Response(null, {
          status: 302,
          headers: { ...corsHeaders, 'Location': redirectUrl }
        });
      }
    }

    const podioClientId = Deno.env.get('PODIO_CLIENT_ID');
    const podioClientSecret = Deno.env.get('PODIO_CLIENT_SECRET');

    if (!podioClientId || !podioClientSecret) {
      if (req.method === 'POST') {
        return new Response(
          JSON.stringify({ error: 'Server configuration error' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        const redirectUrl = getAppRedirectUrl(req, false, 'Server configuration error');
        return new Response(null, {
          status: 302,
          headers: { ...corsHeaders, 'Location': redirectUrl }
        });
      }
    }

    const redirectUri = getRedirectUri();
    
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
      if (req.method === 'POST') {
        return new Response(
          JSON.stringify({ error: `Token exchange failed: ${tokenData.error || 'Unknown error'}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        const redirectUrl = getAppRedirectUrl(req, false, `Token exchange failed: ${tokenData.error || 'Unknown error'}`);
        return new Response(null, {
          status: 302,
          headers: { ...corsHeaders, 'Location': redirectUrl }
        });
      }
    }

    if (!tokenData.access_token || !tokenData.refresh_token) {
      if (req.method === 'POST') {
        return new Response(
          JSON.stringify({ error: 'Invalid token response' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        const redirectUrl = getAppRedirectUrl(req, false, 'Invalid token response');
        return new Response(null, {
          status: 302,
          headers: { ...corsHeaders, 'Location': redirectUrl }
        });
      }
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
      if (req.method === 'POST') {
        return new Response(
          JSON.stringify({ error: 'Failed to store tokens' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        const redirectUrl = getAppRedirectUrl(req, false, 'Failed to store tokens');
        return new Response(null, {
          status: 302,
          headers: { ...corsHeaders, 'Location': redirectUrl }
        });
      }
    }

    if (req.method === 'POST') {
      return new Response(
        JSON.stringify({ success: true, message: 'OAuth tokens stored successfully' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      const redirectUrl = getAppRedirectUrl(req, true);
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, 'Location': redirectUrl }
      });
    }

  } catch (error) {
    if (req.method === 'POST') {
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      const redirectUrl = getAppRedirectUrl(req, false, 'Internal server error');
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, 'Location': redirectUrl }
      });
    }
  }
});