// Stub implementation of Podio auth with no real authentication

// Constants for compatibility with existing code
export const PODIO_CONTACTS_APP_ID = "app-id-placeholder";
export const PODIO_PACKING_SPEC_APP_ID = "app-id-placeholder";

// Contact field IDs for the Podio Contacts app (kept for reference)
export const CONTACT_FIELD_IDS = {
  email: 233245358,
  name: 233245352,
  businessContactName: 233246154,
  phone: 233245357,
  address: 233245358,
  website: 233246156,
  logo: 271291962,
  logoUrl: 271291967,
  username: 271281606,
  password: 271280804
};

// Packing Spec field IDs for the Podio Packing Spec app
export const PACKING_SPEC_FIELD_IDS = {
  id: 265909594,
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
  jarColor: 265952439,
  jarMaterial: 265952440,
  jarShape: 265952442,
  jarSize: 265952441,
  lidSize: 265954653,
  lidColor: 265954652,
  onTheGoPackaging: 266035012,
  pouchSize: 266035907,
  sealInstructions: 265959436,
  shipperSize: 265957893,
  customisedCartonType: 266035908,
  labelCode: 265958873,
  labelSpecification: 265959137,
  label: 265951584,
  labelLink: 267537366,
  printingInfoLocation: 265958021,
  printingColor: 265960110,
  printingInfoRequired: 265909779,
  requiredBestBeforeDate: 265909780,
  dateFormatting: 265951583,
  shipperSticker: 265957894,
  numShipperStickers: 267533778,
  palletType: 265958228,
  cartonsPerLayer: 265958229,
  layersPerPallet: 265958230,
  palletSpecs: 265958640,
  palletDocuments: 265958841,
  customerApprovalStatus: 266244157,
  customerRequestedChanges: 266244158,
  approvedByName: 265959428,
  approvalDate: 266244156,
  signature: 265959139,
  emailForApproval: 265959429,
  action: 265959430,
  updatedBy2: 271320234
};

// Stub functions that do nothing but maintain the API
export const clearTokens = () => console.log("clearTokens called (no-op)");
export const refreshPodioToken = async () => true;
export const authenticateWithClientCredentials = async () => true;
export const validateContactsAppAccess = async () => true;
export const isPodioConfigured = () => true;
export const hasValidTokens = () => true;
export const authenticateUser = async () => ({ 
  id: 1, 
  name: "Test User", 
  email: "test@example.com",
  username: "testuser"
});
export const callPodioApi = async () => ({ items: [] });

// Rate limiting stubs
export const isRateLimited = () => false;
export const isRateLimitedWithInfo = () => ({
  isLimited: false,
  limitUntil: 0,
  lastEndpoint: null
});
export const setRateLimit = () => console.log("setRateLimit called (no-op)");
export const clearRateLimit = () => console.log("clearRateLimit called (no-op)");
export const clearRateLimitInfo = () => console.log("clearRateLimitInfo called (no-op)");

// User data caching stubs
export const cacheUserData = () => console.log("cacheUserData called (no-op)");
export const getCachedUserData = () => null;
