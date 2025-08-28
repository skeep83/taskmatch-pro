import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NeumorphicIconProps {
  icon: LucideIcon;
  size?: number;
  className?: string;
  iconSize?: number;
  delayMs?: number;
  variant?: 'circle' | 'rounded' | 'square';
  style?: React.CSSProperties;
}

export const NeumorphicIcon = ({ 
  icon: Icon, 
  size = 48, 
  iconSize, 
  className,
  delayMs = 0,
  variant = 'circle',
  style,
  ...props 
}: NeumorphicIconProps) => {
  const actualIconSize = iconSize || size * 0.4;
  
  const variantStyles = {
    circle: 'rounded-full',
    rounded: 'rounded-2xl', 
    square: 'rounded-2xl' // Made more rounded like in reference
  };

  return (
    <div
      className={cn(
        'card-surface flex items-center justify-center transition-all duration-300 ease-out border-0',
        variantStyles[variant],
        className
      )}
      style={{
        width: size,
        height: size,
        animationDelay: `${delayMs}ms`,
        ...style
      }}
      {...props}
    >
      <Icon 
        size={actualIconSize} 
        className="text-slate-500 dark:text-slate-400"
        strokeWidth={2}
      />
    </div>
  );
};