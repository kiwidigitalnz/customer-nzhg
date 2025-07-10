import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, ExternalLink } from 'lucide-react';
import MainLayout from '../components/MainLayout';

const SimplePodioSetupPage = () => {
  const navigate = useNavigate();

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Podio Integration Setup</CardTitle>
            <CardDescription>
              Podio OAuth integration has been removed
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Connection Status */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="text-sm font-medium">Connection Status</div>
              </div>
              <Badge variant="destructive" className="flex items-center gap-2">
                <AlertCircle className="h-3 w-3" />
                OAuth Removed
              </Badge>
            </div>
            
            {/* Information Display */}
            <div className="p-4 border border-orange-200 rounded-lg bg-orange-50">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                <div className="space-y-2">
                  <div className="font-medium text-orange-800">OAuth Integration Removed</div>
                  <div className="text-sm text-orange-700">
                    The Podio OAuth integration has been completely removed from this application. 
                    All OAuth-related functionality has been disabled.
                  </div>
                </div>
              </div>
            </div>
            
            <Separator />
            
            {/* Information Section */}
            <div className="space-y-3">
              <h3 className="font-medium">Integration Status</h3>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>
                  This application previously connected to Podio for managing packing specifications. 
                  The following features have been disabled:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Podio OAuth authentication</li>
                  <li>Packing specification management</li>
                  <li>Approval status tracking</li>
                  <li>Comment and update systems</li>
                  <li>Document generation and review</li>
                </ul>
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex gap-3 justify-center">
            <Button 
              onClick={() => navigate('/dashboard')}
              variant="outline"
              className="flex items-center gap-2"
            >
              Go to Dashboard
              <ExternalLink className="h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    </MainLayout>
  );
};

export default SimplePodioSetupPage;