import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { PushNotifications } from '@capacitor/push-notifications';
import { StatusBar, Style } from '@capacitor/status-bar';

// Проверка платформы Android
export const isAndroid = () => Capacitor.getPlatform() === 'android';

// Настройка статус бара для Android
export const setupAndroidStatusBar = async () => {
  if (!isAndroid()) return;
  
  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#1a1f2e' });
    await StatusBar.setOverlaysWebView({ overlay: false });
  } catch (error) {
    console.log('StatusBar not available:', error);
  }
};

// Камера для Android
export const androidCamera = {
  async takePicture() {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        width: 1024,
        height: 1024,
        correctOrientation: true // Важно для Android
      });
      
      return image.webPath;
    } catch (error) {
      console.error('Camera error:', error);
      throw new Error('Ошибка доступа к камере');
    }
  },

  async selectFromGallery() {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.Uri,
        source: CameraSource.Photos,
        width: 1024,
        height: 1024,
        correctOrientation: true
      });
      
      return image.webPath;
    } catch (error) {
      console.error('Gallery error:', error);
      throw new Error('Ошибка доступа к галерее');
    }
  },

  async checkPermissions() {
    try {
      const permissions = await Camera.checkPermissions();
      return permissions;
    } catch (error) {
      console.error('Permission check error:', error);
      return { camera: 'denied', photos: 'denied' };
    }
  },

  async requestPermissions() {
    try {
      const permissions = await Camera.requestPermissions({
        permissions: ['camera', 'photos']
      });
      return permissions;
    } catch (error) {
      console.error('Permission request error:', error);
      return { camera: 'denied', photos: 'denied' };
    }
  }
};

// Геолокация для Android
export const androidLocation = {
  async getCurrentPosition() {
    try {
      const coordinates = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000, // Больше timeout для Android
        maximumAge: 30000
      });
      
      return {
        latitude: coordinates.coords.latitude,
        longitude: coordinates.coords.longitude,
        accuracy: coordinates.coords.accuracy,
        altitude: coordinates.coords.altitude,
        speed: coordinates.coords.speed
      };
    } catch (error) {
      console.error('Geolocation error:', error);
      throw new Error('Ошибка получения местоположения');
    }
  },

  async checkPermissions() {
    try {
      const permissions = await Geolocation.checkPermissions();
      return permissions;
    } catch (error) {
      console.error('Location permission check error:', error);
      return { location: 'denied', coarseLocation: 'denied' };
    }
  },

  async requestPermissions() {
    try {
      const permissions = await Geolocation.requestPermissions();
      return permissions;
    } catch (error) {
      console.error('Location permission request error:', error);
      return { location: 'denied', coarseLocation: 'denied' };
    }
  },

  watchPosition(callback: (position: any) => void) {
    return Geolocation.watchPosition({
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 30000
    }, callback);
  }
};

// Тактильная обратная связь для Android
export const androidHaptics = {
  light: () => {
    if (isAndroid()) {
      Haptics.impact({ style: ImpactStyle.Light });
    }
  },
  
  medium: () => {
    if (isAndroid()) {
      Haptics.impact({ style: ImpactStyle.Medium });
    }
  },
  
  heavy: () => {
    if (isAndroid()) {
      Haptics.impact({ style: ImpactStyle.Heavy });
    }
  },

  // Android-специфичные виды вибрации
  notification: () => {
    if (isAndroid()) {
      try {
        Haptics.impact({ style: ImpactStyle.Medium });
      } catch (error) {
        console.log('Notification haptic not available');
      }
    }
  },

  error: () => {
    if (isAndroid()) {
      try {
        Haptics.impact({ style: ImpactStyle.Heavy });
      } catch (error) {
        console.log('Error haptic not available');
      }
    }
  }
};

// Push уведомления для Android
export const androidNotifications = {
  async setup() {
    if (!isAndroid()) return;
    
    try {
      // Запрос разрешений
      const result = await PushNotifications.requestPermissions();
      
      if (result.receive === 'granted') {
        await PushNotifications.register();
      }
      
      // Обработка регистрации
      PushNotifications.addListener('registration', (token) => {
        console.log('Push registration success, token: ' + token.value);
        // TODO: Отправить токен на сервер
      });
      
      // Обработка ошибок регистрации
      PushNotifications.addListener('registrationError', (error) => {
        console.error('Error on registration: ' + JSON.stringify(error));
      });
      
      // Обработка получения уведомления (когда приложение открыто)
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Push received: ', notification);
        androidHaptics.notification();
      });
      
      // Обработка нажатия на уведомление
      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('Push action performed: ', notification);
        // Навигация к соответствующему экрану
      });
      
    } catch (error) {
      console.error('Push notifications setup error:', error);
    }
  },

  async checkPermissions() {
    try {
      const permissions = await PushNotifications.checkPermissions();
      return permissions;
    } catch (error) {
      console.error('Push permission check error:', error);
      return { receive: 'denied' };
    }
  }
};

// Android системная интеграция
export const androidSystem = {
  // Проверка версии Android
  async getAndroidVersion() {
    if (!isAndroid()) return null;
    
    try {
      return {
        platform: 'android',
        userAgent: navigator.userAgent,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height
      };
    } catch (error) {
      console.error('System info error:', error);
      return null;
    }
  },

  // Проверка состояния батареи (если нужно)
  async getBatteryInfo() {
    if (!isAndroid()) return null;
    
    try {
      // Используем Battery API если доступен
      if ('getBattery' in navigator) {
        const battery = await (navigator as any).getBattery();
        return {
          level: battery.level,
          charging: battery.charging
        };
      }
      return null;
    } catch (error) {
      console.error('Battery info error:', error);
      return null;
    }
  },

  // Проверка подключения к интернету
  async getNetworkStatus() {
    if (!isAndroid()) return { connected: true, type: 'unknown' };
    
    try {
      return {
        connected: navigator.onLine,
        type: (navigator as any).connection?.effectiveType || 'unknown',
        downlink: (navigator as any).connection?.downlink || 0
      };
    } catch (error) {
      console.error('Network status error:', error);
      return { connected: true, type: 'unknown' };
    }
  }
};

// Утилиты для Android разработки
export const androidUtils = {
  // Проверка доступности нативных функций
  async checkCapabilities() {
    const capabilities = {
      camera: false,
      geolocation: false,
      notifications: false,
      haptics: false,
      statusBar: false
    };
    
    if (!isAndroid()) return capabilities;
    
    try {
      // Проверяем камеру
      const cameraPerms = await androidCamera.checkPermissions();
      capabilities.camera = cameraPerms.camera !== 'denied';
    } catch {}
    
    try {
      // Проверяем геолокацию
      const locationPerms = await androidLocation.checkPermissions();
      capabilities.geolocation = locationPerms.location !== 'denied';
    } catch {}
    
    try {
      // Проверяем уведомления
      const notificationPerms = await androidNotifications.checkPermissions();
      capabilities.notifications = notificationPerms.receive !== 'denied';
    } catch {}
    
    capabilities.haptics = true; // Haptics почти всегда доступны на Android
    capabilities.statusBar = true; // StatusBar API доступен
    
    return capabilities;
  },
  
  // Безопасный вызов Android функций
  async safeCall<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
    if (!isAndroid()) return fallback;
    
    try {
      return await fn();
    } catch (error) {
      console.warn('Android function failed, using fallback:', error);
      return fallback;
    }
  },

  // Проверка Material Design поддержки
  supportsMaterialDesign() {
    if (!isAndroid()) return false;
    
    // Material Design доступен с Android 5.0 (API 21)
    try {
      const userAgent = navigator.userAgent;
      const match = userAgent.match(/Android (\d+)/);
      if (match) {
        const version = parseInt(match[1]);
        return version >= 5;
      }
      return false;
    } catch {
      return false;
    }
  },

  // Определение размера экрана для адаптации UI
  getScreenInfo() {
    return {
      width: window.screen.width,
      height: window.screen.height,
      pixelRatio: window.devicePixelRatio,
      orientation: window.screen.orientation?.type || 'unknown',
      isTablet: Math.min(window.screen.width, window.screen.height) >= 600
    };
  }
};

// Хук для Android функций
export const useAndroidFeatures = () => {
  const takePicture = () => androidCamera.takePicture();
  const selectFromGallery = () => androidCamera.selectFromGallery();
  const getCurrentLocation = () => androidLocation.getCurrentPosition();
  const hapticFeedback = androidHaptics;
  const systemInfo = androidSystem;
  
  return {
    takePicture,
    selectFromGallery,
    getCurrentLocation,
    hapticFeedback,
    systemInfo,
    isAndroid: isAndroid(),
    requestCameraPermissions: androidCamera.requestPermissions,
    requestLocationPermissions: androidLocation.requestPermissions,
    checkCapabilities: androidUtils.checkCapabilities
  };
};