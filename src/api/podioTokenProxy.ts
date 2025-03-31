
// Proxy handler for Podio OAuth token requests to avoid CORS issues

// Function to handle Podio token requests
export const handlePodioTokenRequest = async (request: Request): Promise<Response> => {
  try {
    // Only handle POST requests to our proxy endpoint
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
    
    // Get the request body
    let formData: FormData;
    
    try {
      formData = await request.formData();
      console.log('Form data received:', Object.fromEntries(formData.entries()));
    } catch (error) {
      console.error('Error parsing form data:', error);
      return new Response(JSON.stringify({ 
        error: 'invalid_request',
        error_description: 'Could not parse form data'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
    
    // Prepare URL encoded form data
    const urlEncodedData = new URLSearchParams();
    for (const [key, value] of formData.entries()) {
      urlEncodedData.append(key, value.toString());
    }
    
    console.log('Sending token request to Podio');
    
    // Forward the request to Podio
    const podioResponse = await fetch('https://podio.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: urlEncodedData.toString(),
    });
    
    // Get the response data
    let responseData;
    try {
      responseData = await podioResponse.json();
      console.log('Podio response status:', podioResponse.status);
    } catch (error) {
      console.error('Error parsing Podio response:', error);
      
      // If we can't parse JSON, get the text response
      const textResponse = await podioResponse.text();
      console.error('Raw response:', textResponse);
      
      return new Response(JSON.stringify({
        error: 'invalid_response',
        error_description: 'Could not parse Podio response'
      }), {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
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
