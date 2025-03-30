// This module handles interactions with Podio packing specs

import { callPodioApi, hasValidPodioTokens, refreshPodioToken, PODIO_PACKING_SPEC_APP_ID } from './podioAuth';
import { getFieldValueByExternalId, getFieldIdValue, getDateFieldValue, extractPodioImages, mapPodioStatusToAppStatus } from './podioFieldHelpers';
import { uploadFileToPodio, shouldProceedWithoutSignature } from './podioFiles';
import { getCommentsFromPodio, CommentItem, addCommentToPodio } from './podioComments';

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
    APPROVE_SPECIFICATION: { id: 1, text: "approve-specification" },
    REQUEST_CHANGES: { id: 3, text: "request-changes" }
  },
  APPROVAL_STATUS: {
    PENDING_APPROVAL: { id: 1, text: "pending-approval" },
    CHANGES_REQUESTED: { id: 2, text: "changes-requested" },
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
  }
  
  // Default case, pass the string directly (may fail for category fields)
  return { value: value as string };
};

// Get packing specs for a specific contact from Podio
export const getPackingSpecsForContact = async (contactId: number): Promise<PackingSpec[]> => {
  try {
    console.log('Fetching packing specs for contact ID:', contactId);
    
    if (!hasValidPodioTokens() && !await refreshPodioToken()) {
      throw new Error('Not authenticated with Podio API');
    }
    
    // Filter packing specs by contact ID
    const endpoint = `item/app/${PODIO_PACKING_SPEC_APP_ID}/filter/`;
    
    const filters = {
      filters: {
        [PACKING_SPEC_FIELD_IDS.customer]: contactId
      }
    };
    
    console.log('Filtering packing specs with:', JSON.stringify(filters, null, 2));
    
    const response = await callPodioApi(endpoint, {
      method: 'POST',
      body: JSON.stringify(filters),
    });
    
    if (!response.items || response.items.length === 0) {
      console.log('No packing specs found for this contact');
      return [];
    }
    
    console.log(`Found ${response.items.length} packing specs for contact ID ${contactId}`);
    console.log('Raw response from Podio:', JSON.stringify(response.items.map(item => ({
      id: item.item_id,
      title: item.title,
      fields: item.fields.filter((f: any) => f.field_id === PACKING_SPEC_FIELD_IDS.approvalStatus || 
                                              f.field_id === PACKING_SPEC_FIELD_IDS.customerApprovalStatus)
    })), null, 2));
    
    // Transform Podio items into our PackingSpec format
    const packingSpecs: PackingSpec[] = response.items.map((item: any) => {
      const fields = item.fields;
      
      // Get the approval status and log it for debugging
      const rawStatus = getFieldValueByExternalId(fields, 'customer-approval-status');
      const mappedStatus = mapPodioStatusToAppStatus(rawStatus);
      console.log(`Item ${item.item_id} status: raw=${rawStatus}, mapped=${mappedStatus}`);
      
      // Map to our application's format
      return {
        id: item.item_id,
        title: getFieldValueByExternalId(fields, 'product-name') || 'Untitled Spec',
        description: getFieldValueByExternalId(fields, 'customer-requrements') || '',
        status: mappedStatus,
        createdAt: item.created_on,
        details: {
          product: getFieldValueByExternalId(fields, 'product-name') || '',
          productCode: getFieldValueByExternalId(fields, 'product-code') || '',
          umfMgo: getFieldValueByExternalId(fields, 'umf-mgo') || '',
          honeyType: getFieldValueByExternalId(fields, 'honey-type') || '',
          jarSize: getFieldValueByExternalId(fields, 'jar-size') || '',
          jarColour: getFieldValueByExternalId(fields, 'jar-colour') || '',
          jarMaterial: getFieldValueByExternalId(fields, 'jar-material') || '',
          lidSize: getFieldValueByExternalId(fields, 'lid-size') || '',
          lidColour: getFieldValueByExternalId(fields, 'lid-colour') || '',
          customerId: getFieldIdValue(fields, PACKING_SPEC_FIELD_IDS.customer), // Store customer ID for security checks
          specialRequirements: getFieldValueByExternalId(fields, 'customer-requrements') || '',
        }
      };
    });
    
    return packingSpecs;
  } catch (error) {
    console.error('Error fetching packing specs:', error);
    throw new Error('Failed to fetch packing specifications from Podio');
  }
};

// Get packing spec details for a specific spec ID
export const getPackingSpecDetails = async (specId: number): Promise<PackingSpec | null> => {
  try {
    console.log('Fetching details for packing spec ID:', specId);
    
    if (!hasValidPodioTokens() && !await refreshPodioToken()) {
      throw new Error('Not authenticated with Podio API');
    }
    
    // Get the item from Podio
    const endpoint = `item/${specId}`;
    
    const response = await callPodioApi(endpoint);
    
    if (!response) {
      console.log('No packing spec found with this ID');
      return null;
    }
    
    // Transform Podio item into our PackingSpec format
    const item = response;
    const fields = item.fields;
    
    console.log('Raw Podio response for image fields:', 
      fields.find((f: any) => f.field_id === PACKING_SPEC_FIELD_IDS.label),
      fields.find((f: any) => f.field_id === PACKING_SPEC_FIELD_IDS.shipperSticker)
    );
    
    // Get the customer ID for security checks
    const customerId = getFieldIdValue(fields, PACKING_SPEC_FIELD_IDS.customer);
    console.log(`Packing spec ${specId} belongs to customer ID:`, customerId);
    
    // Get comments directly from Podio's comment API
    const comments = await getCommentsFromPodio(specId);
    
    // Extract images from Podio fields
    const labelImages = extractPodioImages(fields, PACKING_SPEC_FIELD_IDS.label);
    const shipperStickerImages = extractPodioImages(fields, PACKING_SPEC_FIELD_IDS.shipperSticker);
    
    console.log('Extracted image data:', {
      labelImages: labelImages ? labelImages.length : 0,
      shipperStickerImages: shipperStickerImages ? shipperStickerImages.length : 0
    });
    
    // Map to our application's format
    const packingSpec: PackingSpec = {
      id: item.item_id,
      title: getFieldValueByExternalId(fields, 'product-name') || 'Untitled Spec',
      description: getFieldValueByExternalId(fields, 'customer-requrements') || '',
      status: mapPodioStatusToAppStatus(getFieldValueByExternalId(fields, 'customer-approval-status')),
      createdAt: item.created_on,
      details: {
        customerId: customerId, // Store customer ID for security checks
        product: getFieldValueByExternalId(fields, 'product-name') || '',
        productCode: getFieldValueByExternalId(fields, 'product-code') || '',
        // Make sure we're explicitly getting updated-by field
        updatedBy: getFieldValueByExternalId(fields, 'updated-by') || '',
        umfMgo: getFieldValueByExternalId(fields, 'umf-mgo') || '',
        honeyType: getFieldValueByExternalId(fields, 'honey-type') || '',
        jarSize: getFieldValueByExternalId(fields, 'jar-size') || '',
        jarColour: getFieldValueByExternalId(fields, 'jar-colour') || '',
        jarMaterial: getFieldValueByExternalId(fields, 'jar-material') || '',
        jarShape: getFieldValueByExternalId(fields, 'jar-shape') || '',
        lidSize: getFieldValueByExternalId(fields, 'lid-size') || '',
        lidColour: getFieldValueByExternalId(fields, 'lid-colour') || '',
        onTheGoPackaging: getFieldValueByExternalId(fields, 'on-the-go-packaging') || '',
        pouchSize: getFieldValueByExternalId(fields, 'pouch-size') || '',
        sealInstructions: getFieldValueByExternalId(fields, 'seal-instructions') || '',
        customerRequirements: getFieldValueByExternalId(fields, 'customer-requrements') || '',
        countryOfEligibility: getFieldValueByExternalId(fields, 'country-of-eligibility') || '',
        otherMarkets: getFieldValueByExternalId(fields, 'other-markets') || '',
        testingRequirements: getFieldValueByExternalId(fields, 'testing-requirments') || '',
        regulatoryRequirements: getFieldValueByExternalId(fields, 'reglatory-requirements') || '',
        shipperSize: getFieldValueByExternalId(fields, 'shipper-size') || '',
        customisedCartonType: getFieldValueByExternalId(fields, 'customised-carton-type') || '',
        labelCode: getFieldValueByExternalId(fields, 'label-code') || '',
        labelSpecification: getFieldValueByExternalId(fields, 'label-soecification') || '',
        printingInfoLocated: getFieldValueByExternalId(fields, 'printing-information-located') || '',
        printingColour: getFieldValueByExternalId(fields, 'printing-colour') || '',
        printingInfoRequired: getFieldValueByExternalId(fields, 'printing-information-required') || '',
        requiredBestBeforeDate: getFieldValueByExternalId(fields, 'required-best-before-date') || '',
        dateFormatting: getFieldValueByExternalId(fields, 'formate-of-dates') || '',
        shipperStickerCount: getFieldValueByExternalId(fields, 'number-of-shipper-stickers-on-carton') || '',
        palletType: getFieldValueByExternalId(fields, 'pallet-type') || '',
        cartonsPerLayer: getFieldValueByExternalId(fields, 'cartons-per-layer') || '',
        numberOfLayers: getFieldValueByExternalId(fields, 'number-of-layers') || '',
        palletSpecs: getFieldValueByExternalId(fields, 'pallet') || '',
        palletDocuments: getFieldValueByExternalId(fields, 'pallet-documents') || '',
        customerRequestedChanges: getFieldValueByExternalId(fields, 'customer-requested-changes') || '',
        approvedByName: getFieldValueByExternalId(fields, 'approved-by-2') || '',
        versionNumber: getFieldValueByExternalId(fields, 'version-number') || '',
        // Include the image fields
        label: labelImages || [],
        shipperSticker: shipperStickerImages || [],
        // Link to label document (if any)
        labelLink: getFieldValueByExternalId(fields, 'label-link') || '',
        // Dates need special handling since they are objects
        dateReviewed: getDateFieldValue(fields, 'date-reviewed'),
        approvalDate: getDateFieldValue(fields, 'approval-date'),
      },
      comments: comments // Use the comments fetched from Podio
    };
    
    // Add console log to debug the updated-by field specifically
    console.log('Updated By value from Podio:', getFieldValueByExternalId(fields, 'updated-by'));
    
    return packingSpec;
  } catch (error) {
    console.error('Error fetching packing spec details:', error);
    throw new Error('Failed to fetch packing specification details from Podio');
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
    
    if (!hasValidPodioTokens() && !await refreshPodioToken()) {
      throw new Error('Not authenticated with Podio API');
    }
    
    // Prepare the update data
    const updateData: any = {
      fields: {}
    };
    
    // Handle different status types
    if (status === 'approved-by-customer') {
      // Set customer approval status to "approve-specification"
      updateData.fields[PACKING_SPEC_FIELD_IDS.customerApprovalStatus] = [
        { value: PODIO_CATEGORIES.CUSTOMER_APPROVAL_STATUS.APPROVE_SPECIFICATION.id }
      ];
      
      // Set approval status to "Approved by Customer"
      updateData.fields[PACKING_SPEC_FIELD_IDS.approvalStatus] = [
        { value: PODIO_CATEGORIES.APPROVAL_STATUS.APPROVED_BY_CUSTOMER.id }
      ];
      
      // Set approved by name
      if (additionalData?.approvedByName) {
        updateData.fields[PACKING_SPEC_FIELD_IDS.approvedByName] = additionalData.approvedByName;
      }
      
      // Set approval date to current date
      updateData.fields[PACKING_SPEC_FIELD_IDS.approvalDate] = {
        start: new Date().toISOString()
      };
      
      // If signature data URL is provided, upload it to Podio
      let fileId = null;
      if (additionalData?.signature) {
        try {
          const signatureFileName = `signature_${specId}_${Date.now()}.jpg`;
          fileId = await uploadFileToPodio(additionalData.signature, signatureFileName);
          
          if (fileId) {
            updateData.fields[PACKING_SPEC_FIELD_IDS.signature] = fileId;
          } else {
            console.log('No file ID returned from upload, proceeding without signature');
          }
        } catch (uploadError) {
          console.error('Error uploading signature:', uploadError);
          // Check if we should proceed without signature
          if (!shouldProceedWithoutSignature(uploadError)) {
            throw uploadError; // Re-throw if we shouldn't proceed
          }
          // Otherwise continue with the update without the signature
          console.log('Proceeding with approval without signature due to upload error');
        }
      }
    } else if (status === 'changes-requested') {
      // Set customer approval status to "request-changes"
      updateData.fields[PACKING_SPEC_FIELD_IDS.customerApprovalStatus] = [
        { value: PODIO_CATEGORIES.CUSTOMER_APPROVAL_STATUS.REQUEST_CHANGES.id }
      ];
      
      // Set approval status to "Changes Requested" - using the correct category ID
      updateData.fields[PACKING_SPEC_FIELD_IDS.approvalStatus] = [
        { value: PODIO_CATEGORIES.APPROVAL_STATUS.CHANGES_REQUESTED.id }
      ];
      
      console.log('Setting approval status to CHANGES_REQUESTED with ID:', PODIO_CATEGORIES.APPROVAL_STATUS.CHANGES_REQUESTED.id);
      
      // Set customer requested changes field
      if (comments) {
        updateData.fields[PACKING_SPEC_FIELD_IDS.customerRequestedChanges] = comments;
      }
    }
    
    // Add the comment to Podio if provided
    if (comments) {
      // Format the comment with a prefix for rejections
      let formattedComment = comments;
      if (status === 'changes-requested') {
        formattedComment = `[REQUESTED CHANGES BY CUSTOMER] ${comments}`;
      }
      
      try {
        // Add comment to Podio using the dedicated comment API
        await addCommentToPodio(specId, formattedComment);
      } catch (commentError) {
        console.error('Error adding comment, but continuing with status update:', commentError);
      }
    }
    
    console.log('Updating Podio with data:', JSON.stringify(updateData, null, 2));
    
    const endpoint = `item/${specId}`;
    
    const response = await callPodioApi(endpoint, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
    
    console.log('Podio update response:', response);
    return true;
  } catch (error) {
    console.error('Error updating packing spec:', error);
    throw error; // Re-throw the error so we can handle it in the calling component
  }
};
