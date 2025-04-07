
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Helper to get field value by external ID
function getFieldValueByExternalId(item: any, externalId: string): any {
  if (!item || !item.fields) return null;
  
  for (const field of item.fields) {
    if (field.external_id === externalId) {
      // Handle different field types
      if (field.values && field.values.length > 0) {
        if (field.type === 'text') {
          return field.values[0].value;
        } else if (field.type === 'email') {
          return field.values[0].value;
        } else if (field.type === 'image') {
          return field.values[0].value.file_id;
        } else if (field.type === 'number') {
          return field.values[0].value;
        } else if (field.type === 'date') {
          return field.values[0].start_date;
        } else {
          return field.values[0];
        }
      }
    }
  }
  return null;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get Podio credentials from environment
    const clientId = Deno.env.get('PODIO_CLIENT_ID');
    const clientSecret = Deno.env.get('PODIO_CLIENT_SECRET');
    const appToken = Deno.env.get('PODIO_CONTACTS_APP_TOKEN');

    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({ error: 'Podio credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const requestData = await req.json();
    const { username, password, app_id } = requestData;

    if (!username || !password || !app_id) {
      return new Response(
        JSON.stringify({ error: 'Username, password, and app_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // First authenticate with client credentials
    const authResponse = await fetch('https://podio.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'grant_type': 'client_credentials',
        'client_id': clientId,
        'client_secret': clientSecret,
      }),
    });

    if (!authResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to authenticate with Podio API' }),
        { status: authResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authData = await authResponse.json();
    const accessToken = authData.access_token;

    // Use the token to search for the user by username
    const userSearchResponse = await fetch(`https://api.podio.com/item/app/${app_id}/filter/`, {
      method: 'POST',
      headers: {
        'Authorization': `OAuth2 ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Podio-App': appToken || '',
      },
      body: JSON.stringify({
        filters: {
          "username": { "from": username, "to": username }
        }
      }),
    });

    if (!userSearchResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to search for user', details: await userSearchResponse.text() }),
        { status: userSearchResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userSearchData = await userSearchResponse.json();
    
    if (!userSearchData.items || userSearchData.items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userItem = userSearchData.items[0];
    
    // Extract stored password and check
    const storedPassword = getFieldValueByExternalId(userItem, 'password');
    
    if (!storedPassword || storedPassword !== password) {
      return new Response(
        JSON.stringify({ error: 'Invalid password' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If authentication is successful, extract user data
    const userData = {
      id: userItem.item_id,
      name: getFieldValueByExternalId(userItem, 'name'),
      email: getFieldValueByExternalId(userItem, 'email'),
      username: getFieldValueByExternalId(userItem, 'username'),
      logoUrl: getFieldValueByExternalId(userItem, 'logo-url'),
      access_token: accessToken,
      expires_in: authData.expires_in,
    };

    return new Response(
      JSON.stringify(userData),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error authenticating user:', error);
    
    return new Response(
      JSON.stringify({ error: 'Failed to authenticate user', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
