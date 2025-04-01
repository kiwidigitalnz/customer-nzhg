
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RateLimitErrorProps {
  retryTime?: number;
  onRetry?: () => void;
}

const RateLimitError: React.FC<RateLimitErrorProps> = ({ 
  retryTime = 3600, 
  onRetry 
}) => {
  const [timeLeft, setTimeLeft] = React.useState(retryTime);
  
  React.useEffect(() => {
    if (timeLeft <= 0) return;
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    
    return () => clearInterval(timer);
  }, [timeLeft]);
  
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="space-y-4">
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>API Rate Limit Reached</AlertTitle>
        <AlertDescription>
          We've hit the rate limit for our data service.
        </AlertDescription>
      </Alert>
      
      <div className="bg-muted/40 rounded-lg p-6 text-center">
        <Clock className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
        <h3 className="text-lg font-medium mb-2">Please try again later</h3>
        
        {timeLeft > 0 ? (
          <div className="mb-4">
            <p className="text-muted-foreground">Rate limit will reset in:</p>
            <p className="text-2xl font-mono mt-1">{formatTime(timeLeft)}</p>
          </div>
        ) : (
          <p className="text-muted-foreground mb-4">
            You can try again now. If you continue to see this error,
            please contact support.
          </p>
        )}
        
        <Button 
          onClick={onRetry} 
          disabled={timeLeft > 0}
          variant="outline"
          className="mt-2"
        >
          Retry
        </Button>
      </div>
    </div>
  );
};

export default RateLimitError;
