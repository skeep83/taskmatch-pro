import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { PushNotifications } from '@capacitor/push-notifications';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

// Проверка платформы iOS
export const isIOS = () => Capacitor.getPlatform() === 'ios';

// Настройка статус бара для iOS
export const setupIOSStatusBar = async () => {
  if (!isIOS()) return;
  
  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#1a1f2e' });
  } catch (error) {
    console.log('StatusBar not available:', error);
  }
};

// Камера для iOS
export const iosCamera = {
  async takePicture() {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        width: 1024,
        height: 1024
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
        height: 1024
      });
      
      return image.webPath;
    } catch (error) {
      console.error('Gallery error:', error);
      throw new Error('Ошибка доступа к галерее');
    }
  }
};

// Геолокация для iOS
export const iosLocation = {
  async getCurrentPosition() {
    try {
      const coordinates = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000
      });
      
      return {
        latitude: coordinates.coords.latitude,
        longitude: coordinates.coords.longitude,
        accuracy: coordinates.coords.accuracy
      };
    } catch (error) {
      console.error('Geolocation error:', error);
      throw new Error('Ошибка получения местоположения');
    }
  },

  watchPosition(callback: (position: any) => void) {
    return Geolocation.watchPosition({
      enableHighAccuracy: true,
      timeout: 10000
    }, callback);
  }
};

// Тактильная обратная связь
export const iosHaptics = {
  light: () => {
    if (isIOS()) {
      Haptics.impact({ style: ImpactStyle.Light });
    }
  },
  
  medium: () => {
    if (isIOS()) {
      Haptics.impact({ style: ImpactStyle.Medium });
    }
  },
  
  heavy: () => {
    if (isIOS()) {
      Haptics.impact({ style: ImpactStyle.Heavy });
    }
  }
};

// Push уведомления для iOS
export const iosNotifications = {
  async setup() {
    if (!isIOS()) return;
    
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
      
      // Обработка получения уведомления
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Push received: ', notification);
        // Показать локальное уведомление или обновить UI
      });
      
      // Обработка нажатия на уведомление
      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('Push action performed: ', notification);
        // Навигация к соответствующему экрану
      });
      
    } catch (error) {
      console.error('Push notifications setup error:', error);
    }
  }
};

// Утилиты для iOS разработки
export const iosUtils = {
  // Проверка доступности нативных функций
  async checkCapabilities() {
    const capabilities = {
      camera: false,
      geolocation: false,
      notifications: false,
      haptics: false
    };
    
    if (!isIOS()) return capabilities;
    
    try {
      // Проверяем камеру
      await Camera.checkPermissions();
      capabilities.camera = true;
    } catch {}
    
    try {
      // Проверяем геолокацию
      await Geolocation.checkPermissions();
      capabilities.geolocation = true;
    } catch {}
    
    try {
      // Проверяем уведомления
      await PushNotifications.checkPermissions();
      capabilities.notifications = true;
    } catch {}
    
    capabilities.haptics = true; // Haptics всегда доступны на iOS
    
    return capabilities;
  },
  
  // Безопасный вызов iOS функций
  async safeCall<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
    if (!isIOS()) return fallback;
    
    try {
      return await fn();
    } catch (error) {
      console.warn('iOS function failed, using fallback:', error);
      return fallback;
    }
  }
};

// Хук для iOS функций
export const useIOSFeatures = () => {
  const takePicture = () => iosCamera.takePicture();
  const selectFromGallery = () => iosCamera.selectFromGallery();
  const getCurrentLocation = () => iosLocation.getCurrentPosition();
  const hapticFeedback = iosHaptics;
  
  return {
    takePicture,
    selectFromGallery,
    getCurrentLocation,
    hapticFeedback,
    isIOS: isIOS()
  };
};