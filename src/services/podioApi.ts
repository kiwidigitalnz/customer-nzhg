
// This file serves as the main entry point for Podio API services

// Export authentication-related functions
export {
  authenticateUser,
  isPodioConfigured,
  hasValidPodioTokens,
  refreshPodioToken,
  callPodioApi,
  PODIO_CONTACTS_APP_ID,
  PODIO_PACKING_SPEC_APP_ID,
  CONTACT_FIELD_IDS
} from './podio/podioAuth';

// Export packing spec related functions and types
export {
  getPackingSpecsForContact,
  getPackingSpecDetails,
  updatePackingSpecStatus,
  PACKING_SPEC_FIELD_IDS
} from './podio/podioPackingSpecs';
export type { PackingSpec, PackingSpecDetails } from './podio/podioPackingSpecs';

// Export comment-related functions and types
export {
  getCommentsFromPodio,
  addCommentToPodio,
  addCommentToPackingSpec,
} from './podio/podioComments';
export type { CommentItem } from './podio/podioComments';

// Export file upload related functions
export {
  uploadFileToPodio
} from './podio/podioFiles';

// Export field helper functions
export {
  getFieldValueByExternalId,
  getFieldIdValue,
  getDateFieldValue,
  extractPodioImages,
  mapPodioStatusToAppStatus
} from './podio/podioFieldHelpers';
