import React from 'react';
import MainLayout from '../components/MainLayout';
import { PodioDebugPanel } from '../components/PodioDebugPanel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

const DebugPage = () => {
  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Podio Integration Debug Tools</CardTitle>
            <CardDescription>
              Use these tools to test and debug the Podio OAuth integration and API connectivity.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Debug Mode:</strong> These tools are for development and testing purposes only. 
                They provide detailed information about the OAuth flow and API responses.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
        
        <PodioDebugPanel />
      </div>
    </MainLayout>
  );
};

export default DebugPage;