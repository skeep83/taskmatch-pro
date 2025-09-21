import React, { Suspense, lazy } from 'react';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';

interface ResponsiveComponentProps {
  mobile: () => Promise<{ default: React.ComponentType<any> }>;
  desktop: () => Promise<{ default: React.ComponentType<any> }>;
  tablet?: () => Promise<{ default: React.ComponentType<any> }>;
  fallback?: React.ReactNode;
  [key: string]: any;
}

export function ResponsiveComponent({
  mobile,
  desktop,
  tablet,
  fallback = <div className="flex items-center justify-center p-4">Загрузка...</div>,
  ...props
}: ResponsiveComponentProps) {
  const { isMobile, isTablet } = useDeviceDetection();
  
  const Component = React.useMemo(() => {
    if (isMobile) {
      return lazy(mobile);
    }
    if (isTablet && tablet) {
      return lazy(tablet);
    }
    if (isTablet && !tablet) {
      return lazy(mobile); // Use mobile for tablets if no specific tablet version
    }
    return lazy(desktop);
  }, [isMobile, isTablet, mobile, desktop, tablet]);

  return (
    <Suspense fallback={fallback}>
      <Component {...props} />
    </Suspense>
  );
}

// HOC for creating responsive components
export function createResponsiveComponent<T = any>(components: {
  mobile: () => Promise<{ default: React.ComponentType<T> }>;
  desktop: () => Promise<{ default: React.ComponentType<T> }>;
  tablet?: () => Promise<{ default: React.ComponentType<T> }>;
}) {
  return function ResponsiveWrapper(props: T) {
    return <ResponsiveComponent {...components} {...props} />;
  };
}