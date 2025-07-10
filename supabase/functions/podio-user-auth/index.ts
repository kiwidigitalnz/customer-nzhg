import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.31.0';

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

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'method_not_allowed',
        error_description: 'Only POST method is supported'
      }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    console.log('=== PODIO USER AUTH FUNCTION START ===');
    console.log('Request timestamp:', new Date().toISOString());

    // Get Supabase credentials
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase credentials not configured');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Supabase credentials not configured' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { username, password } = await req.json();
    
    if (!username || !password) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'missing_credentials',
          error_description: 'Username and password are required'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current access token
    const { data: tokens, error: tokenError } = await supabase
      .from('podio_auth_tokens')
      .select('access_token')
      .order('created_at', { ascending: false })
      .limit(1);

    if (tokenError || !tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'no_auth_token',
          error_description: 'No valid authentication token found. Please complete OAuth first.'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = tokens[0].access_token;
    const contactsAppId = Deno.env.get('PODIO_CONTACTS_APP_ID');
    
    if (!contactsAppId) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'configuration_error',
          error_description: 'Contacts app ID not configured'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Searching for user in Podio contacts app...');

    // Search for user in Podio contacts app
    const response = await fetch(`https://api.podio.com/item/app/${contactsAppId}/filter/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filters: {
          email: username
        },
        limit: 1
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Podio API error:', response.status, errorText);
      
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'podio_api_error',
          error_description: `Failed to search contacts: ${response.status} ${response.statusText}`
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      console.log('User not found in contacts app');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'user_not_found',
          error_description: 'User not found in the contacts database'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userItem = data.items[0];
    console.log('User found in Podio contacts');

    // For this example, we'll just validate that the user exists
    // In a real implementation, you might want to validate the password
    // against a password field in Podio or use additional validation logic

    return new Response(
      JSON.stringify({ 
        success: true,
        user: {
          id: userItem.item_id,
          email: username,
          // Add any other user fields you need from the Podio item
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('=== PODIO USER AUTH FUNCTION ERROR ===');
    console.error('Error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'unexpected_error',
        error_description: error.message || 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});