
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.31.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Set DEBUG mode for verbose logging
const DEBUG = true;

// Helper to get field value by external ID - with enhanced type safety
function getFieldValueByExternalId(item: any, externalId: string): any {
  if (!item || !item.fields) {
    console.log(`No fields found in item for external ID: ${externalId}`);
    return null;
  }
  
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
      } else {
        console.log(`Field ${externalId} found but has no values`);
      }
      return null;
    }
  }
  
  console.log(`Field with external ID ${externalId} not found`);
  return null;
}

// Normalize string values for safe comparison
function normalizeString(str: string | null | undefined): string {
  if (str === null || str === undefined) {
    return '';
  }
  // Remove extra whitespace and convert to lowercase for case-insensitive comparison
  return str.trim();
}

// Secure string comparison that avoids timing attacks
function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// Helper to create consistent error responses
function errorResponse(status: number, message: string, details: any = null) {
  const errorBody = { 
    error: message,
    details: details,
    status
  };
  
  console.error(`Error ${status}: ${message}`, details);
  
  return new Response(
    JSON.stringify(errorBody),
    { 
      status, 
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      } 
    }
  );
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
      console.error('Missing Supabase configuration');
      return errorResponse(500, 'Supabase credentials not configured');
    }

    // Create Supabase client with service key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Podio credentials from environment
    const contactsAppId = Deno.env.get('PODIO_CONTACTS_APP_ID');
    
    if (!contactsAppId) {
      console.error('Missing Podio configuration', { 
        hasContactsAppId: !!contactsAppId
      });
      
      return errorResponse(500, 'Podio Contacts App ID not configured', {
        needs_setup: true
      });
    }

    // Parse request data
    let requestData;
    try {
      requestData = await req.json();
    } catch (e) {
      console.error('Error parsing request body:', e);
      return errorResponse(400, 'Invalid request body, JSON expected');
    }
    
    const { username, password } = requestData;

    // Validate input parameters
    if (!username) {
      return errorResponse(400, 'Username is required');
    }
    
    if (!password) {
      return errorResponse(400, 'Password is required');
    }
    
    // Log sanitized auth attempt (no passwords)
    console.log(`Authentication attempt for username: ${username}`);

    // Get the stored Podio token from the database
    const { data: tokens, error: fetchError } = await supabase
      .from('podio_auth_tokens')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error('Error fetching Podio token:', fetchError);
      return errorResponse(500, 'Failed to retrieve Podio authentication', fetchError);
    }

    if (!tokens || tokens.length === 0) {
      console.error('No Podio tokens found');
      return errorResponse(404, 'No Podio token found. Admin must authenticate with Podio first.', {
        needs_setup: true
      });
    }

    const token = tokens[0];
    const accessToken = token.access_token;
    
    // Check if token is expired
    const expiresAt = new Date(token.expires_at).getTime();
    const now = Date.now();
    
    if (expiresAt <= now) {
      console.error('Podio token is expired', { expiresAt, now });
      return errorResponse(401, 'Podio token is expired and needs to be refreshed', {
        needs_refresh: true
      });
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
        
        let errorDetails;
        try {
          errorDetails = JSON.parse(errorText);
        } catch (e) {
          errorDetails = errorText;
        }
        
        return errorResponse(
          verifyResponse.status, 
          'Failed to access Contacts app in Podio', 
          errorDetails
        );
      }
      
      if (DEBUG) console.log('Successfully verified app access');
    } catch (error) {
      console.error('Error verifying app access:', error);
      return errorResponse(500, 'Failed to verify app access', error.message);
    }
    
    // Use the correct filter format according to Podio API docs
    console.log(`Searching for user with username: ${username} in app: ${contactsAppId}`);
    let userSearchData;
    
    try {
      // Search for user by username
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
              return errorResponse(
                allItemsResponse.status, 
                'Failed to search for user with fallback approach', 
                fallbackError
              );
            }
            
            const allItemsData = await allItemsResponse.json();
            
            // Check if we have a valid array of items
            if (!Array.isArray(allItemsData)) {
              console.error('Unexpected response format from Podio. Expected array of items but got:', 
                typeof allItemsData, 
                allItemsData ? Object.keys(allItemsData) : 'null/undefined'
              );
              
              return errorResponse(
                500,
                'Unexpected response format from Podio. Please check the logs.',
                'Expected array of items in response'
              );
            }
            
            console.log(`Found ${allItemsData.length} total items, filtering for username: ${username}`);
            
            // Manually filter for the user with matching username (case-insensitive)
            const matchingItems = [];
            for (const item of allItemsData) {
              const itemUsername = getFieldValueByExternalId(item, 'customer-portal-username');
              if (itemUsername && normalizeString(itemUsername).toLowerCase() === normalizeString(username).toLowerCase()) {
                matchingItems.push(item);
              }
            }
            
            if (matchingItems.length === 0) {
              console.log('User not found after fallback search:', username);
              return errorResponse(404, 'User not found');
            }
            
            userSearchData = { items: matchingItems };
          } catch (fallbackError) {
            console.error('Error during fallback search:', fallbackError);
            return errorResponse(500, 'Search fallback failed', fallbackError.message);
          }
        } else {
          return errorResponse(
            userSearchResponse.status, 
            'Failed to search for user in Contacts app', 
            errorText
          );
        }
      } else {
        userSearchData = await userSearchResponse.json();
      }
    } catch (error) {
      console.error('Error during user search request:', error);
      return errorResponse(500, 'Network error during user search', error.message);
    }
    
    if (DEBUG) console.log(`Found ${userSearchData?.items?.length || 0} matching users`);
    
    if (!userSearchData?.items || userSearchData.items.length === 0) {
      console.log('User not found:', username);
      return errorResponse(404, 'User not found');
    }

    const userItem = userSearchData.items[0];
    if (DEBUG) console.log('Found user item:', userItem.item_id);
    
    // Extract stored password and check
    const storedPassword = getFieldValueByExternalId(userItem, 'customer-portal-password');
    
    if (DEBUG) {
      // Log sanitized password info (length and presence check only - no actual passwords)
      console.log('Password validation:');
      console.log(`- Stored password present: ${!!storedPassword}`);
      console.log(`- Stored password length: ${storedPassword ? storedPassword.length : 0}`);
      console.log(`- Input password present: ${!!password}`);
      console.log(`- Input password length: ${password ? password.length : 0}`);
    }
    
    if (!storedPassword) {
      console.log('User found but no password field:', username);
      return errorResponse(401, 'User password not set');
    }
    
    // Normalize both passwords for comparison
    const normalizedInput = normalizeString(password);
    const normalizedStored = normalizeString(storedPassword);
    
    // Use constant-time comparison to prevent timing attacks
    const passwordsMatch = secureCompare(normalizedInput, normalizedStored);
    
    if (!passwordsMatch) {
      console.log('Invalid password for user:', username);
      return errorResponse(401, 'Invalid password');
    }

    console.log('User authenticated successfully:', username);
    
    // If authentication is successful, extract additional user data
    // Include PIID (assuming this is the Podio Item ID) and ensure logo is correctly extracted
    const logoValue = getFieldValueByExternalId(userItem, 'logo');
    
    // Also get the direct logo URL if available (new field)
    const logoUrl = getFieldValueByExternalId(userItem, 'logo-url');
    
    let finalLogoUrl = logoUrl;
    
    // If we have a logo file ID but no direct URL, build the URL to access it
    if (logoValue && !finalLogoUrl) {
      try {
        const fileResponse = await fetch(`https://api.podio.com/file/${logoValue}`, {
          method: 'GET',
          headers: {
            'Authorization': `OAuth2 ${accessToken}`,
            'Content-Type': 'application/json',
          }
        });
        
        if (fileResponse.ok) {
          const fileData = await fileResponse.json();
          finalLogoUrl = fileData.link || null;
          console.log('Found logo URL for user:', finalLogoUrl);
        } else {
          console.log('Failed to fetch logo details, but continuing with authentication');
        }
      } catch (fileError) {
        console.error('Error fetching logo details:', fileError);
        // Non-blocking error, continue with authentication
      }
    }
    
    const userData = {
      id: userItem.item_id,
      podioItemId: userItem.item_id, // Make sure PIID is included
      name: getFieldValueByExternalId(userItem, 'name') || getFieldValueByExternalId(userItem, 'title'),
      email: getFieldValueByExternalId(userItem, 'email'),
      username: getFieldValueByExternalId(userItem, 'customer-portal-username'),
      logoFileId: logoValue, // Include raw file ID
      logoUrl: finalLogoUrl, // Include processed URL if available
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
    
    return errorResponse(500, 'Failed to authenticate user', error.message);
  }
});
