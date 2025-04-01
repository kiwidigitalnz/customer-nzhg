
// Core authentication service for Podio integration

// Re-exporting functions from podioAuth to maintain backward compatibility
export {
  isPodioConfigured,
  authenticateUser,
  hasValidPodioTokens,
  authenticateWithClientCredentials,
  validateContactsAppAccess,
  validatePackingSpecAppAccess,
  isRateLimited,
  setRateLimit,
  clearRateLimit,
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
  
  // Rate limiting and caching functions
  setRateLimitWithBackoff,
  clearRateLimitInfo, 
  isRateLimitedWithInfo,
  cacheUserData,
  getCachedUserData
} from './podio/podioAuth';

// For backward compatibility - maintain old function names
export {
  authenticateWithClientCredentials as authenticateWithContactsAppToken,
  authenticateWithClientCredentials as authenticateWithPackingSpecAppToken
};

// For backward compatibility - Re-export types
export type { 
  RateLimitInfo
} from './podio/podioAuth';
