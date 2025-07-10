import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error' | 'warning';
  message: string;
  details?: any;
  timestamp?: string;
}

export const PodioDebugPanel = () => {
  const [tests, setTests] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const updateTest = (name: string, status: TestResult['status'], message: string, details?: any) => {
    setTests(prev => {
      const existing = prev.find(t => t.name === name);
      const newTest: TestResult = {
        name,
        status,
        message,
        details,
        timestamp: new Date().toISOString()
      };
      
      if (existing) {
        return prev.map(t => t.name === name ? newTest : t);
      } else {
        return [...prev, newTest];
      }
    });
  };

  const runHealthCheck = async () => {
    updateTest('health-check', 'pending', 'Testing health check function...');
    
    try {
      const { data, error } = await supabase.functions.invoke('health-check');
      
      if (error) {
        updateTest('health-check', 'error', `Health check failed: ${error.message}`, error);
      } else {
        updateTest('health-check', 'success', 'Health check function is accessible', data);
      }
    } catch (error) {
      updateTest('health-check', 'error', `Health check error: ${error.message}`, error);
    }
  };

  const runOAuthUrlTest = async () => {
    updateTest('oauth-url', 'pending', 'Testing OAuth URL generation...');
    
    try {
      const { data, error } = await supabase.functions.invoke('podio-oauth-url');
      
      if (error) {
        updateTest('oauth-url', 'error', `OAuth URL generation failed: ${error.message}`, error);
      } else if (data?.success) {
        updateTest('oauth-url', 'success', 'OAuth URL generated successfully', data);
      } else {
        updateTest('oauth-url', 'warning', 'OAuth URL function returned non-success', data);
      }
    } catch (error) {
      updateTest('oauth-url', 'error', `OAuth URL error: ${error.message}`, error);
    }
  };

  const runCallbackTest = async () => {
    updateTest('oauth-callback', 'pending', 'Testing OAuth callback function...');
    
    try {
      // Test with dummy data to see if function is accessible
      const { data, error } = await supabase.functions.invoke('podio-oauth-callback', {
        body: { test: true }
      });
      
      if (error) {
        updateTest('oauth-callback', 'error', `OAuth callback failed: ${error.message}`, error);
      } else {
        // We expect this to fail with validation error, but it means function is accessible
        updateTest('oauth-callback', 'success', 'OAuth callback function is accessible (validation error expected)', data);
      }
    } catch (error) {
      updateTest('oauth-callback', 'error', `OAuth callback error: ${error.message}`, error);
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTests([]);
    
    try {
      console.log('Starting edge function tests...');
      
      // Run tests sequentially to avoid overwhelming the functions
      await runHealthCheck();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await runOAuthUrlTest();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await runCallbackTest();
      
    } catch (error) {
      console.error('Test suite error:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return null;
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Podio OAuth Debug Panel</CardTitle>
        <CardDescription>
          Test edge function deployment and accessibility
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={runAllTests} 
            disabled={isRunning}
            className="w-full"
          >
            {isRunning ? 'Running Tests...' : 'Run All Tests'}
          </Button>
        </div>

        {tests.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Test Results</h3>
            
            {tests.map((test, index) => (
              <Alert key={index} className={`${
                test.status === 'success' ? 'border-green-200 bg-green-50' :
                test.status === 'error' ? 'border-red-200 bg-red-50' :
                test.status === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                'border-blue-200 bg-blue-50'
              }`}>
                <div className="flex items-start gap-2">
                  {getStatusIcon(test.status)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <strong>{test.name}</strong>
                      {test.timestamp && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(test.timestamp).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                    <AlertDescription className="mt-1">
                      {test.message}
                    </AlertDescription>
                    {test.details && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm font-medium">
                          View Details
                        </summary>
                        <pre className="mt-2 text-xs bg-white p-2 rounded border overflow-auto max-h-40">
                          {JSON.stringify(test.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </Alert>
            ))}
          </div>
        )}

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Instructions:</strong>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>Click "Run All Tests" to verify edge function deployment</li>
              <li>Check that health-check function returns success</li>
              <li>Verify OAuth URL generation works</li>
              <li>Confirm callback function is accessible (validation error is expected)</li>
              <li>If any tests fail, check the edge function logs in Supabase dashboard</li>
            </ol>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};