import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TokenExchangeResult {
  success: boolean;
  status: number;
  statusText: string;
  responseTime: number;
  headers: Record<string, string>;
  data: any;
  timestamp: string;
  error?: string;
}

export const PodioTokenExchangeDebug: React.FC = () => {
  const [code, setCode] = useState('');
  const [redirectUri, setRedirectUri] = useState('https://customer.nzhg.com/podio-callback');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TokenExchangeResult | null>(null);

  const handleTest = async () => {
    if (!code.trim()) {
      alert('Please enter an authorization code');
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('podio-debug-token-exchange', {
        body: {
          code: code.trim(),
          redirectUri: redirectUri.trim()
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        setResult({
          success: false,
          status: 500,
          statusText: 'Supabase Function Error',
          responseTime: 0,
          headers: {},
          data: { error: error.message },
          timestamp: new Date().toISOString(),
          error: error.message
        });
      } else {
        setResult(data);
      }
    } catch (err) {
      console.error('Network error:', err);
      setResult({
        success: false,
        status: 0,
        statusText: 'Network Error',
        responseTime: 0,
        headers: {},
        data: { error: err instanceof Error ? err.message : 'Unknown error' },
        timestamp: new Date().toISOString(),
        error: err instanceof Error ? err.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'bg-green-500';
    if (status >= 400 && status < 500) return 'bg-yellow-500';
    if (status >= 500) return 'bg-red-500';
    return 'bg-gray-500';
  };

  const formatResponseTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🔍 Podio Token Exchange Debug Tool
        </CardTitle>
        <CardDescription>
          Test the Podio OAuth token exchange manually to isolate issues
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Authorization Code</label>
            <Input
              placeholder="Enter the authorization code from callback URL"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Redirect URI</label>
            <Input
              placeholder="https://customer.nzhg.com/podio-callback"
              value={redirectUri}
              onChange={(e) => setRedirectUri(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>

        <Button 
          onClick={handleTest} 
          disabled={isLoading || !code.trim()}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Testing Token Exchange...
            </>
          ) : (
            'Test Token Exchange'
          )}
        </Button>

        {result && (
          <div className="space-y-4 mt-6">
            <div className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              <Badge 
                className={`${getStatusColor(result.status)} text-white`}
              >
                {result.status} {result.statusText}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatResponseTime(result.responseTime)}
              </Badge>
            </div>

            {result.success ? (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  ✅ Token exchange successful! The Podio API is responding correctly.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="border-red-200 bg-red-50">
                <XCircle className="w-4 h-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  ❌ Token exchange failed. Check the details below for debugging.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              <div>
                <h4 className="font-medium mb-2">Response Data:</h4>
                <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-60">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </div>

              <div>
                <h4 className="font-medium mb-2">Response Headers:</h4>
                <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-40">
                  {JSON.stringify(result.headers, null, 2)}
                </pre>
              </div>

              <div className="text-xs text-gray-500">
                Test completed at: {new Date(result.timestamp).toLocaleString()}
              </div>
            </div>
          </div>
        )}

        <Alert>
          <AlertDescription>
            <strong>How to use:</strong>
            <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
              <li>Get an authorization code by going through the OAuth flow</li>
              <li>Copy the code from the callback URL (after ?code=)</li>
              <li>Paste it above and click "Test Token Exchange"</li>
              <li>Check if the direct API call succeeds or fails</li>
            </ol>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};