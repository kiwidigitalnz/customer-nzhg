
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { username, password } = await req.json();
    
    // Add basic validation
    if (!username || !password) {
      return new Response(
        JSON.stringify({ error: 'Username and password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // First, ensure we have a token to access Podio
    const authResponse = await fetch('https://podio.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'grant_type': 'client_credentials',
        'client_id': Deno.env.get('PODIO_CLIENT_ID') || '',
        'client_secret': Deno.env.get('PODIO_CLIENT_SECRET') || '',
        'scope': 'global'
      }),
    });

    // Check if auth failed
    if (!authResponse.ok) {
      const errorData = await authResponse.text();
      console.error('Failed to authenticate with Podio:', errorData);
      
      return new Response(
        JSON.stringify({ error: 'Authentication with Podio failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the authentication response
    const authData = await authResponse.json();
    const accessToken = authData.access_token;
    const expiresAt = new Date(Date.now() + (authData.expires_in * 1000)).toISOString();
    
    // Use the token to search for the user in the Contacts app
    const contactsAppId = Deno.env.get('PODIO_CONTACTS_APP_ID') || '';
    const searchEndpoint = `https://api.podio.com/item/app/${contactsAppId}/filter/`;
    
    // Search for contacts with matching username
    const searchResponse = await fetch(searchEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `OAuth2 ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filters: {
          "username": username
        },
        limit: 1
      })
    });

    if (!searchResponse.ok) {
      const searchErrorData = await searchResponse.text();
      console.error('Failed to search Podio contacts:', searchErrorData);
      
      return new Response(
        JSON.stringify({ error: 'Failed to search for user' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const searchData = await searchResponse.json();
    
    // Check if any contacts were found
    if (!searchData.items || searchData.items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the user data
    const userItem = searchData.items[0];
    
    // Helper function to find field value
    const getFieldValue = (fields: any[], externalId: string): any => {
      const field = fields.find(f => f.external_id === externalId);
      if (!field || !field.values || field.values.length === 0) return null;
      
      // For different field types
      if (field.type === 'text' || field.type === 'email' || field.type === 'phone') {
        return field.values[0].value;
      } else if (field.type === 'image' || field.type === 'file') {
        return field.values[0].file_id;
      }
      
      return field.values[0].value;
    };
    
    // Extract user details
    const userId = userItem.item_id;
    const name = userItem.title || 'Unknown Contact';
    const userPassword = getFieldValue(userItem.fields, 'password');
    const email = getFieldValue(userItem.fields, 'email');
    const logoUrl = getFieldValue(userItem.fields, 'logo-url') || getFieldValue(userItem.fields, 'logo');
    
    // Verify password
    if (userPassword !== password) {
      return new Response(
        JSON.stringify({ error: 'Invalid password' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Successful login, return user data
    return new Response(
      JSON.stringify({
        id: userId,
        name: name,
        email: email,
        username: username,
        logoUrl: logoUrl,
        access_token: accessToken,
        expires_at: expiresAt
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error in user authentication:', error);
    
    return new Response(
      JSON.stringify({ error: 'Internal server error during authentication' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
