
// Proxy handler for Podio OAuth token requests to avoid CORS issues

// Function to handle Podio token requests
export const handlePodioTokenRequest = async (request: Request): Promise<Response> => {
  try {
    // Only handle POST requests to our proxy endpoint
    if (request.method !== 'POST') {
      console.log(`Received ${request.method} request, only POST is supported`);
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }
    
    // Get the request body
    let formData: FormData;
    let urlEncodedData: URLSearchParams;
    
    try {
      // First try to parse as form data
      const text = await request.text();
      console.log('Request body text:', text);
      
      // Create URLSearchParams directly from the text
      urlEncodedData = new URLSearchParams(text);
      console.log('Parsed URL encoded data:', Object.fromEntries(urlEncodedData.entries()));
    } catch (error) {
      console.error('Error parsing request body:', error);
      return new Response(JSON.stringify({ 
        error: 'invalid_request',
        error_description: 'Could not parse request body'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }
    
    console.log('Sending token request to Podio');
    console.log('Request body:', urlEncodedData.toString());
    
    // Forward the request directly to Podio
    const podioResponse = await fetch('https://podio.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: urlEncodedData.toString(),
    });
    
    console.log('Podio response status:', podioResponse.status);
    console.log('Podio response headers:', [...podioResponse.headers.entries()]);
    
    // Get the response data
    let responseData;
    try {
      const responseText = await podioResponse.text();
      console.log('Raw response text:', responseText);
      
      // Try to parse as JSON
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
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }
    
    console.log('Token response received successfully');
    
    // Forward Podio's response back to the client
    return new Response(JSON.stringify(responseData), {
      status: podioResponse.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
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
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    );
  }
};
