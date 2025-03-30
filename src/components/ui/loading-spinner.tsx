
import React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export interface LoadingSpinnerProps {
  /** Whether to show the spinner in fullscreen mode */
  fullscreen?: boolean;
  /** The size of the spinner (small, medium, large) */
  size?: "sm" | "md" | "lg";
  /** Optional icon to display in center of spinner */
  icon?: React.ReactNode;
  /** Main text to display below the spinner */
  text?: string;
  /** Secondary text to display below the main text */
  subtext?: string;
  /** Optional className for additional styling */
  className?: string;
}

export const LoadingSpinner = ({
  fullscreen = false,
  size = "md",
  icon,
  text = "Loading...",
  subtext,
  className,
}: LoadingSpinnerProps) => {
  // Define spinner sizes
  const spinnerSizes = {
    sm: "h-8 w-8",
    md: "h-12 w-12",
    lg: "h-16 w-16",
  };

  // Define text sizes based on spinner size
  const textSizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  // Icon sizes
  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  const content = (
    <div className={cn("flex flex-col items-center justify-center", className)}>
      <div className="relative">
        <Loader2 
          className={cn(
            "animate-spin text-primary", 
            spinnerSizes[size]
          )} 
        />
        {icon && (
          <div className={cn(
            "absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-primary/80",
            iconSizes[size]
          )}>
            {icon}
          </div>
        )}
      </div>
      {text && (
        <p className={cn("mt-4 text-muted-foreground", textSizes[size])}>
          {text}
        </p>
      )}
      {subtext && (
        <p className={cn("text-muted-foreground/70 mt-2", size === "lg" ? "text-sm" : "text-xs")}>
          {subtext}
        </p>
      )}
    </div>
  );

  // Return fullscreen or inline version based on prop
  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return content;
};

export const LoadingSkeleton = ({ 
  count = 1, 
  className 
}: { 
  count?: number,
  className?: string
}) => {
  return (
    <div className="space-y-2">
      {Array(count).fill(0).map((_, i) => (
        <Skeleton key={i} className={cn("h-12 w-full", className)} />
      ))}
    </div>
  );
};
