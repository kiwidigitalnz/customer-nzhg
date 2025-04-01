
// Core authentication service for Podio integration

// Re-exporting functions from podioAuth to maintain backward compatibility
export {
  isPodioConfigured,
  authenticateUser,
  hasValidPodioTokens,
  authenticateWithClientCredentials,
  authenticateWithAppToken,
  authenticateWithContactsAppToken,
  authenticateWithPackingSpecAppToken,
  validateContactsAppAccess,
  validatePackingSpecAppAccess,
  isRateLimited,
  setRateLimit,
  clearRateLimit,
  getContactsAppToken,
  getPackingSpecAppToken,
  PODIO_CONTACTS_APP_ID,
  PODIO_PACKING_SPEC_APP_ID,
  callPodioApi,
  refreshPodioToken,
  clearPodioTokens,
  CONTACT_FIELD_IDS,
  authenticateWithPasswordFlow,
  PodioAppContext,
  setCurrentAppContext,
  getCurrentAppContext,
  
  // Add new rate limiting and caching functions
  setRateLimitWithBackoff,
  clearRateLimitInfo, 
  isRateLimitedWithInfo,
  cacheUserData,
  getCachedUserData
} from './podio/podioAuth';

// For backward compatibility - Re-export types
export type { 
  RateLimitInfo  // Export the RateLimitInfo type
} from './podio/podioAuth';

