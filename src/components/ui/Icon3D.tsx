import React from 'react';
import { icons3d, type Icon3DKey, type IconSize, iconSizes } from '@/lib/icons3d';
import { cn } from '@/lib/utils';

interface Icon3DProps {
  name: Icon3DKey;
  size?: IconSize;
  className?: string;
  loading?: 'lazy' | 'eager';
}

export const Icon3D: React.FC<Icon3DProps> = ({ 
  name, 
  size = 'md', 
  className, 
  loading = 'lazy' 
}) => {
  const icon = icons3d[name];
  const sizeClass = iconSizes[size];

  return (
    <img
      src={icon.src}
      alt={icon.alt}
      className={cn(sizeClass, 'object-contain', className)}
      loading={loading}
      draggable={false}
    />
  );
};