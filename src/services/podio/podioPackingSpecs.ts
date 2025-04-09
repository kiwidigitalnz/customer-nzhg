
// Import only what's needed
import { callPodioApi, PACKING_SPEC_FIELD_IDS, PODIO_PACKING_SPEC_APP_ID } from './podioAuth';
import { getFieldValueByExternalId, extractPodioImages } from './podioFieldHelpers';

// Define the PackingSpec interface
export interface PackingSpec {
  id: number;
  title: string;
  productName: string;
  status: string;
  customer: string;
  customerItemId: number;
  created: string;
  updated: string;
  customerApprovalStatus: string;
  link: string;
  files?: {
    id: number;
    name: string;
    link: string;
  }[];
}

// Define categories for easier search/filter
export const PODIO_CATEGORIES = {
  PENDING_APPROVAL: "Pending Approval",
  APPROVED: "Approved",
  NEEDS_CHANGES: "Needs Changes",
  DRAFT: "Draft",
};

// Get all packing specs for a contact
export const getPackingSpecsForContact = async (contactId: number): Promise<PackingSpec[]> => {
  try {
    console.log(`Fetching packing specs for contact ID: ${contactId}`);
    
    // Create the filter with the correct field key and values array
    const filterData = {
      fields: [
        {
          key: "customer-brand-name",
          values: [contactId]
        }
      ]
    };
    
    console.log(`Filtering packing specs with format:`, JSON.stringify(filterData));
    
    // Call the Podio API with the filter
    const response = await callPodioApi(`/item/app/${PODIO_PACKING_SPEC_APP_ID}/filter/`, {
      method: 'POST',
      body: JSON.stringify(filterData)
    });
    
    if (!response || !response.items) {
      console.log('No items found in response');
      return [];
    }
    
    console.log(`Found ${response.items.length} packing specs`);
    
    // Map the Podio response to our PackingSpec interface
    const packingSpecs: PackingSpec[] = response.items.map((item: any) => {
      // Extract the basic fields
      const podioId = item.item_id;
      const title = item.title || 'Untitled Packing Spec';
      
      // Get the customer field value (ref to another item)
      const customerField = getFieldValueByExternalId(item, 'customer-brand-name');
      let customerName = 'Unknown Customer';
      let customerItemId = null;
      
      if (customerField && customerField.value) {
        // For reference fields, the value is an array of objects with id and title
        if (Array.isArray(customerField.value) && customerField.value.length > 0) {
          customerName = customerField.value[0].title || 'Unknown Customer';
          customerItemId = customerField.value[0].item_id;
        }
      }
      
      // Get the product name field value
      const productNameField = getFieldValueByExternalId(item, 'product-name');
      const productName = productNameField?.value || 'Unnamed Product';
      
      // Get the status field value
      const statusField = getFieldValueByExternalId(item, 'approval-status');
      const status = statusField?.value?.text || 'Unknown Status';
      
      // Get the customer approval status
      const customerApprovalField = getFieldValueByExternalId(item, 'customer-approval-status');
      const customerApprovalStatus = customerApprovalField?.value?.text || 'Pending';
      
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
      
      // Return a properly formatted PackingSpec object
      return {
        id: podioId,
        title,
        productName,
        status,
        customer: customerName,
        customerItemId: customerItemId || contactId, // Fallback to contactId if itemId not found
        created,
        updated,
        customerApprovalStatus,
        link,
        files
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
    if (images.length > 0) {
      console.log(`Found ${images.length} images in the packing spec`);
    }
    
    return {
      ...response,
      images
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
  additionalFields?: any
): Promise<boolean> => {
  try {
    console.log(`Updating packing spec ${specId} status to: ${status}`);
    
    // Prepare the fields to update
    const fields: any = {
      'customer-approval-status': status
    };
    
    // Add any additional fields from the parameters
    if (additionalFields) {
      Object.assign(fields, additionalFields);
    }
    
    // Call the Podio API to update the item
    const response = await callPodioApi(`/item/${specId}`, {
      method: 'PUT',
      body: JSON.stringify({ fields })
    });
    
    console.log('Packing spec update response:', response);
    return true;
  } catch (error) {
    console.error('Error updating packing spec status:', error);
    throw error;
  }
};
