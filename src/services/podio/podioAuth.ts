
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

// Rate limiting constants for API calls
const API_CALL_COUNT_KEY = 'podio_api_call_count';
const API_CALL_RESET_KEY = 'podio_api_call_reset';
const MAX_API_CALLS_PER_MINUTE = 250; // Podio's general rate limit

// Get Podio App IDs from environment variables with fallbacks to hardcoded values
export const PODIO_CONTACTS_APP_ID = Number(import.meta.env.VITE_PODIO_CONTACTS_APP_ID) || 26969025;
export const PODIO_PACKING_SPEC_APP_ID = Number(import.meta.env.VITE_PODIO_PACKING_SPEC_APP_ID) || 29797638;

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
      console.log('Podio config check: Environment variables found');
    }
    return true;
  }
  
  // Then check for valid tokens
  if (hasValidPodioTokens()) {
    if (import.meta.env.DEV) {
      console.log('Podio config check: Valid tokens found');
    }
    return true;
  }
  
  // Finally check localStorage for credentials (fallback for development)
  const hasLocalStorageCreds = !!localStorage.getItem('podio_client_id') && 
                              !!localStorage.getItem('podio_client_secret');
                              
  if (hasLocalStorageCreds && import.meta.env.DEV) {
    console.log('Podio config check: localStorage credentials found');
    return true;
  }
  
  // Log what's missing for debugging
  if (import.meta.env.DEV) {
    console.log('Podio not configured:',
      !hasEnvVars ? 'No environment variables' : '',
      !hasValidPodioTokens() ? 'No valid tokens' : '',
      !hasLocalStorageCreds ? 'No localStorage credentials' : '');
  }
  
  return false;
};

// Helper function to validate if token is actually working with Podio
export const validatePodioToken = async (): Promise<boolean> => {
  try {
    const accessToken = localStorage.getItem('podio_access_token');
    if (!accessToken) return false;
    
    if (import.meta.env.DEV) {
      console.log('Validating token (first 10 chars):', accessToken.substring(0, 10) + '...');
    }
    
    // Use an endpoint that works with app authentication instead of user authentication
    // The /app/ endpoint requires only app authorization
    const apiDomain = getPodioApiDomain();
    const response = await fetch(`https://${apiDomain}/app/${PODIO_CONTACTS_APP_ID}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (response.status === 403) {
      console.log('Token validation: 403 Forbidden - The app may not have access to this resource');
      
      if (import.meta.env.DEV) {
        console.log('This typically means the Podio app does not have the correct permissions.');
        console.log(`Ensure the Podio API client has access to the Contacts app (ID: ${PODIO_CONTACTS_APP_ID})`);
      }
      
      return false;
    }
    
    return response.ok;
  } catch (error) {
    console.error('Error validating Podio token:', error);
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
  console.log('Cleared Podio tokens');
};

// Function to initially authenticate with Podio using password flow
export const ensureInitialPodioAuth = async (): Promise<boolean> => {
  // First check if we're rate limited
  if (isRateLimited()) {
    const limitUntil = parseInt(localStorage.getItem('podio_rate_limit_until') || '0', 10);
    const waitSecs = Math.ceil((limitUntil - Date.now()) / 1000);
    console.error(`Rate limited. Please wait ${waitSecs} seconds before trying again.`);
    return false;
  }
  
  // Then validate any existing tokens
  if (hasValidPodioTokens()) {
    console.log('Found valid Podio tokens, validating...');
    const isValid = await validatePodioToken();
    
    if (isValid) {
      console.log('Existing tokens are valid');
      return true;
    } else {
      console.log('Existing tokens are invalid, clearing and getting new ones');
      clearPodioTokens();
    }
  }
  
  console.log('Starting Password Flow for Podio authentication...');
  
  // Use Password Flow (client_credentials) for app authentication
  return await authenticateWithPasswordFlow();
};

// Enhanced function to refresh the access token if needed
export const refreshPodioToken = async (): Promise<boolean> => {
  // First check if we're rate limited
  if (isRateLimited()) {
    const limitUntil = parseInt(localStorage.getItem('podio_rate_limit_until') || '0', 10);
    const waitSecs = Math.ceil((limitUntil - Date.now()) / 1000);
    console.error(`Rate limited. Please wait ${waitSecs} seconds before trying again.`);
    return false;
  }
  
  // With client_credentials flow, there's no refresh token
  // We need to get a new token each time
  return await authenticateWithPasswordFlow();
};

// Improved function to make authenticated API calls to Podio with retry limits
let retryCount = 0;
const MAX_RETRIES = 2;

export const callPodioApi = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
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
  const tokenValid = await ensureValidToken();
  
  if (!tokenValid) {
    retryCount = 0; // Reset retry count
    const error = createAuthError(
      AuthErrorType.TOKEN,
      'Not authenticated with Podio',
      true,
      refreshPodioToken
    );
    throw error;
  }
  
  const accessToken = localStorage.getItem('podio_access_token');
  
  // Merge the authorization header with the provided options
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  try {
    const apiDomain = getPodioApiDomain();
    const response = await fetch(`https://${apiDomain}/${endpoint}`, {
      ...options,
      headers,
    });
    
    // Handle rate limiting (420 or 429 status)
    if (response.status === 420 || response.status === 429) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Rate limit reached:', errorData);
      
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
      console.error(`API call returned 403 Forbidden for endpoint ${endpoint}. The app may not have sufficient permissions.`);
      
      // Getting a 403 after successful token acquisition likely means permission issues,
      // not token issues. Don't keep retrying with the same credentials.
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
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
      console.log(`API call returned 401, attempting to refresh token`);
      
      // Check if we've already retried too many times
      if (retryCount >= MAX_RETRIES) {
        console.log(`Maximum retry count (${MAX_RETRIES}) reached, forcing OAuth flow`);
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
        console.log(`Retry attempt ${retryCount} of ${MAX_RETRIES}`);
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
        errorMessage = errorData.error_description || errorMessage;
      } catch (e) {
        // Cannot parse response as JSON, use status text
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
    
    return await response.json();
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Podio API call error:', error);
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
  
  console.log('Processing contact item:', item.item_id);
  
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
    console.log('Authenticating with Podio...', credentials.username);
    
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
    const authenticated = await ensureInitialPodioAuth();
    if (!authenticated) {
      console.error('Failed to authenticate with Podio');
      throw createAuthError(
        AuthErrorType.CONFIGURATION,
        'Could not authenticate with Podio',
        false
      );
    }
    
    // First, test to see if we can get the app details to verify our connection
    try {
      console.log(`Attempting to retrieve app details for app ${PODIO_CONTACTS_APP_ID}`);
      const appDetails = await callPodioApi(`app/${PODIO_CONTACTS_APP_ID}`);
      console.log('Podio app details retrieved successfully:', appDetails.app_id);
    } catch (error) {
      console.error('Failed to retrieve app details:', error);
      
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
          console.log('Retrying app details after token refresh');
          const appDetails = await callPodioApi(`app/${PODIO_CONTACTS_APP_ID}`);
          console.log('Podio app details retrieved successfully after retry:', appDetails.app_id);
        } catch (retryError) {
          console.error('Failed to retrieve app details after token refresh:', retryError);
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
    console.log('Using token (first 10 chars):', accessToken?.substring(0, 10) + '...');
    
    // Use the correct filter format for text fields (simple string value)
    const filters = {
      filters: {
        [CONTACT_FIELD_IDS.username]: credentials.username
      }
    };

    console.log('Searching contacts with filters:', JSON.stringify(filters, null, 2));
    
    // Make the API call
    let searchResponse;
    try {
      searchResponse = await callPodioApi(endpoint, {
        method: 'POST',
        body: JSON.stringify(filters),
      });
    } catch (error) {
      console.error('Error during contact search:', error);
      
      // Try alternative filter format as fallback
      try {
        console.log('Trying alternative filter format...');
        const alternativeFilters = {
          filters: {
            [CONTACT_FIELD_IDS.username]: {
              "equals": credentials.username
            }
          }
        };
        console.log('Alternative filters:', JSON.stringify(alternativeFilters, null, 2));
        
        searchResponse = await callPodioApi(endpoint, {
          method: 'POST',
          body: JSON.stringify(alternativeFilters),
        });
      } catch (secondError) {
        console.error('Alternative filter also failed:', secondError);
        throw createAuthError(
          AuthErrorType.CONFIGURATION,
          'Failed to search for user in Podio contacts',
          false
        );
      }
    }
    
    console.log('Search response items count:', searchResponse.items?.length || 0);
    
    // Check if we found any matches
    if (!searchResponse.items || searchResponse.items.length === 0) {
      console.log('No contact found with username:', credentials.username);
      throw createAuthError(
        AuthErrorType.AUTHENTICATION,
        'No user found with that username',
        false
      );
    }
    
    // Get the first matching contact
    const contactItem = searchResponse.items[0];
    console.log('Found contact item with ID:', contactItem.item_id);
    
    // Get the password field from the contact
    const storedPassword = getFieldValueByExternalId(
      contactItem.fields, 
      CONTACT_FIELD_IDS.password
    );
    
    if (!storedPassword) {
      console.error('Contact has no password field set');
      throw createAuthError(
        AuthErrorType.AUTHENTICATION,
        'User account is not properly configured',
        false
      );
    }
    
    // Verify the password
    const passwordMatches = await comparePasswords(credentials.password, storedPassword);
    if (!passwordMatches) {
      console.log('Password verification failed');
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
    
    console.log('Authentication successful for user:', contactData.username);
    return contactData;
  } catch (error) {
    console.error('Authentication error:', error);
    
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

// Podio Contact Field IDs
export const CONTACT_FIELD_IDS = {
  username: "customer-portal-username",
  password: "customer-portal-password",
  contactItemId: "item-id",
  logoUrl: "logo-url",
  title: "title"
};
