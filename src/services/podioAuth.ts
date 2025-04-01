// Core authentication service for Podio integration
import { 
  getPodioClientId,
  getPodioClientSecret 
} from './podio/podioOAuth';
import { getFieldValueByExternalId } from './podio/podioFieldHelpers';

// Export all necessary functions and constants
export { 
  authenticateUser,
  isPodioConfigured,
  hasValidTokens,
  refreshPodioToken,
  callPodioApi,
  authenticateWithClientCredentials,
  validateContactsAppAccess,
  clearTokens,
  PODIO_CONTACTS_APP_ID,
  PODIO_PACKING_SPEC_APP_ID,
  CONTACT_FIELD_IDS,
  isRateLimited,
  setRateLimit,
  clearRateLimit,
  authenticateWithPasswordFlow
} from './podio/podioAuth';

// Contact field IDs for the Podio Contacts app - Updated with provided developer fields
export const CONTACT_FIELD_IDS = {
  email: 233245358,        // contact-email
  name: 233245352,         // title (business name)
  businessContactName: 233246154, // business-contact-name
  phone: 233245357,        // contact-number
  address: 233245358,      // Reusing contact-email ID as address wasn't in the provided fields
  website: 233246156,      // website
  logo: 271291962,         // logo
  logoUrl: 271291967,      // logo-url
  username: 271281606,     // customer-portal-username
  password: 271280804      // customer-portal-password
};

// Authentication functions and other exports would typically follow here
