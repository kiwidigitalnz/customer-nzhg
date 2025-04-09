
// This module provides helper functions for dealing with Podio fields

// Updated helper function to safely access field values by external_id
export const getFieldValueByExternalId = (item: any, externalId: string): string | null => {
  // If item is invalid or doesn't have fields property, return null
  if (!item || !item.fields) {
    return null;
  }
  
  // Find the field in the item's fields array
  const field = item.fields.find((f: any) => f.external_id === externalId);
  if (!field || !field.values || field.values.length === 0) {
    return null;
  }
  
  // Different field types have different value structures
  if (field.type === 'category' && field.values[0].value) {
    return field.values[0].value.text;
  }
  
  // Handle app reference fields (like customer)
  if (field.type === 'app' && field.values[0].value) {
    if (field.values[0].value.title) {
      return field.values[0].value.title;
    }
    if (field.values[0].value.name) {
      return field.values[0].value.name;
    }
    
    // Return an array of referenced items for multi-reference fields
    if (Array.isArray(field.values[0].value)) {
      return field.values[0].value.map((item: any) => item.title || item.name).join(', ');
    }
  }
  
  // Handle email fields
  if (field.type === 'email' && field.values[0].value) {
    return field.values[0].value;
  }
  
  // Handle phone fields
  if (field.type === 'phone' && field.values[0].value) {
    return field.values[0].value;
  }
  
  // Handle calculation fields
  if (field.type === 'calculation' && field.values[0].value !== undefined) {
    return field.values[0].value.toString();
  }
  
  // Handle text fields
  if (field.type === 'text' && field.values[0].value) {
    return field.values[0].value;
  }
  
  // Handle date fields
  if (field.type === 'date' && field.values[0].start) {
    return field.values[0].start;
  }
  
  // Handle image fields
  if (field.type === 'image' && field.values[0].file) {
    return field.values[0].file.link;
  }
  
  // Handle file fields
  if (field.type === 'file' && field.values[0].file) {
    return field.values[0].file.link;
  }
  
  // Default case - try to get value directly
  return field.values[0].value;
};

// Helper function to get ID value from a reference field
export const getFieldIdValue = (item: any, fieldId: number): number | null => {
  // If item is invalid or doesn't have fields property, return null
  if (!item || !item.fields) {
    return null;
  }
  
  const field = item.fields.find((f: any) => f.field_id === fieldId);
  if (!field || !field.values || field.values.length === 0) {
    return null;
  }
  
  // Handle different reference field formats
  
  // Reference fields have an "item" or "value" property with "item_id"
  if (field.values[0].item && field.values[0].item.item_id) {
    return field.values[0].item.item_id;
  }
  
  if (field.values[0].value && field.values[0].value.item_id) {
    return field.values[0].value.item_id;
  }
  
  // For app reference fields
  if (field.type === 'app' && field.values[0].value && field.values[0].value.id) {
    return field.values[0].value.id;
  }
  
  return null;
};

// Helper function to get date field value from Podio date fields
export const getDateFieldValue = (item: any, externalId: string): string | null => {
  // If item is invalid or doesn't have fields property, return null
  if (!item || !item.fields) {
    return null;
  }
  
  const field = item.fields.find((f: any) => f.external_id === externalId);
  
  if (!field || !field.values || field.values.length === 0) {
    return null;
  }
  
  // Podio date fields can have start/end format or direct ISO string
  if (field.values[0].start) {
    return field.values[0].start;
  }
  
  // Handle the case where it's a direct date value
  if (field.values[0].value) {
    if (typeof field.values[0].value === 'string') {
      return field.values[0].value;
    }
    
    // Some date fields have a start property inside the value
    if (field.values[0].value.start) {
      return field.values[0].value.start;
    }
  }
  
  return null;
};

// Helper function to extract images from Podio fields - fixed to accept a single response parameter
export const extractPodioImages = (response: any): any[] => {
  if (!response || !response.files) {
    return [];
  }
  
  try {
    return response.files.map((file: any) => ({
      id: file.file_id,
      name: file.name,
      link: file.link,
      thumbnail: file.thumbnail || file.link
    }));
  } catch (error) {
    console.error('Error extracting images:', error);
    return [];
  }
};

// Map Podio approval status to our app's status format
export const mapPodioStatusToAppStatus = (podioStatus: string | null): 'pending-approval' | 'approved-by-customer' | 'changes-requested' => {
  if (!podioStatus) return 'pending-approval';
  
  // Make case-insensitive comparison and normalize whitespace
  const normalizedStatus = podioStatus.toLowerCase().trim();
  
  console.log(`Mapping Podio status: "${podioStatus}" (normalized: "${normalizedStatus}")`);
  
  // Exactly match Podio status values to our internal app status values (with consistent hyphenation)
  if (normalizedStatus === 'approved by customer' || 
      normalizedStatus === 'approved-by-customer' || 
      normalizedStatus === 'approve specification' || 
      normalizedStatus === 'approve-specification') {
    return 'approved-by-customer';
  } 
  
  if (normalizedStatus === 'changes requested' || 
      normalizedStatus === 'changes-requested' || 
      normalizedStatus === 'request changes' || 
      normalizedStatus === 'request-changes') {
    return 'changes-requested';
  }
  
  if (normalizedStatus === 'pending approval' || 
      normalizedStatus === 'pending-approval' ||
      normalizedStatus === 'pending customer approval' ||
      normalizedStatus === 'pending-customer-approval') {
    return 'pending-approval';
  }
  
  // Default fallback - if we get an unknown status, assume pending
  console.log(`Unrecognized Podio status: "${podioStatus}", defaulting to 'pending-approval'`);
  return 'pending-approval';
};
