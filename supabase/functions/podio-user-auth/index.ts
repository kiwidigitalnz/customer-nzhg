
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.31.0';

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
    // Get Supabase URL and key from environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Supabase credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Podio credentials from environment
    const clientId = Deno.env.get('PODIO_CLIENT_ID');
    const clientSecret = Deno.env.get('PODIO_CLIENT_SECRET');
    const contactsAppId = Deno.env.get('PODIO_CONTACTS_APP_ID');
    
    if (!clientId || !clientSecret || !contactsAppId) {
      console.error('Missing Podio configuration', { 
        hasClientId: !!clientId, 
        hasClientSecret: !!clientSecret, 
        hasContactsAppId: !!contactsAppId
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

    // Get the stored Podio token from the database
    const { data: tokens, error: fetchError } = await supabase
      .from('podio_auth_tokens')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error('Error fetching Podio token:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to retrieve Podio authentication', details: fetchError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No Podio token found. Admin must authenticate with Podio first.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = tokens[0];
    const accessToken = token.access_token;
    
    // Check if token is expired
    const expiresAt = new Date(token.expires_at).getTime();
    const now = Date.now();
    
    if (expiresAt <= now) {
      return new Response(
        JSON.stringify({ error: 'Podio token is expired and needs to be refreshed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Using stored Podio token to search for user');
    
    // Use the token to search for the user by username in the Contacts app
    console.log(`Searching for user with username: ${username} in app: ${contactsAppId}`);
    
    // First, check if the Contacts app exists and is accessible
    try {
      const appResponse = await fetch(`https://api.podio.com/app/${contactsAppId}`, {
        method: 'GET',
        headers: {
          'Authorization': `OAuth2 ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!appResponse.ok) {
        const responseText = await appResponse.text();
        console.error(`Failed to access Contacts app: ${responseText}`);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to access Contacts app. Check app ID and permissions.',
            details: responseText
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('Successfully verified Contacts app access');
    } catch (error) {
      console.error('Error verifying Contacts app access:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to verify Contacts app access', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Now search for the user in the Contacts app
    let userSearchResponse;
    try {
      userSearchResponse = await fetch(`https://api.podio.com/item/app/${contactsAppId}/filter/`, {
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
    } catch (error) {
      console.error('Error during user search request:', error);
      return new Response(
        JSON.stringify({ error: 'Network error during user search', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clone the response to avoid consuming the body multiple times
    const userSearchResponseText = await userSearchResponse.text();
    console.log(`User search response status: ${userSearchResponse.status}`);
    
    if (!userSearchResponse.ok) {
      console.error('Failed to search for user', userSearchResponseText);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to search for user in Contacts app', 
          details: userSearchResponseText,
          status: userSearchResponse.status
        }),
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
    
    console.log(`Found ${userSearchData.items?.length || 0} matching users`);
    
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
    
    if (!storedPassword) {
      console.log('User found but no password field:', username);
      return new Response(
        JSON.stringify({ error: 'User password not set' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (storedPassword !== password) {
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
      expires_at: token.expires_at
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
