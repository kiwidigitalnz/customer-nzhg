// This module handles Podio authentication and token management
import { 
  getPodioClientId,
  getPodioClientSecret,
  getPodioApiDomain,
  isRateLimited as checkRateLimit,
  setRateLimit as setApiRateLimit,
  clearRateLimit as clearApiRateLimit,
  refreshPodioToken as refreshToken
} from './podioOAuth';
import { getFieldValueByExternalId } from './podioFieldHelpers';

// Re-export the refreshPodioToken function so it can be imported by other modules
export { refreshToken as refreshPodioToken };
// Re-export rate limiting functions
export { 
  checkRateLimit as isRateLimited,
  setApiRateLimit as setRateLimit,
  clearApiRateLimit as clearRateLimit
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
  CURRENT_APP_CONTEXT: 'podio_current_app_context' // Track which app we're using
};

// App context enum for tracking which app we're authenticating with
export enum PodioAppContext {
  CONTACTS = 'contacts',
  PACKING_SPEC = 'packing_spec'
}

// Get Podio App IDs from environment variables with fallbacks to hardcoded values
export const PODIO_CONTACTS_APP_ID = Number(import.meta.env.VITE_PODIO_CONTACTS_APP_ID) || 26969025;
export const PODIO_PACKING_SPEC_APP_ID = Number(import.meta.env.VITE_PODIO_PACKING_SPEC_APP_ID) || 29797638;

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

// Main client credentials authentication
export const authenticateWithClientCredentials = async (): Promise<boolean> => {
  try {
    // Check if we're rate limited
    if (checkRateLimit()) {
      console.log('Rate limited. Try again later.');
      emitDebugInfo('Rate limited', 'error', 'Please wait before trying again');
      return false;
    }
    
    const clientId = getClientId();
    const clientSecret = getClientSecret();
    
    if (!clientId || !clientSecret) {
      console.error('Missing Podio client credentials');
      emitDebugInfo('Missing Podio client credentials', 'error');
      return false;
    }
    
    console.log('Authenticating with Podio using client credentials...');
    emitDebugInfo('Authenticating with client credentials', 'pending');
    
    // Create form data
    const formData = new URLSearchParams();
    formData.append('grant_type', 'client_credentials');
    formData.append('client_id', clientId);
    formData.append('client_secret', clientSecret);
    
    emitDebugInfo('Sending token request', 'pending', 
      `Endpoint: https://podio.com/oauth/token
       Method: POST
       grant_type: client_credentials
       client_id: ${clientId.substring(0, 5)}...`
    );
    
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
    emitDebugInfo('Received token response', 'pending', `Status: ${response.status}`);
    
    // First get the response as text to inspect it
    const responseText = await response.text();
    console.log('Response first 100 chars:', responseText.substring(0, 100));
    
    // Check if the response is HTML instead of JSON
    if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
      console.error('Received HTML instead of JSON. Check your client credentials and request format.');
      emitDebugInfo('Invalid response format', 'error', 'Received HTML instead of JSON');
      return false;
    }
    
    // Parse the text response
    let responseData: any;
    try {
      responseData = JSON.parse(responseText);
      emitDebugInfo('Parsed response data', 'success', 
        `Response data: ${JSON.stringify(responseData).substring(0, 100)}...`
      );
    } catch (error) {
      console.error('Failed to parse JSON response:', error);
      console.error('Raw response:', responseText);
      emitDebugInfo('Failed to parse response', 'error', 
        `Error: ${error instanceof Error ? error.message : String(error)}
         Raw response: ${responseText.substring(0, 200)}...`
      );
      return false;
    }
    
    // Handle rate limiting specifically
    if (response.status === 429 || response.status === 420) {
      const retryAfter = response.headers.get('Retry-After');
      setApiRateLimit(retryAfter ? parseInt(retryAfter, 10) : 60);
      emitDebugInfo('Rate limited by Podio', 'error', 
        `Retry after: ${retryAfter || '60'} seconds`
      );
      return false;
    }
    
    if (!response.ok) {
      console.error('Authentication failed:', responseData);
      emitDebugInfo('Authentication failed', 'error', 
        `Status: ${response.status}
         Error: ${responseData.error || 'Unknown error'}
         Description: ${responseData.error_description || 'No description'}`
      );
      return false;
    }
    
    // Parse and store token data
    const tokenData = responseData;
    
    if (!tokenData.access_token) {
      console.error('Invalid token data received:', tokenData);
      emitDebugInfo('Invalid token data', 'error', 'No access token in response');
      return false;
    }
    
    // Store tokens
    storeTokens(tokenData);
    
    // Store the contacts app token separately if in environment
    const contactsAppToken = getContactsAppToken();
    if (contactsAppToken) {
      storeContactsAppToken(contactsAppToken);
    }
    
    // Store the packing spec app token separately if in environment
    const packingSpecAppToken = getPackingSpecAppToken();
    if (packingSpecAppToken) {
      storePackingSpecAppToken(packingSpecAppToken);
    }
    
    clearApiRateLimit();
    emitDebugInfo('Client credentials authentication successful', 'success');
    
    return true;
  } catch (error) {
    console.error('Error during authentication:', error);
    emitDebugInfo('Authentication error', 'error', 
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );
    return false;
  }
};

// App authentication with contacts app token
export const authenticateWithContactsAppToken = async (): Promise<boolean> => {
  try {
    // Check if we're rate limited
    if (checkRateLimit()) {
      console.log('Rate limited. Try again later.');
      emitDebugInfo('Rate limited', 'error', 'Please wait before trying again');
      return false;
    }
    
    const clientId = getClientId();
    const clientSecret = getClientSecret();
    const contactsAppId = PODIO_CONTACTS_APP_ID.toString();
    const contactsAppToken = getContactsAppToken();
    
    if (!clientId || !clientSecret) {
      console.error('Missing Podio client credentials');
      emitDebugInfo('Missing Podio client credentials', 'error');
      return false;
    }
    
    if (!contactsAppToken) {
      console.error('Missing Contacts app token');
      emitDebugInfo('Missing Contacts app token', 'error');
      return false;
    }
    
    console.log('Authenticating with Podio using Contacts app authentication...');
    emitDebugInfo('Authenticating with Contacts app token', 'pending');
    
    // Create form data for app authentication
    const formData = new URLSearchParams();
    formData.append('grant_type', 'app');
    formData.append('app_id', contactsAppId);
    formData.append('app_token', contactsAppToken);
    formData.append('client_id', clientId);
    formData.append('client_secret', clientSecret);
    
    emitDebugInfo('Sending Contacts app auth request', 'pending', 
      `Endpoint: https://podio.com/oauth/token
       Method: POST
       grant_type: app
       app_id: ${contactsAppId}
       client_id: ${clientId.substring(0, 5)}...`
    );
    
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
    
    console.log('Contacts app auth response status:', response.status);
    emitDebugInfo('Received Contacts app auth response', 'pending', `Status: ${response.status}`);
    
    // First get the response as text to inspect it
    const responseText = await response.text();
    console.log('Contacts app auth response first 100 chars:', responseText.substring(0, 100));
    
    // Check if the response is HTML instead of JSON
    if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
      console.error('Received HTML instead of JSON during Contacts app auth');
      emitDebugInfo('Invalid response format', 'error', 'Received HTML instead of JSON');
      return false;
    }
    
    // Parse the text response
    let responseData: any;
    try {
      responseData = JSON.parse(responseText);
      emitDebugInfo('Parsed Contacts app auth response', 'success', 
        `Response data: ${JSON.stringify(responseData).substring(0, 100)}...`
      );
    } catch (error) {
      console.error('Failed to parse JSON response:', error);
      console.error('Raw response:', responseText);
      emitDebugInfo('Failed to parse response', 'error', 
        `Error: ${error instanceof Error ? error.message : String(error)}
         Raw response: ${responseText.substring(0, 200)}...`
      );
      return false;
    }
    
    // Handle rate limiting
    if (response.status === 429 || response.status === 420) {
      const retryAfter = response.headers.get('Retry-After');
      setApiRateLimit(retryAfter ? parseInt(retryAfter, 10) : 60);
      emitDebugInfo('Rate limited by Podio', 'error', 
        `Retry after: ${retryAfter || '60'} seconds`
      );
      return false;
    }
    
    if (!response.ok) {
      console.error('Contacts app authentication failed:', responseData);
      emitDebugInfo('Contacts app authentication failed', 'error', 
        `Status: ${response.status}
         Error: ${responseData.error || 'Unknown error'}
         Error detail: ${responseData.error_detail || 'No detail'}
         Description: ${responseData.error_description || 'No description'}`
      );
      return false;
    }
    
    // Parse and store token data
    const tokenData = responseData;
    
    if (!tokenData.access_token) {
      console.error('Invalid token data received:', tokenData);
      emitDebugInfo('Invalid token data', 'error', 'No access token in response');
      return false;
    }
    
    // Store tokens
    storeTokens(tokenData);
    
    // Set current app context to Contacts
    setCurrentAppContext(PodioAppContext.CONTACTS);
    
    clearApiRateLimit();
    emitDebugInfo('Contacts app authentication successful', 'success');
    
    return true;
  } catch (error) {
    console.error('Error during Contacts app authentication:', error);
    emitDebugInfo('Contacts app authentication error', 'error', 
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );
    return false;
  }
};

// App authentication with packing spec app token
export const authenticateWithPackingSpecAppToken = async (): Promise<boolean> => {
  try {
    // Check if we're rate limited
    if (checkRateLimit()) {
      console.log('Rate limited. Try again later.');
      emitDebugInfo('Rate limited', 'error', 'Please wait before trying again');
      return false;
    }
    
    const clientId = getClientId();
    const clientSecret = getClientSecret();
    const packingSpecAppId = PODIO_PACKING_SPEC_APP_ID.toString();
    const packingSpecAppToken = getPackingSpecAppToken();
    
    if (!clientId || !clientSecret) {
      console.error('Missing Podio client credentials');
      emitDebugInfo('Missing Podio client credentials', 'error');
      return false;
    }
    
    if (!packingSpecAppToken) {
      console.error('Missing Packing Spec app token');
      emitDebugInfo('Missing Packing Spec app token', 'error');
      return false;
    }
    
    console.log('Authenticating with Podio using Packing Spec app authentication...');
    emitDebugInfo('Authenticating with Packing Spec app token', 'pending');
    
    // Create form data for app authentication
    const formData = new URLSearchParams();
    formData.append('grant_type', 'app');
    formData.append('app_id', packingSpecAppId);
    formData.append('app_token', packingSpecAppToken);
    formData.append('client_id', clientId);
    formData.append('client_secret', clientSecret);
    
    emitDebugInfo('Sending Packing Spec app auth request', 'pending', 
      `Endpoint: https://podio.com/oauth/token
       Method: POST
       grant_type: app
       app_id: ${packingSpecAppId}
       client_id: ${clientId.substring(0, 5)}...`
    );
    
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
    
    console.log('Packing Spec app auth response status:', response.status);
    emitDebugInfo('Received Packing Spec app auth response', 'pending', `Status: ${response.status}`);
    
    // First get the response as text to inspect it
    const responseText = await response.text();
    console.log('Packing Spec app auth response first 100 chars:', responseText.substring(0, 100));
    
    // Check if the response is HTML instead of JSON
    if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
      console.error('Received HTML instead of JSON during Packing Spec app auth');
      emitDebugInfo('Invalid response format', 'error', 'Received HTML instead of JSON');
      return false;
    }
    
    // Parse the text response
    let responseData: any;
    try {
      responseData = JSON.parse(responseText);
      emitDebugInfo('Parsed Packing Spec app auth response', 'success', 
        `Response data: ${JSON.stringify(responseData).substring(0, 100)}...`
      );
    } catch (error) {
      console.error('Failed to parse JSON response:', error);
      console.error('Raw response:', responseText);
      emitDebugInfo('Failed to parse response', 'error', 
        `Error: ${error instanceof Error ? error.message : String(error)}
         Raw response: ${responseText.substring(0, 200)}...`
      );
      return false;
    }
    
    // Handle rate limiting
    if (response.status === 429 || response.status === 420) {
      const retryAfter = response.headers.get('Retry-After');
      setApiRateLimit(retryAfter ? parseInt(retryAfter, 10) : 60);
      emitDebugInfo('Rate limited by Podio', 'error', 
        `Retry after: ${retryAfter || '60'} seconds`
      );
      return false;
    }
    
    if (!response.ok) {
      console.error('Packing Spec app authentication failed:', responseData);
      emitDebugInfo('Packing Spec app authentication failed', 'error', 
        `Status: ${response.status}
         Error: ${responseData.error || 'Unknown error'}
         Error detail: ${responseData.error_detail || 'No detail'}
         Description: ${responseData.error_description || 'No description'}`
      );
      return false;
    }
    
    // Parse and store token data
    const tokenData = responseData;
    
    if (!tokenData.access_token) {
      console.error('Invalid token data received:', tokenData);
      emitDebugInfo('Invalid token data', 'error', 'No access token in response');
      return false;
    }
    
    // Store tokens
    storeTokens(tokenData);
    
    // Set current app context to Packing Spec
    setCurrentAppContext(PodioAppContext.PACKING_SPEC);
    
    clearApiRateLimit();
    emitDebugInfo('Packing Spec app authentication successful', 'success');
    
    return true;
  } catch (error) {
    console.error('Error during Packing Spec app authentication:', error);
    emitDebugInfo('Packing Spec app authentication error', 'error', 
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );
    return false;
  }
};

// For backward compatibility and as the default app authentication
export const authenticateWithAppToken = async (): Promise<boolean> => {
  return await authenticateWithContactsAppToken();
};

// Password authentication flow for user access - keep for backward compatibility
export const authenticateWithPasswordFlow = async (username: string, password: string): Promise<boolean> => {
  // We'll use app authentication instead of password flow
  console.log('Password flow is deprecated. Using app authentication instead.');
  emitDebugInfo('Using app authentication instead of password flow', 'pending');
  return await authenticateWithContactsAppToken();
};

// Function to check if we can access the Contacts app
export const validateContactsAppAccess = async (): Promise<boolean> => {
  try {
    emitDebugInfo('Validating Contacts app access', 'pending');
    
    // First ensure we have valid tokens and authentication with the Contacts app
    if (!hasValidTokens() || getCurrentAppContext() !== PodioAppContext.CONTACTS) {
      emitDebugInfo('No valid Contacts app tokens, authenticating', 'pending');
      const authenticated = await authenticateWithContactsAppToken();
      
      if (!authenticated) {
        console.error('Failed to authenticate with Contacts app');
        emitDebugInfo('Failed to authenticate with Contacts app', 'error');
        return false;
      }
    }
    
    // Try to get the app details
    const appEndpoint = `app/${PODIO_CONTACTS_APP_ID}`;
    emitDebugInfo('Checking Contacts app', 'pending', 
      `Endpoint: ${appEndpoint}`
    );
    
    try {
      const appDetails = await callPodioApi(appEndpoint);
      console.log('Successfully accessed Contacts app:', appDetails.app_id);
      emitDebugInfo('Contacts app access validated', 'success', 
        `App ID: ${appDetails.app_id}
         App name: ${appDetails.config?.name || 'Unknown'}`
      );
      return true;
    } catch (error) {
      console.error('Failed to access Contacts app:', error);
      emitDebugInfo('Failed to access Contacts app', 'error', 
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
      return false;
    }
  } catch (error) {
    console.error('Error validating Contacts app access:', error);
    emitDebugInfo('Validation error', 'error', 
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );
    return false;
  }
};

// Function to check if we can access the Packing Spec app
export const validatePackingSpecAppAccess = async (): Promise<boolean> => {
  try {
    emitDebugInfo('Validating Packing Spec app access', 'pending');
    
    // First ensure we have valid tokens and authentication with the Packing Spec app
    if (!hasValidTokens() || getCurrentAppContext() !== PodioAppContext.PACKING_SPEC) {
      emitDebugInfo('No valid Packing Spec app tokens, authenticating', 'pending');
      const authenticated = await authenticateWithPackingSpecAppToken();
      
      if (!authenticated) {
        console.error('Failed to authenticate with Packing Spec app');
        emitDebugInfo('Failed to authenticate with Packing Spec app', 'error');
        return false;
      }
    }
    
    // Try to get the app details
    const appEndpoint = `app/${PODIO_PACKING_SPEC_APP_ID}`;
    emitDebugInfo('Checking Packing Spec app', 'pending', 
      `Endpoint: ${appEndpoint}`
    );
    
    try {
      const appDetails = await callPodioApi(appEndpoint);
      console.log('Successfully accessed Packing Spec app:', appDetails.app_id);
      emitDebugInfo('Packing Spec app access validated', 'success', 
        `App ID: ${appDetails.app_id}
         App name: ${appDetails.config?.name || 'Unknown'}`
      );
      return true;
    } catch (error) {
      console.error('Failed to access Packing Spec app:', error);
      emitDebugInfo('Failed to access Packing Spec app', 'error', 
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
      return false;
    }
  } catch (error) {
    console.error('Error validating Packing Spec app access:', error);
    emitDebugInfo('Validation error', 'error', 
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );
    return false;
  }
};

// Ensure we have valid tokens for the specified app before making API calls
export const ensureAuthenticated = async (appContext?: PodioAppContext): Promise<boolean> => {
  const currentContext = appContext || getCurrentAppContext();
  
  // If we have valid tokens, check if they're for the right app context
  if (hasValidTokens()) {
    const contextMatches = currentContext === getCurrentAppContext();
    
    if (contextMatches) {
      emitDebugInfo(`Token is valid for ${currentContext}`, 'success');
      return true;
    } else {
      emitDebugInfo(`Token is valid but for different app context, authenticating with ${currentContext}`, 'pending');
    }
  } else {
    emitDebugInfo(`Token invalid or expired, authenticating with ${currentContext}`, 'pending');
  }
  
  // Try refreshing with the refresh token if we have one
  const refreshTokenValue = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  if (refreshTokenValue) {
    const refreshed = await refreshToken();
    if (refreshed) {
      return true;
    }
  }
  
  // Authenticate with the appropriate app based on context
  if (currentContext === PodioAppContext.CONTACTS) {
    return await authenticateWithContactsAppToken();
  } else if (currentContext === PodioAppContext.PACKING_SPEC) {
    return await authenticateWithPackingSpecAppToken();
  }
  
  // Fall back to client credentials if specific app authentication fails
  return await authenticateWithClientCredentials();
};

// Modified API call function to use access tokens with the correct OAuth2 format
export const callPodioApi = async (endpoint: string, options: RequestInit = {}, appContext?: PodioAppContext): Promise<any> => {
  try {
    // Get the app context to use (from parameter or current context)
    const context = appContext || getCurrentAppContext();
    
    // Ensure we have valid tokens for the right app context
    const isAuthenticated = await ensureAuthenticated(context);
    if (!isAuthenticated) {
      throw new Error(`Not authenticated with Podio for ${context} app`);
    }
    
    // Get the access token
    const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (!accessToken) {
      throw new Error('No access token available');
    }
    
    // Create new headers object to avoid modifying the original
    const headers = new Headers(options.headers);
    
    // Set Authorization header with OAuth2 format (this is important - it must be "OAuth2" not "Bearer")
    headers.set('Authorization', `OAuth2 ${accessToken}`);
    headers.set('Content-Type', 'application/json');
    headers.set('Accept', 'application/json');
    headers.set('User-Agent', 'NZHG-Customer-Portal/1.0');
    
    // Create a new options object with the updated headers
    const newOptions = {
      ...options,
      headers
    };
    
    // Log the request for debugging
    console.log(`Making API call to ${endpoint} with token: ${accessToken.substring(0, 10)}... for app context: ${context}`);
    emitDebugInfo(`Making API call for ${context} app`, 'pending', 
      `Endpoint: ${endpoint}
       Method: ${options.method || 'GET'}
       Token (first 10 chars): ${accessToken.substring(0, 10)}...
       Authorization: OAuth2 (correct format for Podio API)`
    );
    
    const response = await fetch(`https://api.podio.com/${endpoint}`, newOptions);
    
    // Handle rate limiting with exponential backoff
    if (response.status === 429 || response.status === 420) {
      const retryAfter = response.headers.get('Retry-After');
      setApiRateLimit(retryAfter ? parseInt(retryAfter, 10) : 60);
      emitDebugInfo('API call rate limited', 'error',
        `Retry after: ${retryAfter || '60'} seconds`
      );
      throw new Error('Rate limit reached');
    }
    
    // If token is invalid, try refreshing it and try with the other app if needed
    if (response.status === 401) {
      console.log('Token invalid, trying to refresh');
      emitDebugInfo('Token invalid', 'pending');
      
      // First try refreshing the current token
      const refreshed = await refreshToken();
      if (refreshed) {
        emitDebugInfo('Token refreshed, retrying API call', 'success');
        // Retry with new token
        return callPodioApi(endpoint, options, context);
      }
      
      // If that fails, try switching to the other app context
      const otherContext = context === PodioAppContext.CONTACTS 
        ? PodioAppContext.PACKING_SPEC 
        : PodioAppContext.CONTACTS;
        
      emitDebugInfo(`Token refresh failed, trying with ${otherContext} app`, 'pending');
      
      // Authenticate with the other app
      let authSuccess = false;
      if (otherContext === PodioAppContext.CONTACTS) {
        authSuccess = await authenticateWithContactsAppToken();
      } else {
        authSuccess = await authenticateWithPackingSpecAppToken();
      }
      
      if (authSuccess) {
        emitDebugInfo(`Authenticated with ${otherContext} app, retrying API call`, 'success');
        // Retry with the new context
        return callPodioApi(endpoint, options, otherContext);
      }
      
      // If all else fails, try client credentials
      emitDebugInfo('App authentication failed, falling back to client credentials', 'pending');
      const clientAuthSuccess = await authenticateWithClientCredentials();
      
      if (clientAuthSuccess) {
        emitDebugInfo('Client credentials authentication successful, retrying API call', 'success');
        return callPodioApi(endpoint, options, context);
      }
      
      emitDebugInfo('All authentication methods failed', 'error');
      throw new Error('Authentication failed after multiple attempts');
    }
    
    if (!response.ok) {
      let errorMessage = `API error: ${response.status}`;
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.error_description || errorMessage;
        emitDebugInfo('API call failed', 'error', 
          `Status: ${response.status}
           Error: ${errorData.error || 'Unknown'}
           Description: ${errorData.error_description || 'No description'}`
        );
      } catch (e) {
        // Cannot parse as JSON
        emitDebugInfo('API call failed', 'error', 
          `Status: ${response.status}
           Could not parse error response as JSON`
        );
      }
      
      throw new Error(errorMessage);
    }
    
    // Get response as JSON
    const responseData = await response.json();
    emitDebugInfo('API call successful', 'success', 
      `Status: ${response.status}
       Response sample: ${JSON.stringify(responseData).substring(0, 100)}...`
    );
    return responseData;
  } catch (error) {
    console.error('API call error:', error);
    emitDebugInfo('API call error', 'error', 
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );
    throw error;
  }
};

// This function authenticates a user by checking the Podio contacts app
export const authenticateUser = async (username: string, password: string): Promise<any> => {
  try {
    console.log(`Authenticating user: ${username}`);
    emitDebugInfo(`Authenticating user: ${username}`, 'pending');
    
    // First authenticate with the Contacts app
    emitDebugInfo('Authenticating with Contacts app', 'pending');
    const contactsAuthSuccess = await authenticateWithContactsAppToken();
    
    if (!contactsAuthSuccess) {
      emitDebugInfo('Contacts app authentication failed', 'error');
      throw new Error('Failed to authenticate with Contacts app');
    }
    
    // Pre-authenticate with the Packing Spec app for later use
    // This is done asynchronously and won't block the login process
    (async () => {
      try {
        emitDebugInfo('Pre-authenticating with Packing Spec app', 'pending');
        const packingSpecAuthSuccess = await authenticateWithPackingSpecAppToken();
        
        if (packingSpecAuthSuccess) {
          emitDebugInfo('Packing Spec app pre-authentication successful', 'success');
          console.log('Pre-authenticated with Packing Spec app');
        } else {
          emitDebugInfo('Packing Spec app pre-authentication failed', 'error');
          console.warn('Failed to pre-authenticate with Packing Spec app');
        }
      } catch (error) {
        console.error('Error pre-authenticating with Packing Spec app:', error);
      }
    })();
    
    // Search for user by username in the Contacts app
    console.log(`Searching for user: ${username}`);
    emitDebugInfo(`Searching for user: ${username}`, 'pending');
    
    try {
      // Use the filter endpoint
      const filters = {
        filters: {
          "customer-portal-username": username
        }
      };
      
      const endpoint = `item/app/${PODIO_CONTACTS_APP_ID}/filter/`;
      emitDebugInfo('Searching in Contacts app', 'pending', 
        `Endpoint: ${endpoint}
         Filter: username = ${username}`
      );
      
      // Make the API call with the Contacts app context
      const searchResponse = await callPodioApi(endpoint, {
        method: 'POST',
        body: JSON.stringify(filters)
      }, PodioAppContext.CONTACTS);
      
      if (!searchResponse.items || searchResponse.items.length === 0) {
        emitDebugInfo('User not found', 'error', 
          `No items found matching username: ${username}`
        );
        throw new Error('User profile not found in contacts');
      }
      
      emitDebugInfo('User found', 'success', 
        `Items found: ${searchResponse.items.length}
         First item ID: ${searchResponse.items[0].item_id}`
      );
      
      // Get the first matching contact
      const contact = searchResponse.items[0];
      
      // Verify password if we have one
      // This is a simple example - in production you would use proper password hashing
      const storedPassword = getFieldValueByExternalId(contact.fields, 'customer-portal-password');
      if (storedPassword && storedPassword !== password) {
        emitDebugInfo('Invalid password', 'error');
        throw new Error('Invalid password');
      }
      
      // Get user details
      const contactData = {
        id: contact.item_id,
        name: getFieldValueByExternalId(contact.fields, 'title') || 'Unknown',
        email: getFieldValueByExternalId(contact.fields, 'email') || '',
        username: getFieldValueByExternalId(contact.fields, 'customer-portal-username') || '',
        logoUrl: getFieldValueByExternalId(contact.fields, 'logo-url') || ''
      };
      
      emitDebugInfo('User authenticated successfully', 'success', 
        `User ID: ${contactData.id}
         Name: ${contactData.name}
         Email: ${contactData.email || 'Not provided'}`
      );
      
      return contactData;
    } catch (error) {
      console.error('Failed to search for user:', error);
      emitDebugInfo('User search failed', 'error', 
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
      throw new Error('Cannot access user data. Check permissions or configuration.');
    }
  } catch (error) {
    console.error('User authentication error:', error);
    emitDebugInfo('User authentication error', 'error', 
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );
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
