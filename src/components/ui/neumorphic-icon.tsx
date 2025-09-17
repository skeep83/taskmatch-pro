import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NeumorphicIconProps {
  icon: LucideIcon;
  size?: number;
  className?: string;
  iconSize?: number;
  delayMs?: number;
  variant?: 'circle' | 'rounded' | 'square' | 'inset';
  style?: React.CSSProperties;
  iconColor?: string;
}

export const NeumorphicIcon = ({ 
  icon: Icon, 
  size = 48, 
  iconSize, 
  className,
  delayMs = 0,
  variant = 'circle',
  style,
  iconColor = 'text-slate-500',
  ...props 
}: NeumorphicIconProps) => {
  const actualIconSize = iconSize || size * 0.45;
  
  const variantStyles = {
    circle: 'rounded-full',
    rounded: 'rounded-3xl', 
    square: 'rounded-2xl',
    // New inset variant like in the reference image
    inset: 'rounded-3xl shadow-[inset_8px_8px_16px_rgba(174,187,204,0.4),inset_-8px_-8px_16px_rgba(255,255,255,0.8)] bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100'
  };

  // For non-inset variants, use raised style
  const baseStyles = variant === 'inset' 
    ? variantStyles[variant]
    : cn(
        'bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100',
        'shadow-[8px_8px_16px_rgba(174,187,204,0.4),-8px_-8px_16px_rgba(255,255,255,0.8)]',
        'hover:shadow-[12px_12px_24px_rgba(174,187,204,0.5),-12px_-12px_24px_rgba(255,255,255,0.9)]',
        'active:shadow-[inset_4px_4px_8px_rgba(174,187,204,0.3),inset_-4px_-4px_8px_rgba(255,255,255,0.7)]',
        'transition-all duration-200 ease-out',
        variantStyles[variant as keyof typeof variantStyles]
      );

  return (
    <div
      className={cn(
        'flex items-center justify-center border-0 relative',
        baseStyles,
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
        className={cn(iconColor, "relative z-10")}
        strokeWidth={1.8}
      />
    </div>
  );
};