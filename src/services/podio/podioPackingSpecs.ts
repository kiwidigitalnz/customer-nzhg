
// Import only what's needed
import { callPodioApi, PACKING_SPEC_FIELD_IDS, PODIO_PACKING_SPEC_APP_ID } from './podioAuth';
import { getFieldValueByExternalId, extractPodioImages, mapPodioStatusToAppStatus } from './podioFieldHelpers';
import { SpecStatus } from '@/components/packing-spec/StatusBadge';

// Define the PackingSpec interface
export interface PackingSpec {
  id: number;
  title: string;
  productName: string;
  status: SpecStatus;
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
    productCode?: string;
    umfMgo?: string;
    honeyType?: string;
    jarSize?: string;
    jarColour?: string;
    jarMaterial?: string;
    lidSize?: string;
    lidColour?: string;
    batchSize?: string;
    packagingType?: string;
    specialRequirements?: string;
    [key: string]: any;
  };
  files?: {
    id: number;
    name: string;
    link: string;
  }[];
  comments?: Array<{
    id: number;
    text: string;
    createdBy: string;
    createdAt: string;
  }>;
}

// Define categories for easier search/filter
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

// Get packing specs filtered by contact/customer
export const getPackingSpecsForContact = async (contactId?: number): Promise<PackingSpec[]> => {
  try {
    // Determine endpoint and options based on whether we're filtering
    let endpoint = `/item/app/${PODIO_PACKING_SPEC_APP_ID}/`;
    let options: RequestInit = {};
    
    if (contactId) {
      console.log(`Fetching packing specs for contact ID: ${contactId}`);
      
      // Use the filter endpoint with the correct field ID for customer/brand
      endpoint = `/item/app/${PODIO_PACKING_SPEC_APP_ID}/filter/`;
      
      // Construct the filter payload using the field ID (265909622)
      const filterPayload = {
        filters: {
          "265909622": [contactId] // Using field ID instead of external ID
        }
      };
      
      options = {
        method: 'POST',
        body: JSON.stringify(filterPayload)
      };
      
      console.log('Filter payload:', filterPayload);
    } else {
      console.log(`Fetching all packing specs without contact filter`);
    }
    
    // Call the Podio API
    const response = await callPodioApi(endpoint, options);
    
    if (!response || !response.items) {
      console.log('No items found in response');
      return [];
    }
    
    console.log(`Found ${response.items.length} packing specs`);
    
    // Map the Podio response to our PackingSpec interface
    const packingSpecs: PackingSpec[] = response.items.map((item: any) => {
      // Extract basic fields
      const podioId = item.item_id;
      const title = item.title || 'Untitled Packing Spec';
      
      // Get the customer field value (ref to another item)
      const customerField = getFieldValueByExternalId(item, 'customer-brand-name');
      let customerName = 'Unknown Customer';
      let customerItemId = null;
      
      if (customerField && Array.isArray(customerField) && customerField.length > 0) {
        customerName = customerField[0]?.title || 'Unknown Customer';
        customerItemId = customerField[0]?.item_id;
      }
      
      // Get the product name field value
      const productName = getFieldValueByExternalId(item, 'product-name') || 'Unnamed Product';
      
      // Get the status field value and convert to our app's status format with null handling
      const podioStatus = getFieldValueByExternalId(item, 'approval-status');
      let statusText = 'Pending Approval';
      
      // Check if podioStatus is an object with a text property
      if (podioStatus && typeof podioStatus === 'object' && 'text' in podioStatus) {
        statusText = podioStatus.text || 'Pending Approval';
      } else if (typeof podioStatus === 'string') {
        statusText = podioStatus;
      }
      
      const status: SpecStatus = mapPodioStatusToAppStatus(statusText);
      
      // Get the customer approval status with null handling
      const customerApprovalStatus = getFieldValueByExternalId(item, 'customer-approval-status');
      let approvalStatusText = 'Pending';
      
      // Check if customerApprovalStatus is an object with a text property
      if (customerApprovalStatus && typeof customerApprovalStatus === 'object' && 'text' in customerApprovalStatus) {
        approvalStatusText = customerApprovalStatus.text || 'Pending';
      } else if (typeof customerApprovalStatus === 'string') {
        approvalStatusText = customerApprovalStatus;
      }
      
      // Get created and updated dates
      const created = item.created_on || '';
      const updated = item.last_event_on || '';
      
      // Build the link to the packing spec in Podio
      const link = `https://podio.com/nzhoneygroup/packing-specifications/apps/packing-specifications/items/${podioId}`;
      
      // Extract files if any
      const files = item.files ? item.files.map((file: any) => ({
        id: file.file_id,
        name: file.name,
        link: file.link
      })) : [];
      
      // Add additional properties required by Dashboard component
      const description = 'Packing specification'; // Default description
      const createdAt = created;
      
      // Extract additional details for the spec
      const details = {
        product: productName,
        productCode: getFieldValueByExternalId(item, 'product-code') || '',
        umfMgo: getFieldValueByExternalId(item, 'umf-mgo') || '',
        honeyType: getFieldValueByExternalId(item, 'honey-type') || '',
        jarSize: getFieldValueByExternalId(item, 'jar-size') || '',
        jarColour: getFieldValueByExternalId(item, 'jar-color') || '',
        jarMaterial: getFieldValueByExternalId(item, 'jar-material') || '',
        lidSize: getFieldValueByExternalId(item, 'lid-size') || '',
        lidColour: getFieldValueByExternalId(item, 'lid-color') || '',
      };
      
      return {
        id: podioId,
        title,
        productName,
        status,
        customer: customerName,
        customerItemId: customerItemId || 0,
        created,
        updated,
        customerApprovalStatus: approvalStatusText,
        link,
        files,
        description,
        createdAt,
        details
      };
    });
    
    return packingSpecs;
  } catch (error) {
    console.error('Error fetching packing specs:', error);
    throw error;
  }
};

// Get details for a specific packing spec
export const getPackingSpecDetails = async (specId: number): Promise<any> => {
  try {
    console.log(`Fetching packing spec details for ID: ${specId}`);
    
    // Call the Podio API to get the item details
    const response = await callPodioApi(`/item/${specId}`);
    
    if (!response) {
      throw new Error('No response received from Podio API');
    }
    
    console.log(`Successfully retrieved packing spec details`);
    
    // Process images if needed
    const images = extractPodioImages(response);
    
    // Add customerInfo to the response for PackingSpecDetails component
    const customerField = getFieldValueByExternalId(response, 'customer-brand-name');
    const customerInfo = {
      customerId: customerField && Array.isArray(customerField) && customerField.length > 0 
        ? customerField[0]?.item_id 
        : null
    };
    
    return {
      ...response,
      images,
      details: {
        ...response.details,
        ...customerInfo
      }
    };
  } catch (error) {
    console.error('Error fetching packing spec details:', error);
    throw error;
  }
};

// Update the status of a packing spec
export const updatePackingSpecStatus = async (
  specId: number, 
  status: string,
  comments?: string
): Promise<boolean> => {
  try {
    console.log(`Updating packing spec ${specId} status to: ${status}`);
    
    // Prepare the fields to update
    const fields: any = {
      'customer-approval-status': status
    };
    
    // Call the Podio API to update the item
    const response = await callPodioApi(`/item/${specId}`, {
      method: 'PUT',
      body: JSON.stringify({ fields })
    });
    
    // Add a comment if provided
    if (comments) {
      await callPodioApi(`/comment/item/${specId}`, {
        method: 'POST',
        body: JSON.stringify({ value: comments })
      });
    }
    
    console.log('Packing spec update response:', response);
    return true;
  } catch (error) {
    console.error('Error updating packing spec status:', error);
    throw error;
  }
};
