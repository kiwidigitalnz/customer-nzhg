
// This file serves as the main entry point for Podio API services

// Export authentication-related functions
export {
  authenticateUser,
  isPodioConfigured,
  hasValidTokens as hasValidPodioTokens,
  refreshPodioToken,
  callPodioApi,
  authenticateWithClientCredentials,
  validateContactsAppAccess,
  clearTokens as clearPodioTokens,
  PODIO_CONTACTS_APP_ID,
  PACKING_SPEC_APP_ID,
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

// Export OAuth-related functions
export {
  getPodioClientId,
  getPodioClientSecret,
  getPodioRedirectUri,
  generatePodioAuthState,
  getPodioAuthUrl,
  validatePodioAuthState
} from './podio/podioOAuth';

// Export packing spec related functions and types
export {
  getPackingSpecsForContact,
  getPackingSpecDetails,
  updatePackingSpecStatus,
  PODIO_CATEGORIES,
  PACKING_SPEC_APP_ID
} from './podio/podioPackingSpecs';
export type { PackingSpec } from './podio/podioPackingSpecs';

// Export comment-related functions and types
export {
  getCommentsFromPodio,
  addCommentToPodio,
  addCommentToPackingSpec,
} from './podio/podioComments';
export type { CommentItem } from './podio/podioComments';

// Export file upload related functions
export {
  uploadFileToPodio,
  shouldProceedWithoutSignature
} from './podio/podioFiles';

// Export field helper functions
export {
  getFieldValueByExternalId,
  getFieldIdValue,
  getDateFieldValue,
  extractPodioImages,
  mapPodioStatusToAppStatus
} from './podio/podioFieldHelpers';
