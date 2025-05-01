
import * as React from "react";
import { cn } from "@/lib/utils";
import { ArrowDown, Loader2 } from "lucide-react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  refreshThreshold?: number;
  maxPullDistance?: number;
  children: React.ReactNode;
  className?: string;
  pullDownComponent?: React.ReactNode;
  refreshingComponent?: React.ReactNode;
  completeComponent?: React.ReactNode;
  disabled?: boolean;
}

export const PullToRefresh = ({
  onRefresh,
  refreshThreshold = 80,
  maxPullDistance = 120,
  children,
  className,
  pullDownComponent,
  refreshingComponent,
  completeComponent,
  disabled = false,
}: PullToRefreshProps) => {
  const [refreshing, setRefreshing] = React.useState(false);
  const [complete, setComplete] = React.useState(false);
  const [pullDistance, setPullDistance] = React.useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const initialTouchY = React.useRef<number | null>(null);
  const pullLock = React.useRef(false);
  const containerStyle = { transform: `translateY(${pullDistance}px)` };

  // Reset to initial state after completion animation
  React.useEffect(() => {
    if (complete) {
      const timer = setTimeout(() => {
        setComplete(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [complete]);

  // Touch handlers for mobile pull down gesture
  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled || refreshing) return;
    
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    
    // Only activate pull to refresh when at top of page
    if (scrollTop > 0) return;
    
    initialTouchY.current = e.touches[0].clientY;
    pullLock.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (disabled || refreshing || initialTouchY.current === null || pullLock.current) return;
    
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    
    // Block default scroll behavior when pulling down at top of page
    if (scrollTop <= 0) {
      const touchY = e.touches[0].clientY;
      const diff = touchY - initialTouchY.current;
      
      if (diff > 0) {
        // Apply resistance to make it feel more natural
        const resistance = 0.4;
        const distance = Math.min(diff * resistance, maxPullDistance);
        
        setPullDistance(distance);
        
        if (diff > refreshThreshold / resistance) {
          e.preventDefault();
        }
      }
    }
  };

  const handleTouchEnd = async () => {
    if (disabled || refreshing || initialTouchY.current === null) return;
    
    initialTouchY.current = null;
    pullLock.current = true;
    
    // Check if pulled enough to trigger refresh
    if (pullDistance > refreshThreshold) {
      setRefreshing(true);
      setPullDistance(refreshThreshold); // Keep showing the refreshing indicator
      
      try {
        await onRefresh();
        setComplete(true);
      } finally {
        // Small delay to show the completion state
        setTimeout(() => {
          setRefreshing(false);
          setPullDistance(0);
        }, 300);
      }
    } else {
      // Not pulled enough, animate back to top
      setPullDistance(0);
    }
  };

  const getProgress = () => {
    return Math.min(pullDistance / refreshThreshold, 1);
  };

  // Default pull indicator components
  const defaultPullComponent = (
    <div className="flex items-center justify-center h-16 w-full">
      <div className="flex flex-col items-center">
        <ArrowDown 
          className={cn(
            "h-6 w-6 text-primary/70 transition-transform",
            getProgress() >= 1 ? "rotate-180" : ""
          )} 
        />
        <span className="text-xs mt-1 text-muted-foreground">
          {getProgress() >= 1 ? "Release to refresh" : "Pull to refresh"}
        </span>
      </div>
    </div>
  );

  const defaultRefreshingComponent = (
    <div className="flex items-center justify-center h-16 w-full">
      <div className="flex flex-col items-center">
        <Loader2 className="h-6 w-6 text-primary animate-spin" />
        <span className="text-xs mt-1 text-muted-foreground">Refreshing...</span>
      </div>
    </div>
  );

  const defaultCompleteComponent = (
    <div className="flex items-center justify-center h-16 w-full">
      <div className="flex flex-col items-center">
        <span className="text-xs text-muted-foreground">Updated</span>
      </div>
    </div>
  );

  return (
    <div
      className={cn("pull-to-refresh-container touch-pan-y", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      ref={containerRef}
    >
      {pullDistance > 0 && (
        <div 
          className="absolute left-0 right-0 flex justify-center overflow-hidden z-10"
          style={{ height: `${pullDistance}px` }}
        >
          {!refreshing && !complete && (
            pullDownComponent || defaultPullComponent
          )}
          {refreshing && (
            refreshingComponent || defaultRefreshingComponent
          )}
          {complete && (
            completeComponent || defaultCompleteComponent
          )}
        </div>
      )}
      
      <div
        className="will-change-transform transition-transform ease-out duration-300"
        style={containerStyle}
      >
        {children}
      </div>
    </div>
  );
};
