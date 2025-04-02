
// Service for handling Podio OAuth flow without using podio-js

// Get client ID from environment
export const getPodioClientId = (): string | null => {
  // Always prioritize environment variables
  if (import.meta.env.VITE_PODIO_CLIENT_ID) {
    return import.meta.env.VITE_PODIO_CLIENT_ID;
  }
  return localStorage.getItem('podio_client_id');
};

// Get client secret from environment
export const getPodioClientSecret = (): string | null => {
  // Always prioritize environment variables
  if (import.meta.env.VITE_PODIO_CLIENT_SECRET) {
    return import.meta.env.VITE_PODIO_CLIENT_SECRET;
  }
  return localStorage.getItem('podio_client_secret');
};

// Get the redirect URI based on the current environment
export const getPodioRedirectUri = (): string => {
  // In development, use localhost
  if (import.meta.env.DEV) {
    const port = window.location.port;
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    return `${protocol}//${hostname}${port ? ':' + port : ''}/podio-callback`;
  }
  
  // In production, use the production URL
  return 'https://customer.nzhg.com/podio-callback';
};

// Generate a random state for CSRF protection
export const generatePodioAuthState = (): string => {
  const state = Math.random().toString(36).substring(2, 15) + 
               Math.random().toString(36).substring(2, 15);
  localStorage.setItem('podio_auth_state', state);
  return state;
};

// Start the OAuth flow by redirecting to Podio authorize URL
export const startPodioOAuthFlow = (): void => {
  const clientId = getPodioClientId();
  const redirectUri = getPodioRedirectUri();
  const state = generatePodioAuthState();
  
  if (!clientId) {
    throw new Error('Podio client ID is not configured');
  }
  
  const authUrl = `https://podio.com/oauth/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`;
  
  // Redirect to Podio OAuth page
  window.location.href = authUrl;
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
    
    // Create form data for token exchange
    const formData = new URLSearchParams();
    formData.append('grant_type', 'authorization_code');
    formData.append('client_id', clientId);
    formData.append('client_secret', clientSecret);
    formData.append('code', code);
    formData.append('redirect_uri', redirectUri);
    
    // Make the token exchange request
    const response = await fetch('https://podio.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Token exchange failed:', errorData);
      return false;
    }
    
    // Parse and store tokens
    const tokenData = await response.json();
    
    // Store tokens in localStorage
    localStorage.setItem('podio_access_token', tokenData.access_token);
    localStorage.setItem('podio_token_type', tokenData.token_type || 'bearer');
    
    if (tokenData.refresh_token) {
      localStorage.setItem('podio_refresh_token', tokenData.refresh_token);
    }
    
    // Set expiry time (current time + expires_in seconds - 30 min buffer)
    const safeExpiryTime = Date.now() + ((tokenData.expires_in - 1800) * 1000);
    localStorage.setItem('podio_token_expiry', safeExpiryTime.toString());
    
    return true;
  } catch (error) {
    console.error('Error during token exchange:', error);
    return false;
  }
};
