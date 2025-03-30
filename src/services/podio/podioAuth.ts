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

// Enhanced function to refresh the access token if needed
export const refreshPodioToken = async (): Promise<boolean> => {
  const refreshToken = localStorage.getItem('podio_refresh_token');
  const clientId = localStorage.getItem('podio_client_id');
  const clientSecret = localStorage.getItem('podio_client_secret');
  
  if (!refreshToken || !clientId || !clientSecret) return false;
  
  try {
    // Log only in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Refreshing Podio token');
    }
    
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
      const errorMessage = errorData.error_description || 'Failed to refresh token';
      
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    
    localStorage.setItem('podio_access_token', data.access_token);
    localStorage.setItem('podio_refresh_token', data.refresh_token);
    
    // Set expiry to 1 hour less than actual to ensure we refresh in time
    const safeExpiryTime = Date.now() + ((data.expires_in - 3600) * 1000);
    localStorage.setItem('podio_token_expiry', safeExpiryTime.toString());
    
    return true;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error refreshing Podio token:', error);
    }
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
    if (process.env.NODE_ENV === 'development') {
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
  // In production, we could add a check for a service account or preconfigured tokens
  // For now, we'll just check if we have valid tokens
  return hasValidPodioTokens();
};

// This function authenticates a user by checking the Podio contacts app
export const authenticateUser = async (credentials: PodioCredentials): Promise<any | null> => {
  try {
    console.log('Authenticating with Podio...', credentials.username);
    
    if (!hasValidPodioTokens() && !await refreshPodioToken()) {
      console.error('No valid Podio tokens available for authentication');
      throw createAuthError(
        AuthErrorType.CONFIGURATION,
        'Not authenticated with Podio API',
        false
      );
    }
    
    // First, test to see if we can get the app details to verify our connection
    try {
      const appDetails = await callPodioApi(`app/${PODIO_CONTACTS_APP_ID}`);
      console.log('Podio app details retrieved successfully:', appDetails.app_id);
    } catch (error) {
      console.error('Failed to retrieve app details:', error);
      throw createAuthError(
        AuthErrorType.CONFIGURATION,
        'Could not connect to Podio. Please check your credentials.',
        false
      );
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
        AuthErrorType.CONFIGURATION,
        'No user found with that username',
        false
      );
    }
    
    // Get the first contact that matches
    const contactItem = searchResponse.items[0];
    console.log('Found contact item ID:', contactItem.item_id);
    
    // Log the fields to help debug
    console.log('Contact fields:', contactItem.fields.map((f: any) => ({
      external_id: f.external_id,
      label: f.label, 
      type: f.type,
      hasValues: !!f.values?.length
    })));
    
    // Extract fields from the response
    const usernameField = contactItem.fields.find((field: any) => field.external_id === CONTACT_FIELD_IDS.username);
    const passwordField = contactItem.fields.find((field: any) => field.external_id === CONTACT_FIELD_IDS.password);
    const titleField = contactItem.fields.find((field: any) => field.external_id === CONTACT_FIELD_IDS.title);
    const logoField = contactItem.fields.find((field: any) => field.external_id === CONTACT_FIELD_IDS.logoUrl);
    
    console.log('Found username field:', !!usernameField, 'value:', usernameField?.values?.[0]?.value);
    console.log('Found password field:', !!passwordField);
    
    // Check if the password matches
    if (!passwordField || !passwordField.values || !passwordField.values.length) {
      console.log('Password field not found or empty');
      throw createAuthError(
        AuthErrorType.CONFIGURATION,
        'Password field not found for this user',
        false
      );
    }
    
    // Compare the password
    const savedPassword = passwordField.values[0].value;
    console.log('Password comparison:', 
      'input length:', credentials.password.length, 
      'saved length:', savedPassword?.length || 0,
      'match:', savedPassword === credentials.password
    );
    
    if (savedPassword !== credentials.password) {
      console.log('Password does not match');
      throw createAuthError(
        AuthErrorType.CONFIGURATION,
        'Invalid password',
        false
      );
    }
    
    // Create the contact data object
    const contact = {
      id: contactItem.item_id,
      name: titleField?.values?.[0]?.value || 'Unknown Company',
      email: '', // Email might be in a different field if needed
      username: credentials.username,
      logoUrl: logoField?.values?.[0]?.value
    };
    
    console.log('Successfully authenticated contact:', contact);
    return contact;
    
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
