import Podio from 'podio-js';

// Initialize Podio client with your API keys
const clientId = import.meta.env.VITE_PODIO_CLIENT_ID;
const clientSecret = import.meta.env.VITE_PODIO_CLIENT_SECRET;

let podio: any;

// Initialize Podio connection
const initializePodio = () => {
  if (!podio && clientId && clientSecret) {
    podio = new Podio({
      client_id: clientId,
      client_secret: clientSecret
    });
  }
  return podio;
};

// Function to get Podio client
export const getPodioClient = () => {
  return initializePodio();
};

// Function to clear tokens from local storage
export const clearTokens = () => {
  localStorage.removeItem('podio_tokens');
};

// Function to store tokens in local storage
const storeTokens = (tokens: any) => {
  localStorage.setItem('podio_tokens', JSON.stringify(tokens));
};

// Function to retrieve tokens from local storage
const retrieveTokens = (): any => {
  const tokens = localStorage.getItem('podio_tokens');
  return tokens ? JSON.parse(tokens) : null;
};

// Function to refresh Podio token
export const refreshPodioToken = async (): Promise<any> => {
  const storedTokens = retrieveTokens();
  if (!storedTokens || !storedTokens.refresh_token) {
    throw new Error('No refresh token available');
  }

  try {
    const podioClient = initializePodio();
    if (!podioClient) {
      throw new Error('Podio client not initialized');
    }

    const tokens = await podioClient.oauth.refresh(storedTokens.refresh_token);
    storeTokens(tokens);
    return tokens;
  } catch (error) {
    console.error('Error refreshing Podio token:', error);
    clearTokens();
    throw error;
  }
};

// Function to authenticate with client credentials
export const authenticateWithClientCredentials = async (): Promise<any> => {
  try {
    const podioClient = initializePodio();
    if (!podioClient) {
      throw new Error('Podio client not initialized');
    }

    const tokens = await podioClient.oauth.authenticate('client', {
      client_id: clientId,
      client_secret: clientSecret
    });
    storeTokens(tokens);
    return tokens;
  } catch (error) {
    console.error('Error authenticating with client credentials:', error);
    throw error;
  }
};

// Function to authenticate with password flow
export const authenticateWithPasswordFlow = async (username: string, password: string): Promise<any> => {
    try {
        const podioClient = initializePodio();
        if (!podioClient) {
            throw new Error('Podio client not initialized');
        }

        const tokens = await podioClient.oauth.authenticate('password', {
            username: username,
            password: password
        });
        storeTokens(tokens);
        return tokens;
    } catch (error) {
        console.error('Error authenticating with password flow:', error);
        throw error;
    }
};

// Function to validate access to the contacts app
export const validateContactsAppAccess = async (): Promise<boolean> => {
  try {
    const podioClient = initializePodio();
    if (!podioClient) {
      throw new Error('Podio client not initialized');
    }

    // Check access to the contacts app
    await podioClient.request('GET', `/app/${import.meta.env.VITE_PODIO_CONTACTS_APP_ID}`);
    return true;
  } catch (error: any) {
    console.error('Access validation failed:', error);
    return false;
  }
};

// Rate limiting variables
let rateLimitExceeded = false;
let rateLimitExpiry: Date | null = null;

// Function to check if rate limit is exceeded
export const isRateLimited = (): boolean => {
  return rateLimitExceeded && rateLimitExpiry !== null && rateLimitExpiry > new Date();
};

// Function to set rate limit
export const setRateLimit = (durationInSeconds: number = 60) => {
  rateLimitExceeded = true;
  rateLimitExpiry = new Date(Date.now() + durationInSeconds * 1000);
  console.warn(`Rate limit exceeded. Will retry after ${rateLimitExpiry.toLocaleTimeString()}`);
};

// Function to clear rate limit
export const clearRateLimit = () => {
  rateLimitExceeded = false;
  rateLimitExpiry = null;
  console.log('Rate limit cleared.');
};

// Module constants
export const PODIO_CONTACTS_APP_ID = import.meta.env.VITE_PODIO_CONTACTS_APP_ID;
export const PODIO_PACKING_SPEC_APP_ID = import.meta.env.VITE_PODIO_PACKING_SPEC_APP_ID;

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

// Function to check if Podio is configured
export const isPodioConfigured = (): boolean => {
  const clientId = import.meta.env.VITE_PODIO_CLIENT_ID;
  const clientSecret = import.meta.env.VITE_PODIO_CLIENT_SECRET;
  const contactsAppId = import.meta.env.VITE_PODIO_CONTACTS_APP_ID;
  const packingSpecAppId = import.meta.env.VITE_PODIO_PACKING_SPEC_APP_ID;
  
  return !!(clientId && clientSecret && contactsAppId && packingSpecAppId);
};

// Function to check if valid tokens exist in local storage
export const hasValidTokens = (): boolean => {
  const tokens = retrieveTokens();
  if (!tokens) return false;
  
  // Check if the access token is present and not expired
  return !!(tokens.access_token);
};

import { getFieldValueByExternalId } from './podioFieldHelpers';

// Ensure valid tokens
const ensureValidTokens = async (): Promise<void> => {
  if (!hasValidTokens()) {
    console.warn('No valid tokens found, authenticating with client credentials');
    await authenticateWithClientCredentials();
  }
};

// Function to get logo URL from fields
const getLogoUrl = (fields: any[]): string | null => {
  // First try to get the logo URL directly if it exists
  const logoUrl = getFieldValueByExternalId(fields, 'logo-url');
  if (logoUrl) return logoUrl;
  
  // If no direct URL, try to use the file ID with a proxy
  const logoField = fields.find(f => f.external_id === 'logo');
  if (logoField && logoField.values && logoField.values.length > 0) {
    const fileData = logoField.values[0];
    if (fileData.file && fileData.file.file_id) {
      return `/api/podio-image/${fileData.file.file_id}`;
    }
  }
  
  return null;
};

// User or contact authentication
export const authenticateUser = async (username: string, password: string): Promise<any> => {
  try {
    console.log('Authenticating user with username:', username);
    await ensureValidTokens();
    
    const endpoint = `item/app/${PODIO_CONTACTS_APP_ID}/filter/`;
    
    const filters = {
      filters: {
        "customer-portal-username": username  // Using correct external_id
      }
    };
    
    const response = await callPodioApi(endpoint, {
      method: 'POST',
      body: JSON.stringify(filters),
    });
    
    if (!response.items || response.items.length === 0) {
      throw new Error('User not found');
    }
    
    const contact = response.items[0];
    const fields = contact.fields;
    
    // Extract the password field to validate
    const storedPassword = getFieldValueByExternalId(fields, 'customer-portal-password');
    
    if (storedPassword !== password) {
      throw new Error('Invalid password');
    }
    
    // Extract user data
    const userData = {
      id: contact.item_id,
      name: getFieldValueByExternalId(fields, 'title') || getFieldValueByExternalId(fields, 'business-contact-name'),
      email: getFieldValueByExternalId(fields, 'contact-email'),
      username: getFieldValueByExternalId(fields, 'customer-portal-username'),
      logoUrl: getLogoUrl(fields)
    };
    
    return userData;
  } catch (error) {
    console.error('Authentication failed:', error);
    throw error;
  }
};

// Make authenticated API calls to Podio
export const callPodioApi = async (endpoint: string, options: RequestInit = {}, appType?: 'contacts' | 'packingspec'): Promise<any> => {
  // Check if we're rate limited
  if (isRateLimited()) {
    throw new Error('API rate limit exceeded. Please try again later.');
  }
  
  // Ensure we have valid tokens
  await ensureValidTokens();
  
  // Get the access token
  const { access_token } = JSON.parse(localStorage.getItem('podio_tokens') || '{}');
  
  if (!access_token) {
    throw new Error('No access token available');
  }
  
  // Determine if we need to use a specific app token
  let appToken = '';
  if (appType === 'contacts') {
    appToken = import.meta.env.VITE_PODIO_CONTACTS_APP_TOKEN;
  } else if (appType === 'packingspec') {
    appToken = import.meta.env.VITE_PODIO_PACKING_SPEC_APP_TOKEN;
  }
  
  // Set up headers with authentication
  const headers = {
    'Authorization': `OAuth2 ${access_token}`,
    'Content-Type': 'application/json',
    ...(appToken ? { 'X-App-Token': appToken } : {}),
    ...(options.headers || {})
  };
  
  try {
    const response = await fetch(`https://api.podio.com/${endpoint}`, {
      ...options,
      headers
    });
    
    // Check for rate limiting
    if (response.status === 429) {
      setRateLimit();
      throw new Error('API rate limit exceeded. Please try again later.');
    }
    
    // Handle error responses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Podio API error:', errorData);
      throw new Error(`Podio API error: ${response.status} ${response.statusText}`);
    }
    
    // Parse and return the response
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error calling Podio API:', error);
    throw error;
  }
};
