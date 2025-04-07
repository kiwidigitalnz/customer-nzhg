
// This module handles interactions with Podio packing specs

import { 
  callPodioApi, 
  hasValidTokens,
  PODIO_PACKING_SPEC_APP_ID
} from './podioAuth';
import { getFieldValueByExternalId, getFieldIdValue, getDateFieldValue, extractPodioImages, mapPodioStatusToAppStatus } from './podioFieldHelpers';
import { uploadFileToPodio, shouldProceedWithoutSignature } from './podioFiles';
import { getCommentsFromPodio, addCommentToPodio, CommentItem } from './podioComments';

// Packing Spec Field IDs
export const PACKING_SPEC_FIELD_IDS = {
  packingSpecId: 265909594,
  approvalStatus: 265959138,
  productName: 265909621,
  customer: 265909622,
  productCode: 265909623,
  versionNumber: 265909624,
  updatedBy: 265959736,
  dateReviewed: 265959737,
  umfMgo: 265958814,
  honeyType: 265958813,
  allergenType: 266035765,
  ingredientType: 266035766,
  customerRequirements: 265951759,
  countryOfEligibility: 265951757,
  otherMarkets: 265951758,
  testingRequirements: 265951761,
  regulatoryRequirements: 265951760,
  jarColour: 265952439,
  jarMaterial: 265952440,
  jarShape: 265952442,
  jarSize: 265952441,
  lidSize: 265954653,
  lidColour: 265954652,
  onTheGoPackaging: 266035012,
  pouchSize: 266035907,
  sealInstructions: 265959436,
  shipperSize: 265957893,
  customisedCartonType: 266035908,
  labelCode: 265958873,
  labelSpecification: 265959137,
  label: 265951584,
  labelLink: 267537366,
  printingInfoLocated: 265958021,
  printingColour: 265960110,
  printingInfoRequired: 265909779,
  requiredBestBeforeDate: 265909780,
  dateFormatting: 265951583,
  shipperSticker: 265957894,
  shipperStickerCount: 267533778,
  palletType: 265958228,
  cartonsPerLayer: 265958229,
  numberOfLayers: 265958230,
  palletSpecs: 265958640,
  palletDocuments: 265958841,
  customerApprovalStatus: 266244157,
  customerRequestedChanges: 266244158,
  approvedByName: 265959428,
  approvalDate: 266244156,
  signature: 265959139,
  emailForApproval: 265959429,
  action: 265959430,
  comments: 267538001  // Field ID for comments
};

// Category values in Podio (these would normally come from a dynamic source)
export const PODIO_CATEGORIES = {
  CUSTOMER_APPROVAL_STATUS: {
    PENDING_CUSTOMER_APPROVAL: { id: 1, text: "pending-customer-approval" },
    APPROVE_SPECIFICATION: { id: 2, text: "approve-specification" }, // Updated to ID 2 from logs
    REQUEST_CHANGES: { id: 3, text: "request-changes" }
  },
  APPROVAL_STATUS: {
    PENDING_APPROVAL: { id: 1, text: "pending-approval" },
    CHANGES_REQUESTED: { id: 4, text: "changes-requested" }, // ID 4 from logs
    APPROVED_BY_CUSTOMER: { id: 3, text: "approved-by-customer" }
  }
};

export interface PackingSpec {
  id: number;
  title: string;
  description: string;
  status: 'pending-approval' | 'approved-by-customer' | 'changes-requested';
  createdAt: string;
  details: {
    product: string;
    batchSize?: string;
    packagingType?: string;
    specialRequirements?: string;
    [key: string]: any;
  };
  comments?: CommentItem[];
}

// Helper function to format category value for Podio API
const formatCategoryValue = (value: string | number): { value: { id: number } } | { value: string } => {
  // If it's already a category ID (number)
  if (typeof value === 'number') {
    return { value: { id: value } };
  }
  
  // If it's a string representing a category, convert to the proper format
  // Check both customer approval status and approval status categories
  if (value === 'approve-specification') {
    return { value: { id: PODIO_CATEGORIES.CUSTOMER_APPROVAL_STATUS.APPROVE_SPECIFICATION.id } };
  } else if (value === 'request-changes') {
    return { value: { id: PODIO_CATEGORIES.CUSTOMER_APPROVAL_STATUS.REQUEST_CHANGES.id } };
  } else if (value === 'pending-approval') {
    return { value: { id: PODIO_CATEGORIES.APPROVAL_STATUS.PENDING_APPROVAL.id } };
  } else if (value === 'changes-requested') {
    return { value: { id: PODIO_CATEGORIES.APPROVAL_STATUS.CHANGES_REQUESTED.id } };
  } else if (value === 'approved-by-customer') {
    return { value: { id: PODIO_CATEGORIES.APPROVAL_STATUS.APPROVED_BY_CUSTOMER.id } };
  } else if (value === 'pending-customer-approval') {
    return { value: { id: PODIO_CATEGORIES.CUSTOMER_APPROVAL_STATUS.PENDING_CUSTOMER_APPROVAL.id } };
  }
  
  // Default case, pass the string directly (may fail for category fields)
  return { value: value as string };
};

// Helper function to format date for Podio API
const formatPodioDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

// Get packing specs for a specific contact from Podio
export const getPackingSpecsForContact = async (contactId: number): Promise<PackingSpec[]> => {
  try {
    console.log('Fetching packing specs for contact ID:', contactId);
    
    if (!hasValidTokens()) {
      throw new Error('Not authenticated with Podio API');
    }
    
    // In stub mode, return empty array
    console.log('Using stub implementation - returning empty packing specs array');
    return [];
  } catch (error) {
    console.error('Error fetching packing specs:', error);
    throw new Error('Failed to fetch packing specifications from Podio');
  }
};

// Get the details of a specific packing spec
export const getPackingSpecDetails = async (packingSpecId: number): Promise<PackingSpec | null> => {
  try {
    if (!hasValidTokens()) {
      console.error('Not authenticated with Podio');
      return null;
    }

    // In stub mode, return a mock packing spec
    const mockSpec: PackingSpec = {
      id: packingSpecId,
      title: 'Mock Packing Specification',
      description: 'This is a mock packing spec for testing',
      status: 'pending-approval',
      createdAt: new Date().toISOString(),
      details: {
        product: 'Mock Product',
        customerId: 1,
        productCode: 'MOCK-001',
        umfMgo: 'UMF 10+',
        honeyType: 'Manuka',
        jarSize: '250g',
        specialRequirements: 'None',
      },
      comments: []
    };

    return mockSpec;
  } catch (error) {
    console.error('Error getting packing spec details:', error);
    return null;
  }
};

// Update packing spec status in Podio
export const updatePackingSpecStatus = async (
  specId: number, 
  status: 'pending-approval' | 'approved-by-customer' | 'changes-requested', 
  comments?: string,
  additionalData?: {
    approvedByName?: string;
    signature?: string;
    status?: string;
  }
): Promise<boolean> => {
  try {
    console.log(`Updating packing spec ${specId} to ${status}`, comments ? `with comments: ${comments}` : '');
    
    if (!hasValidTokens()) {
      throw new Error('Not authenticated with Podio API');
    }
    
    // In stub mode, we'll just return success
    console.log('Mock update successful');
    return true;
  } catch (error) {
    console.error('Error updating packing spec:', error);
    throw error; // Re-throw the error so we can handle it in the calling component
  }
};
