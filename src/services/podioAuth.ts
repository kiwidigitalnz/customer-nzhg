
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

// For backward compatibility - import and re-export
import { authenticateWithClientCredentials as authClientCred } from './podio/podioAuth';
export const authenticateWithContactsAppToken = authClientCred;
export const authenticateWithPackingSpecAppToken = authClientCred;

// For backward compatibility - Re-export types
export type { 
  RateLimitInfo
} from './podio/podioAuth';
