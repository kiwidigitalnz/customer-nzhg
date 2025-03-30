
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

// Implement Password Flow Authentication (App Authentication)
export const authenticateWithPasswordFlow = async (): Promise<boolean> => {
  try {
    const clientId = getPodioClientId();
    const clientSecret = getPodioClientSecret();
    
    if (!clientId || !clientSecret) {
      console.error('Missing Podio client credentials for password flow');
      return false;
    }
    
    console.log('Attempting to authenticate with Podio using Password Flow');
    
    const response = await fetch('https://podio.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }).toString(),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Password flow authentication failed:', errorData);
      return false;
    }
    
    const tokenData = await response.json();
    
    // Store tokens in localStorage
    localStorage.setItem('podio_access_token', tokenData.access_token);
    // Note: client_credentials flow doesn't provide a refresh token
    localStorage.removeItem('podio_refresh_token');
    
    // Set expiry to 1 hour less than actual to ensure we refresh in time
    const safeExpiryTime = Date.now() + ((tokenData.expires_in - 3600) * 1000);
    localStorage.setItem('podio_token_expiry', safeExpiryTime.toString());
    
    console.log('Successfully obtained tokens via Password Flow');
    return true;
  } catch (error) {
    console.error('Error during Password Flow authentication:', error);
    return false;
  }
};

// Start the OAuth flow - always use password flow for better consistency
export const startPodioOAuthFlow = (): Promise<boolean> => {
  console.log('Using Password Flow instead of OAuth flow for consistency');
  return authenticateWithPasswordFlow();
};

// Exchange the authorization code for access/refresh tokens - kept for backward compatibility
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
