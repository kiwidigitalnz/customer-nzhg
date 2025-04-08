import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';
import { 
  isPodioConfigured, 
  authenticateWithClientCredentials, 
  isRateLimited, 
  isRateLimitedWithInfo,
  getCachedUserData,
  cacheUserData,
  callPodioApi
} from '../services/podioApi';
import { getPackingSpecsForContact } from '../services/podioApi';
import { 
  Building, 
  LogOut, 
  PackageCheck, 
  CheckCircle,
  AlertCircle,
  Database,
  Bug
} from 'lucide-react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent,
  CardFooter
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
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
  const [debugSpecs, setDebugSpecs] = useState<any[]>([]);
  const [loadingDebug, setLoadingDebug] = useState(false);
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
      console.log('Pre-authenticating with client credentials...');
      await authenticateWithClientCredentials();
    } catch (error) {
      console.error('Pre-authentication failed:', error);
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
      
      const contactId = user.podioItemId || user.id;
      
      console.log(`Fetching specs for contact ID: ${contactId}`);
      console.log(`Using Podio Item ID: ${contactId}`);
      
      const data = await getPackingSpecsForContact(contactId);
      
      if (data && Array.isArray(data)) {
        console.log(`Received ${data.length} packing specs from API`);
        
        if (data.length > 0) {
          console.log('Sample packing spec data:', JSON.stringify(data[0]).substring(0, 500) + '...');
        }
        
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
  
  const fetchRawPackingSpecs = useCallback(async () => {
    if (!user?.podioItemId) {
      console.log('No Podio Item ID available for raw spec fetching');
      return;
    }
    
    setLoadingDebug(true);
    
    try {
      console.log(`Fetching raw packing specs for contact Podio Item ID: ${user.podioItemId}`);
      
      const packingSpecAppId = '38373557';
      
      const response = await callPodioApi(`item/app/${packingSpecAppId}/filter/`, {
        method: 'POST',
        body: JSON.stringify({
          "filters": {
            "customer-brand-name": [user.podioItemId]
          }
        })
      });
      
      if (response && response.items) {
        console.log(`Found ${response.items.length} raw packing specs`);
        setDebugSpecs(response.items);
      } else {
        console.log('No raw packing specs found or unexpected response format');
        setDebugSpecs([]);
      }
    } catch (error) {
      console.error('Error fetching raw packing specs:', error);
      toast({
        title: 'Debug Error',
        description: 'Failed to fetch raw packing specs',
        variant: 'destructive',
      });
    } finally {
      setLoadingDebug(false);
    }
  }, [user, toast]);
  
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

  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && user?.podioItemId && !debugSpecs.length) {
      console.log('Development mode detected - fetching raw packing specs');
      fetchRawPackingSpecs();
    }
  }, [user, fetchRawPackingSpecs, debugSpecs.length]);

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
    if (!name) return '';
    
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
          <Avatar className="h-16 w-16 border-2 border-primary/20 shadow-sm relative">
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
            
            {user?.podioItemId && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge className="absolute -bottom-2 -right-2 bg-primary text-xs px-2 rounded-full shadow-sm" variant="default">
                      <Database className="h-3 w-3 mr-1" />
                      {user.podioItemId}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Podio Item ID</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold text-foreground/90">Welcome, {user?.name}</h1>
            <p className="text-muted-foreground mt-1">
              Manage your packing specifications
              {user?.email && (
                <span className="ml-2 text-xs text-muted-foreground/80">({user.email})</span>
              )}
            </p>
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

      {process.env.NODE_ENV === 'development' && (
        <Card className="mb-8 bg-slate-50">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Bug className="h-4 w-4" /> User Data (Debug)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs font-mono">
            <pre className="overflow-auto max-h-40">
              {JSON.stringify({
                id: user?.id,
                podioItemId: user?.podioItemId,
                name: user?.name,
                email: user?.email,
                username: user?.username,
                logoFileId: user?.logoFileId,
                logoUrl: user?.logoUrl
              }, null, 2)}
            </pre>
          </CardContent>
          <CardFooter className="text-xs text-muted-foreground">
            This debug information is only visible in development mode
          </CardFooter>
        </Card>
      )}

      {process.env.NODE_ENV === 'development' && (
        <Card className="mb-8 bg-slate-50/80 border-slate-200">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Bug className="h-4 w-4" /> Raw Packing Specs (Debug)
            </CardTitle>
            <CardDescription>
              Using the same search approach as authentication
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs">
            {loadingDebug ? (
              <div className="py-4 flex justify-center">
                <LoadingSpinner size="sm" text="Loading raw specs data..." />
              </div>
            ) : debugSpecs.length > 0 ? (
              <div>
                <div className="mb-2 font-medium">Found {debugSpecs.length} packing specs for contact ID {user?.podioItemId}</div>
                <div className="overflow-auto max-h-60 border rounded-md">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">ID</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Title</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Created</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {debugSpecs.map((spec) => (
                        <tr key={spec.item_id} className="hover:bg-slate-50">
                          <td className="px-3 py-2 whitespace-nowrap text-xs">{spec.item_id}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs">{spec.title}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs">{new Date(spec.created_on).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="py-4 text-center text-slate-500">
                No raw packing specs found for this contact
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between text-xs text-muted-foreground">
            <span>This debug information is only visible in development mode</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchRawPackingSpecs}
              disabled={loadingDebug}
              className="h-7 text-xs"
            >
              Refresh Raw Data
            </Button>
          </CardFooter>
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
