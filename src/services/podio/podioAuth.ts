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

// Last successful token refresh time
let lastTokenRefresh = 0;
// How often to check token (every 10 minutes)
const TOKEN_CHECK_INTERVAL = 10 * 60 * 1000;
// Refresh token if it expires within this time (2 hours)
const TOKEN_REFRESH_BUFFER = 2 * 60 * 60 * 1000;

// Track active token refresh to prevent multiple concurrent attempts
let tokenRefreshInProgress = false;
let tokenRefreshPromise: Promise<boolean> | null = null;

// Retry limitations for authentication
const MAX_AUTH_RETRIES = 3;
const MAX_TOKEN_RETRIES = 2;
const RETRY_BACKOFF_MS = 1000; // Start with 1 second, will be multiplied

// Counter for tracking retry attempts
let authRetryCount = 0;
let tokenRetryCount = 0;
let lastAuthRetryTime = 0;
let connectionErrorDetected = false;

// Global typings needed for global variable
declare global {
  interface Window {
    podioTokenRefreshInterval: number | null;
  }
}

// Enhanced error interface
export interface PodioAuthError {
  status?: number;
  message: string;
  details?: any;
  retry?: boolean;
  networkError?: boolean;
  edge?: boolean;
  data?: any; // Add data field to capture additional error information
}

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
  
  // Reset retry counters
  authRetryCount = 0;
  tokenRetryCount = 0;
  lastAuthRetryTime = 0;
  connectionErrorDetected = false;
};

// Check if Podio API is configured - always true since we're using edge functions
export const isPodioConfigured = (): boolean => {
  return true;
};

// Server-side token refresh via Supabase Edge Function with optimized refresh logic
export const refreshPodioToken = async (): Promise<boolean> => {
  // First, check if we've exceeded the maximum retry attempts
  if (tokenRetryCount >= MAX_TOKEN_RETRIES) {
    console.warn(`Token refresh maximum retries (${MAX_TOKEN_RETRIES}) reached. Waiting for user action.`);
    return false;
  }
  
  // If refresh already in progress, wait for that instead of starting a new one
  if (tokenRefreshInProgress && tokenRefreshPromise) {
    return tokenRefreshPromise;
  }
  
  // Check if we've refreshed recently to reduce unnecessary API calls
  const now = Date.now();
  if (now - lastTokenRefresh < TOKEN_CHECK_INTERVAL) {
    // Get cached expiry time
    const tokenExpiry = localStorage.getItem('podio_token_expiry');
    // If we have a valid non-expiring token, skip refresh
    if (tokenExpiry && parseInt(tokenExpiry, 10) > now + TOKEN_REFRESH_BUFFER) {
      // Reset retry count on successful check
      tokenRetryCount = 0;
      return true;
    }
  }
  
  tokenRefreshInProgress = true;
  tokenRefreshPromise = (async () => {
    try {
      // Increment retry counter
      tokenRetryCount++;
      
      // Apply exponential backoff if this is a retry
      if (tokenRetryCount > 1) {
        const backoffTime = RETRY_BACKOFF_MS * Math.pow(2, tokenRetryCount - 1);
        console.log(`Token refresh retry ${tokenRetryCount}/${MAX_TOKEN_RETRIES}. Waiting ${backoffTime}ms before retry.`);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
      }
      
      console.log('Attempting token refresh via edge function...');
      const { data, error } = await supabase.functions.invoke('podio-token-refresh', {
        method: 'POST'
      });
      
      if (error) {
        console.error('Token refresh error:', error);
        
        // Check for specific error cases in the response data
        if (error.message && error.message.includes('Edge Function returned a non-2xx status code') && error.data) {
          const errorData = error.data;
          
        // Check if this is a configuration issue needing setup
        if (errorData.needs_setup || errorData.needs_reauth) {
          console.log('Token refresh failed - reauth needed:', errorData.error);
          // Clear stored tokens and reset counters to prevent retry loops
          localStorage.removeItem('podio_token_expiry');
          localStorage.removeItem('podio_user_data'); // Also clear user data to force reauth
          tokenRetryCount = MAX_TOKEN_RETRIES; // Prevent further retries
          // Signal to the UI that reauthorization is needed
          window.dispatchEvent(new CustomEvent('podio-reauth-needed'));
          return false;
        }
          
          // Log detailed error information for debugging
          console.error('Token refresh specific error:', errorData);
        }
        
        // Handle specific error case where reauthorization is needed
        if (error.message && error.message.includes('needs_reauth')) {
          console.log('Token refresh failed - reauth needed from error message');
          // Clear stored tokens and reset counters to prevent retry loops
          localStorage.removeItem('podio_token_expiry');
          localStorage.removeItem('podio_user_data'); // Also clear user data to force reauth
          tokenRetryCount = MAX_TOKEN_RETRIES; // Prevent further retries
          // Signal to the UI that reauthorization is needed
          window.dispatchEvent(new CustomEvent('podio-reauth-needed'));
          return false;
        }
        
        // If we haven't reached max retries, we'll try again next time
        // the retry count stays incremented
        return false;
      }
      
      if (!data) {
        console.error('Invalid token response: no data');
        return false;
      }
      
      // Handle new response structure with success field
      if (data.hasOwnProperty('success') && data.success === false) {
        console.error('Token refresh failed:', data.error);
        
    // Check if this is a configuration issue needing setup
    if (data.needs_setup || data.needs_reauth) {
      console.log('Token refresh failed - reauth needed:', data.error);
      // Clear stored tokens and reset counters to prevent retry loops
      localStorage.removeItem('podio_token_expiry');
      localStorage.removeItem('podio_user_data'); // Also clear user data to force reauth
      tokenRetryCount = MAX_TOKEN_RETRIES; // Prevent further retries
      // Signal to the UI that reauthorization is needed
      window.dispatchEvent(new CustomEvent('podio-reauth-needed'));
      return false;
    }
        
        return false;
      }
      
      // Check if we have an access token (for both new and old structures)
      if (!data.access_token) {
        console.error('Invalid token response: no access_token');
        return false;
      }
      
      // Store token expiry in localStorage for client-side checks
      if (data.expires_at) {
        const expiryTime = new Date(data.expires_at).getTime();
        localStorage.setItem('podio_token_expiry', expiryTime.toString());
      }
      
      // Update last refresh time
      lastTokenRefresh = now;
      
      // Reset retry counter on success
      tokenRetryCount = 0;
      
      return true;
    } catch (error) {
      console.error('Unexpected error refreshing token:', error);
      return false;
    } finally {
      tokenRefreshInProgress = false;
      tokenRefreshPromise = null;
    }
  })();
  
  return tokenRefreshPromise;
};

// Setup automatic token refresh interval
export const setupTokenRefreshInterval = (): void => {
  // Skip setup for auth/setup pages to prevent infinite loops
  const currentPath = window.location.pathname;
  if (isAuthOrSetupPage(currentPath)) {
    console.log('Skipping token refresh setup on auth/setup page:', currentPath);
    return;
  }
  
  // Check if user is authenticated before starting refresh
  const storedUser = localStorage.getItem('podio_user_data');
  if (!storedUser) {
    console.log('No authenticated user found, skipping token refresh setup');
    return;
  }
  
  // Initial token check
  refreshPodioToken();
  
  // Set up interval to check token every 30 minutes
  const intervalId = window.setInterval(async () => {
    await refreshPodioToken();
  }, 30 * 60 * 1000); // 30 minutes
  
  // Store interval ID for cleanup
  window.podioTokenRefreshInterval = intervalId;
  
  // Listen for visibility changes to refresh when tab becomes visible
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      refreshPodioToken();
    }
  });
};

// Cleanup token refresh interval
export const cleanupTokenRefreshInterval = (): void => {
  if (window.podioTokenRefreshInterval) {
    clearInterval(window.podioTokenRefreshInterval);
    window.podioTokenRefreshInterval = null;
  }
};

// Reset connection error state
export const resetConnectionError = (): void => {
  connectionErrorDetected = false;
  authRetryCount = 0;
  tokenRetryCount = 0;
};

// Check if we're in a connection error state
export const isInConnectionErrorState = (): boolean => {
  return connectionErrorDetected;
};

// Get current retry counts for debugging
export const getRetryStatus = (): { authRetries: number, tokenRetries: number, maxAuthRetries: number, maxTokenRetries: number } => {
  return {
    authRetries: authRetryCount,
    tokenRetries: tokenRetryCount,
    maxAuthRetries: MAX_AUTH_RETRIES,
    maxTokenRetries: MAX_TOKEN_RETRIES
  };
};

// Authenticate a user with username/password
export const authenticateUser = async (username: string, password: string): Promise<any> => {
  if (!username || !password) {
    throw new Error('Username and password are required');
  }

  // Check if we've exceeded maximum retries
  const now = Date.now();
  if (authRetryCount >= MAX_AUTH_RETRIES) {
    // Only retry if sufficient time has passed (30 seconds) since the last retry
    if (now - lastAuthRetryTime < 30000) {
      connectionErrorDetected = true;
      throw {
        status: 429,
        message: `Maximum login attempts reached (${MAX_AUTH_RETRIES}). Please try again later.`,
        retry: false
      } as PodioAuthError;
    } else {
      // Reset counter if enough time has passed
      console.log('Resetting auth retry counter after timeout');
      authRetryCount = 0;
    }
  }

  try {
    // Update retry tracking
    authRetryCount++;
    lastAuthRetryTime = now;
    
    // Apply exponential backoff if this is a retry
    if (authRetryCount > 1) {
      const backoffTime = RETRY_BACKOFF_MS * Math.pow(2, authRetryCount - 1);
      console.log(`Auth retry ${authRetryCount}/${MAX_AUTH_RETRIES}. Waiting ${backoffTime}ms before retry.`);
      await new Promise(resolve => setTimeout(resolve, backoffTime));
    }

    // Call the Edge Function to find the user in the Contacts app
    const response = await supabase.functions.invoke('podio-user-auth', {
      method: 'POST',
      body: {
        username,
        password
      }
    });
    
    const { data, error } = response;
    
    // Enhanced error handling - handle both new structure (with success field) and old structure
    if (error) {
      console.error('Authentication error from edge function:', error);
      console.error('Raw response data:', response.data);
      
      // Set connection error state if this is a network error
      if (error.message && 
          (error.message.includes('network') || 
           error.message.includes('failed to fetch') || 
           error.status === 0)) {
        connectionErrorDetected = true;
      }
      
      // Enhanced edge function error extraction
      let edgeErrorDetails = null;
      
      // For edge function errors, the actual error details are often in response.data
      // even when there's an error object
      if (response.data && typeof response.data === 'object') {
        edgeErrorDetails = response.data;
        console.log('Extracted edge error details from response.data:', edgeErrorDetails);
      } else if (error.data && typeof error.data === 'object') {
        edgeErrorDetails = error.data;
        console.log('Extracted edge error details from error.data:', edgeErrorDetails);
      }
      
      // If we have detailed edge error information, use it
      if (edgeErrorDetails && (edgeErrorDetails.error || edgeErrorDetails.message)) {
        const errorObj: PodioAuthError = {
          status: edgeErrorDetails.status || error.status || 500,
          message: edgeErrorDetails.error || edgeErrorDetails.message || error.message,
          details: edgeErrorDetails.details || null,
          edge: true,
          data: edgeErrorDetails,
          retry: authRetryCount < MAX_AUTH_RETRIES && 
                !(edgeErrorDetails.status === 401 || edgeErrorDetails.status === 404) // Don't retry auth errors
        };
        
        // Special handling for setup/reauth errors
        if (edgeErrorDetails.needs_setup) {
          errorObj.message = 'Podio integration requires setup. Please contact admin.';
          errorObj.retry = false;
        } else if (edgeErrorDetails.needs_reauth) {
          errorObj.message = 'Authentication session has expired. Please log in again.';
          errorObj.retry = false;
        }
        
        throw errorObj;
      } else {
        // Fallback to generic error handling
        throw {
          status: error.status || 500,
          message: error.message || 'Authentication failed',
          edge: true,
          data: error.data,
          retry: authRetryCount < MAX_AUTH_RETRIES
        } as PodioAuthError;
      }
    }
    
    if (!data) {
      throw new Error('Empty response from authentication service');
    }
    
    // Handle new response structure with success field
    if (data.hasOwnProperty('success') && data.success === false) {
      // New structure: success=false indicates error
      throw {
        status: data.status || 401,
        message: data.error || 'Authentication failed',
        details: data.details || null,
        data: data,
        retry: authRetryCount < MAX_AUTH_RETRIES && 
               data.status !== 401 && // Don't retry invalid credentials
               data.status !== 404    // Don't retry user not found
      } as PodioAuthError;
    }
    
    // Handle legacy response structure
    if (data.error) {
      // Old structure: error field indicates error
      throw {
        status: data.status || 401,
        message: data.error || 'Authentication failed',
        details: data.details || null,
        data: data,
        retry: authRetryCount < MAX_AUTH_RETRIES && 
               data.status !== 401 && // Don't retry invalid credentials
               data.status !== 404    // Don't retry user not found
      } as PodioAuthError;
    }
    
    // Reset retry counters on success
    authRetryCount = 0;
    connectionErrorDetected = false;
    
    // If authentication successful, ensure token refresh is set up
    setupTokenRefreshInterval();
    
    return data;
  } catch (error) {
    // Log the error for debugging
    console.error('Error during authentication:', error);
    
    // Format fetch errors better
    if (error instanceof Error && error.name === 'TypeError' && error.message.includes('fetch')) {
      connectionErrorDetected = true;
      throw {
        status: 0,
        message: 'Network error: Unable to reach authentication service',
        networkError: true,
        retry: authRetryCount < MAX_AUTH_RETRIES
      } as PodioAuthError;
    }
    
    // Ensure error is properly formatted before rethrowing
    if (typeof error === 'object' && !(error as PodioAuthError).status) {
      const formattedError: PodioAuthError = {
        status: 500,
        message: error instanceof Error ? error.message : 'Unknown authentication error',
        retry: authRetryCount < MAX_AUTH_RETRIES
      };
      throw formattedError;
    }
    
    // Rethrow the error for the calling code to handle
    throw error;
  }
};

// Generic function to call the Podio API via Edge Function with OAuth2 headers
export const callPodioApi = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
  // Check for rate limiting
  if (isRateLimited()) {
    throw new Error('Rate limit reached. Please try again later.');
  }
  
  // Ensure we have a valid token before proceeding
  const tokenValid = await refreshPodioToken();
  if (!tokenValid) {
    throw new Error('Failed to obtain valid Podio token. Please reauthenticate.');
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
      
      // If unauthorized (token expired), try refreshing token once and retry
      if (error.message?.includes('401') || response.error?.status === 401) {
        // Force token refresh
        const refreshed = await refreshPodioToken();
        
        if (refreshed) {
          // Retry the API call with fresh token
          return callPodioApi(endpoint, options);
        } else {
          throw new Error('Authentication failed. Please log in again.');
        }
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
  return refreshPodioToken();
};

export const validateContactsAppAccess = async (): Promise<boolean> => {
  try {
    // Try to make a simple request to the Contacts app to verify access
    await callPodioApi(`/app/${PODIO_CONTACTS_APP_ID}`);
    return true;
  } catch (error) {
    console.error('Failed to validate Contacts app access:', error);
    return false;
  }
};

// Helper function to check if current page is auth/setup related
export const isAuthOrSetupPage = (path: string): boolean => {
  const authPaths = ['/login', '/podio-setup', '/podio-callback', '/auth'];
  return authPaths.some(authPath => path.startsWith(authPath));
};

// Helper function to check if Podio is properly configured
export const isPodioProperlyConfigured = (): boolean => {
  // Check for stored token expiry and user data
  const tokenExpiry = localStorage.getItem('podio_token_expiry');
  const userData = localStorage.getItem('podio_user_data');
  
  if (!tokenExpiry || !userData) {
    return false;
  }
  
  // Check if token hasn't expired
  const expiryTime = parseInt(tokenExpiry, 10);
  const now = Date.now();
  
  return expiryTime > now;
};

// Initialize Podio authentication on app start
export const initializePodioAuth = (): void => {
  // Add event listener for reauth events with route checking
  window.addEventListener('podio-reauth-needed', () => {
    const currentPath = window.location.pathname;
    
    // Don't redirect if already on setup/auth pages
    if (isAuthOrSetupPage(currentPath)) {
      console.log('Already on auth/setup page, not redirecting:', currentPath);
      return;
    }
    
    // Navigate to setup page for reauthorization
    window.location.href = '/podio-setup?reauth=required';
  });
  
  // Conditionally set up token refresh based on current state
  const currentPath = window.location.pathname;
  if (!isAuthOrSetupPage(currentPath) && isPodioProperlyConfigured()) {
    console.log('Setting up token refresh for authenticated user');
    setupTokenRefreshInterval();
  } else {
    console.log('Skipping token refresh setup - not authenticated or on auth page');
  }
  
  // Cleanup on window unload
  window.addEventListener('beforeunload', () => {
    cleanupTokenRefreshInterval();
  });
};
