import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.6e55eb01313b440fa7fe90daae1051fc',
  appName: 'ServiceHub',
  webDir: 'dist',
  server: {
    url: 'https://6e55eb01-313b-440f-a7fe-90daae1051fc.lovableproject.com?forceHideBadge=true',
    cleartext: true,
    allowNavigation: [
      'https://6e55eb01-313b-440f-a7fe-90daae1051fc.lovableproject.com'
    ]
  },
  ios: {
    allowsLinkPreview: false,
    contentInset: 'automatic',
    scrollEnabled: true,
    webSecurity: false
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1a1f2e',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#1a1f2e'
    },
    Keyboard: {
      resize: 'body'
    }
  }
};

export default config;