import { useState, useEffect } from 'react';

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  screenWidth: number;
  screenHeight: number;
  orientation: 'portrait' | 'landscape';
  hasTouch: boolean;
}

const MOBILE_BREAKPOINT = 1024; // Увеличили для планшетов
const TABLET_BREAKPOINT = 1024;

export function useDeviceDetection(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(() => {
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isIOS: false,
        isAndroid: false,
        screenWidth: 1920,
        screenHeight: 1080,
        orientation: 'landscape',
        hasTouch: false,
      };
    }

    const userAgent = navigator.userAgent.toLowerCase();
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    return {
      isMobile: width < MOBILE_BREAKPOINT,
      isTablet: width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT,
      isDesktop: width >= TABLET_BREAKPOINT,
      isIOS: /iphone|ipad|ipod/.test(userAgent),
      isAndroid: /android/.test(userAgent),
      screenWidth: width,
      screenHeight: height,
      orientation: width > height ? 'landscape' : 'portrait',
      hasTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    };
  });

  useEffect(() => {
    const updateDeviceInfo = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setDeviceInfo({
        isMobile: width < MOBILE_BREAKPOINT,
        isTablet: width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT,
        isDesktop: width >= TABLET_BREAKPOINT,
        isIOS: /iphone|ipad|ipod/.test(userAgent),
        isAndroid: /android/.test(userAgent),
        screenWidth: width,
        screenHeight: height,
        orientation: width > height ? 'landscape' : 'portrait',
        hasTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      });
    };

    window.addEventListener('resize', updateDeviceInfo);
    window.addEventListener('orientationchange', updateDeviceInfo);

    return () => {
      window.removeEventListener('resize', updateDeviceInfo);
      window.removeEventListener('orientationchange', updateDeviceInfo);
    };
  }, []);

  return deviceInfo;
}