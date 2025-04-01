
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getPackingSpecsForContact, isPodioConfigured, isRateLimited } from '../services/podioApi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PackageCheck, LogOut, Building, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import PackingSpecList from './PackingSpecList';
import { useToast } from '@/hooks/use-toast';
import { useNavigate, useLocation } from 'react-router-dom';
import { SpecStatus } from './packing-spec/StatusBadge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { getCachedUserData, cacheUserData } from '../services/podioAuth';
import RateLimitWarning from './RateLimitWarning';

interface PackingSpec {
  id: number;
  title: string;
  description: string;
  status: SpecStatus;
  createdAt: string;
  details: {
    product: string;
    batchSize?: string;
    packagingType?: string;
    specialRequirements?: string;
    [key: string]: any; // Allow additional fields
  };
  comments?: Array<{
    id: number;
    text: string;
    createdBy: string;
    createdAt: string;
  }>;
}

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [specs, setSpecs] = useState<PackingSpec[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRateLimitReached, setIsRateLimitReached] = useState(false);
  const [lastFetchAttempt, setLastFetchAttempt] = useState(0);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const podioConfigured = isPodioConfigured();
  
  // Cache key for storing packing specs
  const getCacheKey = useCallback(() => {
    return user ? `packing_specs_${user.id}` : null;
  }, [user]);
  
  // Function to fetch specs data with caching and rate limit awareness
  const fetchSpecs = useCallback(async (forceRefresh = false) => {
    if (!user) return;
    
    const cacheKey = getCacheKey();
    if (!cacheKey) return;
    
    // Check if we're rate limited
    if (isRateLimited()) {
      setIsRateLimitReached(true);
      // Load from cache if available
      const cachedData = getCachedUserData(cacheKey);
      if (cachedData) {
        setSpecs(cachedData as PackingSpec[]);
        setLoading(false);
        return;
      }
      return;
    }
    
    // Check cache if not forcing refresh
    if (!forceRefresh) {
      const cachedData = getCachedUserData(cacheKey);
      if (cachedData) {
        setSpecs(cachedData as PackingSpec[]);
        setLoading(false);
        return;
      }
    }
    
    // Set timestamp for last fetch attempt to avoid multiple simultaneous calls
    const now = Date.now();
    if (now - lastFetchAttempt < 5000 && !forceRefresh) {
      console.log('Skipping fetch due to recent attempt');
      return;
    }
    
    setLastFetchAttempt(now);
    setLoading(true);
    setIsRateLimitReached(false);
    
    try {
      console.log(`Fetching specs for contact ID: ${user.id}`);
      const data = await getPackingSpecsForContact(user.id);
      setSpecs(data as PackingSpec[]);
      
      // Cache the successful response
      if (data && data.length > 0) {
        cacheUserData(cacheKey, data);
      }
    } catch (error) {
      console.error('Error fetching specs:', error);
      
      // Check if rate limited after the call
      if (isRateLimited()) {
        setIsRateLimitReached(true);
        
        toast({
          title: 'API Rate Limit Reached',
          description: 'Too many requests. Using cached data if available.',
          variant: 'destructive',
        });
        
        // Try to use cached data
        const cachedData = getCachedUserData(cacheKey);
        if (cachedData) {
          setSpecs(cachedData as PackingSpec[]);
        }
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load your packing specifications',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  }, [user, toast, getCacheKey, lastFetchAttempt]);

  // Fetch specs only on initial component mount and when user changes
  useEffect(() => {
    // Redirect to Podio setup if not configured
    if (!podioConfigured) {
      toast({
        title: 'Podio Not Configured',
        description: 'Please set up Podio API credentials first',
        variant: 'destructive',
      });
      navigate('/podio-setup');
      return;
    }

    // Redirect to login if no user
    if (!user) {
      navigate('/login');
      return;
    }

    // Only fetch if we have a user and haven't fetched recently
    if (user && Date.now() - lastFetchAttempt > 5000) {
      fetchSpecs();
    }
    
    // Return cleanup function to prevent state updates on unmounted component
    return () => {
      // No cleanup needed
    };
  }, [user, toast, navigate, podioConfigured, fetchSpecs, lastFetchAttempt]);

  // Only re-fetch on location change if explicitly navigating back to dashboard
  // and it's been at least 30 seconds since the last fetch
  useEffect(() => {
    const minimumRefreshInterval = 30000; // 30 seconds
    
    if (user && 
        location.pathname === '/dashboard' && 
        location.key && // Location key exists on navigation (not initial load)
        Date.now() - lastFetchAttempt > minimumRefreshInterval) {
      console.log('User navigated back to dashboard, refreshing specs data');
      fetchSpecs();
    }
  }, [location.pathname, location.key, user, fetchSpecs, lastFetchAttempt]);

  // If there's no user or Podio is not configured, show a loading state
  if (!user || !podioConfigured) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <LoadingSpinner 
          size="lg" 
          text="Loading..."
        />
      </div>
    );
  }

  const pendingSpecs = specs.filter(spec => spec.status === 'pending-approval');
  const approvedSpecs = specs.filter(spec => spec.status === 'approved-by-customer');
  const changesRequestedSpecs = specs.filter(spec => spec.status === 'changes-requested');

  const refreshSpecs = () => {
    fetchSpecs(true); // Force refresh
  };

  // Function to get initials from company name for avatar fallback
  const getCompanyInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      {isRateLimitReached && (
        <RateLimitWarning 
          onRetry={refreshSpecs}
          usingCachedData={specs.length > 0}
        />
      )}
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border-2 border-primary/20 shadow-sm">
            {user?.logoUrl ? (
              <AvatarImage 
                src={user.logoUrl} 
                alt={user?.name || 'Company Logo'} 
                onError={(e) => {
                  e.currentTarget.src = '';
                }}
              />
            ) : null}
            <AvatarFallback className="text-xl bg-primary/10 text-primary font-semibold">
              {user?.name ? getCompanyInitials(user.name) : <Building />}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold text-foreground/90">Welcome, {user?.name}</h1>
            <p className="text-muted-foreground mt-1">Manage your packing specifications</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          onClick={logout}
          className="transition-all hover:-translate-y-1 hover:shadow-md"
        >
          <LogOut className="mr-2 h-4 w-4" /> Logout
        </Button>
      </div>

      {!specs.length && !loading && !isRateLimitReached && (
        <Card className="mb-8 bg-amber-50 border border-amber-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
              <div>
                <h3 className="font-medium">No Packing Specifications Found</h3>
                <p className="text-sm text-muted-foreground">
                  There are currently no packing specifications linked to your account.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-card to-amber-50/50 shadow-sm border-amber-100 hover:shadow-md transition-all duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <PackageCheck className="h-5 w-5 text-amber-600" /> Pending Approval
            </CardTitle>
            <CardDescription>Specs awaiting your review</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold flex items-center text-amber-600">
              {pendingSpecs.length}
              <span className="text-sm ml-2 font-normal text-amber-700/70">
                {pendingSpecs.length === 1 ? 'specification' : 'specifications'}
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-card to-green-50/50 shadow-sm border-green-100 hover:shadow-md transition-all duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" /> Approved
            </CardTitle>
            <CardDescription>Specs you've approved</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold flex items-center text-green-600">
              {approvedSpecs.length}
              <span className="text-sm ml-2 font-normal text-green-700/70">
                {approvedSpecs.length === 1 ? 'specification' : 'specifications'}
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-card to-red-50/50 shadow-sm border-red-100 hover:shadow-md transition-all duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" /> Changes Requested
            </CardTitle>
            <CardDescription>Specs with changes requested</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold flex items-center text-red-600">
              {changesRequestedSpecs.length}
              <span className="text-sm ml-2 font-normal text-red-700/70">
                {changesRequestedSpecs.length === 1 ? 'specification' : 'specifications'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="mb-4 bg-muted/70 p-1 rounded-lg">
          <TabsTrigger value="pending" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Pending ({pendingSpecs.length})
          </TabsTrigger>
          <TabsTrigger value="approved" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Approved ({approvedSpecs.length})
          </TabsTrigger>
          <TabsTrigger value="changes" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Changes Requested ({changesRequestedSpecs.length})
          </TabsTrigger>
          <TabsTrigger value="all" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
            All Specifications ({specs.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending" className="focus-visible:outline-none focus-visible:ring-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="md" text="Loading pending specifications..." />
            </div>
          ) : (
            <PackingSpecList 
              specs={pendingSpecs} 
              onUpdate={refreshSpecs} 
            />
          )}
        </TabsContent>
        
        <TabsContent value="approved" className="focus-visible:outline-none focus-visible:ring-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="md" text="Loading approved specifications..." />
            </div>
          ) : (
            <PackingSpecList 
              specs={approvedSpecs} 
              onUpdate={refreshSpecs} 
              readOnly
            />
          )}
        </TabsContent>
        
        <TabsContent value="changes" className="focus-visible:outline-none focus-visible:ring-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="md" text="Loading specifications with requested changes..." />
            </div>
          ) : (
            <PackingSpecList 
              specs={changesRequestedSpecs} 
              onUpdate={refreshSpecs} 
              readOnly
            />
          )}
        </TabsContent>
        
        <TabsContent value="all" className="focus-visible:outline-none focus-visible:ring-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="md" text="Loading all specifications..." />
            </div>
          ) : (
            <PackingSpecList 
              specs={specs} 
              onUpdate={refreshSpecs} 
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;
