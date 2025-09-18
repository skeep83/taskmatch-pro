import { useCallback } from "react";

type HapticType = 'light' | 'medium' | 'heavy' | 'selection' | 'error' | 'success' | 'warning';

export const useHapticFeedback = () => {
  const triggerHaptic = useCallback((type: HapticType = 'light') => {
    // Проверяем поддержку Haptic Feedback API
    if ('navigator' in window && 'vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30],
        selection: [5],
        error: [50, 50, 50],
        success: [10, 10, 10],
        warning: [30, 10, 30]
      };

      navigator.vibrate(patterns[type]);
    }

    // Для iOS устройств с Capacitor
    if ('Haptics' in window) {
      const hapticTypes = {
        light: 'LIGHT',
        medium: 'MEDIUM', 
        heavy: 'HEAVY',
        selection: 'SELECTION',
        error: 'ERROR',
        success: 'SUCCESS',
        warning: 'WARNING'
      };

      try {
        // @ts-ignore
        window.Haptics?.impact({ style: hapticTypes[type] });
      } catch (error) {
        console.log('Haptic feedback not available');
      }
    }
  }, []);

  return { triggerHaptic };
};