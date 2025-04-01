
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
  PODIO_PACKING_SPEC_APP_ID,
  CONTACT_FIELD_IDS,
  isRateLimited,
  setRateLimit,
  clearRateLimit,
  authenticateWithPasswordFlow,
  
  // Add the missing exports
  isRateLimitedWithInfo,
  setRateLimitWithBackoff,
  clearRateLimitInfo
} from './podio/podioAuth';

// Export OAuth-related functions
export {
  startPodioOAuthFlow,
  exchangeCodeForToken,
  getPodioClientId,
  getPodioClientSecret,
  getPodioRedirectUri,
  generatePodioAuthState,
} from './podio/podioOAuth';

// Export packing spec related functions and types
export {
  getPackingSpecsForContact,
  getPackingSpecDetails,
  updatePackingSpecStatus,
  PACKING_SPEC_FIELD_IDS,
  PODIO_CATEGORIES
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
