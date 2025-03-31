
import { AlertCircle, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ConnectionStatusProps {
  error: string | null;
  rateLimitMessage: string | null;
  connectionErrorDetails: string | null;
  isDevelopmentMode: boolean;
}

/**
 * ConnectionStatus component - Shows various connection status and error messages
 * Used to display Podio connection status, rate limiting, and other errors
 */
const ConnectionStatus = ({
  error,
  rateLimitMessage,
  connectionErrorDetails,
  isDevelopmentMode
}: ConnectionStatusProps) => {
  if (!error && !rateLimitMessage && !connectionErrorDetails && !isDevelopmentMode) {
    return null;
  }

  // Show error messages with priority
  if (error || rateLimitMessage || connectionErrorDetails) {
    return (
      <Alert variant="destructive" className="mt-2">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>
          {rateLimitMessage ? "Rate Limit Reached" : 
           connectionErrorDetails ? "Connection Error" : 
           "Login Error"}
        </AlertTitle>
        <AlertDescription>
          {rateLimitMessage || connectionErrorDetails || error}
        </AlertDescription>
      </Alert>
    );
  }

  // Show development mode indicator
  if (isDevelopmentMode) {
    return (
      <Alert variant="default" className="mt-2 bg-blue-50 border-blue-200 text-blue-700">
        <Info className="h-4 w-4" />
        <AlertTitle>Development Mode</AlertTitle>
        <AlertDescription>
          The application is running in development mode with API validation bypassed.
          This allows testing without proper Podio permissions.
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};

export default ConnectionStatus;
