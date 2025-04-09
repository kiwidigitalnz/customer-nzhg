
// Core authentication service for Podio integration (now stubbed)
import { getFieldValueByExternalId } from './podio/podioFieldHelpers';

// Export all necessary functions and constants
export { 
  authenticateUser,
  isPodioConfigured,
  refreshPodioToken,
  callPodioApi,
  authenticateWithClientCredentials,
  validateContactsAppAccess,
  clearTokens,
  PODIO_CONTACTS_APP_ID,
  isRateLimited,
  isRateLimitedWithInfo,
  setRateLimit,
  clearRateLimit,
  clearRateLimitInfo,
  cacheUserData,
  getCachedUserData
} from './podio/podioAuth';

export { getFieldValueByExternalId };
