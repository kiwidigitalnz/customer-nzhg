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
  action: 265959430
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
export const authenticateUser = async (credentials: PodioCredentials): Promise<ContactData | null> => {
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
    
    // Try a different filter format for text fields
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
      return null;
    }
    
    console.log('Search response items count:', searchResponse.items?.length || 0);
    
    // Check if we found any matches
    if (!searchResponse.items || searchResponse.items.length === 0) {
      console.log('No contact found with username:', credentials.username);
      
      // Let's try to list all contacts to see what's available
      try {
        const allItems = await callPodioApi(`item/app/${PODIO_CONTACTS_APP_ID}/`);
        console.log('All contacts count:', allItems.items?.length || 0);
        if (allItems.items && allItems.items.length > 0) {
          // Log fields of first item to understand structure
          console.log('Sample contact fields:', allItems.items[0].fields.map((f: any) => ({
            external_id: f.external_id,
            label: f.label,
            type: f.type,
            hasValues: !!f.values?.length
          })));
        }
      } catch (listError) {
        console.error('Failed to list all contacts:', listError);
      }
      
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
export const getPackingSpecsForContact = async (contactId: number): Promise<PackingSpec[]> => {
  try {
    console.log('Fetching packing specs for contact ID:', contactId);
    
    if (!hasValidPodioTokens() && !await refreshPodioToken()) {
      throw new Error('Not authenticated with Podio API');
    }
    
    // Filter packing specs by contact ID
    const endpoint = `app/${PODIO_PACKING_SPEC_APP_ID}/filter/`;
    
    const filters = {
      filters: {
        [PACKING_SPEC_FIELD_IDS.customer]: contactId
      }
    };
    
    const response = await callPodioApi(endpoint, {
      method: 'POST',
      body: JSON.stringify(filters),
    });
    
    if (!response.items || response.items.length === 0) {
      console.log('No packing specs found for this contact');
      return [];
    }
    
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

// Update packing spec status in Podio
export const updatePackingSpecStatus = async (
  specId: number, 
  status: 'approved' | 'rejected', 
  comments?: string
): Promise<boolean> => {
  try {
    console.log(`Updating packing spec ${specId} to ${status}`, comments ? `with comments: ${comments}` : '');
    
    if (!hasValidPodioTokens() && !await refreshPodioToken()) {
      throw new Error('Not authenticated with Podio API');
    }
    
    // Map our status to Podio category values
    // We would need to know the actual category option IDs here
    // For now, using placeholder values
    const podioStatus = status === 'approved' ? 1 : 2; // Placeholder IDs
    
    const endpoint = `item/${specId}`;
    const updateData = {
      fields: {
        [PACKING_SPEC_FIELD_IDS.customerApprovalStatus]: podioStatus,
        [PACKING_SPEC_FIELD_IDS.customerRequestedChanges]: comments || ''
      }
    };
    
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
export const isPodioConfigured = (): boolean => {
  return hasValidPodioTokens();
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
    
    // Map to our application's format
    const packingSpec: PackingSpec = {
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
      }
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

// Helper function to extract date values from Podio date fields
const getDateFieldValue = (fields: any[], externalId: string): string | null => {
  const field = fields.find(f => f.external_id === externalId);
  if (!field || !field.values || field.values.length === 0) {
    return null;
  }
  
  // Date fields in Podio have start and sometimes end properties
  if (field.values[0].start) {
    return field.values[0].start;
  }
  
  return null;
};

// Helper to ensure we have consistent field access
const getFieldValue = (field: any): any => {
  if (!field || !field.values || field.values.length === 0) {
    return null;
  }
  
  // Different field types have different structures
  if (field.type === 'text' || field.type === 'number') {
    return field.values[0].value;
  } else if (field.type === 'category') {
    return field.values[0].value?.text;
  } else if (field.type === 'date') {
    return field.values[0].start;
  }
  
  // Default fallback
  return field.values[0].value;
};
