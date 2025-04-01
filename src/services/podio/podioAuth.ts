// Core authentication service for Podio integration

import PodioJS from 'podio-js';

// OAuth constants
const PODIO_CLIENT_ID_KEY = 'podio_client_id';
const PODIO_CLIENT_SECRET_KEY = 'podio_client_secret';
const PODIO_REDIRECT_URI_KEY = 'podio_redirect_uri';
const PODIO_AUTH_STATE_KEY = 'podio_auth_state';

// Token storage keys
const PODIO_ACCESS_TOKEN_KEY = 'podio_access_token';
const PODIO_REFRESH_TOKEN_KEY = 'podio_refresh_token';
const PODIO_EXPIRY_TIMESTAMP_KEY = 'podio_expiry_timestamp';

// App token storage keys
const PODIO_CONTACTS_APP_TOKEN_KEY = 'podio_contacts_app_token';
const PODIO_PACKING_SPEC_APP_TOKEN_KEY = 'podio_packing_spec_app_token';

// Rate limiting variables
const RATE_LIMIT_KEY = 'podio_rate_limit';
const RATE_LIMIT_UNTIL_KEY = 'podio_rate_limit_until';
const RATE_LIMIT_BACKOFF_KEY = 'podio_rate_limit_backoff';

// User data cache keys
const USER_DATA_KEY = 'podio_user_data';

// App IDs
export const PODIO_CONTACTS_APP_ID = parseInt(process.env.REACT_APP_PODIO_CONTACTS_APP_ID || '0', 10);
export const PODIO_PACKING_SPEC_APP_ID = parseInt(process.env.REACT_APP_PODIO_PACKING_SPEC_APP_ID || '0', 10);

// Field IDs
export const CONTACT_FIELD_IDS = {
  companyName: parseInt(process.env.REACT_APP_PODIO_COMPANY_NAME_FIELD_ID || '0', 10),
  logo: parseInt(process.env.REACT_APP_PODIO_COMPANY_LOGO_FIELD_ID || '0', 10),
};

// Initialize Podio client with dummy credentials
let podioClient = new PodioJS({
  client_id: 'dummy',
  client_secret: 'dummy'
});

// Context for managing Podio app
export const PodioAppContext = {
  Contacts: 'contacts',
  PackingSpecs: 'packing_specs',
  None: 'none'
};

let currentAppContext = PodioAppContext.None;

export const setCurrentAppContext = (context: string) => {
  currentAppContext = context;
};

export const getCurrentAppContext = () => {
  return currentAppContext;
};

/**
 * Checks if Podio is configured by verifying the presence of client ID, client secret, and redirect URI in localStorage.
 * @returns {boolean} True if Podio is configured, false otherwise.
 */
export const isPodioConfigured = (): boolean => {
  const clientId = localStorage.getItem(PODIO_CLIENT_ID_KEY);
  const clientSecret = localStorage.getItem(PODIO_CLIENT_SECRET_KEY);
  const redirectUri = localStorage.getItem(PODIO_REDIRECT_URI_KEY);
  
  return !!clientId && !!clientSecret && !!redirectUri;
};

/**
 * Authenticates a user with Podio using an authorization code.
 * @param {string} authorizationCode - The authorization code received from Podio.
 * @param {string} authState - The auth state to prevent CSRF
 * @returns {Promise<any>} A promise that resolves with the authentication result or rejects with an error.
 */
export const authenticateUser = async (authorizationCode: string, authState: string): Promise<any> => {
  const storedAuthState = localStorage.getItem(PODIO_AUTH_STATE_KEY);
  if (storedAuthState !== authState) {
    throw new Error('Invalid auth state. Possible CSRF attack.');
  }
  
  const clientId = getPodioClientId();
  const clientSecret = getPodioClientSecret();
  const redirectUri = getPodioRedirectUri();

  podioClient = new PodioJS({
    client_id: clientId,
    client_secret: clientSecret
  });

  try {
    const authResult = await podioClient.auth.authorization({
      grant_type: 'authorization_code',
      code: authorizationCode,
      redirect_uri: redirectUri
    });

    // Store tokens and expiry timestamp
    localStorage.setItem(PODIO_ACCESS_TOKEN_KEY, authResult.access_token);
    localStorage.setItem(PODIO_REFRESH_TOKEN_KEY, authResult.refresh_token);
    
    // Calculate and store the expiry timestamp (in milliseconds)
    const expiryTimestamp = Date.now() + (authResult.expires_in * 1000);
    localStorage.setItem(PODIO_EXPIRY_TIMESTAMP_KEY, expiryTimestamp.toString());

    return authResult;
  } catch (error: any) {
    console.error('Podio authentication failed:', error);
    throw new Error(error.message || 'Podio authentication failed');
  }
};

/**
 * Checks if there are valid Podio tokens in localStorage.
 * @returns {boolean} True if valid tokens exist, false otherwise.
 */
export const hasValidPodioTokens = (): boolean => {
  const accessToken = localStorage.getItem(PODIO_ACCESS_TOKEN_KEY);
   // Check if the access token exists
  if (!accessToken) {
    return false;
  }

  const expiryTimestamp = localStorage.getItem(PODIO_EXPIRY_TIMESTAMP_KEY);

  // If there's no expiry timestamp, consider the tokens invalid
  if (!expiryTimestamp) {
    return false;
  }

  const expiryTime = parseInt(expiryTimestamp, 10);
  const currentTime = Date.now();

  // Check if the current time is before the expiry time
  return currentTime < expiryTime;
};

/**
 * Refreshes the Podio access token using the refresh token.
 * @returns {Promise<any>} A promise that resolves with the new access token or rejects with an error.
 */
export const refreshPodioToken = async (): Promise<any> => {
  const refreshToken = localStorage.getItem(PODIO_REFRESH_TOKEN_KEY);
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const clientId = getPodioClientId();
  const clientSecret = getPodioClientSecret();
  const redirectUri = getPodioRedirectUri();

  podioClient = new PodioJS({
    client_id: clientId,
    client_secret: clientSecret
  });

  try {
    const authResult = await podioClient.auth.refresh(refreshToken);

    // Store new tokens and expiry timestamp
    localStorage.setItem(PODIO_ACCESS_TOKEN_KEY, authResult.access_token);
    localStorage.setItem(PODIO_REFRESH_TOKEN_KEY, authResult.refresh_token);

    // Calculate and store the expiry timestamp (in milliseconds)
    const expiryTimestamp = Date.now() + (authResult.expires_in * 1000);
    localStorage.setItem(PODIO_EXPIRY_TIMESTAMP_KEY, expiryTimestamp.toString());

    return authResult;
  } catch (error: any) {
    console.error('Podio token refresh failed:', error);
    clearPodioTokens(); // Clear tokens to prevent infinite loops
    throw new Error(error.message || 'Podio token refresh failed');
  }
};

/**
 * Clears Podio tokens from localStorage.
 */
export const clearPodioTokens = (): void => {
  localStorage.removeItem(PODIO_ACCESS_TOKEN_KEY);
  localStorage.removeItem(PODIO_REFRESH_TOKEN_KEY);
  localStorage.removeItem(PODIO_EXPIRY_TIMESTAMP_KEY);
};

/**
 * Retrieves the Podio client ID from localStorage.
 * @returns {string | null} The Podio client ID or null if not found.
 */
export const getPodioClientId = (): string | null => {
  return localStorage.getItem(PODIO_CLIENT_ID_KEY);
};

/**
 * Retrieves the Podio client secret from localStorage.
 * @returns {string | null} The Podio client secret or null if not found.
 */
export const getPodioClientSecret = (): string | null => {
  return localStorage.getItem(PODIO_CLIENT_SECRET_KEY);
};

/**
 * Retrieves the Podio redirect URI from localStorage.
 * @returns {string | null} The Podio redirect URI or null if not found.
 */
export const getPodioRedirectUri = (): string | null => {
  return localStorage.getItem(PODIO_REDIRECT_URI_KEY);
};

/**
 * Sets the Podio client ID in localStorage.
 * @param {string} clientId - The Podio client ID to set.
 */
export const setPodioClientId = (clientId: string): void => {
  localStorage.setItem(PODIO_CLIENT_ID_KEY, clientId);
};

/**
 * Sets the Podio client secret in localStorage.
 * @param {string} clientSecret - The Podio client secret to set.
 */
export const setPodioClientSecret = (clientSecret: string): void => {
  localStorage.setItem(PODIO_CLIENT_SECRET_KEY, clientSecret);
};

/**
 * Sets the Podio redirect URI in localStorage.
 * @param {string} redirectUri - The Podio redirect URI to set.
 */
export const setPodioRedirectUri = (redirectUri: string): void => {
  localStorage.setItem(PODIO_REDIRECT_URI_KEY, redirectUri);
};

/**
 * Generates a random string for use as the Podio auth state.
 * @returns {string} The generated auth state.
 */
export const generatePodioAuthState = (): string => {
  const authState = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  localStorage.setItem(PODIO_AUTH_STATE_KEY, authState);
  return authState;
};

/**
 * Calls the Podio API with the given path and options.
 * @param {string} path - The API path to call.
 * @param {any} options - The options to pass to the API call.
 * @returns {Promise<any>} A promise that resolves with the API response or rejects with an error.
 */
export const callPodioApi = async (path: string, options: any): Promise<any> => {
  // Check if Podio is configured
  if (!isPodioConfigured()) {
    throw new Error('Podio is not configured. Please set up Podio API credentials first.');
  }
  
  // Check for rate limiting before making API call
  if (isRateLimited()) {
    throw new Error('Podio API rate limit exceeded. Please wait before making more requests.');
  }

  let accessToken = localStorage.getItem(PODIO_ACCESS_TOKEN_KEY);

  // Check if access token exists
  if (!accessToken) {
    throw new Error('No access token available. Please authenticate with Podio first.');
  }

  // Check if the token is expired and refresh if necessary
  if (!hasValidPodioTokens()) {
    try {
      await refreshPodioToken();
      accessToken = localStorage.getItem(PODIO_ACCESS_TOKEN_KEY);
    } catch (error: any) {
      throw new Error(error.message || 'Failed to refresh Podio token');
    }
  }

  podioClient = new PodioJS({
    client_id: getPodioClientId() || 'dummy',
    client_secret: getPodioClientSecret() || 'dummy'
  });

  podioClient.oauth.access_token = accessToken;

  try {
    const response = await podioClient.request(path, options);
    return response.json();
  } catch (error: any) {
    console.error(`Podio API call to ${path} failed:`, error);

    // Check if the error is due to rate limiting
    if (error.status === 400 && error.body && error.body.error === 'rate_limit') {
      setRateLimit(); // Set rate limit flag
      throw new Error('Podio API rate limit exceeded. Please wait before making more requests.');
    }
    
    // Check if the error is due to invalid grant (token expired)
    if (error.status === 400 && error.body && error.body.error === 'invalid_grant') {
      clearPodioTokens(); // Clear tokens to force re-authentication
      throw new Error('Your session has expired. Please log in again.');
    }

    throw new Error(error.message || `Podio API call to ${path} failed`);
  }
};

/**
 * Authenticates with Podio using client credentials.
 * @returns {Promise<any>} A promise that resolves with the authentication result or rejects with an error.
 */
export const authenticateWithClientCredentials = async (): Promise<any> => {
  const clientId = getPodioClientId();
  const clientSecret = getPodioClientSecret();

  podioClient = new PodioJS({
    client_id: clientId,
    client_secret: clientSecret
  });

  try {
    const authResult = await podioClient.auth.app(PODIO_CONTACTS_APP_ID, process.env.REACT_APP_PODIO_CONTACTS_APP_TOKEN);
    localStorage.setItem(PODIO_CONTACTS_APP_TOKEN_KEY, authResult.access_token);
    return authResult;
  } catch (error: any) {
    console.error('Podio client credentials authentication failed:', error);
    throw new Error(error.message || 'Podio client credentials authentication failed');
  }
};

/**
 * Authenticates with Podio using app token.
 * @param {number} appId - The ID of the Podio app.
 * @param {string} appToken - The token of the Podio app.
 * @returns {Promise<any>} A promise that resolves with the authentication result or rejects with an error.
 */
export const authenticateWithAppToken = async (appId: number, appToken: string): Promise<any> => {
  const clientId = getPodioClientId();
  const clientSecret = getPodioClientSecret();

  podioClient = new PodioJS({
    client_id: clientId,
    client_secret: clientSecret
  });

  try {
    const authResult = await podioClient.auth.app(appId, appToken);
    return authResult;
  } catch (error: any) {
    console.error('Podio app token authentication failed:', error);
    throw new Error(error.message || 'Podio app token authentication failed');
  }
};

/**
 * Authenticates with Podio using contacts app token.
 * @returns {Promise<any>} A promise that resolves with the authentication result or rejects with an error.
 */
export const authenticateWithContactsAppToken = async (): Promise<any> => {
  return authenticateWithAppToken(PODIO_CONTACTS_APP_ID, process.env.REACT_APP_PODIO_CONTACTS_APP_TOKEN || '');
};

/**
 * Authenticates with Podio using packing spec app token.
 * @returns {Promise<any>} A promise that resolves with the authentication result or rejects with an error.
 */
export const authenticateWithPackingSpecAppToken = async (): Promise<any> => {
  return authenticateWithAppToken(PODIO_PACKING_SPEC_APP_ID, process.env.REACT_APP_PODIO_PACKING_SPEC_APP_TOKEN || '');
};

/**
 * Retrieves the contacts app token from localStorage.
 * @returns {string | null} The contacts app token or null if not found.
 */
export const getContactsAppToken = (): string | null => {
  return localStorage.getItem(PODIO_CONTACTS_APP_TOKEN_KEY);
};

/**
 * Retrieves the packing spec app token from localStorage.
 * @returns {string | null} The packing spec app token or null if not found.
 */
export const getPackingSpecAppToken = (): string | null => {
  return localStorage.getItem(PODIO_PACKING_SPEC_APP_TOKEN_KEY);
};

/**
 * Validates access to the contacts app by checking if the app token is available.
 * @returns {boolean} True if access is valid, false otherwise.
 */
export const validateContactsAppAccess = (): boolean => {
  const contactsAppToken = getContactsAppToken();
  return !!contactsAppToken;
};

/**
 * Validates access to the packing spec app by checking if the app token is available.
 * @returns {boolean} True if access is valid, false otherwise.
 */
export const validatePackingSpecAppAccess = (): boolean => {
  const packingSpecAppToken = getPackingSpecAppToken();
  return !!packingSpecAppToken;
};

/**
 * Checks if the API is currently rate limited.
 * @returns {boolean} True if the API is rate limited, false otherwise.
 */
export const isRateLimited = (): boolean => {
  return localStorage.getItem(RATE_LIMIT_KEY) === 'true';
};

/**
 * Sets the rate limit flag in localStorage.
 */
export const setRateLimit = (): void => {
  localStorage.setItem(RATE_LIMIT_KEY, 'true');
  // Optionally, set a timestamp for when the rate limit expires
  const now = Date.now();
  const rateLimitDuration = 60 * 60 * 1000; // 1 hour
  localStorage.setItem(RATE_LIMIT_UNTIL_KEY, (now + rateLimitDuration).toString());
};

/**
 * Clears the rate limit flag from localStorage.
 */
export const clearRateLimit = (): void => {
  localStorage.removeItem(RATE_LIMIT_KEY);
};

/**
 * Authenticates with Podio using password flow (for development/testing purposes only).
 * @param {string} username - The Podio username.
 * @param {string} password - The Podio password.
 * @returns {Promise<any>} A promise that resolves with the authentication result or rejects with an error.
 */
export const authenticateWithPasswordFlow = async (username: string, password: string): Promise<any> => {
  const clientId = getPodioClientId();
  const clientSecret = getPodioClientSecret();

  podioClient = new PodioJS({
    client_id: clientId,
    client_secret: clientSecret
  });

  try {
    const authResult = await podioClient.auth.password(username, password);

    // Store tokens and expiry timestamp
    localStorage.setItem(PODIO_ACCESS_TOKEN_KEY, authResult.access_token);
    localStorage.setItem(PODIO_REFRESH_TOKEN_KEY, authResult.refresh_token);
    
    // Calculate and store the expiry timestamp (in milliseconds)
    const expiryTimestamp = Date.now() + (authResult.expires_in * 1000);
    localStorage.setItem(PODIO_EXPIRY_TIMESTAMP_KEY, expiryTimestamp.toString());

    return authResult;
  } catch (error: any) {
    console.error('Podio password authentication failed:', error);
    throw new Error(error.message || 'Podio password authentication failed');
  }
};

/**
 * Checks if the API is currently rate limited with more detailed info
 * @returns Object with isLimited status and limitUntil timestamp
 */
export function isRateLimitedWithInfo(): { isLimited: boolean; limitUntil: number } {
  const limitedUntil = localStorage.getItem(RATE_LIMIT_UNTIL_KEY);
  
  if (!limitedUntil) {
    return { isLimited: false, limitUntil: 0 };
  }
  
  const limitUntilTime = parseInt(limitedUntil, 10);
  const currentTime = Date.now();
  const isLimited = currentTime < limitUntilTime;
  
  return { 
    isLimited, 
    limitUntil: limitUntilTime 
  };
}

/**
 * Sets rate limit with exponential backoff
 * @param seconds Initial seconds to limit for
 */
export function setRateLimitWithBackoff(seconds: number = 60): void {
  const currentTime = Date.now();
  const currentBackoff = localStorage.getItem(RATE_LIMIT_BACKOFF_KEY);
  
  // Calculate new backoff time (doubles each time)
  let backoffMultiplier = 1;
  if (currentBackoff) {
    backoffMultiplier = Math.min(parseFloat(currentBackoff) * 2, 16); // Max 16x backoff
  }
  
  const limitDuration = seconds * 1000 * backoffMultiplier;
  const limitUntil = currentTime + limitDuration;
  
  localStorage.setItem(RATE_LIMIT_KEY, 'true');
  localStorage.setItem(RATE_LIMIT_UNTIL_KEY, limitUntil.toString());
  localStorage.setItem(RATE_LIMIT_BACKOFF_KEY, backoffMultiplier.toString());
  
  console.log(`Rate limit set for ${Math.round(limitDuration/1000)} seconds (${backoffMultiplier}x backoff)`);
}

/**
 * Clears rate limit information including backoff
 */
export function clearRateLimitInfo(): void {
  localStorage.removeItem(RATE_LIMIT_KEY);
  localStorage.removeItem(RATE_LIMIT_UNTIL_KEY);
  localStorage.removeItem(RATE_LIMIT_BACKOFF_KEY);
}

/**
 * Caches user data in localStorage.
 * @param {any} userData - The user data to cache.
 */
export const cacheUserData = (userData: any): void => {
  localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
};

/**
 * Retrieves cached user data from localStorage.
 * @returns {any | null} The cached user data or null if not found.
 */
export const getCachedUserData = (): any | null => {
  const userData = localStorage.getItem(USER_DATA_KEY);
  return userData ? JSON.parse(userData) : null;
};
