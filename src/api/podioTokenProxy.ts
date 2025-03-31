
// Proxy handler for Podio OAuth token requests to avoid CORS issues

// Function to handle Podio token requests
export const handlePodioTokenRequest = async (request: Request): Promise<Response> => {
  try {
    const url = new URL(request.url);
    
    // Only handle POST requests to our proxy endpoint
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
    
    // Get form data from the request
    const formData = await request.formData();
    
    // Forward the request to Podio
    const podioResponse = await fetch('https://podio.com/oauth/token/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });
    
    // Get the response data
    const responseData = await podioResponse.json();
    
    // Forward Podio's response back to the client
    return new Response(JSON.stringify(responseData), {
      status: podioResponse.status,
      headers: {
        'Content-Type': 'application/json',
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
        },
      }
    );
  }
};
