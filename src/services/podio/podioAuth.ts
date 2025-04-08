// Core authentication service for Podio integration
import { getFieldValueByExternalId } from './podioFieldHelpers';
import { supabase } from '@/integrations/supabase/client';

// Constants
export const PODIO_CONTACTS_APP_ID = '26969025';
export const PODIO_PACKING_SPEC_APP_ID = '29797638';

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
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
  localStorage.removeItem(USER_DATA_KEY);
};

// Check if Podio API is configured - we're now assuming Supabase is configured correctly
// since we're using edge functions for all API calls
export const isPodioConfigured = (): boolean => {
  return true; // We're using Supabase edge functions now, so this is always true
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

// Call the Supabase Edge Function to refresh the token
export const refreshPodioToken = async (): Promise<boolean> => {
  try {
    console.log('Refreshing Podio token via OAuth flow');
    const { data, error } = await supabase.functions.invoke('podio-token-refresh', {
      method: 'POST'
    });
    
    if (error) {
      console.error('Token refresh failed:', error);
      clearTokens();
      return false;
    }
    
    if (!data || !data.access_token) {
      console.error('Token refresh did not return a valid token');
      return false;
    }
    
    // Store the new access token with proper expiry handling
    localStorage.setItem(TOKEN_STORAGE_KEY, data.access_token);
    
    // Use the enhanced response to set accurate expiry time
    // But still subtract 5 minutes as a safety buffer
    if (data.expires_at) {
      const expiryTime = new Date(data.expires_at).getTime() - (5 * 60 * 1000);
      localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
    }
    
    console.log('Token refreshed successfully');
    return true;
  } catch (error) {
    console.error('Failed to refresh token:', error);
    return false;
  }
};

// Authenticate with client credentials via Edge Function
export const authenticateWithClientCredentials = async (): Promise<boolean> => {
  try {
    console.log('Getting Podio OAuth token from our database');
    const { data, error } = await supabase.functions.invoke('podio-token-refresh', {
      method: 'POST'
    });
    
    if (error) {
      console.error('OAuth token refresh failed:', error);
      return false;
    }
    
    if (!data || !data.access_token) {
      console.error('No valid Podio OAuth token found');
      return false;
    }
    
    // Store the access token with proper expiry handling
    localStorage.setItem(TOKEN_STORAGE_KEY, data.access_token);
    
    // Use the enhanced response to set accurate expiry time
    // But still subtract 5 minutes as a safety buffer
    if (data.expires_at) {
      const expiryTime = new Date(data.expires_at).getTime() - (5 * 60 * 1000);
      localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
    }
    
    console.log('Successfully retrieved Podio OAuth token');
    return true;
  } catch (error) {
    console.error('Failed to get Podio OAuth token:', error);
    return false;
  }
};

// Authenticate a user with username/password
export const authenticateUser = async (username: string, password: string): Promise<any> => {
  try {
    console.log(`Authenticating user: ${username}`);
    // Call the Edge Function to authenticate the user
    const { data, error } = await supabase.functions.invoke('podio-user-auth', {
      method: 'POST',
      body: {
        username,
        password
      }
    });
    
    if (error) {
      console.error('User authentication failed:', error);
      throw new Error(error.message || 'Authentication failed');
    }
    
    // Store access token from user auth
    if (data.access_token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, data.access_token);
      
      // Calculate token expiry time (subtract 5 minutes for safety)
      if (data.expires_at) {
        const expiryTime = new Date(data.expires_at).getTime() - (5 * 60 * 1000);
        localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
      }
    }
    
    // Store user data in localStorage
    const userData = {
      id: data.id,
      name: data.name,
      email: data.email,
      username: data.username,
      logoUrl: data.logoUrl
    };
    
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
    console.log('User authenticated successfully');
    
    return userData;
  } catch (error) {
    console.error('Authentication error:', error);
    throw error;
  }
};

// Validate access to the Contacts app
export const validateContactsAppAccess = async (): Promise<boolean> => {
  try {
    console.log(`Validating access to Contacts app: ${PODIO_CONTACTS_APP_ID}`);
    // Use the Edge Function to validate app access
    const { data, error } = await supabase.functions.invoke('podio-validate-access', {
      method: 'POST',
      body: {
        app_id: PODIO_CONTACTS_APP_ID
      }
    });
    
    if (error) {
      console.error('Failed to validate Contacts app access:', error);
      return false;
    }
    
    console.log(`Access validation result:`, data);
    return data.hasAccess || false;
  } catch (error) {
    console.error('Failed to validate Contacts app access:', error);
    return false;
  }
};

// Generic function to call the Podio API via Edge Function
export const callPodioApi = async (endpoint: string, options: RequestInit = {}, appToken?: string): Promise<any> => {
  // Check for rate limiting
  if (isRateLimited()) {
    throw new Error('Rate limit reached. Please try again later.');
  }
  
  try {
    // Prepare the request payload
    const payload = {
      endpoint,
      options: {
        method: options.method || 'GET',
        body: options.body, // This will be stringified again in the Edge Function
        appToken
      }
    };
    
    // Call the Edge Function
    const response = await supabase.functions.invoke('podio-proxy', {
      method: 'POST',
      body: payload
    });
    
    const { data, error } = response;
    
    // Handle rate limiting - check for 429 in error or message
    if (error && (error.message?.includes('429') || response.error?.status === 429)) {
      setRateLimit(endpoint);
      throw new Error('Rate limit reached. Please try again later.');
    }
    
    // Handle other error responses
    if (error) {
      console.error('Podio API error:', error);
      
      // Handle authentication errors
      if (error.message?.includes('401') || error.message?.includes('403')) {
        if (error.message?.includes('401')) {
          clearTokens();
          throw new Error('Authentication failed. Please log in again.');
        } else {
          throw new Error('Access denied. You do not have permission to access this resource.');
        }
      }
      
      throw new Error(error.message || 'Podio API error');
    }
    
    // Return data
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
