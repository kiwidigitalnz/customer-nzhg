import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';

interface TestResult {
  name: string;
  passed: boolean;
  skipped?: boolean;
  details: any;
}

interface DiagnosticResult {
  timestamp: string;
  environment: any;
  runtime: any;
  podioSpecific: any;
  troubleshooting: any;
}

interface ConnectionTestResult {
  timestamp: string;
  tests: Record<string, TestResult>;
  summary: {
    passed: number;
    failed: number;
    total: number;
    health: string;
  };
  recommendations: any[];
}

export default function PodioDebugPage() {
  const [loading, setLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult | null>(null);
  const [connectionTests, setConnectionTests] = useState<ConnectionTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runDiagnostics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('env-diagnostics');
      
      if (error) {
        throw new Error(error.message);
      }
      
      setDiagnostics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run diagnostics');
    } finally {
      setLoading(false);
    }
  };

  const runConnectionTests = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('podio-connection-test');
      
      if (error) {
        throw new Error(error.message);
      }
      
      setConnectionTests(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run connection tests');
    } finally {
      setLoading(false);
    }
  };

  const runAllTests = async () => {
    await runDiagnostics();
    await runConnectionTests();
  };

  const getStatusIcon = (passed: boolean, skipped?: boolean) => {
    if (skipped) return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    return passed ? 
      <CheckCircle className="h-4 w-4 text-green-500" /> : 
      <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getStatusBadge = (passed: boolean, skipped?: boolean) => {
    if (skipped) return <Badge variant="secondary">Skipped</Badge>;
    return passed ? 
      <Badge variant="default" className="bg-green-500">Passed</Badge> : 
      <Badge variant="destructive">Failed</Badge>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Podio Integration Diagnostics</h1>
          <p className="text-muted-foreground">
            Comprehensive testing and debugging tools for Podio integration
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={runDiagnostics} 
            disabled={loading}
            variant="outline"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Run Diagnostics
          </Button>
          <Button 
            onClick={runConnectionTests} 
            disabled={loading}
            variant="outline"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Test Connection
          </Button>
          <Button 
            onClick={runAllTests} 
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Run All Tests
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Environment Diagnostics */}
      {diagnostics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Environment Diagnostics
              <Badge variant="outline" className="text-xs">
                {diagnostics.timestamp}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Podio Credentials Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold">Podio Credentials</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Client ID:</span>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(diagnostics.podioSpecific.clientIdExists)}
                      {diagnostics.podioSpecific.clientIdExists ? 'Found' : 'Missing'}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Client Secret:</span>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(diagnostics.podioSpecific.clientSecretExists)}
                      {diagnostics.podioSpecific.clientSecretExists ? 'Found' : 'Missing'}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Ready:</span>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(diagnostics.podioSpecific.credentialsReady)}
                      {diagnostics.podioSpecific.credentialsReady ? 'Yes' : 'No'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Environment Variables</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Total Variables:</span>
                    <span>{diagnostics.environment.totalVariables}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Podio Related:</span>
                    <span>{diagnostics.environment.podioRelated.length}</span>
                  </div>
                  {diagnostics.environment.podioRelated.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Found: {diagnostics.environment.podioRelated.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Expected Variables Status */}
            <div>
              <h4 className="font-semibold mb-3">Expected Variables Status</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {Object.entries(diagnostics.environment.expectedVariables).map(([key, status]: [string, any]) => (
                  <div key={key} className="flex items-center justify-between p-2 border rounded">
                    <span className="text-sm font-mono">{key}</span>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(status.exists)}
                      <span className="text-xs">
                        {status.exists ? `${status.length} chars` : 'Not found'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Troubleshooting Information */}
            <div>
              <h4 className="font-semibold mb-3">Troubleshooting Guidance</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h5 className="font-medium text-sm mb-2">Common Issues:</h5>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    {diagnostics.troubleshooting.commonIssues.map((issue: string, index: number) => (
                      <li key={index}>• {issue}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h5 className="font-medium text-sm mb-2">Next Steps:</h5>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    {diagnostics.troubleshooting.nextSteps.map((step: string, index: number) => (
                      <li key={index}>• {step}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connection Tests */}
      {connectionTests && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Connection Test Results
              <Badge 
                variant={connectionTests.summary.health === 'HEALTHY' ? 'default' : 'destructive'}
                className={connectionTests.summary.health === 'HEALTHY' ? 'bg-green-500' : ''}
              >
                {connectionTests.summary.health}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {connectionTests.timestamp}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Test Summary */}
            <div className="flex items-center gap-4 text-sm">
              <span>Tests: {connectionTests.summary.total}</span>
              <span className="text-green-600">Passed: {connectionTests.summary.passed}</span>
              <span className="text-red-600">Failed: {connectionTests.summary.failed}</span>
            </div>

            <Separator />

            {/* Individual Tests */}
            <div className="space-y-3">
              {Object.entries(connectionTests.tests).map(([key, test]: [string, TestResult]) => (
                <div key={key} className="border rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium">{test.name}</h5>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(test.passed, test.skipped)}
                      {getStatusBadge(test.passed, test.skipped)}
                    </div>
                  </div>
                  
                  {test.details && (
                    <div className="text-xs text-muted-foreground">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(test.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Recommendations */}
            {connectionTests.recommendations && connectionTests.recommendations.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3">Recommendations</h4>
                <div className="space-y-2">
                  {connectionTests.recommendations.map((rec: any, index: number) => (
                    <Alert key={index} variant={rec.priority === 'HIGH' ? 'destructive' : 'default'}>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium">{rec.issue}</div>
                          <div className="text-sm">{rec.action}</div>
                          {rec.url && (
                            <a 
                              href={rec.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline"
                            >
                              Open in Supabase Dashboard
                            </a>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {rec.priority}
                        </Badge>
                      </div>
                    </Alert>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!diagnostics && !connectionTests && !loading && (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
              <p>Run diagnostics to check Podio integration status</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}