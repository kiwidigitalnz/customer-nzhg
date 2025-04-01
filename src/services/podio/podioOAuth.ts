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
const RATE_LIMIT_COUNTER_KEY = 'podio_rate_limit_counter';
const RATE_LIMIT_REASON_KEY = 'podio_rate_limit_reason';
const MIN_RETRY_DELAY = 2000; // Start with 2 seconds
const MAX_RETRY_DELAY = 300000; // Maximum 5 minutes
const MAX_RETRIES_BEFORE_LONG_TIMEOUT = 5;

// Data caching 
const CACHE_PREFIX = 'podio_data_cache_';
const CACHE_EXPIRY_PREFIX = 'podio_data_expiry_';
const DEFAULT_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Cache user data with expiration
export const cacheUserData = (key: string, data: any, duration: number = DEFAULT_CACHE_DURATION): void => {
  if (!key || !data) return;
  
  try {
    // Prefix the key for isolation
    const cacheKey = `${CACHE_PREFIX}${key}`;
    const expiryKey = `${CACHE_EXPIRY_PREFIX}${key}`;
    
    // Calculate expiration timestamp
    const expires = Date.now() + duration;
    
    // Store data and expiry
    localStorage.setItem(cacheKey, JSON.stringify(data));
    localStorage.setItem(expiryKey, expires.toString());
    
    if (import.meta.env.DEV) {
      console.log(`Cached data for key "${key}" (expires in ${Math.round(duration/1000)} seconds)`);
    }
  } catch (error) {
    console.error('Error caching user data:', error);
  }
};

// Get cached user data if not expired
export const getCachedUserData = (key: string): any | null => {
  if (!key) return null;
  
  try {
    // Prefix the key for isolation
    const cacheKey = `${CACHE_PREFIX}${key}`;
    const expiryKey = `${CACHE_EXPIRY_PREFIX}${key}`;
    
    // Check if cache exists
    const cachedData = localStorage.getItem(cacheKey);
    const expiryTime = localStorage.getItem(expiryKey);
    
    if (!cachedData || !expiryTime) return null;
    
    // Check if cache has expired
    const expiry = parseInt(expiryTime, 10);
    if (Date.now() > expiry) {
      // Clean up expired cache
      localStorage.removeItem(cacheKey);
      localStorage.removeItem(expiryKey);
      return null;
    }
    
    // Return valid cached data
    return JSON.parse(cachedData);
  } catch (error) {
    console.error('Error retrieving cached user data:', error);
    return null;
  }
};

// Clear cache for a specific key
export const clearCache = (key: string): void => {
  if (!key) return;
  
  try {
    // Prefix the key for isolation
    const cacheKey = `${CACHE_PREFIX}${key}`;
    const expiryKey = `${CACHE_EXPIRY_PREFIX}${key}`;
    
    // Remove both data and expiry
    localStorage.removeItem(cacheKey);
    localStorage.removeItem(expiryKey);
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
};

// Check if we're currently rate limited
export const isRateLimited = (): boolean => {
  const limitUntil = localStorage.getItem(RATE_LIMIT_KEY);
  if (!limitUntil) return false;
  
  const limitTime = parseInt(limitUntil, 10);
  return Date.now() < limitTime;
};

// Get detailed rate limit information
export const isRateLimitedWithInfo = (): { limited: boolean, remainingSeconds: number, reason: string } => {
  const limitUntil = localStorage.getItem(RATE_LIMIT_KEY);
  const reason = localStorage.getItem(RATE_LIMIT_REASON_KEY) || 'Too many requests';
  
  if (!limitUntil) {
    return { limited: false, remainingSeconds: 0, reason };
  }
  
  const limitTime = parseInt(limitUntil, 10);
  const now = Date.now();
  
  if (now < limitTime) {
    const remainingSeconds = Math.ceil((limitTime - now) / 1000);
    return { limited: true, remainingSeconds, reason };
  }
  
  return { limited: false, remainingSeconds: 0, reason };
};

// Set rate limit with exponential backoff and jitter
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
  
  // Otherwise use exponential backoff with retry counter
  const retryCountStr = localStorage.getItem(RATE_LIMIT_COUNTER_KEY);
  const retryCount = retryCountStr ? parseInt(retryCountStr, 10) : 0;
  const newRetryCount = retryCount + 1;
  
  // Store the updated retry count
  localStorage.setItem(RATE_LIMIT_COUNTER_KEY, newRetryCount.toString());
  
  // Calculate delay with exponential backoff
  let delay = MIN_RETRY_DELAY * Math.pow(2, Math.min(newRetryCount, 8)); // 2^8 = 256 max multiplier
  
  // Add jitter (up to 20% random variation)
  delay = delay + (Math.random() * delay * 0.2);
  
  // Cap at maximum delay
  delay = Math.min(delay, MAX_RETRY_DELAY);
  
  // If we've exceeded multiple retries, implement a longer timeout
  if (newRetryCount >= MAX_RETRIES_BEFORE_LONG_TIMEOUT) {
    delay = MAX_RETRY_DELAY;
    console.warn(`Exceeded ${MAX_RETRIES_BEFORE_LONG_TIMEOUT} retries, implementing longer timeout`);
  }
  
  const limitTime = Date.now() + delay;
  localStorage.setItem(RATE_LIMIT_KEY, limitTime.toString());
  
  if (import.meta.env.DEV) {
    console.log(`Rate limited (backoff): waiting ${Math.round(delay/1000)} seconds (retry #${newRetryCount})`);
  }
};

// Set rate limit with additional information
export const setRateLimitWithBackoff = (reason: string, retryAfterSecs?: number): void => {
  // Store the reason
  localStorage.setItem(RATE_LIMIT_REASON_KEY, reason);
  
  // Use the existing rate limit logic
  setRateLimit(retryAfterSecs);
};

// Clear rate limit info including the reason
export const clearRateLimitInfo = (): void => {
  localStorage.removeItem(RATE_LIMIT_KEY);
  localStorage.removeItem(RATE_LIMIT_COUNTER_KEY);
  localStorage.removeItem(RATE_LIMIT_REASON_KEY);
};

// Clear regular rate limit (backward compatibility)
export const clearRateLimit = (): void => {
  localStorage.removeItem(RATE_LIMIT_KEY);
  localStorage.removeItem(RATE_LIMIT_COUNTER_KEY);
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
    
    // Make direct request to Podio API (avoiding the proxy that's causing issues)
    // Removed User-Agent header to fix CORS issues
    const response = await fetch('https://podio.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: formData,
    });
    
    console.log('Token response status:', response.status);
    
    // For debugging, log the entire response
    const responseText = await response.text();
    console.log('Raw response text first 100 chars:', responseText.substring(0, 100));
    
    // Check if the response is HTML instead of JSON
    if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
      console.error('Received HTML instead of JSON. Check your client credentials and request format.');
      return false;
    }
    
    // Parse the response text as JSON
    let responseData;
    try {
      responseData = responseText ? JSON.parse(responseText) : {};
    } catch (error) {
      console.error('Failed to parse response JSON:', error);
      return false;
    }
    
    // Handle rate limiting specifically
    if (response.status === 420 || response.status === 429) {
      if (import.meta.env.DEV) {
        console.error('Rate limit reached:', responseData);
      }
      
      // Extract retry-after information if available
      const retryAfter = response.headers.get('Retry-After') || 
                         (responseData.error_description?.match(/wait\s+(\d+)\s+seconds/)?.[1]);
      
      if (retryAfter) {
        setRateLimit(parseInt(retryAfter, 10));
      } else {
        // Default to 60 seconds if no specific time given
        setRateLimit(60);
      }
      
      return false;
    }
    
    if (!response.ok) {
      if (import.meta.env.DEV) {
        console.error('Password flow authentication failed:', responseData);
      }
      return false;
    }
    
    // Reset rate limit on success
    clearRateLimit();
    
    if (!responseData.access_token) {
      if (import.meta.env.DEV) {
        console.error('Invalid token data received:', responseData);
      }
      return false;
    }
    
    // Store tokens in localStorage
    localStorage.setItem('podio_access_token', responseData.access_token);
    localStorage.setItem('podio_token_type', responseData.token_type || 'bearer');
    
    // Store refresh token if provided (client_credentials flow might not provide one)
    if (responseData.refresh_token) {
      localStorage.setItem('podio_refresh_token', responseData.refresh_token);
    } else {
      localStorage.removeItem('podio_refresh_token');
    }
    
    // Set expiry to 30 minutes less than actual to ensure we refresh in time
    // Podio's tokens are valid for 8 hours (28800 seconds)
    const safeExpiryTime = Date.now() + ((responseData.expires_in - 1800) * 1000);
    localStorage.setItem('podio_token_expiry', safeExpiryTime.toString());
    
    if (import.meta.env.DEV) {
      console.log('Successfully obtained tokens via Password Flow');
      console.log(`Token will expire in ${Math.round(responseData.expires_in / 3600)} hours`);
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

// Refresh token
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
    
    // Direct request to Podio API
    const formData = new URLSearchParams();
    formData.append('grant_type', 'refresh_token');
    formData.append('client_id', clientId);
    formData.append('client_secret', clientSecret);
    formData.append('refresh_token', refreshToken);
    
    // Removed User-Agent header to fix CORS issues
    const response = await fetch('https://podio.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: formData,
    });
    
    // Check for HTML response
    const responseText = await response.text();
    if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
      console.error('Received HTML instead of JSON during token refresh');
      return await authenticateWithPasswordFlow();
    }
    
    // Parse JSON
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (error) {
      console.error('Failed to parse JSON during token refresh:', error);
      return await authenticateWithPasswordFlow();
    }
    
    // Handle rate limiting specifically
    if (response.status === 420 || response.status === 429) {
      let errorData: PodioErrorResponse = responseData;
      
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
      let errorData: PodioErrorResponse = responseData;
      
      if (import.meta.env.DEV) {
        console.error('Token refresh failed:', errorData);
      }
      
      // If we get an error other than invalid token, try Password Flow as fallback
      return await authenticateWithPasswordFlow();
    }
    
    // Reset rate limit on success
    clearRateLimit();
    
    const tokenData: PodioTokenResponse = responseData;
    
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
    
    // Direct request to Podio API
    const formData = new URLSearchParams();
    formData.append('grant_type', 'authorization_code');
    formData.append('client_id', clientId);
    formData.append('client_secret', clientSecret);
    formData.append('code', code);
    formData.append('redirect_uri', redirectUri);
    
    // Removed User-Agent header to fix CORS issues
    const response = await fetch('https://podio.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: formData,
    });
    
    // Check for HTML response
    const responseText = await response.text();
    if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
      console.error('Received HTML instead of JSON during token exchange');
      return false;
    }
    
    // Parse JSON
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (error) {
      console.error('Failed to parse JSON during token exchange:', error);
      return false;
    }
    
    // Handle rate limiting
    if (response.status === 420 || response.status === 429) {
      let errorData: PodioErrorResponse = responseData;
      
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
      let errorData: PodioErrorResponse = responseData;
      
      if (import.meta.env.DEV) {
        console.error('Token exchange failed:', errorData);
      }
      return false;
    }
    
    // Reset rate limit on success
    clearRateLimit();
    
    const tokenData: PodioTokenResponse = responseData;
    
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
