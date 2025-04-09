
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
  AlertCircle,
  Database
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

  const renderDebugInfo = () => {
    return (
      <Card className="mb-8 bg-slate-50 border-amber-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center">
            <Database className="h-4 w-4 mr-2 text-amber-500" /> Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs font-mono pt-0">
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Authentication:</span>
              <Badge variant={isAuthenticated ? "secondary" : "destructive"} className="text-xs">
                {isAuthenticated ? "Authenticated" : "Not Authenticated"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Connection:</span>
              <Badge variant={isRateLimitReached ? "destructive" : "secondary"} className="text-xs">
                {isRateLimitReached ? "Rate Limited" : "OK"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Data Status:</span>
              <Badge variant={specs.all.length ? "secondary" : "outline"} className="text-xs">
                {specs.all.length ? `${specs.all.length} Specs Found` : "No Specs Found"}
              </Badge>
            </div>
            {fetchError && (
              <div className="mt-2 p-2 bg-red-50 text-red-800 rounded border border-red-200 text-xs">
                <p><strong>Error:</strong> {fetchError}</p>
              </div>
            )}
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch(true)}
            className="mt-2 w-full text-xs h-7"
          >
            Refresh Data
          </Button>
        </CardContent>
      </Card>
    );
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

      {renderDebugInfo()}

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
              {specs.pending.length}
              <span className="text-sm ml-2 font-normal text-amber-700/70">
                {specs.pending.length === 1 ? 'specification' : 'specifications'}
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
              {specs.approved.length}
              <span className="text-sm ml-2 font-normal text-green-700/70">
                {specs.approved.length === 1 ? 'specification' : 'specifications'}
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
              {specs.changesRequested.length}
              <span className="text-sm ml-2 font-normal text-red-700/70">
                {specs.changesRequested.length === 1 ? 'specification' : 'specifications'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="mb-4 bg-muted/70 p-1 rounded-lg">
          <TabsTrigger value="pending" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Pending ({specs.pending.length})
          </TabsTrigger>
          <TabsTrigger value="approved" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Approved ({specs.approved.length})
          </TabsTrigger>
          <TabsTrigger value="changes" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Changes Requested ({specs.changesRequested.length})
          </TabsTrigger>
          <TabsTrigger value="all" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
            All Specifications ({specs.all.length})
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
