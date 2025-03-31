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
export const validatePodioToken = async (accessToken: string): Promise<boolean> => {
  if (!accessToken) {
    if (import.meta.env.DEV) {
      console.log('No token to validate');
    }
    return false;
  }
  
  try {
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
    
    if (import.meta.env.DEV) {
      console.log(`Token validation: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        try {
          const errorData = await response.json();
          console.log('Token validation error details:', errorData);
        } catch (e) {
          console.log('Could not parse error response');
        }
      }
    }
    
    // Check more helpful message for 403 errors
    if (response.status === 403) {
      if (import.meta.env.DEV) {
        console.log('This typically means the Podio app does not have the correct permissions.');
        console.log(`Ensure the Podio API client has access to the Contacts app (ID: ${PODIO_CONTACTS_APP_ID})`);
        console.log(`Client ID being used: ${getPodioClientId()}`);
      }
      return false;
    }
    
    return response.ok;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Error validating Podio token:', error);
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
    const isValid = await validatePodioToken(localStorage.getItem('podio_access_token'));
    
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

export const callPodioApi = async <T = any>(
  endpoint: string, 
  options: RequestInit = {},
  retryCount = 0
): Promise<T> => {
  // Max 2 retries
  if (retryCount > 2) {
    throw createAuthError(
      AuthErrorType.TOKEN,
      'Maximum retry count exceeded for Podio API call'
    );
  }
  
  // Check if we're rate limited first
  if (isRateLimited()) {
    const limitUntil = parseInt(localStorage.getItem('podio_rate_limit_until') || '0', 10);
    const waitSecs = Math.ceil((limitUntil - Date.now()) / 1000);
    
    const error = createAuthError(
      AuthErrorType.NETWORK,
      `Rate limited. Please wait ${waitSecs} seconds before trying again.`
    );
    
    throw error;
  }
  
  // Ensure we have valid tokens
  if (!hasValidPodioTokens()) {
    if (import.meta.env.DEV) {
      console.log('No valid tokens, attempting to refresh before API call');
    }
    
    const refreshed = await refreshPodioToken();
    
    if (!refreshed) {
      throw createAuthError(
        AuthErrorType.TOKEN,
        'Could not refresh token for API call'
      );
    }
  }
  
  const accessToken = localStorage.getItem('podio_access_token');
  
  if (!accessToken) {
    throw createAuthError(
      AuthErrorType.TOKEN,
      'No access token available for API call'
    );
  }
  
  // Prepare headers
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  try {
    const apiDomain = getPodioApiDomain();
    const url = `https://${apiDomain}/${endpoint}`;
    
    if (import.meta.env.DEV) {
      console.log(`Making API request to: ${url}`);
      console.log(`Using token (first 10 chars): ${accessToken.substring(0, 10)}...`);
    }
    
    const response = await fetch(url, {
      ...options,
      headers,
    });
    
    // Check if we need to handle rate limiting
    if (response.status === 420 || response.status === 429) {
      // Handle rate limiting
      const retryAfter = response.headers.get('Retry-After');
      if (retryAfter) {
        setRateLimit(parseInt(retryAfter, 10));
      } else {
        // Default to 60 seconds if no specific time given
        setRateLimit(60);
      }
      
      throw createAuthError(
        AuthErrorType.NETWORK,
        `Rate limit reached. Please wait ${retryAfter || 60} seconds before trying again.`
      );
    }
    
    // If token is invalid, try to refresh and retry
    if (response.status === 401 || response.status === 403) {
      if (import.meta.env.DEV) {
        console.log(`API call returned ${response.status} for endpoint ${endpoint}. Attempting token refresh.`);
        
        try {
          const errorData = await response.clone().json();
          console.log('API error details:', errorData);
        } catch (e) {
          console.log('Could not parse error response');
        }
      }
      
      // Clear tokens and try to refresh
      clearPodioTokens();
      
      // Attempt to refresh the token
      const refreshed = await refreshPodioToken();
      
      if (refreshed) {
        // Retry the API call with the new token
        return callPodioApi(endpoint, options, retryCount + 1);
      } else {
        throw createAuthError(
          AuthErrorType.TOKEN,
          'Could not refresh token after unauthorized response'
        );
      }
    }
    
    // If we got a non-200 response that's not auth-related, log and throw an error
    if (!response.ok) {
      if (import.meta.env.DEV) {
        console.error(`API call returned ${response.status} ${response.statusText} for endpoint ${endpoint}. The app may not have sufficient permissions.`);
      }
      
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        // Failed to parse JSON
        errorData = { error: 'unknown', error_description: response.statusText };
      }
      
      const error = createAuthError(
        AuthErrorType.UNKNOWN,
        errorData.error_description || `API call failed with status ${response.status}`
      );
      
      throw error;
    }
    
    // Handle empty responses
    if (response.status === 204) {
      return {} as T;
    }
    
    // Parse the JSON response
    try {
      const data = await response.json();
      return data as T;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error parsing API response:', error);
      }
      
      throw createAuthError(
        AuthErrorType.UNKNOWN,
        'Could not parse API response'
      );
    }
  } catch (error) {
    // Re-throw AuthErrors
    if (error && typeof error === 'object' && 'type' in error) {
      throw error;
    }
    
    if (import.meta.env.DEV) {
      console.error('Podio API call error:', error);
    }
    
    // Create a new auth error
    const authError = createAuthError(
      AuthErrorType.UNKNOWN,
      error instanceof Error ? error.message : 'Unknown error during API call'
    );
    
    throw authError;
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
export const authenticateUser = async (credentials: { username: string; password: string }): Promise<ContactData | null> => {
  if (import.meta.env.DEV) {
    console.log('Authenticating with Podio...', credentials.username);
  }
  
  try {
    // First ensure we have valid tokens for making API calls
    if (!hasValidPodioTokens()) {
      if (import.meta.env.DEV) {
        console.log('No valid tokens, refreshing before authentication');
      }
      
      const refreshed = await refreshPodioToken();
      
      if (!refreshed) {
        if (import.meta.env.DEV) {
          console.error('Could not refresh token before authentication');
        }
        
        throw createAuthError(
          AuthErrorType.TOKEN,
          'Could not connect to the service. Please try again later.'
        );
      }
    }
    
    // Get the app details to verify we have access
    try {
      if (import.meta.env.DEV) {
        console.log(`Attempting to retrieve app details for app ${PODIO_CONTACTS_APP_ID}`);
      }
      
      // Manually construct the app info endpoint with retrying
      try {
        await callPodioApi(`app/${PODIO_CONTACTS_APP_ID}`);
      } catch (appError) {
        if (import.meta.env.DEV) {
          console.error('Failed to retrieve app details:', appError);
        }
        
        // Specific error for configuration issues
        throw createAuthError(
          AuthErrorType.CONFIGURATION,
          'The app does not have permission to access the Contacts app. Please check Podio API permissions.'
        );
      }
      
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
        searchResponse = await callPodioApi(`item/app/${PODIO_CONTACTS_APP_ID}/filter/`, {
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
          
          searchResponse = await callPodioApi(`item/app/${PODIO_CONTACTS_APP_ID}/filter/`, {
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
    } catch (appDetailsError) {
      if (import.meta.env.DEV) {
        console.error('Failed to retrieve app details:', appDetailsError);
      }
      
      // Pass through AuthErrors
      if (appDetailsError && typeof appDetailsError === 'object' && 'type' in appDetailsError) {
        throw appDetailsError;
      }
      
      throw createAuthError(
        AuthErrorType.CONFIGURATION,
        'Could not verify access to Podio apps. Please check permissions.'
      );
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Error during authentication:', error);
    }
    
    // Pass through AuthErrors
    if (error && typeof error === 'object' && 'type' in error) {
      throw error;
    }
    
    // Create a generic auth error for other types of errors
    throw createAuthError(
      AuthErrorType.UNKNOWN,
      error instanceof Error ? error.message : 'Unknown error during authentication'
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
