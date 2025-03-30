
// This module handles Podio authentication and token management
import { 
  AuthErrorType, 
  createAuthError, 
  ensureValidToken 
} from '../auth/authService';

interface PodioCredentials {
  username: string;
  password: string;
}

// Use environment variables for credentials in production
const getPodioClientId = (): string | null => {
  return import.meta.env.VITE_PODIO_CLIENT_ID || localStorage.getItem('podio_client_id');
};

const getPodioClientSecret = (): string | null => {
  return import.meta.env.VITE_PODIO_CLIENT_SECRET || localStorage.getItem('podio_client_secret');
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

// Function to initially authenticate with Podio in production
export const ensureInitialPodioAuth = async (): Promise<boolean> => {
  // Skip if we already have valid tokens
  if (hasValidPodioTokens()) {
    console.log('Already have valid Podio tokens');
    return true;
  }
  
  // Only auto-authenticate in production
  if (import.meta.env.PROD) {
    const clientId = getPodioClientId();
    const clientSecret = getPodioClientSecret();
    
    if (!clientId || !clientSecret) {
      console.error('Missing Podio client credentials in environment variables');
      return false;
    }
    
    console.log('Starting client credential authentication with Podio...');
    
    try {
      // Get client credentials token
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
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to get initial Podio token:', errorData);
        return false;
      }
      
      const data = await response.json();
      
      localStorage.setItem('podio_access_token', data.access_token);
      
      // Use refresh token if available, otherwise we'll need to refresh using client credentials again
      if (data.refresh_token) {
        localStorage.setItem('podio_refresh_token', data.refresh_token);
      }
      
      // Set expiry to 1 hour less than actual to ensure we refresh in time
      const safeExpiryTime = Date.now() + ((data.expires_in - 3600) * 1000);
      localStorage.setItem('podio_token_expiry', safeExpiryTime.toString());
      
      console.log('Successfully authenticated with Podio using client credentials');
      return true;
    } catch (error) {
      console.error('Error getting initial Podio token:', error);
      return false;
    }
  }
  
  return false;
};

// Enhanced function to refresh the access token if needed
export const refreshPodioToken = async (): Promise<boolean> => {
  const refreshToken = localStorage.getItem('podio_refresh_token');
  const clientId = getPodioClientId();
  const clientSecret = getPodioClientSecret();
  
  if (!clientId || !clientSecret) {
    console.error('Missing Podio client credentials');
    return false;
  }
  
  // If we have a refresh token, use it
  if (refreshToken) {
    try {
      // Log only in development
      console.log('Refreshing Podio token using refresh token');
      
      const response = await fetch('https://podio.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
        }).toString(),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to refresh token using refresh token:', errorData);
        
        // If refresh token failed, fall back to client credentials in production
        if (import.meta.env.PROD) {
          return getClientCredentialsToken(clientId, clientSecret);
        }
        
        return false;
      }
      
      const data = await response.json();
      
      localStorage.setItem('podio_access_token', data.access_token);
      localStorage.setItem('podio_refresh_token', data.refresh_token);
      
      // Set expiry to 1 hour less than actual to ensure we refresh in time
      const safeExpiryTime = Date.now() + ((data.expires_in - 3600) * 1000);
      localStorage.setItem('podio_token_expiry', safeExpiryTime.toString());
      
      return true;
    } catch (error) {
      console.error('Error refreshing Podio token:', error);
      
      // Fall back to client credentials in production
      if (import.meta.env.PROD) {
        return getClientCredentialsToken(clientId, clientSecret);
      }
      
      return false;
    }
  } else if (import.meta.env.PROD) {
    // No refresh token, use client credentials in production
    return getClientCredentialsToken(clientId, clientSecret);
  }
  
  return false;
};

// Helper function to get a token using client credentials
const getClientCredentialsToken = async (clientId: string, clientSecret: string): Promise<boolean> => {
  try {
    console.log('Getting client credentials token');
    
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
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Failed to get client credentials token:', errorData);
      return false;
    }
    
    const data = await response.json();
    
    localStorage.setItem('podio_access_token', data.access_token);
    
    // May not have refresh token with client credentials
    if (data.refresh_token) {
      localStorage.setItem('podio_refresh_token', data.refresh_token);
    }
    
    // Set expiry to 1 hour less than actual to ensure we refresh in time
    const safeExpiryTime = Date.now() + ((data.expires_in - 3600) * 1000);
    localStorage.setItem('podio_token_expiry', safeExpiryTime.toString());
    
    return true;
  } catch (error) {
    console.error('Error getting client credentials token:', error);
    return false;
  }
};

// Improved function to make authenticated API calls to Podio
export const callPodioApi = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
  // First, ensure we have a valid token
  const tokenValid = await ensureValidToken();
  
  if (!tokenValid) {
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
    const response = await fetch(`https://api.podio.com/${endpoint}`, {
      ...options,
      headers,
    });
    
    // If token is expired, try refreshing it once and retry the call
    if (response.status === 401) {
      const refreshed = await refreshPodioToken();
      if (refreshed) {
        // Retry the API call with the new token
        return callPodioApi(endpoint, options);
      } else {
        throw createAuthError(
          AuthErrorType.TOKEN,
          'Failed to refresh Podio token',
          false
        );
      }
    }
    
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
    
    return await response.json();
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Podio API call error:', error);
    }
    
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

// Function to check if Podio API is configured
export const isPodioConfigured = (): boolean => {
  // In production, check if we have env variables
  if (import.meta.env.PROD) {
    // Check for environment variables first
    const hasEnvVars = !!import.meta.env.VITE_PODIO_CLIENT_ID && 
                       !!import.meta.env.VITE_PODIO_CLIENT_SECRET;
    
    console.log('Production environment, checking Podio config:', 
      hasEnvVars ? 'Environment variables found' : 'No environment variables', 
      hasValidPodioTokens() ? 'Valid tokens found' : 'No valid tokens');
    
    // If we have built-in credentials or valid tokens, consider it configured
    return hasEnvVars || hasValidPodioTokens();
  }
  
  // In development, check if we have valid tokens or local storage credentials
  return hasValidPodioTokens() || 
         (!!localStorage.getItem('podio_client_id') && 
          !!localStorage.getItem('podio_client_secret'));
};

// This function authenticates a user by checking the Podio contacts app
export const authenticateUser = async (credentials: PodioCredentials): Promise<any | null> => {
  try {
    console.log('Authenticating with Podio...', credentials.username);
    
    // In production, ensure we're authenticated with Podio first
    if (import.meta.env.PROD && !hasValidPodioTokens()) {
      console.log('No valid tokens, attempting to authenticate with Podio');
      const authenticated = await ensureInitialPodioAuth();
      if (!authenticated) {
        console.error('Failed to authenticate with Podio');
        throw createAuthError(
          AuthErrorType.CONFIGURATION,
          'Could not authenticate with Podio',
          false
        );
      }
    } else if (!hasValidPodioTokens() && !await refreshPodioToken()) {
      console.error('No valid Podio tokens available for authentication');
      throw createAuthError(
        AuthErrorType.CONFIGURATION,
        'Not authenticated with Podio API',
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
            'Could not connect to Podio. Please check your credentials.',
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
    
    // Rest of the authentication function remains the same
    // ... keep existing code (processing contact item, checking password, and returning contact data)
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
