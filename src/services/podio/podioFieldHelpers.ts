// This module provides helper functions for dealing with Podio fields

// Improved helper function to safely access field values by external_id
export const getFieldValueByExternalId = (item: any, externalId: string): string | null | any[] | Record<string, any> => {
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
    // For multi-value category fields
    if (Array.isArray(field.values) && field.values.length > 0) {
      // Extract all category values from the array
      const categoryValues = field.values
        .map((val: any) => {
          if (val.value && val.value.text) {
            return val.value.text;
          }
          return null;
        })
        .filter(Boolean);
      
      if (categoryValues.length === 1) {
        return categoryValues[0]; // Return as single string if only one value
      } else if (categoryValues.length > 1) {
        return categoryValues; // Return as array if multiple values
      }
    }
    
    // For single-value category fields
    if (typeof field.values[0].value === 'object' && field.values[0].value.text) {
      return field.values[0].value.text;
    }
    
    // Fallback to what's available
    return field.values[0].value && field.values[0].value.text ? field.values[0].value.text : null;
  }
  
  // Handle app reference fields (like customer)
  if (field.type === 'app' && field.values[0].value) {
    // For single app reference
    if (field.values[0].value.title) {
      return [{ title: field.values[0].value.title, item_id: field.values[0].value.item_id }];
    }
    if (field.values[0].value.name) {
      return [{ title: field.values[0].value.name, item_id: field.values[0].value.item_id }];
    }
    
    // For multi-reference fields
    if (Array.isArray(field.values[0].value)) {
      return field.values[0].value.map((item: any) => ({
        title: item.title || item.name,
        item_id: item.item_id
      }));
    }
    
    // Return the whole value object if we couldn't extract more specific information
    return [field.values[0].value];
  }
  
  // Handle email fields
  if (field.type === 'email' && field.values[0].value) {
    // Email fields may have multiple values with type
    if (typeof field.values[0].value === 'object') {
      return field.values[0].value.value || null;
    }
    return field.values[0].value;
  }
  
  // Handle phone fields
  if (field.type === 'phone' && field.values[0].value) {
    // Phone fields may have multiple values with type
    if (typeof field.values[0].value === 'object') {
      return field.values[0].value.value || null;
    }
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
  
  // Handle number fields
  if (field.type === 'number' && field.values[0].value !== undefined) {
    return field.values[0].value;
  }
  
  // Handle date fields
  if (field.type === 'date' && field.values[0]) {
    if (field.values[0].start) {
      return field.values[0].start;
    } else if (field.values[0].value && field.values[0].value.start) {
      return field.values[0].value.start;
    }
    return null;
  }
  
  // Handle image fields
  if (field.type === 'image' && field.values[0]) {
    if (field.values[0].file) {
      // Return as a single object, not part of an array
      return {
        file_id: field.values[0].file.file_id,
        link: field.values[0].file.link,
        name: field.values[0].file.name
      };
    } else if (Array.isArray(field.values)) {
      // Return array of image objects
      return field.values
        .filter((v: any) => v.file)
        .map((v: any) => ({
          file_id: v.file.file_id,
          link: v.file.link,
          name: v.file.name
        }));
    }
  }
  
  // Handle file fields
  if (field.type === 'file' && field.values[0]) {
    if (field.values[0].file) {
      // Return as a single object, not part of an array
      return {
        file_id: field.values[0].file.file_id,
        link: field.values[0].file.link,
        name: field.values[0].file.name
      };
    } else if (Array.isArray(field.values)) {
      // Return array of file objects
      return field.values
        .filter((v: any) => v.file)
        .map((v: any) => ({
          file_id: v.file.file_id,
          link: v.file.link,
          name: v.file.name
        }));
    }
  }
  
  // Handle embed fields
  if (field.type === 'embed' && field.values[0]) {
    if (field.values[0].embed) {
      // Return as a single object, not part of an array
      return {
        embed_id: field.values[0].embed.embed_id,
        url: field.values[0].embed.original_url,
        title: field.values[0].embed.title
      };
    }
    return field.values[0].embed || null;
  }
  
  // Default case - try to get value directly
  if (field.values[0].value !== undefined) {
    return field.values[0].value;
  }
  
  return null;
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
    // Extract all image files from the response
    return response.files
      .filter((file: any) => {
        // Filter to include only image types
        const fileName = file.name.toLowerCase();
        return fileName.endsWith('.jpg') || 
               fileName.endsWith('.jpeg') || 
               fileName.endsWith('.png') || 
               fileName.endsWith('.gif') ||
               fileName.endsWith('.webp') ||
               (file.mime_type && file.mime_type.startsWith('image/'));
      })
      .map((file: any) => ({
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

// Extract field values at the field level for debugging
export const getFieldDebugInfo = (item: any, externalId: string): any => {
  if (!item || !item.fields) {
    return { error: 'No item or fields found' };
  }
  
  const field = item.fields.find((f: any) => f.external_id === externalId);
  if (!field) {
    return { error: `Field with external_id "${externalId}" not found` };
  }
  
  return {
    field_id: field.field_id,
    external_id: field.external_id,
    type: field.type,
    values: field.values,
    label: field.label
  };
};
