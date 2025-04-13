
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
  const { isAuthenticated, user } = useAuth();
  const [specs, setSpecs] = useState<PackingSpec[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRateLimitReached, setIsRateLimitReached] = useState(false);
  const { toast } = useToast();
  const fetchInProgressRef = useRef(false);

  // Fetch function with debouncing and error handling
  const fetchSpecs = useCallback(async (forceRefresh = false) => {
    if (!isAuthenticated) {
      return;
    }
    
    // Prevent duplicate calls
    if (fetchInProgressRef.current && !forceRefresh) {
      return;
    }
    
    // Get the user's podioItemId if available
    const contactId = user?.podioItemId;
    
    fetchInProgressRef.current = true;
    setLoading(true);
    
    try {
      // Call the API function with the contactId if available
      const data = await getPackingSpecsForContact(contactId);
      
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
        } else {
          setSpecs([]);
        }
      }
    } catch (error) {
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
      
      // Fallback to cached data
      const cachedData = localStorage.getItem('cached_packing_specs');
      if (cachedData) {
        setSpecs(JSON.parse(cachedData));
      }
    } finally {
      setLoading(false);
      fetchInProgressRef.current = false;
    }
  }, [isAuthenticated, toast, user?.podioItemId]);

  // Initial data loading effect
  useEffect(() => {
    if (isAuthenticated) {
      fetchSpecs();
    }
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
