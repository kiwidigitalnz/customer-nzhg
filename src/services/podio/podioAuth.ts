
// Core authentication service for Podio integration
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

// Rate limiting management
const RATE_LIMIT_KEY = 'podio_rate_limited';
const RATE_LIMIT_UNTIL_KEY = 'podio_rate_limited_until';
const RATE_LIMIT_ENDPOINT_KEY = 'podio_rate_limited_endpoint';
const RATE_LIMIT_DURATION = 10 * 60 * 1000;

// Clear auth tokens and sensitive data
export const clearTokens = (): void => {
  // Remove all Podio-related data from localStorage
  const keysToRemove = Object.keys(localStorage).filter(key => 
    key.startsWith('podio_') || 
    key.includes('token') || 
    key.includes('auth')
  );
  
  keysToRemove.forEach(key => localStorage.removeItem(key));
  localStorage.removeItem('podio_user_data');
};

// Check if Podio API is configured - always true since we're using edge functions
export const isPodioConfigured = (): boolean => {
  return true;
};

// Server-side token refresh via Supabase Edge Function
export const refreshPodioToken = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('podio-token-refresh', {
      method: 'POST'
    });
    
    if (error || !data || !data.access_token) {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
};

// Authenticate a user with username/password
export const authenticateUser = async (username: string, password: string): Promise<any> => {
  if (!username || !password) {
    throw new Error('Username and password are required');
  }

  try {
    // Call the Edge Function to find the user in the Contacts app
    const { data, error } = await supabase.functions.invoke('podio-user-auth', {
      method: 'POST',
      body: {
        username,
        password
      }
    });
    
    if (error) {
      throw new Error(error.message || 'Authentication failed');
    }
    
    if (!data) {
      throw new Error('Empty response from authentication service');
    }
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    return data;
  } catch (error) {
    throw error;
  }
};

// Generic function to call the Podio API via Edge Function
export const callPodioApi = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
  // Check for rate limiting
  if (isRateLimited()) {
    throw new Error('Rate limit reached. Please try again later.');
  }
  
  try {
    // Normalize endpoint (ensure it starts with a slash)
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    // Prepare the request payload
    const payload = {
      endpoint: normalizedEndpoint,
      options: {
        method: options.method || 'GET',
        body: options.body
      }
    };
    
    // Call the Edge Function
    const response = await supabase.functions.invoke('podio-proxy', {
      method: 'POST',
      body: payload
    });
    
    const { data, error } = response;
    
    // Enhanced error handling with detailed logging
    if (error) {
      // Handle rate limiting - check for 429 in error or message
      if (error.message?.includes('429') || response.error?.status === 429) {
        setRateLimit(endpoint);
        throw new Error('Rate limit reached. Please try again later.');
      }
      
      throw new Error(error.message || 'Podio API error');
    }
    
    // Return data
    return data;
  } catch (error) {
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

// User data caching with expiration
export const cacheUserData = (key: string, data: any): void => {
  try {
    const cacheItem = {
      data,
      timestamp: Date.now(),
      expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hour expiration
    };
    
    localStorage.setItem(`podio_cache_${key}`, JSON.stringify(cacheItem));
  } catch (error) {
    // Silent catch in production
  }
};

export const getCachedUserData = (key: string): any => {
  try {
    const cachedItem = localStorage.getItem(`podio_cache_${key}`);
    if (!cachedItem) return null;
    
    const { data, expires } = JSON.parse(cachedItem);
    
    // Check if cache has expired
    if (expires < Date.now()) {
      localStorage.removeItem(`podio_cache_${key}`);
      return null;
    }
    
    return data;
  } catch (error) {
    return null;
  }
};

// Simplified authorization check functions for client side
export const authenticateWithClientCredentials = async (): Promise<boolean> => {
  return true; // Simplified since we're relying on server-side auth
};

export const validateContactsAppAccess = async (): Promise<boolean> => {
  return true; // Simplified since we're relying on server-side auth
};
