
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

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

  try {
    // Parse request body
    const requestData = await req.json();
    const { fileId } = requestData;

    if (!fileId) {
      return new Response(
        JSON.stringify({ error: 'Podio file ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Podio access token from client credentials
    const clientId = Deno.env.get('PODIO_CLIENT_ID');
    const clientSecret = Deno.env.get('PODIO_CLIENT_SECRET');
    
    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({ error: 'Podio credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const authResponse = await fetch('https://podio.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'grant_type': 'client_credentials',
        'client_id': clientId,
        'client_secret': clientSecret,
        'scope': 'global', // Default scope as per Podio docs
      }),
    });
    
    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      return new Response(
        JSON.stringify({ 
          error: 'Failed to obtain authentication token',
          details: errorText
        }),
        { status: authResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const authData = await authResponse.json();
    const accessToken = authData.access_token;

    // Make request to Podio to get file info
    const fileResponse = await fetch(`https://api.podio.com/file/${fileId}`, {
      headers: {
        'Authorization': `OAuth2 ${accessToken}`,
      },
    });

    if (!fileResponse.ok) {
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch file from Podio',
          status: fileResponse.status
        }),
        { status: fileResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fileData = await fileResponse.json();
    
    // Return the file URL to the client
    return new Response(
      JSON.stringify({
        url: fileData.link,
        mimetype: fileData.mimetype,
        filename: fileData.name,
        file_id: fileData.file_id,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error proxying Podio file request:', error);
    
    return new Response(
      JSON.stringify({ error: 'Failed to proxy Podio file request', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
