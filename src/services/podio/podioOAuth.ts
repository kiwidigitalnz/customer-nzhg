// Service for handling Podio OAuth flow

// Define interfaces for error responses from Podio API
interface PodioErrorResponse {
  error?: string;
  error_description?: string;
  [key: string]: any; // Allow for additional properties
}

interface PodioTokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  scope?: string;
  ref?: {
    type: string;
    id: number;
  }
}

// Generate a random state for CSRF protection
export const generatePodioAuthState = (): string => {
  const state = Math.random().toString(36).substring(2, 15) + 
               Math.random().toString(36).substring(2, 15);
  localStorage.setItem('podio_auth_state', state);
  return state;
};

// Get client ID from environment or localStorage
export const getPodioClientId = (): string | null => {
  // Always prioritize environment variables
  if (import.meta.env.VITE_PODIO_CLIENT_ID) {
    return import.meta.env.VITE_PODIO_CLIENT_ID;
  }
  return localStorage.getItem('podio_client_id');
};

// Get client secret from environment or localStorage
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

// Get the base domain for API calls
export const getPodioApiDomain = (): string => {
  return 'api.podio.com';
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
    if (import.meta.env.DEV) {
      console.log(`Rate limited by Podio for ${retryAfterSecs} seconds`);
    }
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
  
  if (import.meta.env.DEV) {
    console.log(`Rate limited (backoff): waiting ${Math.round(delay/1000)} seconds`);
  }
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
      const limitUntil = parseInt(localStorage.getItem('podio_rate_limit_until') || '0', 10);
      const waitSecs = Math.ceil((limitUntil - Date.now()) / 1000);
      if (import.meta.env.DEV) {
        console.error(`Rate limited. Please wait ${waitSecs} seconds before trying again.`);
      }
      return false;
    }
    
    const clientId = getPodioClientId();
    const clientSecret = getPodioClientSecret();
    
    if (!clientId || !clientSecret) {
      if (import.meta.env.DEV) {
        console.error('Missing Podio client credentials for password flow');
      }
      return false;
    }
    
    if (import.meta.env.DEV) {
      console.log('Attempting to authenticate with Podio using Password Flow');
      console.log('Client ID (first 5 chars):', clientId.substring(0, 5) + '...');
      console.log('Client secret available:', !!clientSecret);
    }
    
    // Create URLSearchParams manually for better control
    const formData = new URLSearchParams();
    formData.append('grant_type', 'client_credentials');
    formData.append('client_id', clientId);
    formData.append('client_secret', clientSecret);
    
    // Use the /api/podio-token proxy endpoint with more error handling
    const response = await fetch('/api/podio-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
      credentials: 'same-origin', // Include cookies for same-origin requests
    });
    
    if (import.meta.env.DEV) {
      console.log('Token response status:', response.status);
    }
    
    // Handle rate limiting specifically
    if (response.status === 420 || response.status === 429) {
      let errorData: PodioErrorResponse = {};
      try {
        errorData = await response.json();
      } catch (e) {
        // Failed to parse JSON, continue with empty object
      }
      
      if (import.meta.env.DEV) {
        console.error('Rate limit reached:', errorData);
      }
      
      // Extract retry-after information if available
      const retryAfter = response.headers.get('Retry-After') || 
                         (errorData.error_description?.match(/wait\s+(\d+)\s+seconds/)?.[1]);
      
      if (retryAfter) {
        setRateLimit(parseInt(retryAfter, 10));
      } else {
        // Default to 60 seconds if no specific time given
        setRateLimit(60);
      }
      
      return false;
    }
    
    if (!response.ok) {
      let errorData: PodioErrorResponse = {};
      try {
        errorData = await response.json();
      } catch (e) {
        if (import.meta.env.DEV) {
          console.error('Failed to parse error response:', e);
        }
        // Failed to parse JSON, continue with empty object
      }
      
      if (import.meta.env.DEV) {
        console.error('Password flow authentication failed:', errorData);
      }
      return false;
    }
    
    // Reset rate limit on success
    clearRateLimit();
    
    let tokenData: PodioTokenResponse;
    try {
      tokenData = await response.json();
    } catch (e) {
      if (import.meta.env.DEV) {
        console.error('Failed to parse token response:', e);
      }
      return false;
    }
    
    if (!tokenData.access_token) {
      if (import.meta.env.DEV) {
        console.error('Invalid token data received:', tokenData);
      }
      return false;
    }
    
    // Store tokens in localStorage
    localStorage.setItem('podio_access_token', tokenData.access_token);
    localStorage.setItem('podio_token_type', tokenData.token_type || 'bearer');
    
    // Store refresh token if provided (client_credentials flow might not provide one)
    if (tokenData.refresh_token) {
      localStorage.setItem('podio_refresh_token', tokenData.refresh_token);
    } else {
      localStorage.removeItem('podio_refresh_token');
    }
    
    // Set expiry to 30 minutes less than actual to ensure we refresh in time
    // Podio's tokens are valid for 8 hours (28800 seconds)
    const safeExpiryTime = Date.now() + ((tokenData.expires_in - 1800) * 1000);
    localStorage.setItem('podio_token_expiry', safeExpiryTime.toString());
    
    if (import.meta.env.DEV) {
      console.log('Successfully obtained tokens via Password Flow');
      console.log(`Token will expire in ${Math.round(tokenData.expires_in / 3600)} hours`);
    }
    return true;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Error during Password Flow authentication:', error);
    }
    // Set a short backoff on error
    setRateLimit(10);
    return false;
  }
};

// Refresh token - now using the proxy endpoint
export const refreshPodioToken = async (): Promise<boolean> => {
  try {
    // Check for rate limiting first
    if (isRateLimited()) {
      const limitUntil = parseInt(localStorage.getItem(RATE_LIMIT_KEY) || '0', 10);
      const waitSecs = Math.ceil((limitUntil - Date.now()) / 1000);
      if (import.meta.env.DEV) {
        console.error(`Rate limited. Please wait ${waitSecs} seconds before trying again.`);
      }
      return false;
    }
    
    const refreshToken = localStorage.getItem('podio_refresh_token');
    const clientId = getPodioClientId();
    const clientSecret = getPodioClientSecret();
    
    // If we don't have a refresh token, fall back to Password Flow
    if (!refreshToken) {
      if (import.meta.env.DEV) {
        console.log('No refresh token available, falling back to Password Flow');
      }
      return await authenticateWithPasswordFlow();
    }
    
    if (!clientId || !clientSecret) {
      if (import.meta.env.DEV) {
        console.error('Missing Podio client credentials for token refresh');
      }
      return false;
    }
    
    if (import.meta.env.DEV) {
      console.log('Refreshing Podio token using refresh token');
    }
    
    // Use proxy API endpoint for token requests to avoid CORS issues
    const formData = new URLSearchParams();
    formData.append('grant_type', 'refresh_token');
    formData.append('client_id', clientId);
    formData.append('client_secret', clientSecret);
    formData.append('refresh_token', refreshToken);
    
    // Use the /api/podio-token proxy endpoint
    const response = await fetch('/api/podio-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });
    
    // Handle rate limiting specifically
    if (response.status === 420 || response.status === 429) {
      let errorData: PodioErrorResponse = {};
      try {
        errorData = await response.json();
      } catch (e) {
        // Failed to parse JSON, continue with empty object
      }
      
      if (import.meta.env.DEV) {
        console.error('Rate limit reached during token refresh:', errorData);
      }
      
      // Extract retry-after information if available
      const retryAfter = response.headers.get('Retry-After') || 
                         (errorData.error_description?.match(/wait\s+(\d+)\s+seconds/)?.[1]);
      
      if (retryAfter) {
        setRateLimit(parseInt(retryAfter, 10));
      } else {
        // Default to 60 seconds if no specific time given
        setRateLimit(60);
      }
      
      return false;
    }
    
    // If refresh token is invalid or expired, fall back to Password Flow
    if (response.status === 400 || response.status === 401) {
      if (import.meta.env.DEV) {
        console.log('Refresh token invalid or expired, falling back to Password Flow');
      }
      return await authenticateWithPasswordFlow();
    }
    
    if (!response.ok) {
      let errorData: PodioErrorResponse = {};
      try {
        errorData = await response.json();
      } catch (e) {
        // Failed to parse JSON, continue with empty object
      }
      
      if (import.meta.env.DEV) {
        console.error('Token refresh failed:', errorData);
      }
      
      // If we get an error other than invalid token, try Password Flow as fallback
      return await authenticateWithPasswordFlow();
    }
    
    // Reset rate limit on success
    clearRateLimit();
    
    const tokenData: PodioTokenResponse = await response.json();
    
    // Store the new tokens
    localStorage.setItem('podio_access_token', tokenData.access_token);
    localStorage.setItem('podio_token_type', tokenData.token_type || 'bearer');
    
    if (tokenData.refresh_token) {
      localStorage.setItem('podio_refresh_token', tokenData.refresh_token);
    }
    
    // Set expiry to 30 minutes less than actual to ensure we refresh in time
    // Podio's tokens are valid for 8 hours (28800 seconds)
    const safeExpiryTime = Date.now() + ((tokenData.expires_in - 1800) * 1000);
    localStorage.setItem('podio_token_expiry', safeExpiryTime.toString());
    
    if (import.meta.env.DEV) {
      console.log('Successfully refreshed tokens');
      console.log(`New token will expire in ${Math.round(tokenData.expires_in / 3600)} hours`);
    }
    
    return true;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Error during token refresh:', error);
    }
    
    // Set a short backoff on error
    setRateLimit(10);
    
    // Try Password Flow as a fallback if refresh fails
    return await authenticateWithPasswordFlow();
  }
};

// Start the OAuth flow - always use password flow for better consistency
export const startPodioOAuthFlow = (): Promise<boolean> => {
  if (import.meta.env.DEV) {
    console.log('Using Password Flow instead of OAuth flow for consistency');
  }
  return authenticateWithPasswordFlow();
};

// Exchange the authorization code for access/refresh tokens - kept for backward compatibility
export const exchangeCodeForToken = async (code: string, redirectUri: string): Promise<boolean> => {
  try {
    // Check for rate limiting first
    if (isRateLimited()) {
      const limitUntil = parseInt(localStorage.getItem(RATE_LIMIT_KEY) || '0', 10);
      const waitSecs = Math.ceil((limitUntil - Date.now()) / 1000);
      if (import.meta.env.DEV) {
        console.error(`Rate limited. Please wait ${waitSecs} seconds before trying again.`);
      }
      return false;
    }
    
    const clientId = getPodioClientId();
    const clientSecret = getPodioClientSecret();
    
    if (!clientId || !clientSecret) {
      if (import.meta.env.DEV) {
        console.error('Missing Podio client credentials');
      }
      return false;
    }
    
    if (import.meta.env.DEV) {
      console.log('Exchanging code for tokens with redirect URI:', redirectUri);
    }
    
    // Use proxy API endpoint for token requests to avoid CORS issues
    const formData = new URLSearchParams();
    formData.append('grant_type', 'authorization_code');
    formData.append('client_id', clientId);
    formData.append('client_secret', clientSecret);
    formData.append('code', code);
    formData.append('redirect_uri', redirectUri);
    
    // Use the /api/podio-token proxy endpoint
    const response = await fetch('/api/podio-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });
    
    // Handle rate limiting
    if (response.status === 420 || response.status === 429) {
      let errorData: PodioErrorResponse = {};
      try {
        errorData = await response.json();
      } catch (e) {
        // Failed to parse JSON, continue with empty object
      }
      
      if (import.meta.env.DEV) {
        console.error('Rate limit reached during token exchange:', errorData);
      }
      
      // Extract retry-after information
      const retryAfter = response.headers.get('Retry-After') || 
                         (errorData.error_description?.match(/wait\s+(\d+)\s+seconds/)?.[1]);
      
      if (retryAfter) {
        setRateLimit(parseInt(retryAfter, 10));
      } else {
        // Default to 60 seconds
        setRateLimit(60);
      }
      
      return false;
    }
    
    if (!response.ok) {
      let errorData: PodioErrorResponse = {};
      try {
        errorData = await response.json();
        if (import.meta.env.DEV) {
          console.error('Token exchange failed:', errorData);
        }
      } catch (e) {
        if (import.meta.env.DEV) {
          console.error('Token exchange failed with non-JSON response');
        }
      }
      return false;
    }
    
    // Reset rate limit on success
    clearRateLimit();
    
    const tokenData: PodioTokenResponse = await response.json();
    
    // Store tokens 
    localStorage.setItem('podio_access_token', tokenData.access_token);
    localStorage.setItem('podio_token_type', tokenData.token_type || 'bearer');
    
    if (tokenData.refresh_token) {
      localStorage.setItem('podio_refresh_token', tokenData.refresh_token);
    }
    
    // Set expiry to 30 minutes less than actual to ensure we refresh in time
    const safeExpiryTime = Date.now() + ((tokenData.expires_in - 1800) * 1000);
    localStorage.setItem('podio_token_expiry', safeExpiryTime.toString());
    
    if (import.meta.env.DEV) {
      console.log('Successfully obtained tokens via OAuth flow');
      console.log(`Token will expire in ${Math.round(tokenData.expires_in / 3600)} hours`);
    }
    return true;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Error during token exchange:', error);
    }
    // Set a short backoff on error
    setRateLimit(10);
    return false;
  }
};
