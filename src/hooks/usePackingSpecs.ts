
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './use-toast';
import { 
  getPackingSpecsForContact, 
  PackingSpec,
  PODIO_CATEGORIES
} from '../services/podio/podioPackingSpecs';
import { 
  isRateLimited, 
  isRateLimitedWithInfo,
  getCachedUserData,
  cacheUserData,
} from '../services/podio/podioAuth';
import { SpecStatus } from '@/components/packing-spec/StatusBadge';

// Constants
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const MIN_REFRESH_INTERVAL = 30 * 1000; // 30 seconds

interface CategorizedSpecs {
  pending: PackingSpec[];
  approved: PackingSpec[];
  changesRequested: PackingSpec[];
  all: PackingSpec[];
}

export function usePackingSpecs() {
  const { user, isAuthenticated } = useAuth();
  const [specs, setSpecs] = useState<PackingSpec[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRateLimitReached, setIsRateLimitReached] = useState(false);
  const { toast } = useToast();

  // Refs to track API call state
  const fetchInProgress = useRef(false);
  const lastFetchTimestamp = useRef(0);
  const mountedRef = useRef(true);
  const initialLoadCompleted = useRef(false);

  // Generate cache key based on user ID
  const getCacheKey = useCallback(() => {
    return user ? `packing_specs_${user.id}` : null;
  }, [user]);
  
  // Main fetch function with optimizations
  const fetchSpecs = useCallback(async (forceRefresh = false) => {
    if (!user || !isAuthenticated) {
      console.log('No authenticated user, skipping fetch');
      return;
    }
    
    if (fetchInProgress.current) {
      console.log('API call already in progress, skipping duplicate call');
      return;
    }
    
    const now = Date.now();
    const cacheKey = getCacheKey();
    
    // First, check rate limit
    const rateLimitInfo = isRateLimitedWithInfo();
    if (rateLimitInfo.isLimited) {
      console.log('Rate limited, using cached data if available');
      setIsRateLimitReached(true);
      
      const cachedData = getCachedUserData(cacheKey || '');
      if (cachedData) {
        console.log('Using cached data during rate limit');
        setSpecs(cachedData as PackingSpec[]);
        setLoading(false);
      }
      return;
    }
    
    // Then check refresh interval
    if (!forceRefresh && (now - lastFetchTimestamp.current < MIN_REFRESH_INTERVAL)) {
      console.log(`Skipping fetch due to recent attempt (${Math.round((now - lastFetchTimestamp.current) / 1000)}s ago)`);
      return;
    }
    
    // Load from cache first if available (immediate feedback)
    if (!forceRefresh) {
      const cachedData = getCachedUserData(cacheKey || '');
      const cacheTimestamp = Number(localStorage.getItem(`podio_cache_${cacheKey}_timestamp`)) || 0;
      const isCacheValid = cachedData && (now - cacheTimestamp < CACHE_DURATION);
      
      if (isCacheValid) {
        console.log('Using recent cache data while fetching in background');
        setSpecs(cachedData as PackingSpec[]);
        setLoading(false);
        initialLoadCompleted.current = true;
        
        // If cache is very fresh, don't fetch again
        if (now - cacheTimestamp < MIN_REFRESH_INTERVAL) {
          console.log('Cache is fresh, skipping network request');
          return;
        }
      }
    }
    
    // Set flags and state for fetch
    fetchInProgress.current = true;
    lastFetchTimestamp.current = now;
    setError(null);
    
    if (!specs.length && !isRateLimitReached) {
      setLoading(true);
    }
    
    try {
      const contactId = user.podioItemId || user.id;
      console.log(`Fetching specs for contact ID: ${contactId}`);
      
      // Actual data fetch - no more auth prefetch or token verification
      const data = await getPackingSpecsForContact(contactId);
      
      // Only update state if component is still mounted
      if (!mountedRef.current) return;
      
      if (data && Array.isArray(data)) {
        console.log(`Received ${data.length} packing specs from API`);
        
        if (data.length > 0) {
          cacheUserData(cacheKey || '', data);
        }
        
        setSpecs(data);
        setIsRateLimitReached(false);
        initialLoadCompleted.current = true;
      } else {
        console.warn('Received invalid data from API:', data);
        setError('Invalid data format received');
      }
    } catch (error) {
      // Only update error state if component is still mounted
      if (!mountedRef.current) return;
      
      console.error('Error fetching specs:', error);
      
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Unknown error occurred');
      }
      
      // Check if rate limited
      if (isRateLimited()) {
        setIsRateLimitReached(true);
        
        toast({
          title: 'API Rate Limit Reached',
          description: 'Using cached data if available. Please try again later.',
          variant: 'destructive',
        });
        
        // Try to use cached data
        const cachedData = getCachedUserData(cacheKey || '');
        if (cachedData) {
          setSpecs(cachedData as PackingSpec[]);
        }
      } else if (!specs.length) {
        toast({
          title: 'Error',
          description: 'Failed to load packing specifications',
          variant: 'destructive',
        });
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
      fetchInProgress.current = false;
    }
  }, [user, isAuthenticated, getCacheKey, specs.length, isRateLimitReached, toast]);

  // Initial data loading effect - simplified to avoid redundant checks
  useEffect(() => {
    mountedRef.current = true;
    
    if (user && isAuthenticated && !initialLoadCompleted.current) {
      const cacheKey = getCacheKey();
      if (cacheKey) {
        const cachedData = getCachedUserData(cacheKey);
        if (cachedData) {
          console.log('Using cached data on initial load');
          setSpecs(cachedData as PackingSpec[]);
          setLoading(false);
        }
      }
      
      // Only fetch once
      console.log('Performing initial fetch of packing specs');
      fetchSpecs();
    }
    
    return () => {
      mountedRef.current = false;
    };
  }, [user, isAuthenticated, fetchSpecs, getCacheKey]);

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
