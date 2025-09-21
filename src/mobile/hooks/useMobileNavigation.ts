import { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMobile } from '../providers/MobileProvider';

interface NavigationOptions {
  replace?: boolean;
  state?: any;
}

export function useMobileNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile } = useMobile();

  const navigateWithTransition = useCallback((
    to: string, 
    options: NavigationOptions = {}
  ) => {
    if (isMobile) {
      // Add mobile-specific transition handling
      document.body.classList.add('transitioning');
      
      setTimeout(() => {
        navigate(to, options);
        document.body.classList.remove('transitioning');
      }, 100);
    } else {
      navigate(to, options);
    }
  }, [navigate, isMobile]);

  const goBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  }, [navigate]);

  const isCurrentPath = useCallback((path: string) => {
    return location.pathname === path;
  }, [location.pathname]);

  const isParentPath = useCallback((path: string) => {
    return location.pathname.startsWith(path);
  }, [location.pathname]);

  return {
    navigate: navigateWithTransition,
    goBack,
    isCurrentPath,
    isParentPath,
    currentPath: location.pathname,
    location
  };
}