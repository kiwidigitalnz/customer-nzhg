import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  userId?: string;
  appLevel?: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Podio OAuth configuration from secrets
    const clientId = Deno.env.get('PODIO_CLIENT_ID');
    const redirectUri = 'https://customer.nzhg.com/podio-oauth-callback';

    if (!clientId) {
      console.error('Missing PODIO_CLIENT_ID environment variable');
      return new Response(
        JSON.stringify({ error: 'Podio OAuth not configured' }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse request body
    let userId: string | undefined;
    let appLevel = false;
    if (req.method === 'POST') {
      const body: RequestBody = await req.json();
      userId = body.userId;
      appLevel = body.appLevel || false;
    }

    // Generate a unique state parameter for security
    const state = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minutes expiry

    // Store the state in the database
    const { error: stateError } = await supabase
      .from('podio_oauth_states')
      .insert({
        state,
        user_id: userId || null,
        expires_at: expiresAt.toISOString()
      });

    if (stateError) {
      console.error('Error storing OAuth state:', stateError);
      return new Response(
        JSON.stringify({ error: 'Failed to initialize OAuth flow' }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Build Podio OAuth URL
    const authUrl = new URL('https://podio.com/oauth/authorize');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('response_type', 'code');

    console.log('Generated OAuth URL:', authUrl.toString());

    return new Response(
      JSON.stringify({ 
        authUrl: authUrl.toString(),
        state,
        redirectUri 
      }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in podio-oauth-url function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});