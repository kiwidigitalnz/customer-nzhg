
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { isRateLimited } from "../services/podioApi";
import { useState, useEffect } from "react";

interface RateLimitWarningProps {
  onRetry: () => void;
  usingCachedData: boolean;
}

const RateLimitWarning = ({ onRetry, usingCachedData }: RateLimitWarningProps) => {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isButtonDisabled, setIsButtonDisabled] = useState(true);
  
  // Check localStorage for rate limit info
  useEffect(() => {
    const checkRateLimit = () => {
      const limitUntilStr = localStorage.getItem('podio_rate_limit_until');
      if (!limitUntilStr) {
        setTimeLeft(null);
        setIsButtonDisabled(false);
        return;
      }
      
      const limitUntil = parseInt(limitUntilStr, 10);
      const now = Date.now();
      
      if (now >= limitUntil) {
        setTimeLeft(null);
        setIsButtonDisabled(false);
      } else {
        const secondsLeft = Math.ceil((limitUntil - now) / 1000);
        setTimeLeft(secondsLeft);
        setIsButtonDisabled(true);
      }
    };
    
    // Check immediately
    checkRateLimit();
    
    // Update every second
    const interval = setInterval(checkRateLimit, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  const formatTimeLeft = () => {
    if (timeLeft === null) return "";
    
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };
  
  const handleRetry = () => {
    if (!isRateLimited()) {
      onRetry();
    }
  };
  
  return (
    <Alert variant="destructive" className="mb-6">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>API Rate Limit Reached</AlertTitle>
      <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          {usingCachedData ? (
            <p>
              Podio API rate limit reached. Showing cached data. {timeLeft !== null && (
                <>Please wait <strong>{formatTimeLeft()}</strong> before trying again.</>
              )}
            </p>
          ) : (
            <p>
              Podio API rate limit reached. {timeLeft !== null && (
                <>Please wait <strong>{formatTimeLeft()}</strong> before trying again.</>
              )}
            </p>
          )}
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRetry}
          disabled={isButtonDisabled}
          className="whitespace-nowrap"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          {isButtonDisabled ? `Wait ${formatTimeLeft()}` : "Try Again"}
        </Button>
      </AlertDescription>
    </Alert>
  );
};

export default RateLimitWarning;
