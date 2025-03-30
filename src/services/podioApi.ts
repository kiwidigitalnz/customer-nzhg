// This file handles all interactions with the Podio API

// Podio App IDs
const PODIO_CONTACTS_APP_ID = 26969025;
const PODIO_PACKING_SPEC_APP_ID = 29797638;

// Podio Contact Field IDs
const CONTACT_FIELD_IDS = {
  username: "customer-portal-username",
  password: "customer-portal-password",
  contactItemId: "item-id",
  logoUrl: "logo-url",
  title: "title"
};

// Podio Packing Spec Field IDs
const PACKING_SPEC_FIELD_IDS = {
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
  comments: 267538001  // New field ID for comments
};

interface PodioCredentials {
  username: string;
  password: string;
}

interface ContactData {
  id: number;
  name: string;
  email: string;
  username: string;
  logoUrl?: string;
}

interface CommentItem {
  id: number;
  text: string;
  createdBy: string;
  createdAt: string;
}

export interface PackingSpec {
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
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

// Helper function to convert image data URL to Podio-compatible file object
interface FileUploadResponse {
  file_id: number;
}

// Mock data for development - will be replaced with actual API calls
const MOCK_CONTACTS: ContactData[] = [
  { 
    id: 1, 
    name: 'Test Customer', 
    email: 'test@example.com',
    username: 'test'
  }
];

const MOCK_SPECS: PackingSpec[] = [
  {
    id: 101,
    title: 'Manuka Honey 250g Jars',
    description: 'Premium Manuka Honey packaging specification',
    status: 'pending',
    createdAt: '2023-11-15',
    details: {
      product: 'UMF 10+ Manuka Honey',
      batchSize: '1,000 units',
      packagingType: 'Glass jar with tamper-evident seal',
      specialRequirements: 'UMF certification label required'
    }
  },
  {
    id: 102,
    title: 'Clover Honey 500g Squeeze Bottle',
    description: 'Clover Honey new packaging design',
    status: 'pending',
    createdAt: '2023-11-20',
    details: {
      product: 'Pure Clover Honey',
      batchSize: '2,500 units',
      packagingType: 'BPA-free plastic squeeze bottle',
    }
  },
  {
    id: 103,
    title: 'Honey Gift Box - Premium Selection',
    description: 'Holiday season gift box with 3 honey varieties',
    status: 'approved',
    createdAt: '2023-10-25',
    details: {
      product: 'Assorted Honey Selection',
      batchSize: '500 units',
      packagingType: 'Cardboard gift box with plastic inserts',
      specialRequirements: 'Festive design with gold foil accents'
    }
  }
];

// Helper function to check if we have valid Podio tokens
const hasValidPodioTokens = (): boolean => {
  const accessToken = localStorage.getItem('podio_access_token');
  const tokenExpiry = localStorage.getItem('podio_token_expiry');
  
  if (!accessToken || !tokenExpiry) return false;
  
  // Check if token is expired
  const expiryTime = parseInt(tokenExpiry, 10);
  const now = Date.now();
  
  return expiryTime > now;
};

// Helper function to refresh the access token if needed
const refreshPodioToken = async (): Promise<boolean> => {
  const refreshToken = localStorage.getItem('podio_refresh_token');
  const clientId = localStorage.getItem('podio_client_id');
  const clientSecret = localStorage.getItem('podio_client_secret');
  
  if (!refreshToken || !clientId || !clientSecret) return false;
  
  try {
    const response = await fetch('https://podio.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }).toString(),
    });
    
    if (!response.ok) return false;
    
    const data = await response.json();
    
    localStorage.setItem('podio_access_token', data.access_token);
    localStorage.setItem('podio_refresh_token', data.refresh_token);
    localStorage.setItem('podio_token_expiry', (Date.now() + data.expires_in * 1000).toString());
    
    return true;
  } catch (error) {
    console.error('Error refreshing Podio token:', error);
    return false;
  }
};

// Helper function to make authenticated API calls to Podio
const callPodioApi = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
  // Check if we have a valid token, try to refresh if not
  if (!hasValidPodioTokens() && !await refreshPodioToken()) {
    throw new Error('Not authenticated with Podio');
  }
  
  const accessToken = localStorage.getItem('podio_access_token');
  
  // Merge the authorization header with the provided options
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  try {
    const response = await fetch(`https://api.podio.com/${endpoint}`, {
      ...options,
      headers,
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error_description || 'Podio API error');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Podio API call error:', error);
    throw error;
  }
};

// This function authenticates a user by checking the Podio contacts app
const authenticateUser = async (credentials: PodioCredentials): Promise<ContactData | null> => {
  try {
    console.log('Authenticating with Podio...', credentials.username);
    
    if (!hasValidPodioTokens() && !await refreshPodioToken()) {
      console.error('No valid Podio tokens available for authentication');
      return null;
    }
    
    // First, test to see if we can get the app details to verify our connection
    try {
      const appDetails = await callPodioApi(`app/${PODIO_CONTACTS_APP_ID}`);
      console.log('Podio app details retrieved successfully:', appDetails.app_id);
    } catch (error) {
      console.error('Failed to retrieve app details:', error);
      return null;
    }

    // Use a simpler approach to find items by field value
    const endpoint = `item/app/${PODIO_CONTACTS_APP_ID}/filter/`;
    
    // Get token to check format
    const accessToken = localStorage.getItem('podio_access_token');
    console.log('Using token (first 10 chars):', accessToken?.substring(0, 10) + '...');
    
    // Use the correct filter format for text fields (simple string value)
    const filters = {
      filters: {
        [CONTACT_FIELD_IDS.username]: credentials.username
      }
    };

    console.log('Searching contacts with filters:', JSON.stringify(filters, null, 2));
    
    // Make the API call
    let searchResponse;
    try {
      searchResponse = await callPodioApi(endpoint, {
        method: 'POST',
        body: JSON.stringify(filters),
      });
    } catch (error) {
      console.error('Error during contact search:', error);
      
      // Try alternative filter format as fallback
      try {
        console.log('Trying alternative filter format...');
        const alternativeFilters = {
          filters: {
            [CONTACT_FIELD_IDS.username]: {
              "equals": credentials.username
            }
          }
        };
        console.log('Alternative filters:', JSON.stringify(alternativeFilters, null, 2));
        
        searchResponse = await callPodioApi(endpoint, {
          method: 'POST',
          body: JSON.stringify(alternativeFilters),
        });
      } catch (secondError) {
        console.error('Alternative filter also failed:', secondError);
        return null;
      }
    }
    
    console.log('Search response items count:', searchResponse.items?.length || 0);
    
    // Check if we found any matches
    if (!searchResponse.items || searchResponse.items.length === 0) {
      console.log('No contact found with username:', credentials.username);
      return null;
    }
    
    // Get the first contact that matches
    const contactItem = searchResponse.items[0];
    console.log('Found contact item ID:', contactItem.item_id);
    
    // Log the fields to help debug
    console.log('Contact fields:', contactItem.fields.map((f: any) => ({
      external_id: f.external_id,
      label: f.label, 
      type: f.type,
      hasValues: !!f.values?.length
    })));
    
    // Extract fields from the response
    const usernameField = contactItem.fields.find((field: any) => field.external_id === CONTACT_FIELD_IDS.username);
    const passwordField = contactItem.fields.find((field: any) => field.external_id === CONTACT_FIELD_IDS.password);
    const titleField = contactItem.fields.find((field: any) => field.external_id === CONTACT_FIELD_IDS.title);
    const logoField = contactItem.fields.find((field: any) => field.external_id === CONTACT_FIELD_IDS.logoUrl);
    
    console.log('Found username field:', !!usernameField, 'value:', usernameField?.values?.[0]?.value);
    console.log('Found password field:', !!passwordField);
    
    // Check if the password matches
    if (!passwordField || !passwordField.values || !passwordField.values.length) {
      console.log('Password field not found or empty');
      return null;
    }
    
    // Compare the password
    const savedPassword = passwordField.values[0].value;
    console.log('Password comparison:', 
      'input length:', credentials.password.length, 
      'saved length:', savedPassword?.length || 0,
      'match:', savedPassword === credentials.password
    );
    
    if (savedPassword !== credentials.password) {
      console.log('Password does not match');
      return null;
    }
    
    // Create the contact data object
    const contact: ContactData = {
      id: contactItem.item_id,
      name: titleField?.values?.[0]?.value || 'Unknown Company',
      email: '', // Email might be in a different field if needed
      username: credentials.username,
      logoUrl: logoField?.values?.[0]?.value
    };
    
    console.log('Successfully authenticated contact:', contact);
    return contact;
    
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
};

// Get packing specs for a specific contact from Podio
const getPackingSpecsForContact = async (contactId: number): Promise<PackingSpec[]> => {
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
    
    // Transform Podio items into our PackingSpec format
    const packingSpecs: PackingSpec[] = response.items.map((item: any) => {
      const fields = item.fields;
      
      // Map to our application's format
      return {
        id: item.item_id,
        title: getFieldValueByExternalId(fields, 'product-name') || 'Untitled Spec',
        description: getFieldValueByExternalId(fields, 'customer-requrements') || '',
        status: mapPodioStatusToAppStatus(getFieldValueByExternalId(fields, 'customer-approval-status')),
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
    
    // For development, return mock data as fallback
    console.log('Falling back to mock data for packing specs');
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate network delay
    return MOCK_SPECS;
  }
};

// Helper function to get field value by external_id
const getFieldValueByExternalId = (fields: any[], externalId: string): string | null => {
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
const getFieldIdValue = (fields: any[], fieldId: number): number | null => {
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

// Map Podio approval status to our app's status format
const mapPodioStatusToAppStatus = (podioStatus: string | null): 'pending' | 'approved' | 'rejected' => {
  if (!podioStatus) return 'pending';
  
  if (podioStatus.toLowerCase().includes('approve')) {
    return 'approved';
  } else if (podioStatus.toLowerCase().includes('reject')) {
    return 'rejected';
  }
  
  return 'pending';
};

// Upload a file to Podio
const uploadFileToPodio = async (fileDataUrl: string, fileName: string): Promise<number | null> => {
  try {
    if (!hasValidPodioTokens() && !await refreshPodioToken()) {
      throw new Error('Not authenticated with Podio API');
    }
    
    console.log(`Preparing to upload file: ${fileName}`);
    
    // For development, simulate a successful upload with a mock file ID
    console.log('Simulating file upload for development');
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate network delay
    
    // Generate a random file ID for development
    const mockFileId = Math.floor(Math.random() * 9000000) + 1000000;
    console.log(`Mock file uploaded with ID: ${mockFileId}`);
    
    return mockFileId;
    
    // In production, we would implement actual file upload like this:
    /*
    // Convert data URL to blob
    const blob = await (await fetch(fileDataUrl)).blob();
    
    // Create FormData object
    const formData = new FormData();
    formData.append('file', blob, fileName);
    
    // Upload the file
    const uploadResponse = await fetch('https://api.podio.com/file', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('podio_access_token')}`,
      },
      body: formData,
    });
    
    if (!uploadResponse.ok) {
      throw new Error('Failed to upload file to Podio');
    }
    
    const fileData = await uploadResponse.json() as FileUploadResponse;
    return fileData.file_id;
    */
  } catch (error) {
    console.error('Error uploading file to Podio:', error);
    return null;
  }
};

// Update packing spec status in Podio
const updatePackingSpecStatus = async (
  specId: number, 
  status: 'approved' | 'rejected', 
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
    if (status === 'approved') {
      // Set customer approval status to "Approve Specification" (use the actual category ID in production)
      updateData.fields[PACKING_SPEC_FIELD_IDS.customerApprovalStatus] = additionalData?.status || 'approve-specification';
      
      // Set approved by name
      if (additionalData?.approvedByName) {
        updateData.fields[PACKING_SPEC_FIELD_IDS.approvedByName] = additionalData.approvedByName;
      }
      
      // Set approval date to current date
      updateData.fields[PACKING_SPEC_FIELD_IDS.approvalDate] = {
        start: new Date().toISOString()
      };
      
      // If signature data URL is provided, upload it to Podio
      if (additionalData?.signature) {
        const signatureFileName = `signature_${specId}_${Date.now()}.jpg`;
        const fileId = await uploadFileToPodio(additionalData.signature, signatureFileName);
        
        if (fileId) {
          updateData.fields[PACKING_SPEC_FIELD_IDS.signature] = fileId;
        }
      }
    } else if (status === 'rejected') {
      // Set customer approval status to "Request Changes" (use the actual category ID in production)
      updateData.fields[PACKING_SPEC_FIELD_IDS.customerApprovalStatus] = additionalData?.status || 'request-changes';
      
      // Set customer requested changes field
      if (comments) {
        updateData.fields[PACKING_SPEC_FIELD_IDS.customerRequestedChanges] = comments;
      }
    }
    
    // Add the comment to the comments field as well
    if (comments) {
      // Get existing comments
      const spec = await getPackingSpecDetails(specId);
      if (spec) {
        const newComment: CommentItem = {
          id: Date.now(),
          text: comments,
          createdBy: additionalData?.approvedByName || 'Customer Portal User',
          createdAt: new Date().toISOString()
        };
        
        // Add to existing comments or create new array
        const updatedComments = spec.comments ? [...spec.comments, newComment] : [newComment];
        
        // Update comments field
        updateData.fields[PACKING_SPEC_FIELD_IDS.comments] = JSON.stringify(updatedComments);
      }
    }
    
    console.log('Updating Podio with data:', JSON.stringify(updateData, null, 2));
    
    const endpoint = `item/${specId}`;
    
    await callPodioApi(endpoint, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
    
    return true;
  } catch (error) {
    console.error('Error updating packing spec:', error);
    
    // For development, simulate a successful update
    console.log('Simulating successful update for development');
    await new Promise(resolve => setTimeout(resolve, 1200)); // Simulate network delay
    return true;
  }
};

// Function to check if Podio API is configured
const isPodioConfigured = (): boolean => {
  return hasValidPodioTokens();
};

// Function to get comments from Podio for a specific item
const getCommentsFromPodio = async (itemId: number): Promise<CommentItem[]> => {
  try {
    console.log('Fetching comments for item ID:', itemId);
    
    if (!hasValidPodioTokens() && !await refreshPodioToken()) {
      throw new Error('Not authenticated with Podio API');
    }
    
    // Call Podio API to get comments
    const endpoint = `comment/item/${itemId}`;
    
    const response = await callPodioApi(endpoint);
    
    if (!response || !Array.isArray(response)) {
      console.log('No comments found or invalid response');
      return [];
    }
    
    // Transform Podio comments into our CommentItem format
    const comments: CommentItem[] = response.map((comment: any) => ({
      id: comment.comment_id,
      text: comment.value,
      createdBy: comment.created_by.name || 'Podio User',
      createdAt: comment.created_on
    }));
    
    console.log(`Found ${comments.length} comments for item ID ${itemId}`);
    return comments;
  } catch (error) {
    console.error('Error fetching comments from Podio:', error);
    
    // For development, return mock data as fallback
    console.log('Falling back to mock data for comments');
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate network delay
    
    return getMockComments(itemId);
  }
};

// Function to add a comment to a Podio item
const addCommentToPodio = async (
  itemId: number,
  comment: string,
  userName?: string
): Promise<boolean> => {
  try {
    console.log(`Adding comment to Podio item ${itemId}: ${comment}`);
    
    if (!hasValidPodioTokens() && !await refreshPodioToken()) {
      throw new Error('Not authenticated with Podio API');
    }
    
    // Prepare the comment data
    const commentData = {
      value: comment,
      external_id: `customer_comment_${Date.now()}`,
    };
    
    // Post the comment to Podio
    const endpoint = `comment/item/${itemId}`;
    
    await callPodioApi(endpoint, {
      method: 'POST',
      body: JSON.stringify(commentData),
    });
    
    return true;
  } catch (error) {
    console.error('Error adding comment to Podio:', error);
    
    // For development, simulate a successful update
    console.log('Simulating successful comment addition for development');
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate network delay
    return true;
  }
};

// Get packing spec details for a specific spec ID
const getPackingSpecDetails = async (specId: number): Promise<PackingSpec | null> => {
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
    
    // Get the customer ID for security checks
    const customerId = getFieldIdValue(fields, PACKING_SPEC_FIELD_IDS.customer);
    console.log(`Packing spec ${specId} belongs to customer ID:`, customerId);
    
    // Get comments directly from Podio's comment API
    const comments = await getCommentsFromPodio(specId);
    
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
        // Dates need special handling since they are objects
        dateReviewed: getDateFieldValue(fields, 'date-reviewed'),
        approvalDate: getDateFieldValue(fields, 'approval-date'),
        // We don't handle images yet, but we could add this later
        // label: getFieldValueByExternalId(fields, 'label'),
        // signature: getFieldValueByExternalId(fields, 'signature'),
        // shipperSticker: getFieldValueByExternalId(fields, 'shipper-sticker'),
      },
      comments: comments // Use the comments fetched from Podio
    };
    
    return packingSpec;
  } catch (error) {
    console.error('Error fetching packing spec details:', error);
    
    // For development, return mock data as fallback
    console.log('Falling back to mock data for packing spec details');
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate network delay
    
    // Find mock spec by ID
    const mockSpec = MOCK_SPECS.find(spec => spec.id === specId);
    
    // Add more detailed fields to the mock data
    if (mockSpec) {
      mockSpec.details = {
        ...mockSpec.details,
        customerId: 1, // Default to test customer ID for mock data
        jarShape: 'Round',
        palletType: 'Standard',
        cartonsPerLayer: '12',
        numberOfLayers: '5',
        dateReviewed: '2023-10-20',
        approvalDate: mockSpec.status === 'approved' ? '2023-10-22' : '',
        approvedByName: mockSpec.status === 'approved' ? 'John Smith' : '',
        versionNumber: '1.2',
        countryOfEligibility: 'New Zealand, Australia',
        regulatoryRequirements: 'MPI Compliance',
        labelCode: 'NZHG-2023-001',
        labelSpecification: 'Standard Label with UMF Logo'
      };
    }
    
    return mockSpec || null;
  }
};

// Helper function to extract comments from Podio fields
const parseCommentsFromPodioField = (fields: any[]): CommentItem[] | null => {
  const commentsField = fields.find(f => f.field_id === PACKING_SPEC_FIELD_IDS.comments);
  
  if (!commentsField || !commentsField.values || commentsField.values.length === 0) {
    return null;
  }
  
  try {
    // Comments might be stored as JSON in a text field
    const commentsValue = commentsField.values[0].value;
    if (typeof commentsValue === 'string') {
      try {
        return JSON.parse(commentsValue);
      } catch (e) {
        // If not valid JSON, return as a single comment
        return [
          {
            id: 1,
            text: commentsValue,
            createdBy: 'System',
            createdAt: new Date().toISOString()
          }
        ];
      }
    }
    return null;
  } catch (error) {
    console.error('Error parsing comments:', error);
    return null;
  }
};

// Helper function to get date field value
const getDateFieldValue = (fields: any[], externalId: string): string | null => {
  const field = fields.find(f => f.external_id === externalId);
  if (!field || !field.values || field.values.length === 0) {
    return null;
  }
  
  // Date fields have a "start" property with the date string
  if (field.values[0].start) {
    // Format the date as needed
    return new Date(field.values[0].start).toISOString().split('T')[0];
  }
  
  return null;
};

// Get mock comments for development
const getMockComments = (specId: number): CommentItem[] => {
  if (specId === 103) {
    return [
      {
        id: 1,
        text: 'Please ensure the honey gift box has proper labeling for allergens.',
        createdBy: 'Sarah Johnson',
        createdAt: '2023-10-15T14:23:00Z'
      },
      {
        id: 2,
        text: 'Updated packaging to include allergen warnings on all sides.',
        createdBy: 'Mark Wilson',
        createdAt: '2023-10-18T09:45:00Z'
      },
      {
        id: 3,
        text: 'Approved the final design. Great work team!',
        createdBy: 'John Smith',
        createdAt: '2023-10-22T16:30:00Z'
      }
    ];
  }
  
  return [];
};

// Function to add a comment to a packing spec
const addCommentToPackingSpec = async (
  specId: number,
  comment: string,
  userName: string
): Promise<boolean> => {
  try {
    console.log(`Adding comment to packing spec ${specId}: ${comment}`);
    
    const success = await addCommentToPodio(specId, comment, userName);
    
    if (!success) {
      throw new Error('Failed to add comment to Podio');
    }
    
    return true;
  } catch (error) {
    console.error('Error adding comment to packing spec:', error);
    return false;
  }
};

// Export the functions we want to use in other parts of the application
export {
  authenticateUser,
  getPackingSpecsForContact,
  getPackingSpecDetails,
  updatePackingSpecStatus,
  isPodioConfigured,
  addCommentToPackingSpec
};
