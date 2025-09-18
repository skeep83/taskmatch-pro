import { useState, useRef, ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  threshold?: number;
  disabled?: boolean;
}

export const PullToRefresh = ({
  children,
  onRefresh,
  threshold = 80,
  disabled = false
}: PullToRefreshProps) => {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef<number>(0);
  const scrollElement = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    const scrollTop = scrollElement.current?.scrollTop || 0;
    if (scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling || disabled || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, (currentY - startY.current) * 0.5);
    
    if (distance > 0) {
      e.preventDefault();
      setPullDistance(Math.min(distance, threshold * 1.5));
    }
  };

  const handleTouchEnd = async () => {
    if (!isPulling || disabled || isRefreshing) return;

    setIsPulling(false);

    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        setIsRefreshing(false);
      }
    }

    setPullDistance(0);
  };

  return (
    <div
      ref={scrollElement}
      className="pull-refresh h-full overflow-y-auto"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: `translateY(${Math.min(pullDistance, threshold)}px)`,
        transition: isPulling ? 'none' : 'transform 0.3s ease-out'
      }}
    >
      {/* Pull indicator */}
      {pullDistance > 10 && (
        <div 
          className={cn(
            "flex items-center justify-center py-4 text-muted-foreground transition-all duration-200",
            pullDistance >= threshold && "text-primary",
            isRefreshing && "animate-spin"
          )}
          style={{
            transform: `translateY(-${threshold}px)`,
            opacity: Math.min(pullDistance / threshold, 1)
          }}
        >
          <RotateCcw 
            className={cn(
              "h-6 w-6 transition-transform duration-200",
              isRefreshing && "animate-spin",
              pullDistance >= threshold && "rotate-180"
            )} 
          />
          <span className="ml-2 text-sm font-medium">
            {isRefreshing 
              ? "Обновление..." 
              : pullDistance >= threshold 
                ? "Отпустите для обновления" 
                : "Потяните для обновления"
            }
          </span>
        </div>
      )}

      {children}
    </div>
  );
};