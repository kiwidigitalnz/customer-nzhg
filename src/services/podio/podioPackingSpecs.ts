
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
    
    // Create a filter to find items where the customer-brand-name field matches the contactId
    // In real implementation, we'd use the Podio API to filter items
    const endpoint = `/item/app/${PODIO_PACKING_SPEC_APP_ID}/filter/`;
    const filterData = {
      filters: {
        "customer": [contactId] // Using the contact ID to filter by customer field
      },
      sort_by: "created_on",
      sort_desc: true,
      limit: 50,
      offset: 0
    };
    
    const response = await callPodioApi(endpoint, {
      method: 'POST',
      body: JSON.stringify(filterData)
    });
    
    console.log('Filter response:', response);
    
    if (!response || !response.items || !Array.isArray(response.items)) {
      console.warn('Invalid response format:', response);
      return [];
    }
    
    // Transform the Podio items into our PackingSpec format
    const specs = response.items.map((item: any) => {
      // Get status 
      const statusField = getFieldValueByExternalId(item.fields, 'approval-status');
      const status = mapPodioStatusToAppStatus(statusField);
      
      // Create a standardized spec object
      const spec: PackingSpec = {
        id: item.item_id,
        title: item.title || 'Untitled Packing Specification',
        description: getFieldValueByExternalId(item.fields, 'product-code') || '',
        status: status,
        createdAt: item.created_on,
        details: {
          product: getFieldValueByExternalId(item.fields, 'product-name') || '',
          productCode: getFieldValueByExternalId(item.fields, 'product-code') || '',
          versionNumber: getFieldValueByExternalId(item.fields, 'version-number') || '',
          umfMgo: getFieldValueByExternalId(item.fields, 'umf-mgo') || '',
          honeyType: getFieldValueByExternalId(item.fields, 'honey-type') || '',
          jarSize: getFieldValueByExternalId(item.fields, 'jar-size') || '',
        }
      };
      
      return spec;
    });
    
    console.log(`Processed ${specs.length} packing specs`);
    return specs;
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

    // Get the item details from Podio
    const endpoint = `/item/${packingSpecId}`;
    const response = await callPodioApi(endpoint);
    
    if (!response || !response.item) {
      console.warn('Invalid response format:', response);
      return null;
    }
    
    const item = response.item;
    
    // Get status 
    const statusField = getFieldValueByExternalId(item.fields, 'approval-status');
    const status = mapPodioStatusToAppStatus(statusField);
    
    // Create a detailed spec object
    const spec: PackingSpec = {
      id: item.item_id,
      title: item.title || 'Untitled Packing Specification',
      description: getFieldValueByExternalId(item.fields, 'product-code') || '',
      status: status,
      createdAt: item.created_on,
      details: {
        product: getFieldValueByExternalId(item.fields, 'product-name') || '',
        productCode: getFieldValueByExternalId(item.fields, 'product-code') || '',
        versionNumber: getFieldValueByExternalId(item.fields, 'version-number') || '',
        umfMgo: getFieldValueByExternalId(item.fields, 'umf-mgo') || '',
        honeyType: getFieldValueByExternalId(item.fields, 'honey-type') || '',
        jarSize: getFieldValueByExternalId(item.fields, 'jar-size') || '',
        // Add all other fields as needed
      }
    };
    
    // Get comments for the spec
    try {
      const comments = await getCommentsFromPodio(packingSpecId);
      if (comments && comments.length > 0) {
        spec.comments = comments;
      }
    } catch (commentsError) {
      console.error('Error fetching comments:', commentsError);
    }
    
    return spec;
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
    
    // Prepare the fields to update based on the status
    const fieldsToUpdate: any = {};
    
    // Map our internal status to the Podio specific field and value
    if (status === 'approved-by-customer') {
      fieldsToUpdate['customer-approval-status'] = formatCategoryValue('approve-specification');
      fieldsToUpdate['approval-status'] = formatCategoryValue('approved-by-customer');
      
      if (additionalData?.approvedByName) {
        fieldsToUpdate['approved-by-name'] = { value: additionalData.approvedByName };
      }
      
      if (additionalData?.signature) {
        // Handle signature upload separately below
      }
      
      // Add approval date (current date)
      const now = new Date();
      fieldsToUpdate['approval-date'] = { 
        start: formatPodioDate(now),
        end: null
      };
    } else if (status === 'changes-requested') {
      fieldsToUpdate['customer-approval-status'] = formatCategoryValue('request-changes');
      fieldsToUpdate['approval-status'] = formatCategoryValue('changes-requested');
      
      if (additionalData?.approvedByName) {
        fieldsToUpdate['approved-by-name'] = { value: additionalData.approvedByName };
      }
    }
    
    // Add customer requested changes if provided
    if (comments) {
      fieldsToUpdate['customer-requested-changes'] = { value: comments };
    }
    
    // Update the item in Podio
    const updateEndpoint = `/item/${specId}`;
    const updateResponse = await callPodioApi(updateEndpoint, {
      method: 'PUT',
      body: JSON.stringify({ fields: fieldsToUpdate })
    });
    
    console.log('Update response:', updateResponse);
    
    // If there's a signature to upload, do that separately
    if (status === 'approved-by-customer' && additionalData?.signature) {
      try {
        const signatureFile = await uploadFileToPodio(additionalData.signature);
        
        if (signatureFile && signatureFile.file_id) {
          const signatureFieldUpdate = {
            'signature': { value: signatureFile.file_id }
          };
          
          // Update just the signature field
          await callPodioApi(updateEndpoint, {
            method: 'PUT',
            body: JSON.stringify({ fields: signatureFieldUpdate })
          });
        }
      } catch (signatureError) {
        console.error('Error uploading signature:', signatureError);
        // Don't fail the entire update if just the signature upload fails
      }
    }
    
    // Add a comment if provided
    if (comments) {
      try {
        await addCommentToPodio(specId, comments);
      } catch (commentError) {
        console.error('Error adding comment:', commentError);
        // Don't fail the entire update if just the comment addition fails
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error updating packing spec:', error);
    throw error; // Re-throw the error so we can handle it in the calling component
  }
};
