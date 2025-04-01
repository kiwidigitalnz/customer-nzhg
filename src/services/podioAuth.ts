
// Core authentication service for Podio integration

// Types for Podio responses
interface PodioTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

interface PodioErrorResponse {
  error: string;
  error_description: string;
}

// Configuration and helper constants
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'podio_access_token',
  REFRESH_TOKEN: 'podio_refresh_token',
  TOKEN_EXPIRY: 'podio_token_expiry',
  CLIENT_ID: 'podio_client_id',
  CLIENT_SECRET: 'podio_client_secret',
  RATE_LIMIT: 'podio_rate_limit_until'
};

// App IDs for Podio apps
export const PODIO_CONTACTS_APP_ID = Number(import.meta.env.VITE_PODIO_CONTACTS_APP_ID) || 26969025;
export const PODIO_PACKING_SPEC_APP_ID = Number(import.meta.env.VITE_PODIO_PACKING_SPEC_APP_ID) || 29797638;

// Utility to get client ID from environment or localStorage
export const getClientId = (): string | null => {
  return import.meta.env.VITE_PODIO_CLIENT_ID || localStorage.getItem(STORAGE_KEYS.CLIENT_ID);
};

// Utility to get client secret from environment or localStorage
export const getClientSecret = (): string | null => {
  return import.meta.env.VITE_PODIO_CLIENT_SECRET || localStorage.getItem(STORAGE_KEYS.CLIENT_SECRET);
};

// Check if Podio API is configured properly
export const isPodioConfigured = (): boolean => {
  return !!getClientId() && !!getClientSecret();
};

// Rate limiting functions
export const isRateLimited = (): boolean => {
  const limitUntil = localStorage.getItem(STORAGE_KEYS.RATE_LIMIT);
  if (!limitUntil) return false;
  
  return Date.now() < parseInt(limitUntil, 10);
};

export const setRateLimit = (seconds: number): void => {
  const limitTime = Date.now() + (seconds * 1000);
  localStorage.setItem(STORAGE_KEYS.RATE_LIMIT, limitTime.toString());
  console.log(`Rate limited for ${seconds} seconds`);
};

export const clearRateLimit = (): void => {
  localStorage.removeItem(STORAGE_KEYS.RATE_LIMIT);
};

// Token management
export const hasValidTokens = (): boolean => {
  const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  const tokenExpiry = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY);
  
  if (!accessToken || !tokenExpiry) return false;
  
  // Check if token is not expired (with 5-minute buffer)
  const expiryTime = parseInt(tokenExpiry, 10);
  return expiryTime > (Date.now() + 5 * 60 * 1000);
};

export const clearTokens = (): void => {
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY);
  console.log('Cleared Podio tokens');
};

export const storeTokens = (tokenData: PodioTokenResponse): void => {
  localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokenData.access_token);
  if (tokenData.refresh_token) {
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokenData.refresh_token);
  }
  
  // Set expiry with a buffer (30 minutes before actual expiry)
  const expiryTime = Date.now() + ((tokenData.expires_in - 1800) * 1000);
  localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, expiryTime.toString());
  
  console.log(`Tokens stored successfully. Expires in ${Math.round(tokenData.expires_in / 3600)} hours`);
};

// Main authentication functions
export const authenticateWithClientCredentials = async (): Promise<boolean> => {
  try {
    // Check if we're rate limited
    if (isRateLimited()) {
      console.log('Rate limited. Try again later.');
      return false;
    }
    
    const clientId = getClientId();
    const clientSecret = getClientSecret();
    
    if (!clientId || !clientSecret) {
      console.error('Missing Podio client credentials');
      return false;
    }
    
    console.log('Authenticating with Podio using client credentials...');
    
    // Create form data
    const formData = new URLSearchParams();
    formData.append('grant_type', 'client_credentials');
    formData.append('client_id', clientId);
    formData.append('client_secret', clientSecret);
    
    // Make the token request directly to Podio's token endpoint
    const response = await fetch('https://podio.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'User-Agent': 'NZHG-Customer-Portal/1.0'
      },
      body: formData
    });
    
    console.log('Token response status:', response.status);
    
    // First get the response as text to inspect it
    const responseText = await response.text();
    console.log('Response first 100 chars:', responseText.substring(0, 100));
    
    // Check if the response is HTML instead of JSON
    if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
      console.error('Received HTML instead of JSON. Check your client credentials and request format.');
      return false;
    }
    
    // Parse the text response
    let responseData: any;
    try {
      responseData = JSON.parse(responseText);
    } catch (error) {
      console.error('Failed to parse JSON response:', error);
      console.error('Raw response:', responseText);
      return false;
    }
    
    // Handle rate limiting specifically
    if (response.status === 429 || response.status === 420) {
      const retryAfter = response.headers.get('Retry-After');
      setRateLimit(retryAfter ? parseInt(retryAfter, 10) : 60);
      return false;
    }
    
    if (!response.ok) {
      console.error('Authentication failed:', responseData);
      return false;
    }
    
    // Parse and store token data
    const tokenData = responseData;
    
    if (!tokenData.access_token) {
      console.error('Invalid token data received:', tokenData);
      return false;
    }
    
    // Store tokens
    storeTokens(tokenData);
    clearRateLimit();
    
    return true;
  } catch (error) {
    console.error('Error during authentication:', error);
    return false;
  }
};

// Function to refresh token
export const refreshToken = async (): Promise<boolean> => {
  try {
    if (isRateLimited()) {
      return false;
    }
    
    const refreshTokenValue = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    if (!refreshTokenValue) {
      // If no refresh token, fall back to client credentials
      return authenticateWithClientCredentials();
    }
    
    const clientId = getClientId();
    const clientSecret = getClientSecret();
    
    if (!clientId || !clientSecret) {
      return false;
    }
    
    console.log('Refreshing token...');
    
    const formData = new URLSearchParams();
    formData.append('grant_type', 'refresh_token');
    formData.append('refresh_token', refreshTokenValue);
    formData.append('client_id', clientId);
    formData.append('client_secret', clientSecret);
    
    const response = await fetch('https://podio.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'User-Agent': 'NZHG-Customer-Portal/1.0'
      },
      body: formData
    });
    
    // First get the response as text to inspect it
    const responseText = await response.text();
    
    // Check if the response is HTML instead of JSON
    if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
      console.error('Received HTML instead of JSON during token refresh. Falling back to client credentials.');
      return authenticateWithClientCredentials();
    }
    
    // Parse the text response
    let responseData: any;
    try {
      responseData = JSON.parse(responseText);
    } catch (error) {
      console.error('Failed to parse JSON response during token refresh:', error);
      console.error('Raw response:', responseText);
      return authenticateWithClientCredentials();
    }
    
    // Handle rate limiting
    if (response.status === 429 || response.status === 420) {
      const retryAfter = response.headers.get('Retry-After');
      setRateLimit(retryAfter ? parseInt(retryAfter, 10) : 60);
      return false;
    }
    
    // If refresh token is invalid, try client credentials
    if (response.status === 400 || response.status === 401) {
      console.log('Refresh token invalid, trying client credentials');
      return authenticateWithClientCredentials();
    }
    
    if (!response.ok) {
      console.error('Token refresh failed:', responseData);
      // Try client credentials as fallback
      return authenticateWithClientCredentials();
    }
    
    const tokenData = responseData;
    storeTokens(tokenData);
    clearRateLimit();
    
    return true;
  } catch (error) {
    console.error('Error refreshing token:', error);
    // Try client credentials as fallback on error
    return authenticateWithClientCredentials();
  }
};

// Ensure we have a valid token before making API calls
export const ensureAuthenticated = async (): Promise<boolean> => {
  if (hasValidTokens()) {
    return true;
  }
  
  const refreshTokenValue = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  if (refreshTokenValue) {
    return await refreshToken();
  }
  
  return await authenticateWithClientCredentials();
};

// API call function
export const callPodioApi = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
  // First ensure we're authenticated
  const isAuthenticated = await ensureAuthenticated();
  if (!isAuthenticated) {
    throw new Error('Not authenticated with Podio');
  }
  
  const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  
  // Add authorization header
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...options.headers,
  };
  
  try {
    const response = await fetch(`https://api.podio.com/${endpoint}`, {
      ...options,
      headers,
    });
    
    // Handle rate limiting
    if (response.status === 429 || response.status === 420) {
      const retryAfter = response.headers.get('Retry-After');
      setRateLimit(retryAfter ? parseInt(retryAfter, 10) : 60);
      throw new Error('Rate limit reached');
    }
    
    // If token is invalid, try refreshing once
    if (response.status === 401) {
      const refreshed = await refreshToken();
      if (!refreshed) {
        throw new Error('Authentication failed');
      }
      
      // Retry the call with new token
      return callPodioApi(endpoint, options);
    }
    
    // Get response as text first to check for HTML error pages
    const responseText = await response.text();
    
    // Check if the response is HTML instead of JSON
    if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
      console.error('Received HTML instead of JSON from API call');
      throw new Error('Invalid response from Podio API');
    }
    
    // Parse JSON response
    let responseData;
    try {
      responseData = responseText ? JSON.parse(responseText) : {};
    } catch (error) {
      console.error('Failed to parse API response:', error);
      console.error('Raw response:', responseText);
      throw new Error('Invalid JSON response from API');
    }
    
    if (!response.ok) {
      throw new Error(responseData.error_description || `API error: ${response.status}`);
    }
    
    return responseData;
  } catch (error) {
    console.error('API call error:', error);
    throw error;
  }
};

// User authentication
export const authenticateUser = async (username: string, password: string): Promise<any> => {
  try {
    // Ensure we have authenticated with Podio first
    const isAuthenticated = await ensureAuthenticated();
    if (!isAuthenticated) {
      throw new Error('Could not connect to Podio');
    }
    
    // Search for user by username in the Contacts app
    const filters = {
      filters: {
        "customer-portal-username": username
      }
    };
    
    console.log(`Searching for user: ${username}`);
    
    const searchResponse = await callPodioApi(`item/app/${PODIO_CONTACTS_APP_ID}/filter/`, {
      method: 'POST',
      body: JSON.stringify(filters),
    });
    
    if (!searchResponse.items || searchResponse.items.length === 0) {
      throw new Error('User not found');
    }
    
    // Get the first matching contact
    const contact = searchResponse.items[0];
    
    // Helper function to get field value
    const getFieldValue = (fields: any[], externalId: string): string => {
      const field = fields.find(f => f.external_id === externalId);
      if (!field || !field.values) return '';
      
      if (field.type === 'text') {
        return field.values[0].value || '';
      }
      
      return '';
    };
    
    // Get user details
    const contactData = {
      id: contact.item_id,
      name: getFieldValue(contact.fields, 'title') || 'Unknown',
      email: getFieldValue(contact.fields, 'email') || '',
      username: getFieldValue(contact.fields, 'customer-portal-username') || '',
      logoUrl: getFieldValue(contact.fields, 'logo-url') || ''
    };
    
    // Get the stored password
    const storedPassword = getFieldValue(contact.fields, 'customer-portal-password');
    
    // Simple password check (in a real app, use proper hashing)
    if (password !== storedPassword) {
      throw new Error('Invalid password');
    }
    
    return contactData;
  } catch (error) {
    console.error('User authentication error:', error);
    throw error;
  }
};
