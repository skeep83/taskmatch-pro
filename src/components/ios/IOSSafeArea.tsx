import React from 'react';
import { cn } from '@/lib/utils';
import { isIOS } from '@/utils/iosIntegration';

interface IOSSafeAreaProps {
  children: React.ReactNode;
  className?: string;
  top?: boolean;
  bottom?: boolean;
  left?: boolean;
  right?: boolean;
}

export const IOSSafeArea: React.FC<IOSSafeAreaProps> = ({
  children,
  className,
  top = true,
  bottom = true,
  left = true,
  right = true
}) => {
  if (!isIOS()) {
    return <div className={className}>{children}</div>;
  }

  const safeAreaClasses = cn(
    top && 'pt-[env(safe-area-inset-top)]',
    bottom && 'pb-[env(safe-area-inset-bottom)]',
    left && 'pl-[env(safe-area-inset-left)]',
    right && 'pr-[env(safe-area-inset-right)]',
    className
  );

  return (
    <div className={safeAreaClasses}>
      {children}
    </div>
  );
};

// Компонент для хедера с safe area
export const IOSHeader: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <IOSSafeArea
    top={true}
    bottom={false}
    left={false}
    right={false}
    className={cn('bg-background border-b', className)}
  >
    <div className="px-4 py-3">
      {children}
    </div>
  </IOSSafeArea>
);

// Компонент для футера с safe area
export const IOSFooter: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <IOSSafeArea
    top={false}
    bottom={true}
    left={false}
    right={false}
    className={cn('bg-background border-t', className)}
  >
    <div className="px-4 py-3">
      {children}
    </div>
  </IOSSafeArea>
);