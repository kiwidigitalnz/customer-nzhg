
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

// Corrected field external IDs based on Podio developer info
const FIELD_EXTERNAL_IDS = {
  // Basic info
  productName: 'product-name',
  productCode: 'product-code',
  versionNumber: 'version-number',
  customer: 'customerbrand-name', // Corrected from 'customer-brand-name'
  updatedBy: 'specification-updated-by', // Corrected from 'updated-by'
  dateReviewed: 'date-reviewed',
  
  // Honey specifications
  umfMgo: 'umf-mgo',
  honeyType: 'honey-type',
  allergenType: 'allergen-or-lozenge-type', // Corrected from 'allergen-type'
  ingredientType: 'ingredient', // Corrected from 'ingredient-type'
  
  // Requirements
  customerRequirements: 'customer-requrements', // Note the typo in Podio
  countryOfEligibility: 'country-of-eligibility',
  otherMarkets: 'other-markets',
  testingRequirements: 'testing-requirments', // Note the typo in Podio
  regulatoryRequirements: 'reglatory-requirements', // Note the typo in Podio
  
  // Packaging
  jarColour: 'jar-colour', // Corrected from 'jar-color'
  jarMaterial: 'jar-material',
  jarShape: 'jar-shape',
  jarSize: 'jar-size',
  lidSize: 'lid-size',
  lidColour: 'lid-colour', // Corrected from 'lid-color'
  onTheGoPackaging: 'on-the-go-packaging',
  pouchSize: 'pouch-size',
  sealInstructions: 'seal-instructions',
  
  // Shipping
  shipperSize: 'shipper-size',
  customisedCartonType: 'customised-carton-type',
  palletType: 'pallet-type',
  cartonsPerLayer: 'cartons-per-layer',
  layersPerPallet: 'number-of-layers', // Corrected from 'layers-per-pallet'
  palletSpecifications: 'pallet', // Corrected from 'pallet-specs'
  palletDocuments: 'pallet-documents',
  
  // Label
  labelCode: 'label-code',
  labelSpecification: 'label-soecification', // Note the typo in Podio
  label: 'label',
  labelUrl: 'label-url', // Added missing field
  labelLink: 'label-link',
  printingInfoLocation: 'printing-information-located', // Corrected
  printingColour: 'printing-colour', // Corrected from 'printing-color'
  printingInfoRequired: 'printing-information-required', // Corrected
  requiredBestBeforeDate: 'required-best-before-date',
  dateFormatting: 'formate-of-dates', // Corrected from 'date-formatting'
  
  // Shipper sticker
  shipperSticker: 'shipper-sticker',
  shipperStickerUrl: 'shipper-sticker-url', // Added missing field
  shipperStickerCount: 'number-of-shipper-stickers-on-carton', // Corrected from 'num-shipper-stickers'
  
  // Approval
  approvalStatus: 'approval-status',
  customerApprovalStatus: 'customer-approval-status',
  customerRequestedChanges: 'customer-requested-changes',
  approvedByName: 'approved-by-2', // Corrected from 'approved-by-name'
  approvalDate: 'approval-date',
  signature: 'signature',
  emailForApproval: 'email-address-to-send-for-approval', // Corrected
  action: 'action'
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
      const customerField = getFieldValueByExternalId(item, FIELD_EXTERNAL_IDS.customer);
      let customerName = 'Unknown Customer';
      let customerItemId = null;
      
      if (customerField && Array.isArray(customerField) && customerField.length > 0) {
        customerName = customerField[0]?.title || 'Unknown Customer';
        customerItemId = customerField[0]?.item_id;
      }
      
      // Get the product name field value
      const productName = getFieldValueByExternalId(item, FIELD_EXTERNAL_IDS.productName) || 'Unnamed Product';
      
      // Get the status field value and convert to our app's status format with simplified handling
      const podioStatus = getFieldValueByExternalId(item, FIELD_EXTERNAL_IDS.approvalStatus);
      const statusText = 'Pending Approval'; // Default status
      
      // Map to our app's status format
      const status: SpecStatus = mapPodioStatusToAppStatus(
        typeof podioStatus === 'string' ? podioStatus : statusText
      );
      
      // Get the customer approval status with simplified handling
      const customerApprovalStatus = getFieldValueByExternalId(item, FIELD_EXTERNAL_IDS.customerApprovalStatus);
      const approvalStatusText = typeof customerApprovalStatus === 'string' ? customerApprovalStatus : 'Pending';
      
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
        productCode: getFieldValueByExternalId(item, FIELD_EXTERNAL_IDS.productCode) || '',
        umfMgo: getFieldValueByExternalId(item, FIELD_EXTERNAL_IDS.umfMgo) || '',
        honeyType: getFieldValueByExternalId(item, FIELD_EXTERNAL_IDS.honeyType) || '',
        jarSize: getFieldValueByExternalId(item, FIELD_EXTERNAL_IDS.jarSize) || '',
        jarColour: getFieldValueByExternalId(item, FIELD_EXTERNAL_IDS.jarColour) || '',
        jarMaterial: getFieldValueByExternalId(item, FIELD_EXTERNAL_IDS.jarMaterial) || '',
        lidSize: getFieldValueByExternalId(item, FIELD_EXTERNAL_IDS.lidSize) || '',
        lidColour: getFieldValueByExternalId(item, FIELD_EXTERNAL_IDS.lidColour) || '',
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
    
    // Extract basic item properties
    const podioId = response.item_id;
    const title = response.title || 'Untitled Packing Spec';
    const created = response.created_on || '';
    const updated = response.last_event_on || '';
    
    // Build the link to the packing spec in Podio
    const link = `https://podio.com/nzhoneygroup/packing-specifications/apps/packing-specifications/items/${podioId}`;
    
    // Get the customer field value (ref to another item)
    const customerField = getFieldValueByExternalId(response, FIELD_EXTERNAL_IDS.customer);
    let customerName = 'Unknown Customer';
    let customerItemId = null;
    
    if (customerField && Array.isArray(customerField) && customerField.length > 0) {
      customerName = customerField[0]?.title || 'Unknown Customer';
      customerItemId = customerField[0]?.item_id;
    }
    
    // Get the product name field value
    const productName = getFieldValueByExternalId(response, FIELD_EXTERNAL_IDS.productName) || 'Unnamed Product';
    
    // Get the status field value and convert to our app's status format with simplified handling
    const podioStatus = getFieldValueByExternalId(response, FIELD_EXTERNAL_IDS.approvalStatus);
    const statusText = 'Pending Approval'; // Default status
    
    // Map to our app's status format - simplified handling to avoid null issues
    const status: SpecStatus = mapPodioStatusToAppStatus(
      typeof podioStatus === 'string' ? podioStatus : statusText
    );
    
    // Get the customer approval status with simplified handling
    const customerApprovalStatus = getFieldValueByExternalId(response, FIELD_EXTERNAL_IDS.customerApprovalStatus);
    const approvalStatusText = typeof customerApprovalStatus === 'string' ? customerApprovalStatus : 'Pending';
    
    // Extract files if any
    const files = response.files ? response.files.map((file: any) => ({
      id: file.file_id,
      name: file.name,
      link: file.link
    })) : [];
    
    // Process images 
    const images = extractPodioImages(response);
    
    // Extract all relevant fields into details object
    const details = {
      // Customer info
      customer: customerName,
      customerId: customerItemId,
      
      // Basic product info
      product: productName,
      productCode: getFieldValueByExternalId(response, FIELD_EXTERNAL_IDS.productCode),
      versionNumber: getFieldValueByExternalId(response, FIELD_EXTERNAL_IDS.versionNumber),
      updatedBy: getFieldValueByExternalId(response, FIELD_EXTERNAL_IDS.updatedBy),
      dateReviewed: getFieldValueByExternalId(response, FIELD_EXTERNAL_IDS.dateReviewed),
      
      // Honey specifications
      umfMgo: getFieldValueByExternalId(response, FIELD_EXTERNAL_IDS.umfMgo),
      honeyType: getFieldValueByExternalId(response, FIELD_EXTERNAL_IDS.honeyType),
      allergenType: getFieldValueByExternalId(response, FIELD_EXTERNAL_IDS.allergenType),
      ingredientType: getFieldValueByExternalId(response, FIELD_EXTERNAL_IDS.ingredientType),
      
      // Market and requirements
      customerRequirements: getFieldValueByExternalId(response, FIELD_EXTERNAL_IDS.customerRequirements),
      countryOfEligibility: getFieldValueByExternalId(response, FIELD_EXTERNAL_IDS.countryOfEligibility),
      otherMarkets: getFieldValueByExternalId(response, FIELD_EXTERNAL_IDS.otherMarkets),
      testingRequirements: getFieldValueByExternalId(response, FIELD_EXTERNAL_IDS.testingRequirements),
      regulatoryRequirements: getFieldValueByExternalId(response, FIELD_EXTERNAL_IDS.regulatoryRequirements),
      
      // Packaging specifications
      jarColor: getFieldValueByExternalId(response, FIELD_EXTERNAL_IDS.jarColour),
      jarMaterial: getFieldValueByExternalId(response, FIELD_EXTERNAL_IDS.jarMaterial),
      jarShape: getFieldValueByExternalId(response, FIELD_EXTERNAL_IDS.jarShape),
      jarSize: getFieldValueByExternalId(response, FIELD_EXTERNAL_IDS.jarSize),
      lidSize: getFieldValueByExternalId(response, FIELD_EXTERNAL_IDS.lidSize),
      lidColor: getFieldValueByExternalId(response, FIELD_EXTERNAL_IDS.lidColour),
      onTheGoPackaging: getFieldValueByExternalId(response, FIELD_EXTERNAL_IDS.onTheGoPackaging),
      pouchSize: getFieldValueByExternalId(response, FIELD_EXTERNAL_IDS.pouchSize),
      sealInstructions: getFieldValueByExternalId(response, FIELD_EXTERNAL_IDS.sealInstructions),
      
      // Shipping details
      shipperSize: getFieldValueByExternalId(response, FIELD_EXTERNAL_IDS.shipperSize),
      customisedCartonType: getFieldValueByExternalId(response, FIELD_EXTERNAL_IDS.customisedCartonType),
      palletType: getFieldValueByExternalId(response, FIELD_EXTERNAL_IDS.palletType),
      cartonsPerLayer: getFieldValueByExternalId(response, FIELD_EXTERNAL_IDS.cartonsPerLayer),
      layersPerPallet: getFieldValueByExternalId(response, FIELD_EXTERNAL_IDS.layersPerPallet),
      palletSpecifications: getFieldValueByExternalId(response, FIELD_EXTERNAL_IDS.palletSpecifications),
      palletDocuments: getFieldValueByExternalId(response, FIELD_EXTERNAL_IDS.palletDocuments),
      
      // Label information
      labelCode: getFieldValueByExternalId(response, FIELD_EXTERNAL_IDS.labelCode),
      labelSpecification: getFieldValueByExternalId(response, FIELD_EXTERNAL_IDS.labelSpecification),
      label: getFieldValueByExternalId(response, FIELD_EXTERNAL_IDS.label),
      labelUrl: getFieldValueByExternalId(response, FIELD_EXTERNAL_IDS.labelUrl),
      labelLink: getFieldValueByExternalId(response, FIELD_EXTERNAL_IDS.labelLink),
      printingInfoLocation: getFieldValueByExternalId(response, FIELD_EXTERNAL_IDS.printingInfoLocation),
      printingColor: getFieldValueByExternalId(response, FIELD_EXTERNAL_IDS.printingColour),
      printingInfoRequired: getFieldValueByExternalId(response, FIELD_EXTERNAL_IDS.printingInfoRequired),
      requiredBestBeforeDate: getFieldValueByExternalId(response, FIELD_EXTERNAL_IDS.requiredBestBeforeDate),
      dateFormatting: getFieldValueByExternalId(response, FIELD_EXTERNAL_IDS.dateFormatting),
      shipperSticker: getFieldValueByExternalId(response, FIELD_EXTERNAL_IDS.shipperSticker),
      shipperStickerUrl: getFieldValueByExternalId(response, FIELD_EXTERNAL_IDS.shipperStickerUrl),
      shipperStickerCount: getFieldValueByExternalId(response, FIELD_EXTERNAL_IDS.shipperStickerCount),
      
      // Approval details
      customerApprovalStatus: approvalStatusText,
      customerRequestedChanges: getFieldValueByExternalId(response, FIELD_EXTERNAL_IDS.customerRequestedChanges),
      approvedByName: getFieldValueByExternalId(response, FIELD_EXTERNAL_IDS.approvedByName),
      approvalDate: getFieldValueByExternalId(response, FIELD_EXTERNAL_IDS.approvalDate),
      signature: getFieldValueByExternalId(response, FIELD_EXTERNAL_IDS.signature),
      emailForApproval: getFieldValueByExternalId(response, FIELD_EXTERNAL_IDS.emailForApproval),
      action: getFieldValueByExternalId(response, FIELD_EXTERNAL_IDS.action)
    };
    
    // Build the complete PackingSpec structure
    const packingSpec = {
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
      description: 'Packing specification',
      createdAt: created,
      details,
      images,
      // Include the raw Podio response for debugging if needed
      _podioResponse: response
    };
    
    console.log('Processed packing spec details with field count:', 
      Object.keys(details).filter(key => details[key] !== null && details[key] !== undefined).length);
    
    return packingSpec;
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
      [FIELD_EXTERNAL_IDS.customerApprovalStatus]: status
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
