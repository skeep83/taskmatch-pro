import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NeumorphicIconProps {
  icon: LucideIcon;
  size?: number;
  className?: string;
  iconSize?: number;
  delayMs?: number;
  variant?: 'circle' | 'rounded' | 'square' | 'soft-inset' | 'behance';
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
    square: 'rounded-2xl',
    'soft-inset': 'rounded-3xl bg-gray-100/80 dark:bg-gray-800/50',
    'behance': 'rounded-3xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900'
  };

  return (
    <div
      className={cn(
        'flex items-center justify-center transition-all duration-300 ease-out border-0',
        variant === 'behance' 
          ? 'shadow-[inset_8px_8px_16px_rgba(0,0,0,0.1),inset_-8px_-8px_16px_rgba(255,255,255,0.9)] border border-gray-200/50 dark:border-gray-700/50' 
          : variant === 'soft-inset'
          ? 'shadow-[inset_4px_4px_8px_rgba(0,0,0,0.1),inset_-4px_-4px_8px_rgba(255,255,255,0.7)]'
          : 'card-surface',
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
        className={cn(
          variant === 'behance' || variant === 'soft-inset'
            ? "text-gray-600 dark:text-gray-300" 
            : "text-slate-500 dark:text-slate-400"
        )}
        strokeWidth={variant === 'behance' ? 1.5 : 2}
      />
    </div>
  );
};