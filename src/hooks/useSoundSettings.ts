import { useState, useEffect } from 'react';

interface SoundSettings {
  enabled: boolean;
  volume: number;
  messageSound: boolean;
  jobSound: boolean;
  paymentSound: boolean;
  systemSound: boolean;
}

const defaultSettings: SoundSettings = {
  enabled: true,
  volume: 0.5,
  messageSound: true,
  jobSound: true,
  paymentSound: true,
  systemSound: true,
};

export const useSoundSettings = () => {
  const [settings, setSettings] = useState<SoundSettings>(defaultSettings);

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('notification-sound-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...defaultSettings, ...parsed });
      } catch (error) {
        console.warn('Failed to parse sound settings:', error);
      }
    }
  }, []);

  const updateSettings = (newSettings: Partial<SoundSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem('notification-sound-settings', JSON.stringify(updated));
  };

  const shouldPlaySound = (type: string): boolean => {
    if (!settings.enabled) return false;
    
    switch (type) {
      case 'message':
        return settings.messageSound;
      case 'job_match':
      case 'job_update':
      case 'price_proposal':
      case 'job_application':
        return settings.jobSound;
      case 'payment':
        return settings.paymentSound;
      case 'system':
      case 'rating':
        return settings.systemSound;
      default:
        return true;
    }
  };

  return {
    settings,
    updateSettings,
    shouldPlaySound,
  };
};