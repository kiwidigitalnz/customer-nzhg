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
  getPodioApiDomain
} from './podioOAuth';
import { getFieldValueByExternalId } from './podioFieldHelpers';
import bcrypt from 'bcryptjs';

interface PodioCredentials {
  username: string;
  password: string;
}

// Add a development mode bypass flag
export const DEV_BYPASS_API_VALIDATION = true; // Set to false to enforce API validation in development

// Rate limiting constants for API calls
const API_CALL_COUNT_KEY = 'podio_api_call_count';
const API_CALL_RESET_KEY = 'podio_api_call_reset';
const MAX_API_CALLS_PER_MINUTE = 250; // Podio's general rate limit

// Track API calls to prevent hitting rate limits
const trackApiCall = (): boolean => {
  // Check if we need to reset the counter
  const resetTime = localStorage.getItem(API_CALL_RESET_KEY);
  const now = Date.now();
  
  if (!resetTime || parseInt(resetTime, 10) < now) {
    // Reset counter for a new minute
    localStorage.setItem(API_CALL_COUNT_KEY, '1');
    localStorage.setItem(API_CALL_RESET_KEY, (now + 60000).toString());
    return true;
  }
  
  // Increment counter
  const count = parseInt(localStorage.getItem(API_CALL_COUNT_KEY) || '0', 10) + 1;
  localStorage.setItem(API_CALL_COUNT_KEY, count.toString());
  
  // Check if we're approaching the limit
  if (count >= MAX_API_CALLS_PER_MINUTE - 20) {
    console.warn(`API call rate is high: ${count}/${MAX_API_CALLS_PER_MINUTE} calls this minute`);
  }
  
  // Return false if we're over the limit
  if (count >= MAX_API_CALLS_PER_MINUTE) {
    console.error(`Rate limit preventive action: ${count} calls in the last minute exceeds limit`);
    setRateLimit(60); // Wait a minute before trying again
    return false;
  }
  
  return true;
}

// Function to check if Podio API is configured
export const isPodioConfigured = (): boolean => {
  // Check for environment variables first in both environments
  const hasEnvVars = !!import.meta.env.VITE_PODIO_CLIENT_ID && 
                     !!import.meta.env.VITE_PODIO_CLIENT_SECRET;
                     
  if (hasEnvVars) {
    if (import.meta.env.DEV) {
      console.log('[Podio Config] Environment variables found');
      console.log('[Podio Config] Client ID (first 5 chars):', 
        import.meta.env.VITE_PODIO_CLIENT_ID.substring(0, 5) + '...');
      console.log('[Podio Config] Using env:', import.meta.env.MODE);
    }
    return true;
  }
  
  // Then check for valid tokens
  if (hasValidPodioTokens()) {
    if (import.meta.env.DEV) {
      console.log('[Podio Config] Valid tokens found');
    }
    return true;
  }
  
  // Finally check localStorage for credentials (fallback for development)
  const hasLocalStorageCreds = !!localStorage.getItem('podio_client_id') && 
                              !!localStorage.getItem('podio_client_secret');
                              
  if (hasLocalStorageCreds && import.meta.env.DEV) {
    console.log('[Podio Config] localStorage credentials found');
    const storedClientId = localStorage.getItem('podio_client_id');
    if (storedClientId) {
      console.log('[Podio Config] localStorage client ID (first 5 chars):', 
        storedClientId.substring(0, 5) + '...');
    }
    return true;
  }
  
  // Log what's missing for debugging
  if (import.meta.env.DEV) {
    console.log('[Podio Config] Podio not configured:',
      !hasEnvVars ? 'No environment variables' : '',
      !hasValidPodioTokens() ? 'No valid tokens' : '',
      !hasLocalStorageCreds ? 'No localStorage credentials' : '');
    
    // Log environment variable details
    console.log('[Podio Config] VITE_PODIO_CLIENT_ID defined:', 
      !!import.meta.env.VITE_PODIO_CLIENT_ID);
    console.log('[Podio Config] VITE_PODIO_CLIENT_SECRET defined:', 
      !!import.meta.env.VITE_PODIO_CLIENT_SECRET);
  }
  
  return false;
};

// Helper function to validate if token is actually working with Podio
export const validatePodioToken = async (): Promise<boolean> => {
  try {
    // In development mode, we can bypass validation to help with debugging
    if (import.meta.env.DEV && DEV_BYPASS_API_VALIDATION) {
      console.log('[Podio Validation] Development mode - bypassing API validation');
      return true;
    }

    const accessToken = localStorage.getItem('podio_access_token');
    if (!accessToken) return false;
    
    if (import.meta.env.DEV) {
      console.log('[Podio Validation] Validating token (first 10 chars):', accessToken.substring(0, 10) + '...');
    }
    
    // Use an endpoint that works with app authentication instead of user authentication
    // The /app/ endpoint requires only app authorization
    const apiDomain = getPodioApiDomain();
    console.log(`[Podio Validation] Making API call to https://${apiDomain}/app/${PODIO_CONTACTS_APP_ID}`);
    
    const response = await fetch(`https://${apiDomain}/app/${PODIO_CONTACTS_APP_ID}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    console.log('[Podio Validation] Validation API call status:', response.status);
    console.log('[Podio Validation] Validation API call headers:', JSON.stringify(Object.fromEntries([...response.headers.entries()])));
    
    if (response.status === 403) {
      console.log('[Podio Validation] 403 Forbidden - The app may not have access to this resource');
      
      // Try to get more details from the response
      try {
        const errorData = await response.json();
        console.error('[Podio Validation] 403 error details:', errorData);
      } catch (e) {
        console.error('[Podio Validation] Failed to parse 403 response body');
      }
      
      if (import.meta.env.DEV) {
        console.log('[Podio Validation] This typically means the Podio app does not have the correct permissions.');
        console.log('[Podio Validation] Ensure the Podio API client has access to the Contacts app (ID: 26969025)');
        
        // Try another endpoint to see if token works at all
        try {
          console.log('[Podio Validation] Trying alternative endpoint to check token validity...');
          const altResponse = await fetch(`https://${apiDomain}/org/`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          });
          
          console.log('[Podio Validation] Alternative endpoint status:', altResponse.status);
          
          if (altResponse.ok) {
            console.log('[Podio Validation] Token is valid but lacks specific app permissions');
            const orgs = await altResponse.json();
            console.log('[Podio Validation] Organizations accessible with token:', orgs.length);
          } else {
            console.log('[Podio Validation] Token is invalid or has very limited permissions');
          }
        } catch (e) {
          console.error('[Podio Validation] Error checking alternative endpoint:', e);
        }
      }
      
      // In development mode, we can still return true despite 403 
      // to allow development to continue without proper app permissions
      if (import.meta.env.DEV && DEV_BYPASS_API_VALIDATION) {
        console.log('[Podio Validation] Development mode - bypassing API validation despite 403');
        return true;
      }
      
      return false;
    }
    
    if (!response.ok) {
      console.error('[Podio Validation] Token validation failed with status:', response.status);
      try {
        const errorData = await response.json();
        console.error('[Podio Validation] Error details:', errorData);
      } catch (e) {
        console.error('[Podio Validation] Failed to parse error response body');
      }
      
      // In development mode, we can still return true despite errors
      if (import.meta.env.DEV && DEV_BYPASS_API_VALIDATION) {
        console.log('[Podio Validation] Development mode - bypassing API validation despite error');
        return true;
      }
      
      return false;
    }
    
    console.log('[Podio Validation] Token validated successfully');
    return true;
  } catch (error) {
    console.error('[Podio Validation] Error validating Podio token:', error);
    
    // In development mode, we can still return true despite errors
    if (import.meta.env.DEV && DEV_BYPASS_API_VALIDATION) {
      console.log('[Podio Validation] Development mode - bypassing API validation despite error');
      return true;
    }
    
    return false;
  }
};

// Helper function to check if we have valid Podio tokens
export const hasValidPodioTokens = (): boolean => {
  const accessToken = localStorage.getItem('podio_access_token');
  const tokenExpiry = localStorage.getItem('podio_token_expiry');
  
  if (!accessToken || !tokenExpiry) return false;
  
  // Check if token is expired
  const expiryTime = parseInt(tokenExpiry, 10);
  const now = Date.now();
  
  // Add a 5-minute buffer to account for processing time
  return expiryTime > (now + 300000);
};

// Function to clear invalid Podio tokens
export const clearPodioTokens = (): void => {
  localStorage.removeItem('podio_access_token');
  localStorage.removeItem('podio_refresh_token');
  localStorage.removeItem('podio_token_expiry');
  console.log('[Podio Auth] Cleared Podio tokens');
};

// Function to initially authenticate with Podio using password flow
export const ensureInitialPodioAuth = async (): Promise<boolean> => {
  console.log('[Podio Auth] Starting initial Podio authentication check');
  console.log('[Podio Auth] Environment mode:', import.meta.env.MODE);
  
  // First check if we're rate limited
  if (isRateLimited()) {
    const limitUntil = parseInt(localStorage.getItem('podio_rate_limit_until') || '0', 10);
    const waitSecs = Math.ceil((limitUntil - Date.now()) / 1000);
    console.error(`[Podio Auth] Rate limited. Please wait ${waitSecs} seconds before trying again.`);
    return false;
  }
  
  // In development, we can bypass validation completely
  if (import.meta.env.DEV && DEV_BYPASS_API_VALIDATION) {
    console.log('[Podio Auth] Development mode - using simplified auth flow');
    
    // If we already have tokens, consider them valid in development
    if (hasValidPodioTokens()) {
      console.log('[Podio Auth] Development mode - existing tokens accepted without validation');
      return true;
    }
    
    // Otherwise get new tokens
    const result = await authenticateWithPasswordFlow();
    console.log('[Podio Auth] Development mode - password flow result:', result);
    return result;
  }
  
  // Then validate any existing tokens
  if (hasValidPodioTokens()) {
    console.log('[Podio Auth] Found valid Podio tokens, validating...');
    const isValid = await validatePodioToken();
    
    if (isValid) {
      console.log('[Podio Auth] Existing tokens are valid');
      return true;
    } else {
      console.log('[Podio Auth] Existing tokens are invalid, clearing and getting new ones');
      clearPodioTokens();
    }
  }
  
  console.log('[Podio Auth] Starting Password Flow for Podio authentication...');
  console.log('[Podio Auth] Environment:', import.meta.env.DEV ? 'development' : 'production');
  
  // Print Podio client ID and secret status
  const clientId = getPodioClientId();
  const clientSecret = getPodioClientSecret();
  console.log('[Podio Auth] Client ID available:', !!clientId);
  console.log('[Podio Auth] Client Secret available:', !!clientSecret);
  if (clientId) {
    console.log('[Podio Auth] Client ID first 5 chars:', clientId.substring(0, 5) + '...');
  }
  
  // Use Password Flow (client_credentials) for app authentication
  const result = await authenticateWithPasswordFlow();
  console.log('[Podio Auth] Password flow authentication result:', result ? 'success' : 'failed');
  
  // If authentication was successful, verify the token works by making a test call
  if (result) {
    try {
      console.log('[Podio Auth] Verifying token with test API call');
      const accessToken = localStorage.getItem('podio_access_token');
      if (accessToken) {
        const apiDomain = getPodioApiDomain();
        const testEndpoint = `/app/${PODIO_CONTACTS_APP_ID}`;
        console.log(`[Podio Auth] Making test call to https://${apiDomain}${testEndpoint}`);
        
        const testResponse = await fetch(`https://${apiDomain}${testEndpoint}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        
        console.log('[Podio Auth] Test API call status:', testResponse.status);
        
        if (testResponse.ok) {
          const testData = await testResponse.json();
          console.log('[Podio Auth] Test API call successful:', testData.app_id);
          return true;
        } else {
          console.error('[Podio Auth] Test API call failed with status:', testResponse.status);
          try {
            const errorBody = await testResponse.json();
            console.error('[Podio Auth] Test API error details:', errorBody);
          } catch (e) {
            console.error('[Podio Auth] Could not parse test API error response');
          }
          
          // If we get a 403, it's likely a permissions issue
          if (testResponse.status === 403) {
            console.log('[Podio Auth] 403 Forbidden - The API client may need additional permissions');
            console.log('[Podio Auth] Retrying with a different endpoint to check token validity');
            
            // Try a different endpoint to see if token is valid at all
            const altResponse = await fetch(`https://${apiDomain}/org/`, {
              headers: {
                'Authorization': `Bearer ${accessToken}`
              }
            });
            
            console.log('[Podio Auth] Alternative endpoint status:', altResponse.status);
            
            if (altResponse.ok) {
              console.log('[Podio Auth] Token is valid but lacks specific app permissions');
              
              // Token is valid, but we need to check scope
              try {
                const tokenExpiry = localStorage.getItem('podio_token_expiry');
                if (tokenExpiry) {
                  const expiryDate = new Date(parseInt(tokenExpiry, 10));
                  console.log('[Podio Auth] Token expires at:', expiryDate.toISOString());
                }
              } catch (e) {
                console.error('[Podio Auth] Error parsing token expiry:', e);
              }
              
              return true;
            }
          }
        }
      }
    } catch (e) {
      console.error('[Podio Auth] Error during token verification:', e);
    }
  }
  
  return result;
};

// Enhanced function to refresh the access token if needed
export const refreshPodioToken = async (): Promise<boolean> => {
  // First check if we're rate limited
  if (isRateLimited()) {
    const limitUntil = parseInt(localStorage.getItem('podio_rate_limit_until') || '0', 10);
    const waitSecs = Math.ceil((limitUntil - Date.now()) / 1000);
    console.error(`[Podio Auth] Rate limited. Please wait ${waitSecs} seconds before trying again.`);
    return false;
  }
  
  console.log('[Podio Auth] Refreshing token using Password Flow');
  
  // With client_credentials flow, there's no refresh token
  // We need to get a new token each time
  return await authenticateWithPasswordFlow();
};

// Improved function to make authenticated API calls to Podio with retry limits
let retryCount = 0;
const MAX_RETRIES = 2;

export const callPodioApi = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
  console.log(`[Podio API] Calling endpoint: ${endpoint}`);
  
  // Check if we're rate limited
  if (isRateLimited()) {
    const limitUntil = parseInt(localStorage.getItem('podio_rate_limit_until') || '0', 10);
    const waitSecs = Math.ceil((limitUntil - Date.now()) / 1000);
    
    const error = createAuthError(
      AuthErrorType.NETWORK,
      `Rate limited. Please wait ${waitSecs} seconds before trying again.`,
      false
    );
    throw error;
  }
  
  // Track API call rate
  if (!trackApiCall()) {
    const error = createAuthError(
      AuthErrorType.NETWORK,
      'Too many API calls. Please try again later.',
      false
    );
    throw error;
  }
  
  // First, ensure we have a valid token
  console.log('[Podio API] Ensuring valid token before API call');
  const tokenValid = await ensureValidToken();
  
  if (!tokenValid) {
    retryCount = 0; // Reset retry count
    console.error('[Podio API] No valid token available for API call');
    const error = createAuthError(
      AuthErrorType.TOKEN,
      'Not authenticated with Podio',
      true,
      refreshPodioToken
    );
    throw error;
  }
  
  const accessToken = localStorage.getItem('podio_access_token');
  console.log('[Podio API] Using token (first 10 chars):', accessToken?.substring(0, 10) + '...');
  
  // Merge the authorization header with the provided options
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  try {
    const apiDomain = getPodioApiDomain();
    const url = `https://${apiDomain}/${endpoint}`;
    console.log(`[Podio API] Making request to: ${url}`);
    
    // Log request details in development
    if (import.meta.env.DEV) {
      console.log('[Podio API] Request method:', options.method || 'GET');
      console.log('[Podio API] Request headers:', headers);
      if (options.body) {
        try {
          // If it's JSON, try to parse and log it
          if (typeof options.body === 'string' && headers['Content-Type']?.includes('application/json')) {
            console.log('[Podio API] Request body:', JSON.parse(options.body));
          } else {
            console.log('[Podio API] Request body:', options.body);
          }
        } catch (e) {
          console.log('[Podio API] Request body: [Could not parse]', options.body);
        }
      }
    }
    
    const response = await fetch(url, {
      ...options,
      headers,
    });
    
    console.log(`[Podio API] Response status: ${response.status}`);
    
    // Log response headers in development
    if (import.meta.env.DEV) {
      console.log('[Podio API] Response headers:', 
        JSON.stringify(Object.fromEntries([...response.headers.entries()])));
    }
    
    // Handle rate limiting (420 or 429 status)
    if (response.status === 420 || response.status === 429) {
      let errorData;
      try {
        errorData = await response.json();
        console.error('[Podio API] Rate limit response data:', errorData);
      } catch (e) {
        // Failed to parse JSON
        console.error('[Podio API] Could not parse rate limit error response');
        errorData = {};
      }
      
      console.error('[Podio API] Rate limit reached:', errorData);
      
      // Extract retry-after information
      const retryAfter = response.headers.get('Retry-After') || 
                        errorData.error_description?.match(/wait\s+(\d+)\s+seconds/)?.[1];
      
      if (retryAfter) {
        setRateLimit(parseInt(retryAfter, 10));
      } else {
        // Default to 60 seconds
        setRateLimit(60);
      }
      
      throw createAuthError(
        AuthErrorType.NETWORK,
        `Rate limit reached. Please wait before trying again. ${errorData.error_description || ''}`,
        false
      );
    }
    
    // Handle 403 Forbidden specifically - this could mean the app doesn't have permission
    if (response.status === 403) {
      console.error(`[Podio API] API call returned 403 Forbidden for endpoint ${endpoint}. The app may not have sufficient permissions.`);
      
      // Getting a 403 after successful token acquisition likely means permission issues,
      // not token issues. Don't keep retrying with the same credentials.
      let errorData;
      try {
        errorData = await response.json();
        console.error('[Podio API] 403 error details:', errorData);
      } catch (e) {
        console.error('[Podio API] Could not parse 403 error response');
        errorData = { error_description: "Forbidden - Insufficient permissions" };
      }
      
      throw createAuthError(
        AuthErrorType.AUTHENTICATION,
        `Permission error: ${errorData.error_description || 'The app lacks permission to access this resource'}`,
        false
      );
    }
    
    // If token is expired or invalid, try refreshing it once and retry the call
    if (response.status === 401) {
      console.log(`[Podio API] API call returned 401, attempting to refresh token`);
      
      // Try to get more details about the 401
      let errorData;
      try {
        errorData = await response.json();
        console.error('[Podio API] 401 error details:', errorData);
      } catch (e) {
        console.error('[Podio API] Could not parse 401 error response');
      }
      
      // Check if we've already retried too many times
      if (retryCount >= MAX_RETRIES) {
        console.log(`[Podio API] Maximum retry count (${MAX_RETRIES}) reached, forcing OAuth flow`);
        retryCount = 0; // Reset for next time
        clearPodioTokens();
        const refreshed = await authenticateWithPasswordFlow(); // Changed from startPodioOAuthFlow to use password flow consistently
        if (!refreshed) {
          throw createAuthError(
            AuthErrorType.AUTHENTICATION,
            'Failed to authenticate with Podio after multiple attempts',
            false
          );
        }
      } else {
        retryCount++;
        console.log(`[Podio API] Retry attempt ${retryCount} of ${MAX_RETRIES}`);
        const refreshed = await refreshPodioToken();
        if (!refreshed) {
          retryCount = 0; // Reset for next time
          throw createAuthError(
            AuthErrorType.TOKEN,
            'Failed to refresh Podio token',
            false
          );
        }
      }
      
      // Retry the API call with the new token
      return callPodioApi(endpoint, options);
    }
    
    // Reset retry count on successful call
    retryCount = 0;
    
    if (!response.ok) {
      let errorMessage = 'Podio API error';
      
      try {
        const errorData = await response.json();
        console.error('[Podio API] Error response:', errorData);
        errorMessage = errorData.error_description || errorMessage;
      } catch (e) {
        // Cannot parse response as JSON, use status text
        console.error('[Podio API] Could not parse error response as JSON');
        errorMessage = response.statusText || errorMessage;
      }
      
      // Classify error type based on status code
      let errorType = AuthErrorType.UNKNOWN;
      if (response.status >= 500) {
        errorType = AuthErrorType.NETWORK;
      } else if (response.status === 403) {
        errorType = AuthErrorType.AUTHENTICATION;
      } else if (response.status === 401) {
        errorType = AuthErrorType.TOKEN;
      }
      
      throw createAuthError(
        errorType,
        `API error (${response.status}): ${errorMessage}`,
        false
      );
    }
    
    // Clear rate limit on successful call
    clearRateLimit();
    
    const responseData = await response.json();
    
    // In development, log a summary of the response
    if (import.meta.env.DEV) {
      const summary = {};
      // Try to create a safe summary for logging
      if (Array.isArray(responseData)) {
        console.log(`[Podio API] Response is an array with ${responseData.length} items`);
      } else if (typeof responseData === 'object' && responseData !== null) {
        Object.keys(responseData).forEach(key => {
          // Skip logging values that might be large or sensitive
          if (key === 'access_token' || key === 'refresh_token' || key === 'token') {
            summary[key] = '[REDACTED]';
          } else if (Array.isArray(responseData[key])) {
            summary[key] = `Array with ${responseData[key].length} items`;
          } else if (typeof responseData[key] === 'object' && responseData[key] !== null) {
            summary[key] = 'Object';
          } else {
            summary[key] = responseData[key];
          }
        });
        console.log('[Podio API] Response data summary:', summary);
      }
    }
    
    return responseData;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[Podio API] API call error:', error);
    }
    
    // Reset retry count on error
    retryCount = 0;
    
    // If it's already an AuthError, just rethrow it
    if (error && typeof error === 'object' && 'type' in error) {
      throw error;
    }
    
    // Otherwise, create a new AuthError
    throw createAuthError(
      AuthErrorType.NETWORK,
      error instanceof Error ? error.message : 'Network error during API call',
      false
    );
  }
};

// Improved utility to compare passwords securely with browser-safe fallbacks
const comparePasswords = async (plainPassword: string, storedPassword: string): Promise<boolean> => {
  // For plain text comparison (not recommended but may be needed for legacy data)
  if (!storedPassword.startsWith('$2a$') && !storedPassword.startsWith('$2b$')) {
    return plainPassword === storedPassword;
  }
  
  // For bcrypt hashed passwords
  try {
    // Use a browser-safe method if available
    if (typeof bcrypt.compareSync === 'function') {
      return bcrypt.compareSync(plainPassword, storedPassword);
    } else {
      console.warn('bcrypt.compareSync not available in browser environment, falling back to plain text comparison');
      return plainPassword === storedPassword;
    }
  } catch (error) {
    console.error('Error comparing passwords:', error);
    // Fallback to plain text if bcrypt fails
    return plainPassword === storedPassword;
  }
};

// Extract contact data from a Podio item
const extractContactData = (item: any): any => {
  if (!item || !item.fields) {
    console.error('Invalid item structure for contact:', item);
    return null;
  }
  
  console.log('[Podio Auth] Processing contact item:', item.item_id);
  
  // Extract fields from the Podio contact item
  const name = getFieldValueByExternalId(item.fields, 'title') || 'Unknown Contact';
  const email = getFieldValueByExternalId(item.fields, 'email') || '';
  const username = getFieldValueByExternalId(item.fields, CONTACT_FIELD_IDS.username) || '';
  const logoUrl = getFieldValueByExternalId(item.fields, CONTACT_FIELD_IDS.logoUrl) || '';
  
  return {
    id: item.item_id,
    name,
    email,
    username,
    logoUrl
  };
};

// This function authenticates a user by checking the Podio contacts app
export const authenticateUser = async (credentials: PodioCredentials): Promise<any | null> => {
  try {
    console.log('[Podio Auth] Authenticating user:', credentials.username);
    
    // Check if we're rate limited first
    if (isRateLimited()) {
      const limitUntil = parseInt(localStorage.getItem('podio_rate_limit_until') || '0', 10);
      const waitSecs = Math.ceil((limitUntil - Date.now()) / 1000);
      throw createAuthError(
        AuthErrorType.NETWORK,
        `Rate limited. Please wait ${waitSecs} seconds before trying again.`,
        false
      );
    }
    
    // Ensure we're authenticated with Podio first using password flow
    console.log('[Podio Auth] Ensuring Podio authentication before user login');
    const authenticated = await ensureInitialPodioAuth();
    if (!authenticated) {
      console.error('[Podio Auth] Failed to authenticate with Podio');
      throw createAuthError(
        AuthErrorType.CONFIGURATION,
        'Could not authenticate with Podio',
        false
      );
    }
    
    // First, test to see if we can get the app details to verify our connection
    try {
      console.log(`[Podio Auth] Attempting to retrieve app details for app ${PODIO_CONTACTS_APP_ID}`);
      const appDetails = await callPodioApi(`app/${PODIO_CONTACTS_APP_ID}`);
      console.log('[Podio Auth] Podio app details retrieved successfully:', appDetails.app_id);
    } catch (error) {
      console.error('[Podio Auth] Failed to retrieve app details:', error);
      
      // If we get a 403, it means we don't have access to this app
      if (error && typeof error === 'object' && 'type' in error && error.type === AuthErrorType.AUTHENTICATION) {
        throw createAuthError(
          AuthErrorType.CONFIGURATION,
          'The app does not have permission to access the Contacts app. Please check Podio API permissions.',
          false
        );
      }
      
      // Try to refresh the token and try again
      const refreshed = await refreshPodioToken();
      if (refreshed) {
        try {
          console.log('[Podio Auth] Retrying app details after token refresh');
          const appDetails = await callPodioApi(`app/${PODIO_CONTACTS_APP_ID}`);
          console.log('[Podio Auth] Podio app details retrieved successfully after retry:', appDetails.app_id);
        } catch (retryError) {
          console.error('[Podio Auth] Failed to retrieve app details after token refresh:', retryError);
          throw createAuthError(
            AuthErrorType.CONFIGURATION,
            'Could not connect to Podio. Please check your credentials and app permissions.',
            false
          );
        }
      } else {
        throw createAuthError(
          AuthErrorType.CONFIGURATION,
          'Could not connect to Podio. Please check your credentials.',
          false
        );
      }
    }

    // Use a simpler approach to find items by field value
    const endpoint = `item/app/${PODIO_CONTACTS_APP_ID}/filter/`;
    
    // Get token to check format
    const accessToken = localStorage.getItem('podio_access_token');
    console.log('[Podio Auth] Using token (first 10 chars):', accessToken?.substring(0, 10) + '...');
    
    // Use the correct filter format for text fields (simple string value)
    const filters = {
      filters: {
        [CONTACT_FIELD_IDS.username]: credentials.username
      }
    };

    console.log('[Podio Auth] Searching contacts with filters:', JSON.stringify(filters, null, 2));
    
    // Make the API call
    let searchResponse;
    try {
      searchResponse = await callPodioApi(endpoint, {
        method: 'POST',
        body: JSON.stringify(filters),
      });
    } catch (error) {
      console.error('[Podio Auth] Error during contact search:', error);
      
      // Try alternative filter format as fallback
      try {
        console.log('[Podio Auth] Trying alternative filter format...');
        const alternativeFilters = {
          filters: {
            [CONTACT_FIELD_IDS.username]: {
              "equals": credentials.username
            }
          }
        };
        console.log('[Podio Auth] Alternative filters:', JSON.stringify(alternativeFilters, null, 2));
        
        searchResponse = await callPodioApi(endpoint, {
          method: 'POST',
          body: JSON.stringify(alternativeFilters),
        });
      } catch (secondError) {
        console.error('[Podio Auth] Alternative filter also failed:', secondError);
        throw createAuthError(
          AuthErrorType.CONFIGURATION,
          'Failed to search for user in Podio contacts',
          false
        );
      }
    }
    
    console.log('[Podio Auth] Search response items count:', searchResponse.items?.length || 0);
    
    // Check if we found any matches
    if (!searchResponse.items || searchResponse.items.length === 0) {
      console.log('[Podio Auth] No contact found with username:', credentials.username);
      throw createAuthError(
        AuthErrorType.AUTHENTICATION,
        'No user found with that username',
        false
      );
    }
    
    // Get the first matching contact
    const contactItem = searchResponse.items[0];
    console.log('[Podio Auth] Found contact item with ID:', contactItem.item_id);
    
    // Get the password field from the contact
    const storedPassword = getFieldValueByExternalId(
      contactItem.fields, 
      CONTACT_FIELD_IDS.password
    );
    
    if (!storedPassword) {
      console.error('[Podio Auth] Contact has no password field set');
      throw createAuthError(
        AuthErrorType.AUTHENTICATION,
        'User account is not properly configured',
        false
      );
    }
    
    // Verify the password
    const passwordMatches = await comparePasswords(credentials.password, storedPassword);
    if (!passwordMatches) {
      console.log('[Podio Auth] Password verification failed');
      throw createAuthError(
        AuthErrorType.AUTHENTICATION,
        'No matching contact found with these credentials',
        false
      );
    }
    
    // Password matches, extract contact data
    const contactData = extractContactData(contactItem);
    if (!contactData) {
      throw createAuthError(
        AuthErrorType.UNKNOWN,
        'Could not process contact data',
        false
      );
    }
    
    console.log('[Podio Auth] Authentication successful for user:', contactData.username);
    return contactData;
  } catch (error) {
    console.error('[Podio Auth] Authentication error:', error);
    
    // If it's already an AuthError, just rethrow it
    if (error && typeof error === 'object' && 'type' in error) {
      throw error;
    }
    
    // Convert to AuthError if it's not already one
    throw createAuthError(
      AuthErrorType.UNKNOWN,
      error instanceof Error ? error.message : 'Unknown authentication error',
      false
    );
  }
};

// Podio App IDs
export const PODIO_CONTACTS_APP_ID = 26969025;
export const PODIO_PACKING_SPEC_APP_ID = 29797638;

// Podio Contact Field IDs
export const CONTACT_FIELD_IDS = {
  username: "customer-portal-username",
  password: "customer-portal-password",
  contactItemId: "item-id",
  logoUrl: "logo-url",
  title: "title"
};
