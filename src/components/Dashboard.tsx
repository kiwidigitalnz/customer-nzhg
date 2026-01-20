
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

const cardVariants = {
  hidden: { 
    opacity: 0, 
    y: 20,
    scale: 0.95
  },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 15
    }
  }
};

const headerVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.4
    }
  }
};

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
    <div className="container mx-auto px-4 py-8 pb-12">
      {isRateLimitReached && (
        <RateLimitWarning 
          onRetry={() => refetch(true)}
          usingCachedData={specs.all.length > 0}
        />
      )}
      
      <motion.div 
        className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4"
        variants={headerVariants}
        initial="hidden"
        animate="visible"
      >
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
            <h1 className="text-3xl font-bold text-gray-900 font-raleway">Welcome, {user?.name}</h1>
            <p className="text-gray-600 mt-1 font-open">
              Manage your packing specifications
              {user?.email && (
                <span className="ml-2 text-xs text-gray-500">({user.email})</span>
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
      </motion.div>

      <motion.div 
        className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          variants={cardVariants}
          whileHover={{ y: -4, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <Card 
            className={`h-full bg-white border border-gray-100 ring-1 ring-gray-100 shadow-lg cursor-pointer rounded-xl overflow-hidden relative ${activeTab === 'pending' ? 'ring-2 ring-amber-400' : ''}`}
            onClick={() => handleCardClick('pending')}
          >
            {/* Decorative gradient orb */}
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-gradient-to-br from-amber-200/40 to-amber-400/20 rounded-full blur-2xl" />
            <CardContent className="p-5 relative">
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center shadow-sm">
                    <PackageCheck className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 font-raleway">Pending</h3>
                    <p className="text-sm text-gray-500 font-open">Awaiting review</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-6xl font-black tracking-tighter bg-gradient-to-br from-amber-500 to-amber-600 bg-clip-text text-transparent drop-shadow-sm font-raleway">
                    {specs.pending.length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          variants={cardVariants}
          whileHover={{ y: -4, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <Card 
            className={`h-full bg-white border border-gray-100 ring-1 ring-gray-100 shadow-lg cursor-pointer rounded-xl overflow-hidden relative ${activeTab === 'approved' ? 'ring-2 ring-emerald-400' : ''}`}
            onClick={() => handleCardClick('approved')}
          >
            {/* Decorative gradient orb */}
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-gradient-to-br from-emerald-200/40 to-emerald-400/20 rounded-full blur-2xl" />
            <CardContent className="p-5 relative">
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center shadow-sm">
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 font-raleway">Approved</h3>
                    <p className="text-sm text-gray-500 font-open">Completed specs</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-6xl font-black tracking-tighter bg-gradient-to-br from-emerald-500 to-emerald-600 bg-clip-text text-transparent drop-shadow-sm font-raleway">
                    {specs.approved.length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          variants={cardVariants}
          whileHover={{ y: -4, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <Card 
            className={`h-full bg-white border border-gray-100 ring-1 ring-gray-100 shadow-lg cursor-pointer rounded-xl overflow-hidden relative ${activeTab === 'changes' ? 'ring-2 ring-rose-400' : ''}`}
            onClick={() => handleCardClick('changes')}
          >
            {/* Decorative gradient orb */}
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-gradient-to-br from-rose-200/40 to-rose-400/20 rounded-full blur-2xl" />
            <CardContent className="p-5 relative">
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-rose-100 to-rose-200 flex items-center justify-center shadow-sm">
                    <AlertCircle className="h-5 w-5 text-rose-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 font-raleway">Changes</h3>
                    <p className="text-sm text-gray-500 font-open">Needs attention</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-6xl font-black tracking-tighter bg-gradient-to-br from-rose-500 to-rose-600 bg-clip-text text-transparent drop-shadow-sm font-raleway">
                    {specs.changesRequested.length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full">
        <TabsList className="mb-5 bg-gray-100 p-1.5 rounded-xl border border-gray-200">
          <TabsTrigger value="pending" className="rounded-lg px-4 text-gray-600 hover:text-gray-900 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm data-[state=active]:font-semibold transition-all">
            Pending ({specs.pending.length})
          </TabsTrigger>
          <TabsTrigger value="approved" className="rounded-lg px-4 text-gray-600 hover:text-gray-900 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm data-[state=active]:font-semibold transition-all">
            Approved ({specs.approved.length})
          </TabsTrigger>
          <TabsTrigger value="changes" className="rounded-lg px-4 text-gray-600 hover:text-gray-900 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm data-[state=active]:font-semibold transition-all">
            Changes ({specs.changesRequested.length})
          </TabsTrigger>
          <TabsTrigger value="all" className="rounded-lg px-4 text-gray-600 hover:text-gray-900 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm data-[state=active]:font-semibold transition-all">
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
