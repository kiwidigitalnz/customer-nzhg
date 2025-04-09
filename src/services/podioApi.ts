
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
  getPodioAuthUrl,
  validatePodioAuthState
} from './podio/podioOAuth';

// Create placeholder packing spec related functions and types
export const PODIO_CATEGORIES = {
  PENDING_APPROVAL: "Pending Approval",
  APPROVED: "Approved",
  NEEDS_CHANGES: "Needs Changes",
  DRAFT: "Draft",
  APPROVAL_STATUS: {
    APPROVED_BY_CUSTOMER: { id: 1, text: "Approved by Customer" },
    CHANGES_REQUESTED: { id: 2, text: "Changes Requested" }
  }
};

// Placeholder functions for packing specs
export const getPackingSpecsForContact = async (contactId: number) => {
  console.log('Placeholder: getPackingSpecsForContact called with ID:', contactId);
  return [];
};

export const getPackingSpecDetails = async (specId: number) => {
  console.log('Placeholder: getPackingSpecDetails called with ID:', specId);
  return null;
};

export const updatePackingSpecStatus = async (
  specId: number, 
  status: string,
  comments?: string
) => {
  console.log('Placeholder: updatePackingSpecStatus called', { specId, status, comments });
  return true;
};

// Placeholder for PackingSpec type
export interface PackingSpec {
  id: number;
  title: string;
  productName: string;
  status: any;
  customer: string;
  customerItemId: number;
  created: string;
  updated: string;
  customerApprovalStatus: string;
  link: string;
  description: string;
  createdAt: string;
  details: {
    product: string;
    [key: string]: any;
  };
  files?: Array<{
    id: number;
    name: string;
    link: string;
  }>;
  comments?: Array<{
    id: number;
    text: string;
    createdBy: string;
    createdAt: string;
  }>;
}

// Placeholder functions for comments
export const getCommentsFromPodio = async (itemId: number) => {
  console.log('Placeholder: getCommentsFromPodio called with ID:', itemId);
  return [];
};

export const addCommentToPodio = async (itemId: number, comment: string) => {
  console.log('Placeholder: addCommentToPodio called', { itemId, comment });
  return true;
};

export const addCommentToPackingSpec = async (specId: number, comment: string) => {
  console.log('Placeholder: addCommentToPackingSpec called', { specId, comment });
  return true;
};

// Placeholder comment item type
export interface CommentItem {
  id: number;
  text: string;
  createdBy: string;
  createdAt: string;
}

// Placeholder file upload related functions
export const uploadFileToPodio = async (file: File, itemId: number, fieldId: number) => {
  console.log('Placeholder: uploadFileToPodio called', { itemId, fieldId });
  return { fileId: 12345, name: file.name };
};

export const shouldProceedWithoutSignature = () => {
  return false;
};

// Export field helper functions from the correct file
export {
  getFieldValueByExternalId,
  getFieldIdValue,
  getDateFieldValue,
  extractPodioImages,
  mapPodioStatusToAppStatus
} from './podio/podioFieldHelpers';
