
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './use-toast';
import { 
  getPackingSpecsForContact, 
  PackingSpec
} from '../services/podioApi';
import { SpecStatus } from '@/components/packing-spec/StatusBadge';

interface CategorizedSpecs {
  pending: PackingSpec[];
  approved: PackingSpec[];
  changesRequested: PackingSpec[];
  all: PackingSpec[];
}

export function usePackingSpecs() {
  const { isAuthenticated } = useAuth();
  const [specs, setSpecs] = useState<PackingSpec[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRateLimitReached, setIsRateLimitReached] = useState(false);
  const { toast } = useToast();
  const fetchInProgressRef = useRef(false);

  // Mock data for development and fallback
  const mockSpecs: PackingSpec[] = [
    {
      id: 1,
      title: 'Sample Packing Specification',
      productName: 'Premium Honey',
      status: 'pending-approval' as SpecStatus,
      customer: 'Test Customer',
      customerItemId: 1234,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      customerApprovalStatus: 'Pending',
      link: '#',
      description: 'Sample packing specification',
      createdAt: new Date().toISOString(),
      details: {
        product: 'Premium Honey',
        productCode: 'PH-001',
        umfMgo: 'UMF 10+',
        honeyType: 'Manuka'
      }
    }
  ];

  // Fetch function with debouncing and error handling
  const fetchSpecs = useCallback(async (forceRefresh = false) => {
    if (!isAuthenticated) {
      console.log('No authenticated user, skipping fetch');
      return;
    }
    
    // Prevent duplicate calls
    if (fetchInProgressRef.current && !forceRefresh) {
      console.log('API call already in progress, skipping duplicate call');
      return;
    }
    
    console.log('Performing fetch of all packing specs');
    fetchInProgressRef.current = true;
    setLoading(true);
    
    try {
      // Call the API function without passing contactId
      const data = await getPackingSpecsForContact();
      
      // Process the data
      if (Array.isArray(data) && data.length > 0) {
        setSpecs(data);
        // Cache the data for fallback
        localStorage.setItem('cached_packing_specs', JSON.stringify(data));
        setIsRateLimitReached(false);
      } else {
        // If no data is returned, use cached data if available
        const cachedData = localStorage.getItem('cached_packing_specs');
        if (cachedData) {
          setSpecs(JSON.parse(cachedData));
          console.log('Using cached packing specs data');
        } else {
          // Default to mock data in development
          if (process.env.NODE_ENV === 'development') {
            setSpecs(mockSpecs);
            console.log('Using mock packing specs data for development');
          } else {
            setSpecs([]);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching specs:', error);
      
      if (error instanceof Error) {
        setError(error.message);
        
        // Check for rate limiting in the error message
        if (error.message.includes('rate limit') || error.message.includes('429')) {
          setIsRateLimitReached(true);
          toast({
            title: 'Rate Limit Reached',
            description: 'Too many requests. Please try again later.',
            variant: 'destructive',
          });
          
          // Try to use cached data
          const cachedData = localStorage.getItem('cached_packing_specs');
          if (cachedData) {
            setSpecs(JSON.parse(cachedData));
            console.log('Using cached packing specs data due to rate limiting');
          } else if (process.env.NODE_ENV === 'development') {
            setSpecs(mockSpecs);
          }
        } else {
          // General error
          toast({
            title: 'Error',
            description: 'Failed to load packing specifications',
            variant: 'destructive',
          });
        }
      } else {
        setError('Unknown error occurred');
        toast({
          title: 'Error',
          description: 'An unexpected error occurred while loading specifications',
          variant: 'destructive',
        });
      }
      
      // Fallback to cached or mock data
      const cachedData = localStorage.getItem('cached_packing_specs');
      if (cachedData) {
        setSpecs(JSON.parse(cachedData));
      } else if (process.env.NODE_ENV === 'development') {
        setSpecs(mockSpecs);
      }
    } finally {
      setLoading(false);
      fetchInProgressRef.current = false;
    }
  }, [isAuthenticated, toast]);

  // Initial data loading effect
  useEffect(() => {
    if (isAuthenticated) {
      fetchSpecs();
    }
    
    // Cleanup function
    return () => {
      // Any cleanup if needed
    };
  }, [isAuthenticated, fetchSpecs]);

  // Process specs into categories
  const categorizedSpecs: CategorizedSpecs = {
    pending: specs.filter(spec => spec.status === 'pending-approval'),
    approved: specs.filter(spec => spec.status === 'approved-by-customer'),
    changesRequested: specs.filter(spec => spec.status === 'changes-requested'),
    all: specs
  };

  return {
    specs: categorizedSpecs,
    loading,
    error,
    isRateLimitReached,
    refetch: (forceRefresh = true) => fetchSpecs(forceRefresh)
  };
}
