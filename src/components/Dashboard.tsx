import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';
import { 
  isPodioConfigured, 
  authenticateWithPackingSpecAppToken, 
  isRateLimited, 
  isRateLimitedWithInfo,
  getCachedUserData,
  cacheUserData
} from '../services/podioAuth';
import { getPackingSpecsForContact } from '../services/podioApi';
import { 
  AlertTriangle, 
  AlertCircle, 
  Building, 
  LogOut, 
  PackageCheck, 
  CheckCircle 
} from 'lucide-react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Tabs, 
  TabsList, 
  TabsTrigger, 
  TabsContent 
} from '@/components/ui/tabs';
import { 
  Avatar, 
  AvatarImage, 
  AvatarFallback 
} from '@/components/ui/avatar';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import RateLimitWarning from '../components/RateLimitWarning';
import PackingSpecList from '../components/PackingSpecList';
import { SpecStatus } from '../components/packing-spec/StatusBadge';

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
  const apiCallInProgress = useRef(false);
  const apiCallAttempted = useRef(false);
  const initialLoadCompleted = useRef(false);
  
  const getCacheKey = useCallback(() => {
    return user ? `packing_specs_${user.id}` : null;
  }, [user]);
  
  const ensurePackingSpecAuth = useCallback(async () => {
    if (apiCallInProgress.current || isRateLimited()) {
      console.log('Skipping pre-authentication due to ongoing API call or rate limit');
      return;
    }
    
    try {
      console.log('Pre-authenticating with Packing Spec app...');
      await authenticateWithPackingSpecAppToken();
    } catch (error) {
      console.error('Pre-authentication with Packing Spec app failed:', error);
    }
  }, []);
  
  const fetchSpecs = useCallback(async (forceRefresh = false) => {
    if (!user) {
      console.log('No user, skipping fetch');
      return;
    }
    
    if (apiCallInProgress.current) {
      console.log('API call already in progress, skipping duplicate call');
      return;
    }
    
    const cacheKey = getCacheKey();
    if (!cacheKey) {
      console.log('No cache key available, skipping fetch');
      return;
    }
    
    const rateLimitInfo = isRateLimitedWithInfo();
    if (rateLimitInfo.isLimited) {
      console.log('Rate limited, using cached data if available');
      setIsRateLimitReached(true);
      
      const cachedData = getCachedUserData(cacheKey);
      if (cachedData) {
        console.log('Using cached data during rate limit');
        setSpecs(cachedData as PackingSpec[]);
        setLoading(false);
      }
      return;
    }
    
    const now = Date.now();
    if (!forceRefresh && now - lastFetchAttempt < 30000) {
      console.log('Skipping fetch due to recent attempt');
      return;
    }
    
    if (!forceRefresh) {
      const cachedData = getCachedUserData(cacheKey);
      if (cachedData) {
        console.log('Using cached data while fetching fresh data');
        setSpecs(cachedData as PackingSpec[]);
        setLoading(false);
        
        if (!initialLoadCompleted.current) {
          initialLoadCompleted.current = true;
        }
        
        if (apiCallAttempted.current && !forceRefresh) {
          console.log('Already attempted API call, using cached data only');
          return;
        }
      }
    }
    
    setLastFetchAttempt(now);
    apiCallInProgress.current = true;
    apiCallAttempted.current = true;
    
    if (!specs.length && !isRateLimitReached) {
      setLoading(true);
    }
    
    try {
      await ensurePackingSpecAuth();
      
      console.log(`Fetching specs for contact ID: ${user.id}`);
      const data = await getPackingSpecsForContact(user.id);
      
      if (data && Array.isArray(data)) {
        console.log(`Received ${data.length} packing specs from API`);
        setSpecs(data as PackingSpec[]);
        setIsRateLimitReached(false);
        
        if (data.length > 0) {
          console.log('Caching packing specs data');
          cacheUserData(cacheKey, data);
        }
        
        initialLoadCompleted.current = true;
      } else {
        console.warn('Received invalid data from API:', data);
      }
    } catch (error) {
      console.error('Error fetching specs:', error);
      
      if (isRateLimited()) {
        setIsRateLimitReached(true);
        
        toast({
          title: 'API Rate Limit Reached',
          description: 'Too many requests. Using cached data if available.',
          variant: 'destructive',
        });
        
        const cachedData = getCachedUserData(cacheKey);
        if (cachedData) {
          setSpecs(cachedData as PackingSpec[]);
        }
      } else {
        if (!specs.length) {
          toast({
            title: 'Error',
            description: 'Failed to load your packing specifications',
            variant: 'destructive',
          });
        }
      }
    } finally {
      setLoading(false);
      apiCallInProgress.current = false;
    }
  }, [user, toast, getCacheKey, lastFetchAttempt, isRateLimitReached, specs.length, ensurePackingSpecAuth]);

  useEffect(() => {
    if (!podioConfigured) {
      toast({
        title: 'Podio Not Configured',
        description: 'Please set up Podio API credentials first',
        variant: 'destructive',
      });
      navigate('/podio-setup');
      return;
    }

    if (!user) {
      navigate('/login');
      return;
    }

    if (user && !initialLoadCompleted.current) {
      const cacheKey = getCacheKey();
      if (cacheKey) {
        const cachedData = getCachedUserData(cacheKey);
        if (cachedData) {
          console.log('Using cached data on initial load');
          setSpecs(cachedData as PackingSpec[]);
          setLoading(false);
        }
      }
      
      console.log('Performing initial fetch of packing specs');
      fetchSpecs();
    }
    
    return () => {
      apiCallAttempted.current = false;
      apiCallInProgress.current = false;
    };
  }, [user, toast, navigate, podioConfigured, fetchSpecs, getCacheKey]);

  useEffect(() => {
    const minimumRefreshInterval = 300000;
    
    if (user && 
        location.pathname === '/dashboard' && 
        location.key && 
        Date.now() - lastFetchAttempt > minimumRefreshInterval) {
      console.log('User navigated back to dashboard after 5+ minutes, refreshing specs data');
      fetchSpecs(true);
    }
  }, [location.pathname, location.key, user, fetchSpecs, lastFetchAttempt]);

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
    fetchSpecs(true);
  };

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
