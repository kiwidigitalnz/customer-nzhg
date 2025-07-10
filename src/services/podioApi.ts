
// This file serves as the main entry point for Podio API services

// Export authentication-related functions
export {
  authenticateUser,
  isPodioConfigured,
  refreshPodioToken,
  callPodioApi,
  authenticateWithClientCredentials,
  validateContactsAppAccess,
  clearTokens as clearPodioTokens,
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

// Export OAuth-related functions
export {
  getPodioClientId,
  getPodioClientSecret,
  getPodioRedirectUri,
  generatePodioAuthState,
  clearPodioAuthState
} from './podio/podioOAuth';

// Export packing specs related functions, types and constants
export {
  getPackingSpecsForContact,
  getPackingSpecDetails,
  updatePackingSpecStatus,
  PODIO_CATEGORIES,
  type PackingSpec
} from './podio/podioPackingSpecs';

// Export field helper functions from the correct file
export {
  getFieldValueByExternalId,
  getFieldIdValue,
  getDateFieldValue,
  extractPodioImages,
  mapPodioStatusToAppStatus
} from './podio/podioFieldHelpers';

// Export comment functions
export {
  getCommentsFromPodio,
  addCommentToPodio,
  addCommentToPackingSpec,
  type CommentItem
} from './podio/podioComments';

// Export file upload related functions from the dedicated file
export { uploadFileToPodio, shouldProceedWithoutSignature } from './podio/podioFiles';
