
// Simple proxy handler for Podio OAuth token requests to avoid CORS issues

export const handlePodioTokenRequest = async (request: Request): Promise<Response> => {
  try {
    // Handle OPTIONS requests for CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Only handle POST requests
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    
    // Get the request body
    const text = await request.text();
    console.log('Token request body:', text);
    
    // Create URLSearchParams from the text
    const formData = new URLSearchParams(text);
    
    // Log complete request details
    console.log('Sending token request to Podio with:', {
      url: 'https://podio.com/oauth/token',
      method: 'POST',
      body: Object.fromEntries(formData.entries())
    });
    
    // Forward the request to Podio
    const podioResponse = await fetch('https://podio.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });
    
    console.log('Podio response status:', podioResponse.status);
    
    // For better debugging, log headers
    const responseHeaders = {};
    podioResponse.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });
    console.log('Podio response headers:', responseHeaders);
    
    // Get the response text
    const responseText = await podioResponse.text();
    console.log('Podio response body:', responseText);
    
    // Try to parse as JSON
    let responseData;
    try {
      responseData = responseText ? JSON.parse(responseText) : {};
    } catch (error) {
      console.error('Error parsing Podio response:', error);
      return new Response(JSON.stringify({
        error: 'invalid_response',
        error_description: 'Could not parse Podio response'
      }), {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    
    // Return the Podio response
    return new Response(JSON.stringify(responseData), {
      status: podioResponse.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error in Podio token proxy:', error);
    
    return new Response(
      JSON.stringify({
        error: 'proxy_error',
        error_description: error instanceof Error ? error.message : 'Unknown error in proxy',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
};
