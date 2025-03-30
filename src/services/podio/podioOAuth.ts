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

// Rate limit handling
const RATE_LIMIT_KEY = 'podio_rate_limit_until';
const MIN_RETRY_DELAY = 2000; // Start with 2 seconds
const MAX_RETRY_DELAY = 60000; // Maximum 1 minute

// Check if we're currently rate limited
export const isRateLimited = (): boolean => {
  const limitUntil = localStorage.getItem(RATE_LIMIT_KEY);
  if (!limitUntil) return false;
  
  const limitTime = parseInt(limitUntil, 10);
  return Date.now() < limitTime;
};

// Set rate limit with exponential backoff
export const setRateLimit = (retryAfterSecs?: number): void => {
  // If Podio tells us when to retry, use that
  if (retryAfterSecs) {
    const limitTime = Date.now() + (retryAfterSecs * 1000);
    localStorage.setItem(RATE_LIMIT_KEY, limitTime.toString());
    console.log(`Rate limited by Podio for ${retryAfterSecs} seconds`);
    return;
  }
  
  // Otherwise use exponential backoff
  const currentDelay = localStorage.getItem('podio_retry_delay');
  let delay = currentDelay ? parseInt(currentDelay, 10) : MIN_RETRY_DELAY;
  
  // Apply exponential backoff with jitter
  delay = Math.min(delay * 2, MAX_RETRY_DELAY);
  delay = delay + (Math.random() * delay * 0.2); // Add up to 20% jitter
  
  const limitTime = Date.now() + delay;
  localStorage.setItem(RATE_LIMIT_KEY, limitTime.toString());
  localStorage.setItem('podio_retry_delay', delay.toString());
  
  console.log(`Rate limited (backoff): waiting ${Math.round(delay/1000)} seconds`);
};

// Clear rate limit
export const clearRateLimit = (): void => {
  localStorage.removeItem(RATE_LIMIT_KEY);
  localStorage.removeItem('podio_retry_delay');
};

// Implement Password Flow Authentication (App Authentication)
export const authenticateWithPasswordFlow = async (): Promise<boolean> => {
  try {
    // Check for rate limiting first
    if (isRateLimited()) {
      const limitUntil = parseInt(localStorage.getItem(RATE_LIMIT_KEY) || '0', 10);
      const waitSecs = Math.ceil((limitUntil - Date.now()) / 1000);
      console.error(`Rate limited. Please wait ${waitSecs} seconds before trying again.`);
      return false;
    }
    
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
    
    // Handle rate limiting specifically
    if (response.status === 420 || response.status === 429) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Rate limit reached:', errorData);
      
      // Extract retry-after information if available
      const retryAfter = response.headers.get('Retry-After') || 
                         errorData.error_description?.match(/wait\s+(\d+)\s+seconds/)?.[1];
      
      if (retryAfter) {
        setRateLimit(parseInt(retryAfter, 10));
      } else {
        // Default to 60 seconds if no specific time given
        setRateLimit(60);
      }
      
      return false;
    }
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Password flow authentication failed:', errorData);
      return false;
    }
    
    // Reset rate limit on success
    clearRateLimit();
    
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
    // Set a short backoff on error
    setRateLimit(10);
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
    // Check for rate limiting first
    if (isRateLimited()) {
      const limitUntil = parseInt(localStorage.getItem(RATE_LIMIT_KEY) || '0', 10);
      const waitSecs = Math.ceil((limitUntil - Date.now()) / 1000);
      console.error(`Rate limited. Please wait ${waitSecs} seconds before trying again.`);
      return false;
    }
    
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
    
    // Handle rate limiting
    if (response.status === 420 || response.status === 429) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Rate limit reached during token exchange:', errorData);
      
      // Extract retry-after information
      const retryAfter = response.headers.get('Retry-After') || 
                         errorData.error_description?.match(/wait\s+(\d+)\s+seconds/)?.[1];
      
      if (retryAfter) {
        setRateLimit(parseInt(retryAfter, 10));
      } else {
        // Default to 60 seconds
        setRateLimit(60);
      }
      
      return false;
    }
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Token exchange failed:', errorData);
      return false;
    }
    
    // Reset rate limit on success
    clearRateLimit();
    
    const tokenData = await response.json();
    
    // Store tokens 
    localStorage.setItem('podio_access_token', tokenData.access_token);
    localStorage.setItem('podio_refresh_token', tokenData.refresh_token);
    localStorage.setItem('podio_token_expiry', (Date.now() + tokenData.expires_in * 1000).toString());
    
    console.log('Successfully obtained tokens via OAuth flow');
    return true;
  } catch (error) {
    console.error('Error during token exchange:', error);
    // Set a short backoff on error
    setRateLimit(10);
    return false;
  }
};
