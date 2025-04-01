
// Core authentication service for Podio integration

// Re-exporting functions from podioApi to maintain backward compatibility
export {
  isPodioConfigured,
  authenticateUser,
  hasValidPodioTokens,
  authenticateWithClientCredentials,
  validateContactsAppAccess,
  isRateLimited,
  setRateLimit,
  clearRateLimit,
  getContactsAppToken,
  PODIO_CONTACTS_APP_ID,
  PODIO_PACKING_SPEC_APP_ID,
  callPodioApi
} from './podioApi';

// For backward compatibility - Re-export types
export type { 
  // Add any types if needed
} from './podioApi';
