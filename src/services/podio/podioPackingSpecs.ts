
import { callPodioApi, hasValidTokens } from './podioAuth';
import { addCommentToPodio } from './podioComments';

// Field IDs for Packing Spec app fields
export const PACKING_SPEC_FIELD_IDS = {
  approvalStatus: 'approval-status',
  approvedByName: 'approved-by-name',
  signature: 'signature',
  approvalDate: 'approval-date',
  customerRequestedChanges: 'customer-requested-changes',
  customerApprovalStatus: 'customer-approval-status',
  customerBrandName: 'customer-brand-name'
};

// Category IDs for various statuses
export const PODIO_CATEGORIES = {
  APPROVAL_STATUS: {
    PENDING_APPROVAL: { id: 1, text: 'Pending Approval' },
    APPROVED_BY_CUSTOMER: { id: 2, text: 'Approved by Customer' },
    CHANGES_REQUESTED: { id: 3, text: 'Changes Requested' }
  }
};

// Helper function to format a category value for Podio API
const formatCategoryValue = (categoryId: number) => {
  return { value: categoryId };
};

// Helper function to format date for Podio API
const formatPodioDate = (date: Date) => {
  return date.toISOString().split('T')[0];
};

// Helper function to add a comment to a packing spec
export const addCommentToPackingSpec = async (specId: number, comment: string): Promise<boolean> => {
  try {
    return await addCommentToPodio(specId, comment);
  } catch (error) {
    console.error('Error adding comment to packing spec:', error);
    throw error;
  }
};

// Type definition for a packing specification
export interface PackingSpec {
  id: number;
  title: string;
  description: string;
  status: 'pending-approval' | 'approved-by-customer' | 'changes-requested';
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
    customerId?: number;
    [key: string]: any; // Allow additional fields
  };
  comments?: Array<{
    id: number;
    text: string;
    createdBy: string;
    createdAt: string;
  }>;
}

// Get packing specs associated with a contact
export const getPackingSpecsForContact = async (contactId: number): Promise<PackingSpec[]> => {
  try {
    console.log(`Fetching packing specs for contact ID: ${contactId}`);
    
    if (!hasValidTokens()) {
      throw new Error('Not authenticated with Podio API');
    }
    
    // Create a filter to get packing specs where the customer field matches the contact ID
    const filter = {
      [PACKING_SPEC_FIELD_IDS.customerBrandName]: contactId
    };
    
    // Call Podio API to get the items
    const response = await callPodioApi(`item/app/${process.env.PODIO_PACKING_SPEC_APP_ID}/filter/`, {
      method: 'POST',
      body: JSON.stringify({ filters: filter })
    });
    
    if (!response || !response.items) {
      console.log('No packing specs found for this contact');
      return [];
    }
    
    // Map the response to our PackingSpec interface
    const specs = response.items.map((item: any) => {
      // Transform Podio item into our data structure
      return {
        id: item.item_id,
        title: item.title,
        description: item.fields?.description?.value || '',
        status: mapStatusFromPodio(item),
        createdAt: item.created_on,
        details: extractDetailsFromPodioItem(item),
      };
    });
    
    console.log(`Found ${specs.length} packing specs`);
    return specs;
  } catch (error) {
    console.error('Error fetching packing specs:', error);
    throw error;
  }
};

// Get detailed information about a specific packing spec
export const getPackingSpecDetails = async (specId: number): Promise<PackingSpec | null> => {
  try {
    console.log(`Fetching details for packing spec ID: ${specId}`);
    
    if (!hasValidTokens()) {
      throw new Error('Not authenticated with Podio API');
    }
    
    // Call Podio API to get the item
    const item = await callPodioApi(`item/${specId}`);
    
    if (!item) {
      console.log(`No packing spec found with ID: ${specId}`);
      return null;
    }
    
    // Transform Podio item into our data structure
    const spec: PackingSpec = {
      id: item.item_id,
      title: item.title,
      description: item.fields?.description?.value || '',
      status: mapStatusFromPodio(item),
      createdAt: item.created_on,
      details: extractDetailsFromPodioItem(item),
    };
    
    console.log(`Successfully fetched packing spec details`);
    return spec;
  } catch (error) {
    console.error('Error fetching packing spec details:', error);
    throw error;
  }
};

// Helper function to map Podio status to our status enum
const mapStatusFromPodio = (item: any): 'pending-approval' | 'approved-by-customer' | 'changes-requested' => {
  try {
    const approvalStatusField = item.fields.find((f: any) => f.external_id === PACKING_SPEC_FIELD_IDS.approvalStatus);
    
    if (!approvalStatusField || !approvalStatusField.values || approvalStatusField.values.length === 0) {
      return 'pending-approval'; // Default status
    }
    
    const statusId = approvalStatusField.values[0].value.id;
    
    if (statusId === PODIO_CATEGORIES.APPROVAL_STATUS.APPROVED_BY_CUSTOMER.id) {
      return 'approved-by-customer';
    } else if (statusId === PODIO_CATEGORIES.APPROVAL_STATUS.CHANGES_REQUESTED.id) {
      return 'changes-requested';
    } else {
      return 'pending-approval';
    }
  } catch (error) {
    console.error('Error mapping status from Podio:', error);
    return 'pending-approval'; // Default status
  }
};

// Helper function to extract details from a Podio item
const extractDetailsFromPodioItem = (item: any): any => {
  const details: any = {};
  
  // Extract details from item fields
  if (item.fields) {
    item.fields.forEach((field: any) => {
      if (field.label && field.values && field.values.length > 0) {
        let value;
        
        // Handle different field types
        if (field.type === 'category') {
          value = field.values[0].value.text;
        } else if (field.type === 'number') {
          value = field.values[0].value;
        } else if (field.type === 'text') {
          value = field.values[0].value;
        } else if (field.type === 'date') {
          value = field.values[0].start_date;
        } else if (field.type === 'app') {
          value = field.values[0].value.item_id;
        } else {
          value = field.values[0].value;
        }
        
        // Convert field label to camelCase property name
        const propName = field.label
          .toLowerCase()
          .replace(/[^a-zA-Z0-9]+(.)/g, (m: any, chr: string) => chr.toUpperCase());
        
        details[propName] = value;
      }
    });
  }
  
  return details;
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
    
    // Prepare the fields to update
    const fieldsToUpdate: any = {};
    
    // Set the appropriate approval status category
    if (status === 'approved-by-customer') {
      fieldsToUpdate[PACKING_SPEC_FIELD_IDS.approvalStatus] = formatCategoryValue(PODIO_CATEGORIES.APPROVAL_STATUS.APPROVED_BY_CUSTOMER.id);
      
      // If we have approvedByName, add it
      if (additionalData?.approvedByName) {
        fieldsToUpdate[PACKING_SPEC_FIELD_IDS.approvedByName] = { value: additionalData.approvedByName };
      }
      
      // If we have signature file ID, add it
      if (additionalData?.signature) {
        fieldsToUpdate[PACKING_SPEC_FIELD_IDS.signature] = { value: additionalData.signature };
      }
      
      // Set approval date to now
      const now = new Date();
      fieldsToUpdate[PACKING_SPEC_FIELD_IDS.approvalDate] = { 
        start_date: formatPodioDate(now)
      };
    } else if (status === 'changes-requested') {
      fieldsToUpdate[PACKING_SPEC_FIELD_IDS.approvalStatus] = formatCategoryValue(PODIO_CATEGORIES.APPROVAL_STATUS.CHANGES_REQUESTED.id);
      
      // If we have customerRequestedChanges, add them
      if (comments) {
        fieldsToUpdate[PACKING_SPEC_FIELD_IDS.customerRequestedChanges] = { value: comments };
      }
    }
    
    // If the user selected a specific status via additionalData
    if (additionalData?.status) {
      fieldsToUpdate[PACKING_SPEC_FIELD_IDS.customerApprovalStatus] = formatCategoryValue(additionalData.status);
    }
    
    // Update the item in Podio
    await callPodioApi(`item/${specId}`, {
      method: 'PUT',
      body: JSON.stringify({ fields: fieldsToUpdate })
    });
    
    // If comments are provided, add them as a comment on the item
    if (comments) {
      try {
        await addCommentToPackingSpec(specId, comments);
      } catch (commentError) {
        console.error('Error adding comment:', commentError);
        // Continue even if comment addition fails
      }
    }
    
    console.log(`Successfully updated packing spec ${specId} to ${status}`);
    return true;
  } catch (error) {
    console.error('Error updating packing spec:', error);
    throw error; // Re-throw the error so we can handle it in the calling component
  }
};
