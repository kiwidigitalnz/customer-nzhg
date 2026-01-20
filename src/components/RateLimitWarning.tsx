
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { isRateLimited, isRateLimitedWithInfo, clearRateLimitInfo } from "../services/podioApi";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

interface RateLimitWarningProps {
  onRetry: () => void;
  usingCachedData: boolean;
}

const RateLimitWarning = ({ onRetry, usingCachedData }: RateLimitWarningProps) => {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isButtonDisabled, setIsButtonDisabled] = useState(true);
  const [rateLimitReason, setRateLimitReason] = useState('API rate limit reached');
  const { toast } = useToast();
  
  // Check localStorage for rate limit info
  useEffect(() => {
    const checkRateLimit = () => {
      const rateLimitInfo = isRateLimitedWithInfo();
      
      if (!rateLimitInfo.isLimited) {
        setTimeLeft(null);
        setIsButtonDisabled(false);
        return;
      }
      
      // Calculate seconds left
      const secondsLeft = Math.ceil((rateLimitInfo.limitUntil - Date.now()) / 1000);
      
      setTimeLeft(secondsLeft);
      
      // Generate reason message
      const reasonMessage = rateLimitInfo.lastEndpoint ? 
        `API rate limit reached for ${rateLimitInfo.lastEndpoint}` : 
        'API rate limit reached';
      
      setRateLimitReason(reasonMessage);
      setIsButtonDisabled(secondsLeft > 0);
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
      clearRateLimitInfo(); // Clear all rate limit info
      toast({
        title: "Retrying connection",
        description: "Attempting to refresh data from the API...",
        duration: 3000 // Set a reasonable duration
      });
      onRetry();
    }
  };
  
  return (
    <Alert variant="destructive" className="mb-6 font-open">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="font-raleway">API Rate Limit Reached</AlertTitle>
      <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          {usingCachedData ? (
            <p>
              {rateLimitReason}. Showing cached data. {timeLeft !== null && (
                <>Please wait <strong>{formatTimeLeft()}</strong> before trying again.</>
              )}
            </p>
          ) : (
            <p>
              {rateLimitReason}. {timeLeft !== null && (
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
          className="whitespace-nowrap font-open"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isButtonDisabled ? 'animate-spin' : ''}`} />
          {isButtonDisabled ? `Wait ${formatTimeLeft()}` : "Try Again"}
        </Button>
      </AlertDescription>
    </Alert>
  );
};

export default RateLimitWarning;
