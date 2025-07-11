import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Database Operations Test ===');
    
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const results: any = {
      timestamp: new Date().toISOString(),
      tests: {}
    };

    // Test 1: Check table structure
    console.log('Test 1: Checking table structure...');
    try {
      const { data: tableInfo, error: tableError } = await supabase
        .from('podio_oauth_tokens')
        .select('*')
        .limit(0);
      
      results.tests.tableStructure = {
        success: !tableError,
        error: tableError?.message || null
      };
      console.log('Table structure check:', results.tests.tableStructure);
    } catch (error) {
      results.tests.tableStructure = {
        success: false,
        error: error.message
      };
    }

    // Test 2: Test OAuth state creation
    console.log('Test 2: Testing OAuth state creation...');
    const testState = crypto.randomUUID();
    try {
      const { data: stateData, error: stateError } = await supabase
        .from('podio_oauth_states')
        .insert({
          state: testState,
          user_id: null,
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
        })
        .select()
        .single();

      results.tests.stateCreation = {
        success: !stateError,
        error: stateError?.message || null,
        data: stateData
      };
      console.log('State creation test:', results.tests.stateCreation);
    } catch (error) {
      results.tests.stateCreation = {
        success: false,
        error: error.message
      };
    }

    // Test 3: Test app-level token insertion
    console.log('Test 3: Testing app-level token insertion...');
    try {
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + 3600);

      const { data: tokenData, error: tokenError } = await supabase
        .from('podio_oauth_tokens')
        .insert({
          user_id: null,
          app_level: true,
          access_token: 'test_access_token_' + Date.now(),
          refresh_token: 'test_refresh_token_' + Date.now(),
          expires_at: expiresAt.toISOString(),
          token_type: 'bearer',
          scope: 'test'
        })
        .select()
        .single();

      results.tests.tokenInsertion = {
        success: !tokenError,
        error: tokenError?.message || null,
        errorCode: tokenError?.code || null,
        errorDetails: tokenError?.details || null,
        data: tokenData
      };
      console.log('Token insertion test:', results.tests.tokenInsertion);

      // Clean up test token if successful
      if (tokenData) {
        await supabase
          .from('podio_oauth_tokens')
          .delete()
          .eq('id', tokenData.id);
      }
    } catch (error) {
      results.tests.tokenInsertion = {
        success: false,
        error: error.message
      };
    }

    // Test 4: Test RLS policies
    console.log('Test 4: Testing RLS policies...');
    try {
      const { data: rlsData, error: rlsError } = await supabase
        .from('podio_oauth_tokens')
        .select('*')
        .eq('app_level', true)
        .limit(1);

      results.tests.rlsPolicies = {
        success: !rlsError,
        error: rlsError?.message || null,
        canRead: !rlsError
      };
      console.log('RLS policies test:', results.tests.rlsPolicies);
    } catch (error) {
      results.tests.rlsPolicies = {
        success: false,
        error: error.message
      };
    }

    // Test 5: Check current app-level tokens
    console.log('Test 5: Checking existing app-level tokens...');
    try {
      const { data: existingTokens, error: existingError } = await supabase
        .from('podio_oauth_tokens')
        .select('*')
        .eq('app_level', true);

      results.tests.existingTokens = {
        success: !existingError,
        error: existingError?.message || null,
        count: existingTokens?.length || 0,
        tokens: existingTokens
      };
      console.log('Existing tokens test:', results.tests.existingTokens);
    } catch (error) {
      results.tests.existingTokens = {
        success: false,
        error: error.message
      };
    }

    // Clean up test state
    if (testState) {
      await supabase
        .from('podio_oauth_states')
        .delete()
        .eq('state', testState);
    }

    console.log('=== Database Operations Test Complete ===');
    
    return new Response(
      JSON.stringify(results, null, 2),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Test function error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Test function failed',
        details: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
