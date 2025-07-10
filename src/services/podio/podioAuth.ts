// Legacy Podio configuration - kept for compatibility

// Constants
export const PODIO_CONTACTS_APP_ID = '26969025';
export const PODIO_PACKING_SPEC_APP_ID = '29797638';

// Contact field IDs for the Podio Contacts app
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

// Check if Podio is configured (legacy function)
export const isPodioConfigured = (): boolean => {
  return false; // Always false since OAuth is removed
};

// Check if Podio is properly configured for authentication
export const isPodioProperlyConfigured = (): boolean => {
  return false; // Always return false since OAuth is removed
};

// Legacy token refresh function - no longer functional
export const refreshPodioToken = async (): Promise<boolean> => {
  console.warn('Token refresh disabled - OAuth removed');
  return false;
};

// Legacy token refresh setup - no longer functional
export const setupTokenRefreshInterval = (): void => {
  console.warn('Token refresh setup disabled - OAuth removed');
};

// Legacy cleanup function
export const cleanupTokenRefreshInterval = (): void => {
  console.warn('Token refresh cleanup disabled - OAuth removed');
};

// Legacy connection error functions
export const resetConnectionError = (): void => {
  console.warn('Connection error reset disabled - OAuth removed');
};

export const isInConnectionErrorState = (): boolean => {
  return false;
};

export const getRetryStatus = () => {
  return { authRetries: 0, tokenRetries: 0, maxAuthRetries: 0, maxTokenRetries: 0 };
};

// Legacy authentication function - no longer functional
export const authenticateUser = async (username: string, password: string): Promise<any> => {
  throw new Error('Authentication disabled - OAuth removed. Please contact administrator.');
};

// Legacy authentication check
export const isAuthenticated = (): boolean => {
  return false;
};

// Legacy cache functions
export const cacheUserData = (key: string, data: any): void => {
  console.warn('User data caching disabled - OAuth removed');
};

export const getCachedUserData = (key: string): any => {
  return null;
};

// Legacy API call function - no longer functional
export const callPodioApi = async (endpoint: string, options: any = {}): Promise<any> => {
  throw new Error('Podio API calls disabled - OAuth removed. Please contact administrator.');
};

// Rate limiting functions (kept for compatibility)
export const isRateLimited = (): boolean => {
  return false;
};

export const isRateLimitedWithInfo = (): { isLimited: boolean; limitUntil: number; lastEndpoint: string | null } => {
  return {
    isLimited: false,
    limitUntil: 0,
    lastEndpoint: null
  };
};

export const setRateLimit = (endpoint?: string): void => {
  console.warn('Rate limiting disabled - OAuth removed');
};

export const clearRateLimit = (): void => {
  console.warn('Rate limit clearing disabled - OAuth removed');
};

export const clearRateLimitInfo = (): void => {
  console.warn('Rate limit info clearing disabled - OAuth removed');
};

// Legacy OAuth functions
export const authenticateWithClientCredentials = async (): Promise<boolean> => {
  console.warn('OAuth authentication disabled - OAuth removed');
  return false;
};

export const validateContactsAppAccess = async (): Promise<boolean> => {
  console.warn('Contacts app validation disabled - OAuth removed');
  return false;
};

// Helper function to check if current page is auth/setup related
export const isAuthOrSetupPage = (path: string): boolean => {
  const authPaths = ['/login', '/podio-setup', '/podio-callback', '/auth'];
  return authPaths.some(authPath => path.startsWith(authPath));
};

// Initialize Podio authentication (now disabled)
export const initializePodioAuth = (): void => {
  console.warn('Podio auth initialization disabled - OAuth removed');
};

// Legacy clear tokens function
export const clearTokens = (): void => {
  console.warn('Clear tokens disabled - OAuth removed');
};