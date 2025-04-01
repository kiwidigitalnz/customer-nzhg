
// This module handles Podio authentication and token management
import { 
  AuthErrorType, 
  createAuthError, 
  ensureValidToken 
} from '../auth/authService';
import {
  authenticateWithPasswordFlow,
  getPodioClientId,
  getPodioClientSecret,
  startPodioOAuthFlow,
  isRateLimited,
  setRateLimit,
  clearRateLimit,
  getPodioApiDomain,
  refreshPodioToken as refreshToken
} from './podioOAuth';
import { getFieldValueByExternalId } from './podioFieldHelpers';

// Re-export the refreshPodioToken function so it can be imported by other modules
export { refreshToken as refreshPodioToken };

interface PodioCredentials {
  username: string;
  password: string;
}

// Rate limiting constants for API calls
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'podio_access_token',
  REFRESH_TOKEN: 'podio_refresh_token',
  TOKEN_EXPIRY: 'podio_token_expiry',
  APP_ACCESS_TOKEN: 'podio_app_access_token',
  APP_TOKEN_EXPIRY: 'podio_app_token_expiry',
  CLIENT_ID: 'podio_client_id',
  CLIENT_SECRET: 'podio_client_secret',
  CONTACTS_APP_TOKEN: 'podio_contacts_app_token',
  RATE_LIMIT: 'podio_rate_limit_until'
};

// Get Podio App IDs from environment variables with fallbacks to hardcoded values
export const PODIO_CONTACTS_APP_ID = Number(import.meta.env.VITE_PODIO_CONTACTS_APP_ID) || 26969025;
export const PODIO_PACKING_SPEC_APP_ID = Number(import.meta.env.VITE_PODIO_PACKING_SPEC_APP_ID) || 29797638;

// Get the contacts app token from environment
export const getContactsAppToken = (): string | null => {
  return import.meta.env.VITE_PODIO_CONTACTS_APP_TOKEN || localStorage.getItem(STORAGE_KEYS.CONTACTS_APP_TOKEN);
};

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

// Token management for client credentials
export const hasValidTokens = (): boolean => {
  const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  const tokenExpiry = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY);
  
  if (!accessToken || !tokenExpiry) return false;
  
  // Check if token is not expired (with 5-minute buffer)
  const expiryTime = parseInt(tokenExpiry, 10);
  return expiryTime > (Date.now() + 5 * 60 * 1000);
};

// Check if app token is valid
export const hasValidAppToken = (): boolean => {
  const appToken = localStorage.getItem(STORAGE_KEYS.APP_ACCESS_TOKEN);
  const tokenExpiry = localStorage.getItem(STORAGE_KEYS.APP_TOKEN_EXPIRY);
  
  if (!appToken || !tokenExpiry) return false;
  
  // Check if token is not expired (with 5-minute buffer)
  const expiryTime = parseInt(tokenExpiry, 10);
  return expiryTime > (Date.now() + 5 * 60 * 1000);
};

export const clearTokens = (): void => {
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY);
  localStorage.removeItem(STORAGE_KEYS.APP_ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.APP_TOKEN_EXPIRY);
  console.log('Cleared Podio tokens');
};

export const storeTokens = (tokenData: any): void => {
  localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokenData.access_token);
  if (tokenData.refresh_token) {
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokenData.refresh_token);
  }
  
  // Set expiry with a buffer (30 minutes before actual expiry)
  const expiryTime = Date.now() + ((tokenData.expires_in - 1800) * 1000);
  localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, expiryTime.toString());
  
  console.log(`Tokens stored successfully. Expires in ${Math.round(tokenData.expires_in / 3600)} hours`);
};

// Store the app token
export const storeAppToken = (tokenData: any): void => {
  localStorage.setItem(STORAGE_KEYS.APP_ACCESS_TOKEN, tokenData.access_token);
  
  // Set expiry with a buffer (30 minutes before actual expiry)
  const expiryTime = Date.now() + ((tokenData.expires_in - 1800) * 1000);
  localStorage.setItem(STORAGE_KEYS.APP_TOKEN_EXPIRY, expiryTime.toString());
  
  console.log(`App token stored successfully. Expires in ${Math.round(tokenData.expires_in / 3600)} hours`);
};

// Store the contacts app token
export const storeContactsAppToken = (token: string): void => {
  localStorage.setItem(STORAGE_KEYS.CONTACTS_APP_TOKEN, token);
  console.log('Contacts app token stored');
};

// Main client credentials authentication
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
    
    // Also store the app-specific token if available
    const contactsAppToken = getContactsAppToken();
    if (contactsAppToken) {
      storeContactsAppToken(contactsAppToken);
    }
    
    clearRateLimit();
    
    return true;
  } catch (error) {
    console.error('Error during authentication:', error);
    return false;
  }
};

// New function to authenticate with the Contacts app token
export const authenticateWithContactsAppToken = async (): Promise<boolean> => {
  try {
    // Check if we're rate limited
    if (isRateLimited()) {
      console.log('Rate limited. Try again later.');
      return false;
    }
    
    const clientId = getClientId();
    const contactsAppToken = getContactsAppToken();
    
    if (!clientId || !contactsAppToken) {
      console.error('Missing Podio client ID or contacts app token');
      return false;
    }
    
    console.log('Authenticating with Podio using Contacts app token...');
    
    // Create form data for app authentication flow
    const formData = new URLSearchParams();
    formData.append('grant_type', 'app');
    formData.append('app_id', PODIO_CONTACTS_APP_ID.toString());
    formData.append('app_token', contactsAppToken);
    formData.append('client_id', clientId);
    
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
    
    console.log('App token response status:', response.status);
    
    // Get the response as text to inspect it
    const responseText = await response.text();
    console.log('App token response first 100 chars:', responseText.substring(0, 100));
    
    // Check if the response is HTML instead of JSON
    if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
      console.error('Received HTML instead of JSON. Check your app credentials and request format.');
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
    
    // Handle rate limiting
    if (response.status === 429 || response.status === 420) {
      const retryAfter = response.headers.get('Retry-After');
      setRateLimit(retryAfter ? parseInt(retryAfter, 10) : 60);
      return false;
    }
    
    if (!response.ok) {
      console.error('App authentication failed:', responseData);
      return false;
    }
    
    // Parse and store token data
    const tokenData = responseData;
    
    if (!tokenData.access_token) {
      console.error('Invalid app token data received:', tokenData);
      return false;
    }
    
    // Store app token
    storeAppToken(tokenData);
    
    clearRateLimit();
    
    return true;
  } catch (error) {
    console.error('Error during app authentication:', error);
    return false;
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

// Ensure we have a valid app token for Contacts
export const ensureContactsAppAuthenticated = async (): Promise<boolean> => {
  if (hasValidAppToken()) {
    return true;
  }
  
  return await authenticateWithContactsAppToken();
};

// Modified API call function to use the app token for contacts app
export const callPodioApi = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
  // Determine which authentication to use based on the endpoint
  const isContactsEndpoint = endpoint.includes(`app/${PODIO_CONTACTS_APP_ID}`) || 
                           endpoint.includes(`item/app/${PODIO_CONTACTS_APP_ID}`);
  
  // For contacts app endpoints, use app authentication
  if (isContactsEndpoint) {
    const isAppAuthenticated = await ensureContactsAppAuthenticated();
    if (!isAppAuthenticated) {
      throw new Error('Could not authenticate with Contacts app');
    }
    
    // Use the app access token
    const appAccessToken = localStorage.getItem(STORAGE_KEYS.APP_ACCESS_TOKEN);
    
    // Add authorization header
    const headers = {
      'Authorization': `Bearer ${appAccessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'NZHG-Customer-Portal/1.0',
      ...options.headers,
    };
    
    try {
      console.log(`Making API call to Contacts endpoint: ${endpoint} with app token`);
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
      
      // If app authentication failed, try to reauthenticate
      if (response.status === 401) {
        console.log('App token invalid, trying to reauthenticate');
        
        // Clear existing token and try again
        localStorage.removeItem(STORAGE_KEYS.APP_ACCESS_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.APP_TOKEN_EXPIRY);
        
        const reauth = await authenticateWithContactsAppToken();
        if (!reauth) {
          throw new Error('Failed to authenticate with Contacts app');
        }
        
        // Retry with new token
        return callPodioApi(endpoint, options);
      }
      
      if (!response.ok) {
        let errorMessage = `API error: ${response.status}`;
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.error_description || errorMessage;
        } catch (e) {
          // Cannot parse as JSON
        }
        
        throw new Error(errorMessage);
      }
      
      // Get response as JSON
      return await response.json();
    } catch (error) {
      console.error('API call error:', error);
      throw error;
    }
  } else {
    // For non-contacts endpoints, use client credentials
    const isAuthenticated = await ensureAuthenticated();
    if (!isAuthenticated) {
      throw new Error('Not authenticated with Podio');
    }
    
    // Use general access token
    const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    
    // Add authorization header
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'NZHG-Customer-Portal/1.0',
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
      
      // If token is invalid, try refreshing it
      if (response.status === 401) {
        console.log('Token invalid, trying to refresh');
        
        const refreshed = await refreshToken();
        if (!refreshed) {
          throw new Error('Authentication failed');
        }
        
        // Retry with new token
        return callPodioApi(endpoint, options);
      }
      
      if (!response.ok) {
        let errorMessage = `API error: ${response.status}`;
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.error_description || errorMessage;
        } catch (e) {
          // Cannot parse as JSON
        }
        
        throw new Error(errorMessage);
      }
      
      // Get response as JSON
      return await response.json();
    } catch (error) {
      console.error('API call error:', error);
      throw error;
    }
  }
};

// Function to check if we can access the Contacts app
export const validateContactsAppAccess = async (): Promise<boolean> => {
  try {
    // First authenticate with the app token
    const authenticated = await authenticateWithContactsAppToken();
    if (!authenticated) {
      console.error('Failed to authenticate with Contacts app token');
      return false;
    }
    
    // Try to get the app details
    const appEndpoint = `app/${PODIO_CONTACTS_APP_ID}`;
    
    try {
      const appDetails = await callPodioApi(appEndpoint);
      console.log('Successfully accessed Contacts app:', appDetails.app_id);
      return true;
    } catch (error) {
      console.error('Failed to access Contacts app:', error);
      return false;
    }
  } catch (error) {
    console.error('Error validating Contacts app access:', error);
    return false;
  }
};

// This function authenticates a user by checking the Podio contacts app
export const authenticateUser = async (username: string, password: string): Promise<any> => {
  try {
    console.log(`Authenticating user: ${username}`);
    
    // Check if we're rate limited
    if (isRateLimited()) {
      throw new Error('Rate limited. Try again later.');
    }
    
    // Authenticate with Podio client credentials first (for general access)
    const isAuthenticated = await authenticateWithClientCredentials();
    if (!isAuthenticated) {
      throw new Error('Could not authenticate with Podio');
    }
    
    // Authenticate with the Contacts app token
    const appAuthenticated = await authenticateWithContactsAppToken();
    if (!appAuthenticated) {
      throw new Error('Could not authenticate with Contacts app');
    }
    
    // Validate app access
    const hasAppAccess = await validateContactsAppAccess();
    if (!hasAppAccess) {
      throw new Error('The application does not have permission to access the Contacts app. Please check your Podio API permissions.');
    }
    
    // Search for user by username in the Contacts app
    console.log(`Searching for user: ${username}`);
    
    try {
      // Use the filter endpoint with the app token
      const filters = {
        filters: {
          "customer-portal-username": username
        }
      };
      
      const endpoint = `item/app/${PODIO_CONTACTS_APP_ID}/filter/`;
      const searchResponse = await callPodioApi(endpoint, {
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
      console.error('Failed to search for user:', error);
      throw new Error('Cannot access user data. Check permissions or configuration.');
    }
  } catch (error) {
    console.error('User authentication error:', error);
    throw error;
  }
};

// Podio Contact Field IDs
export const CONTACT_FIELD_IDS = {
  username: "customer-portal-username",
  password: "customer-portal-password",
  contactItemId: "item-id",
  logoUrl: "logo-url",
  title: "title"
};
