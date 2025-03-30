
// This module provides helper functions for dealing with Podio fields

// Helper function to get field value by external_id
export const getFieldValueByExternalId = (fields: any[], externalId: string): string | null => {
  const field = fields.find(f => f.external_id === externalId);
  if (!field || !field.values || field.values.length === 0) {
    return null;
  }
  
  // Different field types have different value structures
  if (field.type === 'category' && field.values[0].value) {
    return field.values[0].value.text;
  }
  
  return field.values[0].value;
};

// Helper function to get ID value from a reference field
export const getFieldIdValue = (fields: any[], fieldId: number): number | null => {
  const field = fields.find(f => f.field_id === fieldId);
  if (!field || !field.values || field.values.length === 0) {
    return null;
  }
  
  // Reference fields have an "item" or "value" property with "item_id"
  if (field.values[0].item && field.values[0].item.item_id) {
    return field.values[0].item.item_id;
  }
  
  if (field.values[0].value && field.values[0].value.item_id) {
    return field.values[0].value.item_id;
  }
  
  return null;
};

// Helper function to get date field value from Podio date fields
export const getDateFieldValue = (fields: any[], externalId: string): string | null => {
  const field = fields.find(f => f.external_id === externalId);
  
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

// Helper function to extract images from Podio fields
export const extractPodioImages = (fields: any[], fieldId: number): any[] | null => {
  const field = fields.find(f => f.field_id === fieldId);
  
  if (!field || !field.values || field.values.length === 0) {
    console.log(`No values found for field ID ${fieldId}`);
    return null;
  }
  
  console.log(`Extracting images from field ${fieldId}, found ${field.values.length} values`);
  
  const images = [];
  
  for (const value of field.values) {
    // Check if it's a file type
    if (value.file) {
      console.log('Found file:', value.file);
      images.push(value.file);
    } 
    // For direct value objects
    else if (value.value) {
      console.log('Found value object:', value.value);
      images.push(value.value);
    }
    // For any other format, just add the value
    else {
      console.log('Found other format:', value);
      images.push(value);
    }
  }
  
  return images.length > 0 ? images : null;
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
      normalizedStatus === 'pending customer approval' ||  // Added this mapping
      normalizedStatus === 'pending-customer-approval') {  // Added this mapping
    return 'pending-approval';
  }
  
  // Default fallback - if we get an unknown status, assume pending
  console.log(`Unrecognized Podio status: "${podioStatus}", defaulting to 'pending-approval'`);
  return 'pending-approval';
};
