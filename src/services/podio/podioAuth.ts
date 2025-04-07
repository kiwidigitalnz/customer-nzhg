
// Core authentication service for Podio integration
import { getPodioClientId, getPodioClientSecret, getPodioRedirectUri } from './podioOAuth';
import { getFieldValueByExternalId } from './podioFieldHelpers';

// Constants
export const PODIO_CONTACTS_APP_ID = import.meta.env.VITE_PODIO_CONTACTS_APP_ID || '';
export const PODIO_PACKING_SPEC_APP_ID = import.meta.env.VITE_PODIO_PACKING_SPEC_APP_ID || '';

// App-specific tokens
const PODIO_CONTACTS_APP_TOKEN = import.meta.env.VITE_PODIO_CONTACTS_APP_TOKEN || '';
const PODIO_PACKING_SPEC_APP_TOKEN = import.meta.env.VITE_PODIO_PACKING_SPEC_APP_TOKEN || '';

// Contact field IDs for the Podio Contacts app
export const CONTACT_FIELD_IDS = {
  email: 233245358,
  name: 233245352,
  businessContactName: 233246154,
  phone: 233245357,
  address: 233245358,
  website: 233246156,
  logo: 271291962,
  logoUrl: 271291967,
  username: 271281606,
  password: 271280804
};

// Packing Spec field IDs for the Podio Packing Spec app
export const PACKING_SPEC_FIELD_IDS = {
  id: 265909594,
  approvalStatus: 265959138,
  productName: 265909621,
  customer: 265909622,
  productCode: 265909623,
  versionNumber: 265909624,
  updatedBy: 265959736,
  dateReviewed: 265959737,
  umfMgo: 265958814,
  honeyType: 265958813,
  allergenType: 266035765,
  ingredientType: 266035766,
  customerRequirements: 265951759,
  countryOfEligibility: 265951757,
  otherMarkets: 265951758,
  testingRequirements: 265951761,
  regulatoryRequirements: 265951760,
  jarColor: 265952439,
  jarMaterial: 265952440,
  jarShape: 265952442,
  jarSize: 265952441,
  lidSize: 265954653,
  lidColor: 265954652,
  onTheGoPackaging: 266035012,
  pouchSize: 266035907,
  sealInstructions: 265959436,
  shipperSize: 265957893,
  customisedCartonType: 266035908,
  labelCode: 265958873,
  labelSpecification: 265959137,
  label: 265951584,
  labelLink: 267537366,
  printingInfoLocation: 265958021,
  printingColor: 265960110,
  printingInfoRequired: 265909779,
  requiredBestBeforeDate: 265909780,
  dateFormatting: 265951583,
  shipperSticker: 265957894,
  numShipperStickers: 267533778,
  palletType: 265958228,
  cartonsPerLayer: 265958229,
  layersPerPallet: 265958230,
  palletSpecs: 265958640,
  palletDocuments: 265958841,
  customerApprovalStatus: 266244157,
  customerRequestedChanges: 266244158,
  approvedByName: 265959428,
  approvalDate: 266244156,
  signature: 265959139,
  emailForApproval: 265959429,
  action: 265959430,
  updatedBy2: 271320234
};

// Token management
const TOKEN_STORAGE_KEY = 'podio_access_token';
const REFRESH_TOKEN_STORAGE_KEY = 'podio_refresh_token';
const TOKEN_EXPIRY_KEY = 'podio_token_expiry';
const USER_DATA_KEY = 'podio_user_data';

// Rate limiting management
const RATE_LIMIT_KEY = 'podio_rate_limited';
const RATE_LIMIT_UNTIL_KEY = 'podio_rate_limited_until';
const RATE_LIMIT_ENDPOINT_KEY = 'podio_rate_limited_endpoint';
const RATE_LIMIT_DURATION = 10 * 60 * 1000;

// Clear auth tokens from localStorage
export const clearTokens = (): void => {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
  localStorage.removeItem(USER_DATA_KEY);
};

// Check if Podio API is configured
export const isPodioConfigured = (): boolean => {
  const clientId = getPodioClientId();
  const clientSecret = getPodioClientSecret();
  return Boolean(clientId && clientSecret);
};

// Check if we have valid tokens
export const hasValidTokens = (): boolean => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  
  if (!token || !expiry) {
    return false;
  }
  
  // Check if token has expired
  const expiryTime = parseInt(expiry, 10);
  const now = Date.now();
  
  return expiryTime > now;
};

// Refresh the access token using the refresh token
export const refreshPodioToken = async (): Promise<boolean> => {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
  
  if (!refreshToken) {
    console.error('No refresh token available');
    return false;
  }
  
  try {
    const clientId = getPodioClientId();
    const clientSecret = getPodioClientSecret();
    
    const response = await fetch('https://podio.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        'grant_type': 'refresh_token',
        'client_id': clientId,
        'client_secret': clientSecret,
        'refresh_token': refreshToken
      })
    });
    
    if (!response.ok) {
      // If refresh fails, clear tokens and return false
      const errorData = await response.json();
      console.error('Token refresh failed:', errorData);
      clearTokens();
      return false;
    }
    
    const data = await response.json();
    
    // Store the new tokens
    localStorage.setItem(TOKEN_STORAGE_KEY, data.access_token);
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, data.refresh_token);
    
    // Calculate token expiry time (subtract 5 minutes for safety)
    const expiresIn = data.expires_in * 1000; // Convert to milliseconds
    const expiryTime = Date.now() + expiresIn - (5 * 60 * 1000);
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
    
    return true;
  } catch (error) {
    console.error('Failed to refresh token:', error);
    return false;
  }
};

// Authenticate with client credentials (server-to-server)
export const authenticateWithClientCredentials = async (): Promise<boolean> => {
  try {
    const clientId = getPodioClientId();
    const clientSecret = getPodioClientSecret();
    
    if (!clientId || !clientSecret) {
      console.error('Missing client credentials');
      return false;
    }
    
    // Modified request body - removed the 'scope' parameter as Podio indicates it's not supported
    const response = await fetch('https://podio.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        'grant_type': 'client_credentials',
        'client_id': clientId,
        'client_secret': clientSecret
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Client credentials authentication failed:', errorData);
      return false;
    }
    
    const data = await response.json();
    
    // Store the tokens
    localStorage.setItem(TOKEN_STORAGE_KEY, data.access_token);
    // Client credentials flow doesn't provide a refresh token
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    
    // Calculate token expiry time (subtract 5 minutes for safety)
    const expiresIn = data.expires_in * 1000; // Convert to milliseconds
    const expiryTime = Date.now() + expiresIn - (5 * 60 * 1000);
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
    
    return true;
  } catch (error) {
    console.error('Failed to authenticate with client credentials:', error);
    return false;
  }
};

// Authenticate a user with username/password
export const authenticateUser = async (username: string, password: string): Promise<any> => {
  try {
    // Ensure app authentication is done first
    if (!hasValidTokens()) {
      const appAuthSuccess = await authenticateWithClientCredentials();
      if (!appAuthSuccess) {
        throw new Error('Could not authenticate the application with Podio');
      }
    }
    
    // Use app token to search for the user by username
    const userResponse = await callPodioApi(
      `/item/app/${PODIO_CONTACTS_APP_ID}/filter/`, 
      {
        method: 'POST',
        body: JSON.stringify({
          filters: {
            [CONTACT_FIELD_IDS.username]: { "from": username, "to": username }
          }
        })
      },
      PODIO_CONTACTS_APP_TOKEN
    );
    
    if (!userResponse.items || userResponse.items.length === 0) {
      throw new Error('User not found');
    }
    
    const userItem = userResponse.items[0];
    
    // Extract stored password hash from Podio
    const storedPasswordValue = getFieldValueByExternalId(
      userItem, 
      'password'
    );
    
    if (!storedPasswordValue) {
      throw new Error('Invalid password field');
    }
    
    // In a real implementation, you would use bcrypt.compare here
    // For this stub, we'll just check if passwords match directly
    // In production, this should use proper password comparison
    if (storedPasswordValue !== password) {
      throw new Error('Invalid password');
    }
    
    // Get user data
    const userData = {
      id: userItem.item_id,
      name: getFieldValueByExternalId(userItem, 'name'),
      email: getFieldValueByExternalId(userItem, 'email'),
      username: getFieldValueByExternalId(userItem, 'username'),
      logoUrl: getFieldValueByExternalId(userItem, 'logo-url')
    };
    
    // Store user data in localStorage
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
    
    return userData;
  } catch (error) {
    console.error('Authentication error:', error);
    throw error;
  }
};

// Validate access to the Contacts app
export const validateContactsAppAccess = async (): Promise<boolean> => {
  try {
    // Ensure we have valid tokens
    if (!hasValidTokens()) {
      const success = await authenticateWithClientCredentials();
      if (!success) {
        return false;
      }
    }
    
    // Try to fetch a single item from the Contacts app
    const response = await callPodioApi(
      `/item/app/${PODIO_CONTACTS_APP_ID}/filter/`,
      { 
        method: 'POST',
        body: JSON.stringify({
          limit: 1
        })
      },
      PODIO_CONTACTS_APP_TOKEN
    );
    
    return Boolean(response && !response.error);
  } catch (error) {
    console.error('Failed to validate Contacts app access:', error);
    return false;
  }
};

// Generic function to call the Podio API
export const callPodioApi = async (endpoint: string, options: RequestInit = {}, appToken?: string): Promise<any> => {
  // Check for rate limiting
  if (isRateLimited()) {
    throw new Error('Rate limit reached. Please try again later.');
  }
  
  try {
    // Check if we have valid tokens, if not, try to refresh
    if (!hasValidTokens()) {
      const refreshSuccess = await refreshPodioToken();
      if (!refreshSuccess) {
        // If refresh fails, try client credentials auth
        const authSuccess = await authenticateWithClientCredentials();
        if (!authSuccess) {
          throw new Error('Authentication failed');
        }
      }
    }
    
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    
    // Set up request headers
    const headers = new Headers({
      'Authorization': `OAuth2 ${token}`,
      'Content-Type': 'application/json'
    });
    
    // Add app token if provided
    if (appToken) {
      headers.append('X-PODIO-APP', appToken);
    }
    
    // Combine default options with provided options
    const requestOptions = {
      ...options,
      headers: {
        ...Object.fromEntries(headers.entries()),
        ...options.headers
      }
    };
    
    // Make the API call
    const response = await fetch(`https://api.podio.com${endpoint}`, requestOptions);
    
    // Handle rate limiting
    if (response.status === 429) {
      // Set rate limit
      setRateLimit(endpoint);
      throw new Error('Rate limit reached. Please try again later.');
    }
    
    // Handle authentication errors
    if (response.status === 401 || response.status === 403) {
      // Try to refresh the token once
      const refreshSuccess = await refreshPodioToken();
      if (refreshSuccess) {
        // Retry the request with the new token
        return callPodioApi(endpoint, options, appToken);
      } else {
        if (response.status === 401) {
          clearTokens();
          throw new Error('Authentication failed. Please log in again.');
        } else {
          throw new Error('Access denied. You do not have permission to access this resource.');
        }
      }
    }
    
    // Handle other error responses
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Podio API error:', errorData);
      throw new Error(errorData.error_description || 'Podio API error');
    }
    
    // Parse and return response
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Podio API call failed:', error);
    throw error;
  }
};

// Rate limiting functions
export const isRateLimited = (): boolean => {
  const rateLimited = localStorage.getItem(RATE_LIMIT_KEY);
  if (!rateLimited) return false;
  
  const limitUntil = localStorage.getItem(RATE_LIMIT_UNTIL_KEY);
  if (!limitUntil) return false;
  
  const limitTime = parseInt(limitUntil, 10);
  return limitTime > Date.now();
};

export const isRateLimitedWithInfo = (): { isLimited: boolean; limitUntil: number; lastEndpoint: string | null } => {
  const rateLimited = localStorage.getItem(RATE_LIMIT_KEY);
  const limitUntil = localStorage.getItem(RATE_LIMIT_UNTIL_KEY);
  const lastEndpoint = localStorage.getItem(RATE_LIMIT_ENDPOINT_KEY);
  
  if (!rateLimited || !limitUntil) {
    return {
      isLimited: false,
      limitUntil: 0,
      lastEndpoint: null
    };
  }
  
  const limitTime = parseInt(limitUntil, 10);
  return {
    isLimited: limitTime > Date.now(),
    limitUntil: limitTime,
    lastEndpoint: lastEndpoint
  };
};

export const setRateLimit = (endpoint?: string): void => {
  const now = Date.now();
  const limitUntil = now + RATE_LIMIT_DURATION;
  
  localStorage.setItem(RATE_LIMIT_KEY, 'true');
  localStorage.setItem(RATE_LIMIT_UNTIL_KEY, limitUntil.toString());
  
  if (endpoint) {
    localStorage.setItem(RATE_LIMIT_ENDPOINT_KEY, endpoint);
  }
};

export const clearRateLimit = (): void => {
  localStorage.removeItem(RATE_LIMIT_KEY);
  localStorage.removeItem(RATE_LIMIT_UNTIL_KEY);
};

export const clearRateLimitInfo = (): void => {
  clearRateLimit();
  localStorage.removeItem(RATE_LIMIT_ENDPOINT_KEY);
};

// User data caching
export const cacheUserData = (key: string, data: any): void => {
  try {
    localStorage.setItem(`podio_cache_${key}`, JSON.stringify(data));
    localStorage.setItem(`podio_cache_${key}_timestamp`, Date.now().toString());
  } catch (error) {
    console.error('Failed to cache user data:', error);
  }
};

export const getCachedUserData = (key: string): any => {
  try {
    const cachedData = localStorage.getItem(`podio_cache_${key}`);
    if (!cachedData) return null;
    
    return JSON.parse(cachedData);
  } catch (error) {
    console.error('Failed to get cached user data:', error);
    return null;
  }
};
