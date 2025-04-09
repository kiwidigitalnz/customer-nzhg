
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
  const { user, isAuthenticated } = useAuth();
  const [specs, setSpecs] = useState<PackingSpec[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRateLimitReached, setIsRateLimitReached] = useState(false);
  const { toast } = useToast();

  // Mock data for development
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

  // Simplified fetch function (placeholder)
  const fetchSpecs = useCallback(async (forceRefresh = false) => {
    if (!user || !isAuthenticated) {
      console.log('No authenticated user, skipping fetch');
      return;
    }
    
    setLoading(true);
    try {
      // Simulate API call
      console.log('Placeholder: Fetching packing specs for user:', user.id);
      
      // Use actual API function but with safety wrapper
      const contactId = user.podioItemId || user.id;
      console.log(`Fetching specs for contact ID: ${contactId}`);
      
      // Uncomment the following when API is ready
      // const data = await getPackingSpecsForContact(contactId);
      
      // Use mock data for now
      const data = mockSpecs;
      
      setSpecs(data);
      setIsRateLimitReached(false);
    } catch (error) {
      console.error('Error fetching specs:', error);
      
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Unknown error occurred');
      }
      
      // Show toast notification for errors
      toast({
        title: 'Error',
        description: 'Failed to load packing specifications',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, isAuthenticated, toast]);

  // Initial data loading effect
  useEffect(() => {
    if (user && isAuthenticated) {
      fetchSpecs();
    }
    
    // Cleanup function
    return () => {
      // Any cleanup if needed
    };
  }, [user, isAuthenticated, fetchSpecs]);

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
