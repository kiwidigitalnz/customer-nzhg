
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './use-toast';
import { 
  getPackingSpecsForContact, 
  PackingSpec,
  cacheUserData,
  getCachedUserData
} from '../services/podioApi';
import { SpecStatus } from '@/components/packing-spec/StatusBadge';

interface CategorizedSpecs {
  pending: PackingSpec[];
  approved: PackingSpec[];
  changesRequested: PackingSpec[];
  all: PackingSpec[];
}

const CACHE_KEY = 'packing_specs_data';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

export function usePackingSpecs() {
  const { isAuthenticated, user } = useAuth();
  const [specs, setSpecs] = useState<PackingSpec[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRateLimitReached, setIsRateLimitReached] = useState(false);
  const [isUsingCachedData, setIsUsingCachedData] = useState(false);
  const { toast } = useToast();
  const fetchInProgressRef = useRef(false);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

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
    setIsUsingCachedData(false);
    
    try {
      // Reset error state
      setError(null);
      
      // Call the API function with the contactId if available
      const data = await getPackingSpecsForContact(contactId);
      
      // Process the data
      if (Array.isArray(data) && data.length > 0) {
        setSpecs(data);
        // Cache the data for fallback
        cacheUserData(CACHE_KEY, {
          timestamp: Date.now(),
          data
        });
        setIsRateLimitReached(false);
        retryCountRef.current = 0; // Reset retry counter on success
      } else {
        // Check for cached data first from our improved cache
        const cachedData = getCachedUserData(CACHE_KEY);
        if (cachedData) {
          setSpecs(cachedData.data);
          setIsUsingCachedData(true);
          toast({
            title: 'Using cached data',
            description: 'No new data available. Showing previously cached data.',
            duration: 4000,
          });
        } else {
          // Fallback to localStorage if needed
          const legacyCache = localStorage.getItem('cached_packing_specs');
          if (legacyCache) {
            setSpecs(JSON.parse(legacyCache));
            setIsUsingCachedData(true);
          } else {
            setSpecs([]);
          }
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
            description: 'Too many requests. Using cached data where available.',
            variant: 'destructive',
            duration: 5000,
          });
          
          // Try to use cached data
          const cachedData = getCachedUserData(CACHE_KEY);
          if (cachedData) {
            setSpecs(cachedData.data);
            setIsUsingCachedData(true);
          } else {
            // Fallback to localStorage
            const legacyCache = localStorage.getItem('cached_packing_specs');
            if (legacyCache) {
              setSpecs(JSON.parse(legacyCache));
              setIsUsingCachedData(true);
            }
          }
        } else if (error.message.includes('network') || error.message.includes('connection')) {
          // Handle network errors with automatic retry logic
          if (retryCountRef.current < maxRetries) {
            retryCountRef.current++;
            
            const retryDelay = Math.pow(2, retryCountRef.current) * 1000; // Exponential backoff
            
            toast({
              title: 'Connection Issue',
              description: `Retrying in ${retryDelay/1000} seconds... (Attempt ${retryCountRef.current}/${maxRetries})`,
              duration: retryDelay - 500,
            });
            
            // Set a timeout for retry
            setTimeout(() => {
              fetchSpecs(true);
            }, retryDelay);
          } else {
            // Max retries reached, display error and use cached data
            toast({
              title: 'Network Error',
              description: 'Could not connect to the server after multiple attempts. Using cached data if available.',
              variant: 'destructive',
              duration: 5000,
            });
            
            // Try to use cached data
            const cachedData = getCachedUserData(CACHE_KEY);
            if (cachedData) {
              setSpecs(cachedData.data);
              setIsUsingCachedData(true);
            } else {
              // Fallback to localStorage
              const legacyCache = localStorage.getItem('cached_packing_specs');
              if (legacyCache) {
                setSpecs(JSON.parse(legacyCache));
                setIsUsingCachedData(true);
              }
            }
          }
        } else {
          // General error
          toast({
            title: 'Error',
            description: 'Failed to load packing specifications: ' + error.message,
            variant: 'destructive',
            duration: 5000,
          });
          
          // Try to use cached data
          const cachedData = getCachedUserData(CACHE_KEY);
          if (cachedData) {
            setSpecs(cachedData.data);
            setIsUsingCachedData(true);
          } else {
            // Fallback to localStorage
            const legacyCache = localStorage.getItem('cached_packing_specs');
            if (legacyCache) {
              setSpecs(JSON.parse(legacyCache));
              setIsUsingCachedData(true);
            }
          }
        }
      } else {
        setError('Unknown error occurred');
        toast({
          title: 'Error',
          description: 'An unexpected error occurred while loading specifications',
          variant: 'destructive',
          duration: 5000,
        });
        
        // Try to use cached data
        const cachedData = getCachedUserData(CACHE_KEY);
        if (cachedData) {
          setSpecs(cachedData.data);
          setIsUsingCachedData(true);
        } else {
          // Fallback to localStorage
          const legacyCache = localStorage.getItem('cached_packing_specs');
          if (legacyCache) {
            setSpecs(JSON.parse(legacyCache));
            setIsUsingCachedData(true);
          }
        }
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
    isUsingCachedData,
    refetch: (forceRefresh = true) => fetchSpecs(forceRefresh)
  };
}
