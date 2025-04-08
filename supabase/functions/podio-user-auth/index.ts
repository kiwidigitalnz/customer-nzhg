
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

// Set DEBUG mode to true for more verbose logging
const DEBUG = true;

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
    const contactsAppId = Deno.env.get('PODIO_CONTACTS_APP_ID');
    
    if (!contactsAppId) {
      console.error('Missing Podio configuration', { 
        hasContactsAppId: !!contactsAppId
      });
      
      return new Response(
        JSON.stringify({ error: 'Podio Contacts App ID not configured' }),
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
    
    // First, let's try to get a view of all items to find the user
    try {
      // First, try to fetch some items to verify we can access the app
      if (DEBUG) console.log(`Fetching items from app ${contactsAppId} to verify access`);
      
      const verifyResponse = await fetch(`https://api.podio.com/item/app/${contactsAppId}/filter/`, {
        method: 'POST',
        headers: {
          'Authorization': `OAuth2 ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          "limit": 1
        }),
      });
      
      if (!verifyResponse.ok) {
        const errorText = await verifyResponse.text();
        console.error(`Failed to verify app access: ${verifyResponse.status} - ${errorText}`);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to access Contacts app in Podio', 
            details: errorText,
            status: verifyResponse.status
          }),
          { status: verifyResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (DEBUG) console.log('Successfully verified app access');
    } catch (error) {
      console.error('Error verifying app access:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to verify app access', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Use the correct filter format according to Podio API docs
    console.log(`Searching for user with username: ${username} in app: ${contactsAppId}`);
    let userSearchData;
    
    try {
      // First attempt: Use simpler filter approach
      const userSearchResponse = await fetch(`https://api.podio.com/item/app/${contactsAppId}/filter/`, {
        method: 'POST',
        headers: {
          'Authorization': `OAuth2 ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          "filters": {
            "customer-portal-username": username
          }
        }),
      });
      
      if (!userSearchResponse.ok) {
        const errorText = await userSearchResponse.text();
        console.error(`Failed to search for user: ${userSearchResponse.status} - ${errorText}`);
        
        // If filter format is still an issue, try a fallback approach
        if (userSearchResponse.status === 400 && errorText.includes('invalid')) {
          console.log('Trying fallback search approach...');
          
          // Fallback: Try to get all items from the app without filters
          try {
            const allItemsResponse = await fetch(`https://api.podio.com/item/app/${contactsAppId}/`, {
              method: 'GET',
              headers: {
                'Authorization': `OAuth2 ${accessToken}`,
                'Content-Type': 'application/json',
              }
            });
            
            if (!allItemsResponse.ok) {
              const fallbackError = await allItemsResponse.text();
              console.error(`Fallback approach failed: ${allItemsResponse.status} - ${fallbackError}`);
              return new Response(
                JSON.stringify({ 
                  error: 'Failed to search for user with fallback approach', 
                  details: fallbackError
                }),
                { status: allItemsResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
            
            const allItemsData = await allItemsResponse.json();
            
            // Check if we have a valid array of items
            if (!Array.isArray(allItemsData)) {
              console.error('Unexpected response format from Podio. Expected array of items but got:', 
                typeof allItemsData, 
                allItemsData ? Object.keys(allItemsData) : 'null/undefined'
              );
              
              return new Response(
                JSON.stringify({ 
                  error: 'Unexpected response format from Podio. Please check the logs.',
                  details: 'Expected array of items in response'
                }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
            
            console.log(`Found ${allItemsData.length} total items, filtering for username: ${username}`);
            
            // Manually filter for the user with matching username
            const matchingItems = [];
            for (const item of allItemsData) {
              const itemUsername = getFieldValueByExternalId(item, 'customer-portal-username');
              if (itemUsername === username) {
                matchingItems.push(item);
              }
            }
            
            if (matchingItems.length === 0) {
              return new Response(
                JSON.stringify({ error: 'User not found' }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
            
            userSearchData = { items: matchingItems };
          } catch (fallbackError) {
            console.error('Error during fallback search:', fallbackError);
            return new Response(
              JSON.stringify({ error: 'Search fallback failed', details: fallbackError.message }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } else {
          return new Response(
            JSON.stringify({ 
              error: 'Failed to search for user in Contacts app', 
              details: errorText,
              status: userSearchResponse.status
            }),
            { status: userSearchResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        userSearchData = await userSearchResponse.json();
      }
    } catch (error) {
      console.error('Error during user search request:', error);
      return new Response(
        JSON.stringify({ error: 'Network error during user search', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (DEBUG) console.log(`Found ${userSearchData?.items?.length || 0} matching users`);
    
    if (!userSearchData?.items || userSearchData.items.length === 0) {
      console.log('User not found:', username);
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userItem = userSearchData.items[0];
    if (DEBUG) console.log('Found user item:', userItem.item_id);
    
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
      // Include access token for client-side API access
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
