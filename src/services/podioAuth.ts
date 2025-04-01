
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
  authenticateWithPasswordFlow
} from './podio/podioAuth';

// For backward compatibility - Re-export types
export type { 
  // Add any types if needed
} from './podioApi';
