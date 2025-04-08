
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
    const appId = Deno.env.get('PODIO_CONTACTS_APP_ID');
    const appToken = Deno.env.get('PODIO_CONTACTS_APP_TOKEN');
    
    if (!clientId || !clientSecret || !appId || !appToken) {
      console.error('Missing Podio configuration', { 
        hasClientId: !!clientId, 
        hasClientSecret: !!clientSecret, 
        hasAppId: !!appId, 
        hasAppToken: !!appToken 
      });
      
      return new Response(
        JSON.stringify({ error: 'Podio credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request data
    const requestData = await req.json();
    const { username, password } = requestData;

    if (!username || !password) {
      return new Response(
        JSON.stringify({ error: 'Username and password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Authenticate using app token instead of client credentials
    console.log('Authenticating with Podio API using app token');
    const authResponse = await fetch('https://podio.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'grant_type': 'app',
        'app_id': appId,
        'app_token': appToken,
        'client_id': clientId,
        'client_secret': clientSecret,
      }),
    });

    if (!authResponse.ok) {
      const authErrorText = await authResponse.text();
      console.error('Failed to authenticate with Podio API using app token', authErrorText);
      return new Response(
        JSON.stringify({ error: 'Failed to authenticate with Podio API', details: authErrorText }),
        { status: authResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authData = await authResponse.json();
    const accessToken = authData.access_token;
    
    console.log('Successfully authenticated with Podio API using app token, searching for user');
    
    // Use the token to search for the user by username
    console.log(`Searching for user with username: ${username} in app: ${appId}`);
    console.log(`Using token: ${accessToken.substring(0, 10)}...`);
    
    const userSearchResponse = await fetch(`https://api.podio.com/item/app/${appId}/filter/`, {
      method: 'POST',
      headers: {
        'Authorization': `OAuth2 ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filters: {
          "customer-portal-username": { "from": username, "to": username }
        }
      }),
    });

    // Clone the response to avoid consuming the body multiple times
    const userSearchResponseText = await userSearchResponse.text();
    
    if (!userSearchResponse.ok) {
      console.error('Failed to search for user', userSearchResponseText);
      return new Response(
        JSON.stringify({ error: 'Failed to search for user', details: userSearchResponseText }),
        { status: userSearchResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the response after we've read it as text
    let userSearchData;
    try {
      userSearchData = JSON.parse(userSearchResponseText);
    } catch (e) {
      console.error('Failed to parse user search response', e);
      return new Response(
        JSON.stringify({ error: 'Failed to parse user search response', details: e.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!userSearchData.items || userSearchData.items.length === 0) {
      console.log('User not found:', username);
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userItem = userSearchData.items[0];
    console.log('Found user item:', userItem.item_id);
    
    // Extract stored password and check
    const storedPassword = getFieldValueByExternalId(userItem, 'customer-portal-password');
    
    if (!storedPassword || storedPassword !== password) {
      console.log('Invalid password for user:', username);
      return new Response(
        JSON.stringify({ error: 'Invalid password' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User authenticated successfully:', username);
    
    // If authentication is successful, extract user data
    const userData = {
      id: userItem.item_id,
      name: getFieldValueByExternalId(userItem, 'name') || getFieldValueByExternalId(userItem, 'title'),
      email: getFieldValueByExternalId(userItem, 'email'),
      username: getFieldValueByExternalId(userItem, 'customer-portal-username'),
      logoUrl: getFieldValueByExternalId(userItem, 'logo'),
      // Include access token for API access
      access_token: accessToken,
      expires_in: authData.expires_in,
      expires_at: new Date(Date.now() + (authData.expires_in * 1000)).toISOString(),
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
