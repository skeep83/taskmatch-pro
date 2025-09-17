import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { isAndroid } from '@/utils/androidIntegration';

interface AndroidMaterialCardProps {
  children: React.ReactNode;
  className?: string;
  elevated?: boolean;
  outlined?: boolean;
  interactive?: boolean;
  onClick?: () => void;
}

export const AndroidMaterialCard: React.FC<AndroidMaterialCardProps> = ({
  children,
  className,
  elevated = false,
  outlined = false,
  interactive = false,
  onClick
}) => {
  const [isPressed, setIsPressed] = useState(false);
  
  if (!isAndroid()) {
    // Fallback для не-Android платформ
    return (
      <div 
        className={cn('rounded-lg bg-card p-4 border border-border', className)}
        onClick={onClick}
      >
        {children}
      </div>
    );
  }

  const cardClasses = cn(
    'android-card transition-all duration-200',
    elevated && 'android-card-elevated',
    outlined && 'android-card-outlined',
    interactive && 'android-card-interactive cursor-pointer',
    isPressed && interactive && 'android-card-pressed',
    className
  );

  return (
    <div
      className={cardClasses}
      onClick={onClick}
      onTouchStart={() => interactive && setIsPressed(true)}
      onTouchEnd={() => interactive && setIsPressed(false)}
      onMouseDown={() => interactive && setIsPressed(true)}
      onMouseUp={() => interactive && setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
    >
      {children}
    </div>
  );
};

// Android-style List Item
interface AndroidListItemProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  subtitle?: string;
  disabled?: boolean;
}

export const AndroidListItem: React.FC<AndroidListItemProps> = ({
  children,
  className,
  onClick,
  leading,
  trailing,
  subtitle,
  disabled = false
}) => {
  const [isPressed, setIsPressed] = useState(false);

  if (!isAndroid()) {
    return (
      <div 
        className={cn(
          'flex items-center gap-3 p-4 hover:bg-accent cursor-pointer',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
        onClick={!disabled ? onClick : undefined}
      >
        {leading}
        <div className="flex-1">
          <div>{children}</div>
          {subtitle && <div className="text-sm text-muted-foreground">{subtitle}</div>}
        </div>
        {trailing}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'android-list-item',
        onClick && !disabled && 'android-list-item-clickable',
        isPressed && 'android-list-item-pressed',
        disabled && 'android-list-item-disabled',
        className
      )}
      onClick={!disabled ? onClick : undefined}
      onTouchStart={() => !disabled && setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      onMouseDown={() => !disabled && setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
    >
      {leading && <div className="android-list-leading">{leading}</div>}
      
      <div className="android-list-content">
        <div className="android-list-primary">{children}</div>
        {subtitle && <div className="android-list-subtitle">{subtitle}</div>}
      </div>
      
      {trailing && <div className="android-list-trailing">{trailing}</div>}
    </div>
  );
};

// Android-style Chip
interface AndroidChipProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'filled' | 'outlined' | 'filter';
  selected?: boolean;
  onDelete?: () => void;
  onClick?: () => void;
  icon?: React.ReactNode;
}

export const AndroidChip: React.FC<AndroidChipProps> = ({
  children,
  className,
  variant = 'filled',
  selected = false,
  onDelete,
  onClick,
  icon
}) => {
  if (!isAndroid()) {
    return (
      <span 
        className={cn(
          'inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm',
          variant === 'outlined' ? 'border border-border' : 'bg-secondary',
          onClick && 'cursor-pointer hover:opacity-80',
          className
        )}
        onClick={onClick}
      >
        {icon}
        {children}
        {onDelete && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
          >
            ×
          </button>
        )}
      </span>
    );
  }

  return (
    <span
      className={cn(
        'android-chip',
        `android-chip-${variant}`,
        selected && 'android-chip-selected',
        onClick && 'android-chip-clickable',
        className
      )}
      onClick={onClick}
    >
      {icon && <span className="android-chip-icon">{icon}</span>}
      <span className="android-chip-text">{children}</span>
      {onDelete && (
        <button
          className="android-chip-delete"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          ×
        </button>
      )}
    </span>
  );
};

// Android Bottom Sheet
interface AndroidBottomSheetProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  className?: string;
}

export const AndroidBottomSheet: React.FC<AndroidBottomSheetProps> = ({
  children,
  isOpen,
  onClose,
  title,
  className
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  if (!isAndroid()) {
    return (
      <div className="fixed inset-0 z-50 flex items-end">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <div className={cn(
          'relative w-full bg-background rounded-t-lg p-6 max-h-[80vh] overflow-y-auto',
          className
        )}>
          {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="android-bottom-sheet-overlay">
      <div className="android-bottom-sheet-backdrop" onClick={onClose} />
      <div className={cn('android-bottom-sheet', className)}>
        {/* Handle bar */}
        <div className="android-bottom-sheet-handle" />
        
        {title && (
          <div className="android-bottom-sheet-header">
            <h3 className="android-bottom-sheet-title">{title}</h3>
          </div>
        )}
        
        <div className="android-bottom-sheet-content">
          {children}
        </div>
      </div>
    </div>
  );
};