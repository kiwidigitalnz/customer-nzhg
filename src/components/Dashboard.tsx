
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';
import { usePackingSpecs } from '../hooks/usePackingSpecs';
import { 
  Building, 
  LogOut, 
  PackageCheck, 
  CheckCircle,
  AlertCircle
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
import { Badge } from '@/components/ui/badge';

const Dashboard = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'changes' | 'all'>('pending');
  
  // Use our hook for data fetching
  const { 
    specs,
    loading, 
    error: fetchError, 
    isRateLimitReached, 
    refetch 
  } = usePackingSpecs();
  
  if (!user || !isAuthenticated) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <LoadingSpinner 
          size="lg" 
          text="Loading..."
        />
      </div>
    );
  }

  const getCompanyInitials = (name: string) => {
    if (!name) return '';
    
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleCardClick = (tabValue: 'pending' | 'approved' | 'changes' | 'all') => {
    setActiveTab(tabValue);
  };

  return (
    <div className="container mx-auto px-4 py-8 pb-12 animate-fade-in">
      {isRateLimitReached && (
        <RateLimitWarning 
          onRetry={() => refetch(true)}
          usingCachedData={specs.all.length > 0}
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card 
          className={`bg-white border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer rounded-xl ${activeTab === 'pending' ? 'ring-2 ring-amber-400' : ''}`}
          onClick={() => handleCardClick('pending')}
        >
          <CardHeader className="p-5 pb-3">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <PackageCheck className="h-5 w-5 text-amber-600" />
              </div>
              <span className="text-3xl font-bold text-amber-600">{specs.pending.length}</span>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-0">
            <h3 className="font-semibold text-foreground">Pending Approval</h3>
            <p className="text-sm text-muted-foreground mt-0.5">Specs awaiting your review</p>
          </CardContent>
        </Card>
        
        <Card 
          className={`bg-white border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer rounded-xl ${activeTab === 'approved' ? 'ring-2 ring-green-400' : ''}`}
          onClick={() => handleCardClick('approved')}
        >
          <CardHeader className="p-5 pb-3">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <span className="text-3xl font-bold text-green-600">{specs.approved.length}</span>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-0">
            <h3 className="font-semibold text-foreground">Approved</h3>
            <p className="text-sm text-muted-foreground mt-0.5">Specs you've approved</p>
          </CardContent>
        </Card>
        
        <Card 
          className={`bg-white border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer rounded-xl ${activeTab === 'changes' ? 'ring-2 ring-red-400' : ''}`}
          onClick={() => handleCardClick('changes')}
        >
          <CardHeader className="p-5 pb-3">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <span className="text-3xl font-bold text-red-600">{specs.changesRequested.length}</span>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-0">
            <h3 className="font-semibold text-foreground">Changes Requested</h3>
            <p className="text-sm text-muted-foreground mt-0.5">Specs with changes requested</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full">
        <TabsList className="mb-5 bg-white/60 backdrop-blur-sm p-1.5 rounded-xl shadow-sm border border-gray-200">
          <TabsTrigger value="pending" className="rounded-lg px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all">
            Pending ({specs.pending.length})
          </TabsTrigger>
          <TabsTrigger value="approved" className="rounded-lg px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all">
            Approved ({specs.approved.length})
          </TabsTrigger>
          <TabsTrigger value="changes" className="rounded-lg px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all">
            Changes ({specs.changesRequested.length})
          </TabsTrigger>
          <TabsTrigger value="all" className="rounded-lg px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all">
            All ({specs.all.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending" className="focus-visible:outline-none focus-visible:ring-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="md" text="Loading pending specifications..." />
            </div>
          ) : (
            <PackingSpecList 
              specs={specs.pending} 
              onUpdate={() => refetch(true)} 
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
              specs={specs.approved} 
              onUpdate={() => refetch(true)} 
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
              specs={specs.changesRequested} 
              onUpdate={() => refetch(true)} 
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
              specs={specs.all} 
              onUpdate={() => refetch(true)} 
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;
