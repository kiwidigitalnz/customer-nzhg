
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getPackingSpecsForContact } from '../services/podioApi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PackageCheck, LogOut, Loader2, Building } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import PackingSpecList from './PackingSpecList';
import { useToast } from '@/components/ui/use-toast';

interface PackingSpec {
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  details: {
    product: string;
    batchSize?: string;
    packagingType?: string;
    specialRequirements?: string;
    [key: string]: any; // Allow additional fields
  };
}

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [specs, setSpecs] = useState<PackingSpec[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchSpecs = async () => {
      if (user) {
        setLoading(true);
        try {
          const data = await getPackingSpecsForContact(user.id);
          setSpecs(data);
        } catch (error) {
          console.error('Error fetching specs:', error);
          toast({
            title: 'Error',
            description: 'Failed to load your packing specifications',
            variant: 'destructive',
          });
        } finally {
          setLoading(false);
        }
      }
    };

    fetchSpecs();
  }, [user, toast]);

  const pendingSpecs = specs.filter(spec => spec.status === 'pending');
  const approvedSpecs = specs.filter(spec => spec.status === 'approved');
  const rejectedSpecs = specs.filter(spec => spec.status === 'rejected');

  const refreshSpecs = async () => {
    if (user) {
      setLoading(true);
      const data = await getPackingSpecsForContact(user.id);
      setSpecs(data);
      setLoading(false);
    }
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
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border-2 border-primary/20">
            {user?.logoUrl ? (
              <AvatarImage 
                src={user.logoUrl} 
                alt={user?.name || 'Company Logo'} 
                onError={(e) => {
                  e.currentTarget.src = '';
                }}
              />
            ) : null}
            <AvatarFallback className="text-xl bg-primary/10 text-primary">
              {user?.name ? getCompanyInitials(user.name) : <Building />}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold">{user?.name}</h1>
            <p className="text-muted-foreground mt-1">Manage your packing specifications</p>
          </div>
        </div>
        <Button variant="outline" onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" /> Logout
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Pending Approval</CardTitle>
            <CardDescription>Specs awaiting your review</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold flex items-center text-amber-600">
              <PackageCheck className="mr-2" />
              {pendingSpecs.length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Approved</CardTitle>
            <CardDescription>Specs you've approved</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold flex items-center text-green-600">
              {approvedSpecs.length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Rejected</CardTitle>
            <CardDescription>Specs you've rejected</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold flex items-center text-red-600">
              {rejectedSpecs.length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="pending">Pending ({pendingSpecs.length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({approvedSpecs.length})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({rejectedSpecs.length})</TabsTrigger>
          <TabsTrigger value="all">All Specifications ({specs.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <PackingSpecList 
              specs={pendingSpecs} 
              onUpdate={refreshSpecs} 
            />
          )}
        </TabsContent>
        
        <TabsContent value="approved">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <PackingSpecList 
              specs={approvedSpecs} 
              onUpdate={refreshSpecs} 
              readOnly
            />
          )}
        </TabsContent>
        
        <TabsContent value="rejected">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <PackingSpecList 
              specs={rejectedSpecs} 
              onUpdate={refreshSpecs} 
              readOnly
            />
          )}
        </TabsContent>
        
        <TabsContent value="all">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
