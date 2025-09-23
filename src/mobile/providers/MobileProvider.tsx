import { default as React, createContext, useContext, useEffect, useState } from 'react';
import { useDeviceDetection, DeviceInfo } from '@/hooks/useDeviceDetection';

interface MobileContextType extends DeviceInfo {
  bottomNavHeight: number;
  safeAreaInsets: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  isKeyboardOpen: boolean;
  viewportHeight: number;
}

const MobileContext = createContext<MobileContextType | undefined>(undefined);

export function useMobile() {
  const context = useContext(MobileContext);
  if (!context) {
    throw new Error('useMobile must be used within MobileProvider');
  }
  return context;
}

interface MobileProviderProps {
  children: React.ReactNode;
}

export function MobileProvider({ children }: MobileProviderProps) {
  const deviceInfo = useDeviceDetection();
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);

  useEffect(() => {
    const handleResize = () => {
      const currentHeight = window.innerHeight;
      setViewportHeight(currentHeight);
      
      // Detect keyboard open on mobile (significant height reduction)
      if (deviceInfo.isMobile) {
        const heightDiff = deviceInfo.screenHeight - currentHeight;
        setIsKeyboardOpen(heightDiff > 150);
      }
    };

    const handleVisualViewportChange = () => {
      if (window.visualViewport) {
        setViewportHeight(window.visualViewport.height);
        const heightDiff = deviceInfo.screenHeight - window.visualViewport.height;
        setIsKeyboardOpen(heightDiff > 150);
      }
    };

    window.addEventListener('resize', handleResize);
    
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVisualViewportChange);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleVisualViewportChange);
      }
    };
  }, [deviceInfo.isMobile, deviceInfo.screenHeight]);

  const contextValue: MobileContextType = {
    ...deviceInfo,
    bottomNavHeight: 60, // Уменьшенная высота
    safeAreaInsets: {
      top: deviceInfo.isIOS ? 44 : 24,
      bottom: deviceInfo.isIOS ? 34 : 0,
      left: 0,
      right: 0,
    },
    isKeyboardOpen,
    viewportHeight,
  };

  return (
    <MobileContext.Provider value={contextValue}>
      {children}
    </MobileContext.Provider>
  );
}