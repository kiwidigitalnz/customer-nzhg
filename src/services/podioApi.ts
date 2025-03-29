
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

// This function would be replaced with an actual API call to Podio
export const authenticateUser = async (credentials: PodioCredentials): Promise<ContactData | null> => {
  try {
    console.log('Authenticating with Podio...', credentials);
    
    // This is where the actual API call would happen
    // const response = await fetch('https://api.podio.com/authenticate', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(credentials)
    // });
    // const data = await response.json();
    
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
    
    // This is where the actual API call would happen
    // const response = await fetch(`https://api.podio.com/contacts/${contactId}/packing-specs`);
    // const data = await response.json();
    
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
    
    // This is where the actual API call would happen
    // const response = await fetch(`https://api.podio.com/packing-specs/${specId}/status`, {
    //   method: 'PUT',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ status, comments })
    // });
    
    // For development, we'll simulate a successful update
    await new Promise(resolve => setTimeout(resolve, 1200)); // Simulate network delay
    
    return true;
  } catch (error) {
    console.error('Error updating packing spec:', error);
    return false;
  }
};
