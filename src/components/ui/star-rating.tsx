import React from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  showCount?: boolean;
  count?: number;
  className?: string;
  readonly?: boolean;
  onRatingChange?: (rating: number) => void;
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating,
  maxRating = 5,
  size = 'md',
  showValue = false,
  showCount = false,
  count,
  className,
  readonly = true,
  onRatingChange
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base', 
    lg: 'text-lg'
  };

  const renderStars = () => {
    const stars = [];
    
    for (let i = 1; i <= maxRating; i++) {
      const filled = i <= Math.floor(rating);
      const halfFilled = i === Math.floor(rating) + 1 && rating % 1 >= 0.5;
      
      stars.push(
        <Star
          key={i}
          className={cn(
            sizeClasses[size],
            'transition-colors duration-200',
            filled 
              ? 'fill-primary text-primary'
              : halfFilled
              ? 'fill-primary/50 text-primary/50'
              : 'fill-muted text-muted-foreground/30',
            !readonly && 'cursor-pointer hover:text-primary hover:fill-primary/80'
          )}
          onClick={() => !readonly && onRatingChange?.(i)}
        />
      );
    }
    
    return stars;
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex items-center gap-0.5">
        {renderStars()}
      </div>
      
      {showValue && (
        <span className={cn(
          'font-medium text-foreground',
          textSizeClasses[size]
        )}>
          {rating.toFixed(1)}
        </span>
      )}
      
      {showCount && count !== undefined && (
        <span className={cn(
          'text-muted-foreground',
          textSizeClasses[size]
        )}>
          ({count})
        </span>
      )}
    </div>
  );
};