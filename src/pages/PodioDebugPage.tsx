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

  const [envTestResults, setEnvTestResults] = useState<any>(null);
  const [detailedDiagnostics, setDetailedDiagnostics] = useState<any>(null);

  const testDirectAuthentication = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('=== ENHANCED DIRECT AUTH TEST START ===');
      console.log('Testing direct podio-authenticate edge function...');
      
      // Make the request
      const response = await supabase.functions.invoke('podio-authenticate');
      
      // Log the COMPLETE response structure
      console.log('=== COMPLETE RESPONSE ANALYSIS ===');
      console.log('Raw response object:', response);
      console.log('Response.data:', response.data);
      console.log('Response.error:', response.error);
      console.log('Response keys:', Object.keys(response));
      
      // Extract detailed error information
      const detailedError = {
        hasError: Boolean(response.error),
        errorMessage: response.error?.message || 'No error message',
        errorData: response.error?.data || null,
        errorStatus: response.error?.status || null,
        responseData: response.data || null,
        fullError: response.error,
        timestamp: new Date().toISOString()
      };
      
      console.log('=== DETAILED ERROR ANALYSIS ===', detailedError);
      
      // Set detailed diagnostics for UI display
      setDetailedDiagnostics({
        type: 'podio-authenticate-test',
        timestamp: new Date().toISOString(),
        response: response,
        analysis: detailedError,
        success: !response.error && response.data
      });
      
      if (response.error) {
        console.error('=== AUTHENTICATION FAILED ===');
        console.error('Error details:', response.error);
        
        // Try to extract the actual error message from nested structure
        let actualErrorMessage = response.error.message;
        if (response.error.data && typeof response.error.data === 'object') {
          actualErrorMessage = response.error.data.error || response.error.data.message || actualErrorMessage;
        }
        
        throw new Error(`Authentication failed: ${actualErrorMessage} (Status: ${response.error.status || 'unknown'})`);
      }
      
      console.log('=== AUTHENTICATION SUCCESSFUL ===');
      console.log('Success data:', response.data);
      alert('Direct authentication test successful! Check console and detailed diagnostics below for full analysis.');
      
    } catch (err) {
      console.error('=== AUTH TEST EXCEPTION ===', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to test direct authentication';
      setError(`Direct auth test failed: ${errorMessage}`);
      
      // Also set error in detailed diagnostics
      setDetailedDiagnostics({
        type: 'podio-authenticate-test',
        timestamp: new Date().toISOString(),
        error: err,
        success: false
      });
    } finally {
      setLoading(false);
    }
  };

  const testEnvironmentVariables = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('=== ENVIRONMENT VARIABLE TEST START ===');
      
      const response = await supabase.functions.invoke('podio-env-test');
      
      console.log('=== ENV TEST RESPONSE ===', response);
      
      setEnvTestResults(response.data);
      
      if (response.error) {
        throw new Error(`Environment test failed: ${response.error.message}`);
      }
      
      console.log('Environment variable test completed successfully');
      
    } catch (err) {
      console.error('Environment test failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to test environment variables';
      setError(`Environment test: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const runComparativeAnalysis = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('=== COMPARATIVE ANALYSIS START ===');
      
      // Run env-diagnostics (working function)
      const envDiagResponse = await supabase.functions.invoke('env-diagnostics');
      
      // Run podio-env-test (new test function)
      const envTestResponse = await supabase.functions.invoke('podio-env-test');
      
      // Run podio-authenticate (failing function)
      const authResponse = await supabase.functions.invoke('podio-authenticate');
      
      const comparison = {
        timestamp: new Date().toISOString(),
        envDiagnostics: {
          success: !envDiagResponse.error,
          data: envDiagResponse.data,
          error: envDiagResponse.error
        },
        envTest: {
          success: !envTestResponse.error,
          data: envTestResponse.data,
          error: envTestResponse.error
        },
        authenticate: {
          success: !authResponse.error,
          data: authResponse.data,
          error: authResponse.error
        }
      };
      
      console.log('=== COMPARATIVE ANALYSIS RESULTS ===', comparison);
      
      setDetailedDiagnostics({
        type: 'comparative-analysis',
        ...comparison
      });
      
      // Analyze differences
      const analysis = {
        envDiagWorking: comparison.envDiagnostics.success,
        envTestWorking: comparison.envTest.success,
        authWorking: comparison.authenticate.success,
        patterns: {
          allEnvAccessWorks: comparison.envDiagnostics.success && comparison.envTest.success,
          onlyAuthFails: comparison.envDiagnostics.success && comparison.envTest.success && !comparison.authenticate.success
        }
      };
      
      console.log('=== PATTERN ANALYSIS ===', analysis);
      
      if (analysis.patterns.onlyAuthFails) {
        console.log('🔍 DIAGNOSIS: Environment variable access works, but podio-authenticate fails - likely external API call issue');
      }
      
    } catch (err) {
      console.error('Comparative analysis failed:', err);
      setError(`Comparative analysis failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
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
        <div className="flex gap-2 flex-wrap">
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
            onClick={testEnvironmentVariables} 
            disabled={loading}
            variant="outline"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Test Env Vars
          </Button>
          <Button 
            onClick={testDirectAuthentication} 
            disabled={loading}
            variant="outline"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Test Auth
          </Button>
          <Button 
            onClick={runComparativeAnalysis} 
            disabled={loading}
            variant="outline"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Compare All
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

      {/* Environment Variable Test Results */}
      {envTestResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Environment Variable Test Results
              <Badge variant={envTestResults.success ? 'default' : 'destructive'} className={envTestResults.success ? 'bg-green-500' : ''}>
                {envTestResults.success ? 'SUCCESS' : 'FAILED'}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {envTestResults.timestamp}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold">Environment Access</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Total Env Vars:</span>
                    <span>{envTestResults.environmentAccess?.totalEnvVars || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Podio Keys Found:</span>
                    <span>{envTestResults.environmentAccess?.podioKeysFound || 'N/A'}</span>
                  </div>
                  {envTestResults.environmentAccess?.podioKeys && (
                    <div className="text-xs text-muted-foreground">
                      Keys: {envTestResults.environmentAccess.podioKeys.join(', ')}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold">Credential Access</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Client ID:</span>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(envTestResults.credentialAccess?.clientIdExists)}
                      {envTestResults.credentialAccess?.clientIdExists ? `Found (${envTestResults.credentialAccess.clientIdLength} chars)` : 'Missing'}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Client Secret:</span>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(envTestResults.credentialAccess?.clientSecretExists)}
                      {envTestResults.credentialAccess?.clientSecretExists ? `Found (${envTestResults.credentialAccess.clientSecretLength} chars)` : 'Missing'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
              <strong>Test Pattern:</strong> {envTestResults.variableAccessPattern} | 
              <strong>Type:</strong> {envTestResults.testType}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Diagnostics */}
      {detailedDiagnostics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Detailed Diagnostic Results
              <Badge variant={detailedDiagnostics.success ? 'default' : 'destructive'} className={detailedDiagnostics.success ? 'bg-green-500' : ''}>
                {detailedDiagnostics.success ? 'SUCCESS' : 'FAILED'}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {detailedDiagnostics.type}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {detailedDiagnostics.timestamp}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {detailedDiagnostics.type === 'comparative-analysis' && (
              <div className="space-y-4">
                <h4 className="font-semibold">Function Comparison</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 border rounded">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-sm">env-diagnostics</h5>
                      {getStatusBadge(detailedDiagnostics.envDiagnostics?.success)}
                    </div>
                    {detailedDiagnostics.envDiagnostics?.error && (
                      <div className="text-xs text-red-600">
                        Error: {detailedDiagnostics.envDiagnostics.error.message}
                      </div>
                    )}
                  </div>
                  
                  <div className="p-3 border rounded">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-sm">podio-env-test</h5>
                      {getStatusBadge(detailedDiagnostics.envTest?.success)}
                    </div>
                    {detailedDiagnostics.envTest?.error && (
                      <div className="text-xs text-red-600">
                        Error: {detailedDiagnostics.envTest.error.message}
                      </div>
                    )}
                  </div>
                  
                  <div className="p-3 border rounded">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-sm">podio-authenticate</h5>
                      {getStatusBadge(detailedDiagnostics.authenticate?.success)}
                    </div>
                    {detailedDiagnostics.authenticate?.error && (
                      <div className="text-xs text-red-600">
                        Error: {detailedDiagnostics.authenticate.error.message}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {detailedDiagnostics.type === 'podio-authenticate-test' && detailedDiagnostics.analysis && (
              <div className="space-y-4">
                <h4 className="font-semibold">Authentication Test Analysis</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h5 className="font-medium text-sm">Error Information</h5>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center justify-between">
                        <span>Has Error:</span>
                        <span className={detailedDiagnostics.analysis.hasError ? 'text-red-600' : 'text-green-600'}>
                          {detailedDiagnostics.analysis.hasError ? 'Yes' : 'No'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Status:</span>
                        <span>{detailedDiagnostics.analysis.errorStatus || 'N/A'}</span>
                      </div>
                      {detailedDiagnostics.analysis.errorMessage && (
                        <div className="text-xs text-red-600 mt-2">
                          <strong>Message:</strong> {detailedDiagnostics.analysis.errorMessage}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h5 className="font-medium text-sm">Response Data</h5>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center justify-between">
                        <span>Has Response Data:</span>
                        <span className={detailedDiagnostics.analysis.responseData ? 'text-green-600' : 'text-red-600'}>
                          {detailedDiagnostics.analysis.responseData ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {detailedDiagnostics.analysis.errorData && (
                  <div className="mt-4">
                    <h5 className="font-medium text-sm mb-2">Raw Error Data</h5>
                    <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-40">
                      {JSON.stringify(detailedDiagnostics.analysis.errorData, null, 2)}
                    </pre>
                  </div>
                )}
                
                {detailedDiagnostics.response && (
                  <div className="mt-4">
                    <h5 className="font-medium text-sm mb-2">Complete Response Structure</h5>
                    <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-60">
                      {JSON.stringify(detailedDiagnostics.response, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!diagnostics && !connectionTests && !envTestResults && !detailedDiagnostics && !loading && (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
              <p>Run diagnostics to check Podio integration status</p>
              <p className="text-sm mt-2">New enhanced tests available: Test Env Vars, Test Auth, Compare All</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}