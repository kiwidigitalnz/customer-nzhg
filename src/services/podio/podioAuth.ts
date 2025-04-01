
// This module handles Podio authentication and token management
import { 
  getPodioClientId,
  getPodioClientSecret,
  getPodioApiDomain,
  isRateLimited as checkRateLimit,
  setRateLimit as setApiRateLimit,
  clearRateLimit as clearApiRateLimit,
  refreshPodioToken as refreshToken,
  cacheUserData as cacheData,
  getCachedUserData as getCachedData
} from './podioOAuth';
import { getFieldValueByExternalId } from './podioFieldHelpers';

// Re-export the refreshPodioToken function so it can be imported by other modules
export { refreshToken as refreshPodioToken };
// Re-export rate limiting functions
export { 
  checkRateLimit as isRateLimited,
  setApiRateLimit as setRateLimit,
  clearApiRateLimit as clearRateLimit,
  cacheData as cacheUserData,
  getCachedData as getCachedUserData
};

// Storage keys for Podio tokens and settings
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'podio_access_token',
  REFRESH_TOKEN: 'podio_refresh_token',
  TOKEN_EXPIRY: 'podio_token_expiry',
  APP_ACCESS_TOKEN: 'podio_app_access_token',
  APP_TOKEN_EXPIRY: 'podio_app_token_expiry',
  CLIENT_ID: 'podio_client_id',
  CLIENT_SECRET: 'podio_client_secret',
  CONTACTS_APP_TOKEN: 'podio_contacts_app_token',
  PACKING_SPEC_APP_TOKEN: 'podio_packing_spec_app_token',
  CURRENT_APP_CONTEXT: 'podio_current_app_context', // Track which app we're using
  USER_CACHE: 'podio_user_cache', // Cache for user data
  USER_CACHE_EXPIRY: 'podio_user_cache_expiry', // Expiry time for user cache
  RATE_LIMIT_INFO: 'podio_rate_limit_info' // Store structured rate limit information
};

// Cache expiry time in milliseconds (30 minutes)
const USER_CACHE_DURATION = 30 * 60 * 1000;

// Rate limit backoff constants
const RATE_LIMIT = {
  MAX_RETRIES: 5,
  INITIAL_DELAY: 1000, // 1 second
  MAX_DELAY: 60000, // 1 minute
  BACKOFF_FACTOR: 2 // Exponential factor
};

// App context enum for tracking which app we're authenticating with
export enum PodioAppContext {
  CONTACTS = 'contacts',
  PACKING_SPEC = 'packing_spec'
}

// Get Podio App IDs from environment variables with fallbacks to hardcoded values
export const PODIO_CONTACTS_APP_ID = Number(import.meta.env.VITE_PODIO_CONTACTS_APP_ID) || 26969025;
export const PODIO_PACKING_SPEC_APP_ID = Number(import.meta.env.VITE_PODIO_PACKING_SPEC_APP_ID) || 29797638;

// Rate limit information interface - fix inconsistent property names
export interface RateLimitInfo {
  isLimited: boolean;
  limitUntil: number; // timestamp when the rate limit expires
  retryCount: number;
  lastEndpoint?: string;
}

// Get rate limit info or return default
const getRateLimitInfo = (): RateLimitInfo => {
  const info = localStorage.getItem(STORAGE_KEYS.RATE_LIMIT_INFO);
  if (!info) {
    return {
      isLimited: false,
      limitUntil: 0,
      retryCount: 0
    };
  }
  return JSON.parse(info);
};

// Set rate limit with exponential backoff
export const setRateLimitWithBackoff = (retryAfter?: number, endpoint?: string): void => {
  const info = getRateLimitInfo();
  
  // Increment retry count
  info.retryCount = (info.retryCount || 0) + 1;
  
  // Calculate backoff delay (in seconds)
  let delay = retryAfter ? retryAfter : Math.min(
    Math.floor(RATE_LIMIT.INITIAL_DELAY / 1000 * Math.pow(RATE_LIMIT.BACKOFF_FACTOR, info.retryCount - 1)),
    Math.floor(RATE_LIMIT.MAX_DELAY / 1000)
  );
  
  // Set rate limit info
  info.isLimited = true;
  info.limitUntil = Date.now() + (delay * 1000);
  info.lastEndpoint = endpoint;
  
  localStorage.setItem(STORAGE_KEYS.RATE_LIMIT_INFO, JSON.stringify(info));
  
  console.log(`Rate limited with exponential backoff. Retry after ${delay} seconds. Retry count: ${info.retryCount}`);
  emitDebugInfo('Rate limited with backoff', 'error', 
    `Retry after: ${delay} seconds
     Retry count: ${info.retryCount}
     Endpoint: ${endpoint || 'Unknown'}`
  );
};

// Clear rate limit info
export const clearRateLimitInfo = (): void => {
  localStorage.removeItem(STORAGE_KEYS.RATE_LIMIT_INFO);
  console.log('Rate limit cleared');
  emitDebugInfo('Rate limit cleared', 'success');
};

// Check if rate limited with more details
export const isRateLimitedWithInfo = (): RateLimitInfo => {
  const info = getRateLimitInfo();
  
  if (info.isLimited && info.limitUntil > Date.now()) {
    return info;
  }
  
  // If rate limit has expired, clear it
  if (info.isLimited) {
    clearRateLimitInfo();
  }
  
  return {
    isLimited: false,
    limitUntil: 0,
    retryCount: 0
  };
};

// Debugging functions for UI feedback
const emitDebugInfo = (step: string, status: 'pending' | 'success' | 'error', details?: string) => {
  // Store debug info in localStorage to allow components to react
  const debugKey = `podio_auth_debug_${Date.now()}`;
  const debugInfo = JSON.stringify({ step, status, details });
  
  // Use localStorage event for communication
  localStorage.setItem(debugKey, debugInfo);
  // Trigger event for current window
  window.dispatchEvent(new StorageEvent('storage', {
    key: debugKey,
    newValue: debugInfo
  }));
  
  // Log to console
  if (import.meta.env.DEV) {
    console.log(`[Podio Auth Debug] ${step} - ${status}${details ? ': ' + details : ''}`);
  }
  
  // Clean up old debug keys after 10 seconds to prevent localStorage pollution
  setTimeout(() => {
    localStorage.removeItem(debugKey);
  }, 10000);
};

// Get the contacts app token from environment
export const getContactsAppToken = (): string | null => {
  return import.meta.env.VITE_PODIO_CONTACTS_APP_TOKEN || localStorage.getItem(STORAGE_KEYS.CONTACTS_APP_TOKEN);
};

// Get the packing spec app token from environment
export const getPackingSpecAppToken = (): string | null => {
  return import.meta.env.VITE_PODIO_PACKING_SPEC_APP_TOKEN || localStorage.getItem(STORAGE_KEYS.PACKING_SPEC_APP_TOKEN);
};

// Set the current app context
export const setCurrentAppContext = (context: PodioAppContext): void => {
  localStorage.setItem(STORAGE_KEYS.CURRENT_APP_CONTEXT, context);
  console.log(`Set current app context to: ${context}`);
  emitDebugInfo('Set app context', 'success', `Context: ${context}`);
};

// Get the current app context
export const getCurrentAppContext = (): PodioAppContext => {
  const context = localStorage.getItem(STORAGE_KEYS.CURRENT_APP_CONTEXT) as PodioAppContext;
  return context || PodioAppContext.CONTACTS; // Default to contacts app
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

// Token management for client credentials
export const hasValidTokens = (): boolean => {
  const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  const tokenExpiry = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY);
  
  if (!accessToken || !tokenExpiry) return false;
  
  // Check if token is not expired (with 5-minute buffer)
  const expiryTime = parseInt(tokenExpiry, 10);
  return expiryTime > (Date.now() + 5 * 60 * 1000);
};

// For backward compatibility
export const hasValidPodioTokens = hasValidTokens;

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
  localStorage.removeItem(STORAGE_KEYS.CURRENT_APP_CONTEXT);
  console.log('Cleared Podio tokens');
  emitDebugInfo('Cleared all Podio tokens', 'success');
};

// For backward compatibility
export const clearPodioTokens = clearTokens;

export const storeTokens = (tokenData: any): void => {
  localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokenData.access_token);
  if (tokenData.refresh_token) {
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokenData.refresh_token);
  }
  
  // Set expiry with a buffer (30 minutes before actual expiry)
  const expiryTime = Date.now() + ((tokenData.expires_in - 1800) * 1000);
  localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, expiryTime.toString());
  
  console.log(`Tokens stored successfully. Expires in ${Math.round(tokenData.expires_in / 3600)} hours`);
  emitDebugInfo('Tokens stored successfully', 'success', 
    `Access token: ${tokenData.access_token.substring(0, 10)}...
     Expires in: ${Math.round(tokenData.expires_in / 3600)} hours
     Refresh token: ${tokenData.refresh_token ? 'Present' : 'Not provided'}`
  );
};

// Store the app token
export const storeAppToken = (tokenData: any): void => {
  localStorage.setItem(STORAGE_KEYS.APP_ACCESS_TOKEN, tokenData.access_token);
  
  // Set expiry with a buffer (30 minutes before actual expiry)
  const expiryTime = Date.now() + ((tokenData.expires_in - 1800) * 1000);
  localStorage.setItem(STORAGE_KEYS.APP_TOKEN_EXPIRY, expiryTime.toString());
  
  console.log(`App token stored successfully. Expires in ${Math.round(tokenData.expires_in / 3600)} hours`);
  emitDebugInfo('App token stored successfully', 'success', 
    `App token: ${tokenData.access_token.substring(0, 10)}...
     Expires in: ${Math.round(tokenData.expires_in / 3600)} hours`
  );
};

// Store the contacts app token
export const storeContactsAppToken = (token: string): void => {
  localStorage.setItem(STORAGE_KEYS.CONTACTS_APP_TOKEN, token);
  console.log('Contacts app token stored');
  emitDebugInfo('Contacts app token stored', 'success');
};

// Store the packing spec app token
export const storePackingSpecAppToken = (token: string): void => {
  localStorage.setItem(STORAGE_KEYS.PACKING_SPEC_APP_TOKEN, token);
  console.log('Packing spec app token stored');
  emitDebugInfo('Packing spec app token stored', 'success');
};

// App authentication with client credentials
export const authenticateWithAppToken = async (appId: number, appToken: string): Promise<boolean> => {
  try {
    if (isRateLimited()) {
      console.log('Rate limited. Try again later.');
      return false;
    }
    
    console.log(`Authenticating with app ${appId} using app token`);
    
    // Create form data for token request
    const formData = new URLSearchParams();
    formData.append('grant_type', 'app');
    formData.append('app_id', appId.toString());
    formData.append('app_token', appToken);
    
    const response = await fetch('https://podio.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: formData
    });
    
    // Check for rate limiting
    if (response.status === 429 || response.status === 420) {
      const retryAfter = response.headers.get('Retry-After');
      console.log(`Rate limited. Retry after ${retryAfter || 'unknown'} seconds.`);
      setRateLimitWithBackoff(retryAfter ? parseInt(retryAfter, 10) : undefined, `App auth ${appId}`);
      return false;
    }
    
    if (!response.ok) {
      console.error(`App authentication failed with status ${response.status}`);
      return false;
    }
    
    const tokenData = await response.json();
    
    if (!tokenData.access_token) {
      console.error('No access token in response');
      return false;
    }
    
    // Store the app token
    storeAppToken(tokenData);
    
    // Set the app context based on app ID
    if (appId === PODIO_CONTACTS_APP_ID) {
      setCurrentAppContext(PodioAppContext.CONTACTS);
    } else if (appId === PODIO_PACKING_SPEC_APP_ID) {
      setCurrentAppContext(PodioAppContext.PACKING_SPEC);
    }
    
    return true;
  } catch (error) {
    console.error('Error authenticating with app token:', error);
    return false;
  }
};

// Authenticate with Contacts app
export const authenticateWithContactsAppToken = async (): Promise<boolean> => {
  try {
    const appToken = getContactsAppToken();
    
    if (!appToken) {
      console.error('No Contacts app token available');
      return false;
    }
    
    const success = await authenticateWithAppToken(PODIO_CONTACTS_APP_ID, appToken);
    
    if (success) {
      console.log('Successfully authenticated with Contacts app');
      return true;
    }
    
    console.error('Failed to authenticate with Contacts app');
    return false;
  } catch (error) {
    console.error('Error in Contacts app authentication:', error);
    return false;
  }
};

// Authenticate with Packing Spec app
export const authenticateWithPackingSpecAppToken = async (): Promise<boolean> => {
  try {
    const appToken = getPackingSpecAppToken();
    
    if (!appToken) {
      console.error('No Packing Spec app token available');
      return false;
    }
    
    const success = await authenticateWithAppToken(PODIO_PACKING_SPEC_APP_ID, appToken);
    
    if (success) {
      console.log('Successfully authenticated with Packing Spec app');
      return true;
    }
    
    console.error('Failed to authenticate with Packing Spec app');
    return false;
  } catch (error) {
    console.error('Error in Packing Spec app authentication:', error);
    return false;
  }
};

// Main client credentials authentication
export const authenticateWithClientCredentials = async (): Promise<boolean> => {
  try {
    // Check if we're rate limited
    if (checkRateLimit()) {
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
        'Accept': 'application/json'
      },
      body: formData
    });
    
    console.log('Token response status:', response.status);
    
    // Check for rate limiting
    if (response.status === 429 || response.status === 420) {
      const retryAfter = response.headers.get('Retry-After');
      console.log(`Rate limited. Retry after ${retryAfter || 'unknown'} seconds.`);
      setRateLimitWithBackoff(retryAfter ? parseInt(retryAfter, 10) : undefined, 'client_credentials');
      return false;
    }
    
    if (!response.ok) {
      console.error(`Authentication failed with status ${response.status}`);
      return false;
    }
    
    const responseText = await response.text();
    
    // Check for valid JSON
    try {
      const responseData = JSON.parse(responseText);
      
      if (!responseData.access_token) {
        console.error('No access token in response');
        return false;
      }
      
      // Store tokens
      storeTokens(responseData);
      
      return true;
    } catch (error) {
      console.error('Error parsing token response:', error);
      return false;
    }
  } catch (error) {
    console.error('Error during client credentials authentication:', error);
    setRateLimitWithBackoff(10, 'client_credentials_error');
    return false;
  }
};

// Contact field IDs for the Podio Contacts app
export const CONTACT_FIELD_IDS = {
  email: 265834175,
  name: 265834176,
  phone: 265834177,
  address: 265834178,
  website: 265834179,
  logo: 265834180,
  username: 265834182,
  password: 265834181
};

// User or contact authentication
export const authenticateUser = async (username: string, password: string): Promise<any> => {
  try {
    // Check for rate limiting
    if (isRateLimited()) {
      throw new Error('Rate limited. Please try again later.');
    }
    
    // Check if we're already authenticated for the Contacts app
    if (getCurrentAppContext() !== PodioAppContext.CONTACTS) {
      const authSuccess = await authenticateWithContactsAppToken();
      if (!authSuccess) {
        throw new Error('Failed to authenticate with Contacts app');
      }
    }
    
    // Check cache first
    const cachedUser = getCachedUserData(username);
    if (cachedUser) {
      console.log('Using cached user data');
      return cachedUser;
    }
    
    console.log(`Authenticating user ${username}`);
    
    // Filter contacts by username
    const endpoint = `item/app/${PODIO_CONTACTS_APP_ID}/filter/`;
    
    const filters = {
      filters: {
        [CONTACT_FIELD_IDS.username]: username
      }
    };
    
    const response = await callPodioApi(endpoint, {
      method: 'POST',
      body: JSON.stringify(filters),
    });
    
    if (!response.items || response.items.length === 0) {
      throw new Error('User not found');
    }
    
    // Get the first matching contact
    const contact = response.items[0];
    const fields = contact.fields;
    
    // Extract the password field to validate
    const storedPassword = getFieldValueByExternalId(fields, 'password');
    
    if (storedPassword !== password) {
      throw new Error('Invalid password');
    }
    
    // Extract user data
    const userData = {
      id: contact.item_id,
      name: getFieldValueByExternalId(fields, 'name'),
      email: getFieldValueByExternalId(fields, 'email'),
      username: getFieldValueByExternalId(fields, 'username'),
      logoUrl: getLogoUrl(fields)
    };
    
    // Cache user data
    cacheUserData(username, userData);
    
    return userData;
  } catch (error) {
    console.error('Error authenticating user:', error);
    if ((error as Error).message.includes('Rate limit')) {
      setRateLimitWithBackoff(undefined, 'user_authentication');
    }
    throw error;
  }
};

// Extract logo URL from fields
const getLogoUrl = (fields: any[]): string | undefined => {
  try {
    const logoField = fields.find(field => field.field_id === CONTACT_FIELD_IDS.logo);
    if (logoField && logoField.values && logoField.values.length > 0) {
      return logoField.values[0].file.link;
    }
    return undefined;
  } catch {
    return undefined;
  }
};

// Password-based authentication (for testing)
export const authenticateWithPasswordFlow = async (): Promise<boolean> => {
  return await authenticateWithClientCredentials();
};

// Validate access to the Contacts app
export const validateContactsAppAccess = async (): Promise<boolean> => {
  try {
    // First try to authenticate with Contacts app token
    const authSuccess = await authenticateWithContactsAppToken();
    if (!authSuccess) {
      return false;
    }
    
    // Test if we can access the app
    const response = await callPodioApi(`app/${PODIO_CONTACTS_APP_ID}`);
    
    return !!response && !!response.app_id;
  } catch (error) {
    console.error('Error validating Contacts app access:', error);
    return false;
  }
};

// Validate access to the Packing Spec app
export const validatePackingSpecAppAccess = async (): Promise<boolean> => {
  try {
    // First try to authenticate with Packing Spec app token
    const authSuccess = await authenticateWithPackingSpecAppToken();
    if (!authSuccess) {
      return false;
    }
    
    // Test if we can access the app
    const response = await callPodioApi(`app/${PODIO_PACKING_SPEC_APP_ID}`);
    
    return !!response && !!response.app_id;
  } catch (error) {
    console.error('Error validating Packing Spec app access:', error);
    return false;
  }
};

// Generic function to call Podio API with authentication and rate limit handling
export const callPodioApi = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
  try {
    // Check if we're rate limited
    if (isRateLimited()) {
      throw new Error('Rate limited');
    }
    
    // Ensure we have valid tokens
    if (!hasValidTokens()) {
      const refreshSuccess = await refreshToken();
      if (!refreshSuccess) {
        throw new Error('Failed to refresh token');
      }
    }
    
    // Get access token
    const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    
    if (!accessToken) {
      throw new Error('No access token available');
    }
    
    // Set up headers
    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${accessToken}`);
    
    if (!headers.has('Content-Type') && options.method && options.method !== 'GET') {
      headers.set('Content-Type', 'application/json');
    }
    
    // Make the API call
    const apiDomain = getPodioApiDomain();
    const url = `https://${apiDomain}/${endpoint.startsWith('/') ? endpoint.slice(1) : endpoint}`;
    
    console.log(`Calling Podio API: ${url}`);
    
    const response = await fetch(url, {
      ...options,
      headers
    });
    
    // Handle rate limiting
    if (response.status === 429 || response.status === 420) {
      const retryAfter = response.headers.get('Retry-After');
      console.log(`Rate limited. Retry after ${retryAfter || 'unknown'} seconds.`);
      setRateLimitWithBackoff(retryAfter ? parseInt(retryAfter, 10) : undefined, endpoint);
      throw new Error(`Rate limit reached for ${endpoint}`);
    }
    
    // Handle auth errors
    if (response.status === 401 || response.status === 403) {
      console.log('Authentication error. Trying to refresh token...');
      
      const refreshSuccess = await refreshToken();
      if (!refreshSuccess) {
        throw new Error('Failed to refresh token');
      }
      
      // Retry the call once with the new token
      return callPodioApi(endpoint, options);
    }
    
    // Handle other errors
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error (${response.status}): ${errorText}`);
    }
    
    // Parse the response
    const data = await response.json();
    return data;
  } catch (error) {
    // Handle rate limiting errors
    if ((error as Error).message.includes('Rate limit')) {
      console.error('Rate limit reached:', error);
      throw error;
    }
    
    console.error('Error calling Podio API:', error);
    throw error;
  }
};

// Add other functions exported by the module...
