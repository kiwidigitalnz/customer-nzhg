
import * as React from "react";
import { cn } from "@/lib/utils";

interface SwipeableContainerProps {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  swipeThreshold?: number;
  className?: string;
  children: React.ReactNode;
  disabled?: boolean;
}

export const SwipeableContainer: React.FC<SwipeableContainerProps> = ({
  onSwipeLeft,
  onSwipeRight,
  swipeThreshold = 100,
  className,
  children,
  disabled = false,
}) => {
  const [touchStartX, setTouchStartX] = React.useState<number | null>(null);
  const [touchEndX, setTouchEndX] = React.useState<number | null>(null);
  const [isSwiping, setIsSwiping] = React.useState(false);
  
  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    setTouchStartX(e.touches[0].clientX);
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (disabled || !isSwiping) return;
    setTouchEndX(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (disabled || !isSwiping || touchStartX === null || touchEndX === null) {
      setIsSwiping(false);
      return;
    }

    const swipeDistance = touchEndX - touchStartX;
    const isLeftSwipe = swipeDistance < -swipeThreshold;
    const isRightSwipe = swipeDistance > swipeThreshold;

    if (isLeftSwipe && onSwipeLeft) {
      onSwipeLeft();
    } else if (isRightSwipe && onSwipeRight) {
      onSwipeRight();
    }

    // Reset values
    setTouchStartX(null);
    setTouchEndX(null);
    setIsSwiping(false);
  };

  return (
    <div
      className={cn("swipeable-container touch-pan-x", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {children}
    </div>
  );
};

export default SwipeableContainer;
