
// Service for handling Podio OAuth flow

// Generate a random state for CSRF protection
export const generatePodioAuthState = (): string => {
  const state = Math.random().toString(36).substring(2, 15) + 
               Math.random().toString(36).substring(2, 15);
  localStorage.setItem('podio_auth_state', state);
  return state;
};

// Get client ID from environment or localStorage
export const getPodioClientId = (): string | null => {
  return import.meta.env.VITE_PODIO_CLIENT_ID || localStorage.getItem('podio_client_id');
};

// Get client secret from environment or localStorage
export const getPodioClientSecret = (): string | null => {
  return import.meta.env.VITE_PODIO_CLIENT_SECRET || localStorage.getItem('podio_client_secret');
};

// Get the redirect URI based on the current environment
export const getPodioRedirectUri = (): string => {
  // Use the production URL for both environments to ensure consistency
  return 'https://customer.nzhg.com/podio-callback';
};

// Start the OAuth flow in a popup window
export const startPodioOAuthFlow = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const clientId = getPodioClientId();
    
    if (!clientId) {
      console.error('Missing Podio Client ID');
      resolve(false);
      return;
    }
    
    // Generate state parameter for security
    const state = generatePodioAuthState();
    
    // Build the authorization URL
    const redirectUri = getPodioRedirectUri();
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      state: state,
      scope: 'write' // Changed from 'global' to 'write' as per Podio documentation
    });
    
    const authUrl = `https://podio.com/oauth/authorize?${params.toString()}`;
    
    // In production, open this in a popup window
    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    
    // Open the OAuth popup
    const popup = window.open(
      authUrl,
      'PodioAuth',
      `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`
    );
    
    if (!popup) {
      console.error('Popup blocked by browser');
      // Try alternative approach - direct user to auth page
      window.location.href = authUrl;
      resolve(false);
      return;
    }
    
    // Set up a listener for when the code is received via the callback
    window.addEventListener('message', function authMessageListener(event) {
      // Only accept messages from our app domain
      const isOurOrigin = event.origin === window.location.origin;
      if (!isOurOrigin) return;
      
      // Check if this is our Podio auth message
      if (event.data && event.data.type === 'PODIO_AUTH_CODE') {
        const code = event.data.code;
        const receivedState = event.data.state;
        
        // Remove the event listener
        window.removeEventListener('message', authMessageListener);
        
        // Close the popup
        if (!popup.closed) {
          popup.close();
        }
        
        // Check if state matches
        const savedState = localStorage.getItem('podio_auth_state');
        if (!savedState || savedState !== receivedState) {
          console.error('State parameter mismatch - possible CSRF attack');
          resolve(false);
          return;
        }
        
        // Clear the saved state
        localStorage.removeItem('podio_auth_state');
        
        // Exchange the code for a token
        exchangeCodeForToken(code, redirectUri)
          .then(success => {
            resolve(success);
          })
          .catch(error => {
            console.error('Failed to exchange code for token:', error);
            resolve(false);
          });
      }
    });
    
    // Check if the popup was closed before completing authentication
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        window.removeEventListener('message', () => {});
        resolve(false);
      }
    }, 1000);
  });
};

// Exchange the authorization code for access/refresh tokens
export const exchangeCodeForToken = async (code: string, redirectUri: string): Promise<boolean> => {
  try {
    const clientId = getPodioClientId();
    const clientSecret = getPodioClientSecret();
    
    if (!clientId || !clientSecret) {
      console.error('Missing Podio client credentials');
      return false;
    }
    
    console.log('Exchanging code for tokens with redirect URI:', redirectUri);
    
    const tokenUrl = 'https://podio.com/oauth/token';
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirectUri,
      }).toString(),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Token exchange failed:', errorData);
      return false;
    }
    
    const tokenData = await response.json();
    
    // Store tokens 
    localStorage.setItem('podio_access_token', tokenData.access_token);
    localStorage.setItem('podio_refresh_token', tokenData.refresh_token);
    localStorage.setItem('podio_token_expiry', (Date.now() + tokenData.expires_in * 1000).toString());
    
    console.log('Successfully obtained tokens via OAuth flow');
    return true;
  } catch (error) {
    console.error('Error during token exchange:', error);
    return false;
  }
};
