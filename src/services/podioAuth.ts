// Core authentication service for Podio integration
import { 
  getPodioClientId,
  getPodioClientSecret 
} from './podio/podioOAuth';
import { getFieldValueByExternalId } from './podio/podioFieldHelpers';

// Export all necessary functions and constants
export { 
  authenticateUser,
  isPodioConfigured,
  hasValidTokens,
  refreshPodioToken,
  callPodioApi,
  authenticateWithClientCredentials,
  validateContactsAppAccess,
  clearTokens,
  PODIO_CONTACTS_APP_ID,
  PODIO_PACKING_SPEC_APP_ID,
  CONTACT_FIELD_IDS,
  PACKING_SPEC_FIELD_IDS,
  isRateLimited,
  isRateLimitedWithInfo,
  setRateLimit,
  clearRateLimit,
  clearRateLimitInfo,
  cacheUserData,
  getCachedUserData
} from './podio/podioAuth';
