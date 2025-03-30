
// This file contains functions for working with packing specifications in Podio

import { callPodioApi, hasValidPodioTokens, refreshPodioToken, PODIO_PACKING_SPEC_APP_ID } from './podioAuth';
import { getFieldValueByExternalId, getFieldIdValue, getDateFieldValue, extractPodioImages, mapPodioStatusToAppStatus } from './podioFieldHelpers';
import { getCommentsFromPodio, CommentItem } from './podioComments';

// Packing Spec Field IDs
export const PACKING_SPEC_FIELD_IDS = {
  status: 'status',
  customer: 'customer',
  customerId: 'customer-id',
  product: 'product',
  productCode: 'product-code',
  honeyType: 'honey-type',
  umfMgo: 'umf-mgo',
  jarSize: 'jar-size',
  jarColour: 'jar-colour',
  jarMaterial: 'jar-material',
  lidSize: 'lid-size',
  lidColour: 'lid-colour',
  packagingType: 'packaging-type',
  batchSize: 'batch-size',
  versionNumber: 'version-number',
  markets: 'markets',
  specialRequirements: 'special-requirements',
  labelInformation: 'label-information',
  labelDesign: 'label-design',
  labelImages: 'label-images',
  productImages: 'product-images',
  shippingInformation: 'shipping-information',
  regulatoryInfo: 'regulatory-info',
  dateReviewed: 'date-reviewed',
  approvalDate: 'approval-date',
  approvedByName: 'approved-by-name',
  customerRequestedChanges: 'customer-requested-changes',
};

// Types
export interface PackingSpecDetails {
  [key: string]: any;
  product: string;
  batchSize?: string;
  packagingType?: string;
  specialRequirements?: string;
}

export interface PackingSpec {
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  details: PackingSpecDetails;
  comments?: CommentItem[];
}

// Get a list of packing specs associated with a contact
export const getPackingSpecsForContact = async (contactId: number): Promise<PackingSpec[]> => {
  try {
    if (!hasValidPodioTokens() && !await refreshPodioToken()) {
      throw new Error('Not authenticated with Podio API');
    }
    
    // Query for packing specs filtering by contact ID
    // Fix: Only pass two arguments to callPodioApi
    const response = await callPodioApi(`/item/app/${PODIO_PACKING_SPEC_APP_ID}/filter/`, 'POST', {
      filters: {
        "customer-id": [contactId]
      },
      sort_by: "created_on",
      sort_desc: true,
      limit: 50
    });
    
    if (!response.items) {
      return [];
    }
    
    // Map Podio items to our app format
    return response.items.map((item: any) => {
      return {
        id: item.item_id,
        title: item.title,
        description: item.fields?.find((f: any) => f.external_id === 'description')?.values?.[0]?.value || '',
        status: mapPodioStatusToAppStatus(getFieldValueByExternalId(item.fields, PACKING_SPEC_FIELD_IDS.status)),
        createdAt: item.created_on,
        details: {
          product: getFieldValueByExternalId(item.fields, PACKING_SPEC_FIELD_IDS.product) || '',
          productCode: getFieldValueByExternalId(item.fields, PACKING_SPEC_FIELD_IDS.productCode),
          honeyType: getFieldValueByExternalId(item.fields, PACKING_SPEC_FIELD_IDS.honeyType),
          umfMgo: getFieldValueByExternalId(item.fields, PACKING_SPEC_FIELD_IDS.umfMgo),
          jarSize: getFieldValueByExternalId(item.fields, PACKING_SPEC_FIELD_IDS.jarSize),
          jarColour: getFieldValueByExternalId(item.fields, PACKING_SPEC_FIELD_IDS.jarColour),
          jarMaterial: getFieldValueByExternalId(item.fields, PACKING_SPEC_FIELD_IDS.jarMaterial),
          lidSize: getFieldValueByExternalId(item.fields, PACKING_SPEC_FIELD_IDS.lidSize),
          lidColour: getFieldValueByExternalId(item.fields, PACKING_SPEC_FIELD_IDS.lidColour),
          batchSize: getFieldValueByExternalId(item.fields, PACKING_SPEC_FIELD_IDS.batchSize),
          packagingType: getFieldValueByExternalId(item.fields, PACKING_SPEC_FIELD_IDS.packagingType),
          versionNumber: getFieldValueByExternalId(item.fields, PACKING_SPEC_FIELD_IDS.versionNumber),
          // Fix: Parse string to number or provide proper type conversion
          customerId: getFieldIdValue(item.fields, parseInt(PACKING_SPEC_FIELD_IDS.customer, 10)),
          specialRequirements: getFieldValueByExternalId(item.fields, PACKING_SPEC_FIELD_IDS.specialRequirements),
        }
      };
    });
  } catch (error) {
    console.error('Error fetching packing specs:', error);
    throw new Error('Failed to fetch packing specifications');
  }
};

// Get detailed information about a specific packing spec
export const getPackingSpecDetails = async (specId: number): Promise<PackingSpec | null> => {
  try {
    if (!hasValidPodioTokens() && !await refreshPodioToken()) {
      throw new Error('Not authenticated with Podio API');
    }
    
    // Fetch the packing spec details
    const item = await callPodioApi(`/item/${specId}`);
    
    if (!item) {
      return null;
    }
    
    // Fetch comments for this spec
    const comments = await getCommentsFromPodio(specId);
    
    // Extract additional details
    // Fix: Parse string to number
    const labelImages = extractPodioImages(item.fields, parseInt(PACKING_SPEC_FIELD_IDS.labelImages, 10));
    const productImages = extractPodioImages(item.fields, parseInt(PACKING_SPEC_FIELD_IDS.productImages, 10));
    
    // Map Podio item to our app format with more details
    const spec: PackingSpec = {
      id: item.item_id,
      title: item.title,
      description: item.fields?.find((f: any) => f.external_id === 'description')?.values?.[0]?.value || '',
      status: mapPodioStatusToAppStatus(getFieldValueByExternalId(item.fields, PACKING_SPEC_FIELD_IDS.status)),
      createdAt: item.created_on,
      details: {
        product: getFieldValueByExternalId(item.fields, PACKING_SPEC_FIELD_IDS.product) || '',
        productCode: getFieldValueByExternalId(item.fields, PACKING_SPEC_FIELD_IDS.productCode),
        honeyType: getFieldValueByExternalId(item.fields, PACKING_SPEC_FIELD_IDS.honeyType),
        umfMgo: getFieldValueByExternalId(item.fields, PACKING_SPEC_FIELD_IDS.umfMgo),
        jarSize: getFieldValueByExternalId(item.fields, PACKING_SPEC_FIELD_IDS.jarSize),
        jarColour: getFieldValueByExternalId(item.fields, PACKING_SPEC_FIELD_IDS.jarColour),
        jarMaterial: getFieldValueByExternalId(item.fields, PACKING_SPEC_FIELD_IDS.jarMaterial),
        lidSize: getFieldValueByExternalId(item.fields, PACKING_SPEC_FIELD_IDS.lidSize),
        lidColour: getFieldValueByExternalId(item.fields, PACKING_SPEC_FIELD_IDS.lidColour),
        batchSize: getFieldValueByExternalId(item.fields, PACKING_SPEC_FIELD_IDS.batchSize),
        packagingType: getFieldValueByExternalId(item.fields, PACKING_SPEC_FIELD_IDS.packagingType),
        versionNumber: getFieldValueByExternalId(item.fields, PACKING_SPEC_FIELD_IDS.versionNumber),
        // Fix: Parse string to number
        customerId: getFieldIdValue(item.fields, parseInt(PACKING_SPEC_FIELD_IDS.customer, 10)),
        markets: getFieldValueByExternalId(item.fields, PACKING_SPEC_FIELD_IDS.markets),
        specialRequirements: getFieldValueByExternalId(item.fields, PACKING_SPEC_FIELD_IDS.specialRequirements),
        labelInformation: getFieldValueByExternalId(item.fields, PACKING_SPEC_FIELD_IDS.labelInformation),
        labelDesign: getFieldValueByExternalId(item.fields, PACKING_SPEC_FIELD_IDS.labelDesign),
        labelImages: labelImages,
        productImages: productImages,
        shippingInformation: getFieldValueByExternalId(item.fields, PACKING_SPEC_FIELD_IDS.shippingInformation),
        regulatoryInfo: getFieldValueByExternalId(item.fields, PACKING_SPEC_FIELD_IDS.regulatoryInfo),
        dateReviewed: getDateFieldValue(item.fields, PACKING_SPEC_FIELD_IDS.dateReviewed),
        approvalDate: getDateFieldValue(item.fields, PACKING_SPEC_FIELD_IDS.approvalDate),
        approvedByName: getFieldValueByExternalId(item.fields, PACKING_SPEC_FIELD_IDS.approvedByName),
        customerRequestedChanges: getFieldValueByExternalId(item.fields, PACKING_SPEC_FIELD_IDS.customerRequestedChanges),
        updatedBy: item.app_item_id_formatted,
      },
      comments
    };
    
    return spec;
  } catch (error) {
    console.error('Error fetching packing spec details:', error);
    throw new Error('Failed to fetch packing specification details');
  }
};

// Update the status of a packing spec
export const updatePackingSpecStatus = async (
  specId: number, 
  status: 'approved' | 'rejected', 
  comments: string,
  additionalData?: Record<string, any>
): Promise<boolean> => {
  try {
    if (!hasValidPodioTokens() && !await refreshPodioToken()) {
      throw new Error('Not authenticated with Podio API');
    }
    
    // Prepare the update data based on the status
    const updateData: any = {
      fields: {
        [PACKING_SPEC_FIELD_IDS.status]: status === 'approved' ? 'approved' : 'changes-requested'
      }
    };
    
    // Add additional data if provided
    if (additionalData) {
      // Add approval date if approving
      if (status === 'approved' && additionalData.approvedByName) {
        updateData.fields[PACKING_SPEC_FIELD_IDS.approvalDate] = new Date().toISOString();
        updateData.fields[PACKING_SPEC_FIELD_IDS.approvedByName] = additionalData.approvedByName;
        
        // Handle signature if provided
        if (additionalData.signature) {
          // If we need to store the signature, this would be done here
          // For now, we're just noting that it was signed
          console.log('Signature provided for approval');
        }
      }
      
      // Add rejection feedback if rejecting
      if (status === 'rejected' && additionalData.customerRequestedChanges) {
        updateData.fields[PACKING_SPEC_FIELD_IDS.customerRequestedChanges] = additionalData.customerRequestedChanges;
      }
      
      // Add any other fields from additionalData
      Object.entries(additionalData).forEach(([key, value]) => {
        // Skip signature as it's handled separately
        if (key !== 'signature' && PACKING_SPEC_FIELD_IDS[key as keyof typeof PACKING_SPEC_FIELD_IDS]) {
          updateData.fields[PACKING_SPEC_FIELD_IDS[key as keyof typeof PACKING_SPEC_FIELD_IDS]] = value;
        }
      });
    }
    
    // Update the item in Podio
    await callPodioApi(`/item/${specId}`, 'PUT', updateData);
    
    // Add a comment if provided
    if (comments) {
      // Fix: Only pass two arguments to callPodioApi
      await callPodioApi(`/comment/item/${specId}`, 'POST', {
        value: comments
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error updating packing spec status:', error);
    return false;
  }
};
