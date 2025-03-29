
// This file handles all interactions with the Podio API

interface PodioCredentials {
  username: string;
  password: string;
}

interface ContactData {
  id: number;
  name: string;
  email: string;
  username: string;
}

interface PackingSpec {
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  details: {
    product: string;
    batchSize: string;
    packagingType: string;
    specialRequirements?: string;
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

// This function would be replaced with an actual API call to Podio
export const authenticateUser = async (credentials: PodioCredentials): Promise<ContactData | null> => {
  try {
    console.log('Authenticating with Podio...', credentials);
    
    // For development, we'll simulate a successful authentication
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
    
    // Check if credentials match our mock data
    const contact = MOCK_CONTACTS.find(c => 
      c.username === credentials.username && 
      credentials.password === 'password' // In the mock, any password 'password' works
    );
    
    if (contact) {
      return contact;
    }
    
    return null;
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
};

// This function would be replaced with an actual API call to Podio
export const getPackingSpecsForContact = async (contactId: number): Promise<PackingSpec[]> => {
  try {
    console.log('Fetching packing specs for contact ID:', contactId);
    
    // Check if we have Podio API access
    if (hasValidPodioTokens()) {
      try {
        // This would be replaced with actual API endpoint when you have the Podio app structure
        // const data = await callPodioApi('app/{app_id}/filter/');
        console.log('Using Podio API for packing specs');
        
        // For now, still return mock data
        await new Promise(resolve => setTimeout(resolve, 800)); // Simulate network delay
        return MOCK_SPECS;
      } catch (error) {
        console.warn('Failed to fetch from Podio API, using mock data:', error);
      }
    }
    
    // For development, we'll return mock data
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate network delay
    return MOCK_SPECS;
  } catch (error) {
    console.error('Error fetching packing specs:', error);
    return [];
  }
};

// This function would be replaced with an actual API call to Podio
export const updatePackingSpecStatus = async (
  specId: number, 
  status: 'approved' | 'rejected', 
  comments?: string
): Promise<boolean> => {
  try {
    console.log(`Updating packing spec ${specId} to ${status}`, comments ? `with comments: ${comments}` : '');
    
    // Check if we have Podio API access
    if (hasValidPodioTokens()) {
      try {
        // This would be replaced with actual API endpoint when you have the Podio item structure
        // const endpoint = `item/${specId}`;
        // await callPodioApi(endpoint, {
        //   method: 'PUT',
        //   body: JSON.stringify({
        //     fields: {
        //       status: status,
        //       comments: comments || ''
        //     }
        //   })
        // });
        console.log('Using Podio API for updating packing spec');
        
        // For now, still simulate a successful update
        await new Promise(resolve => setTimeout(resolve, 1200)); // Simulate network delay
        return true;
      } catch (error) {
        console.warn('Failed to update via Podio API:', error);
        return false;
      }
    }
    
    // For development, we'll simulate a successful update
    await new Promise(resolve => setTimeout(resolve, 1200)); // Simulate network delay
    return true;
  } catch (error) {
    console.error('Error updating packing spec:', error);
    return false;
  }
};

// Function to check if Podio API is configured
export const isPodioConfigured = (): boolean => {
  return hasValidPodioTokens();
};

