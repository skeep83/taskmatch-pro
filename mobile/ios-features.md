# 📱 iOS специфичные функции ServiceHub

## Нативные возможности

### 🔔 Push уведомления

**Настройка:**
```typescript
// src/utils/iosNotifications.ts
import { PushNotifications } from '@capacitor/push-notifications';

export const setupIOSNotifications = async () => {
  // Запрос разрешений
  const result = await PushNotifications.requestPermissions();
  
  if (result.receive === 'granted') {
    // Регистрация для push уведомлений
    await PushNotifications.register();
  }
  
  // Обработка получения токена
  PushNotifications.addListener('registration', (token) => {
    console.log('Push registration success, token: ' + token.value);
    // Отправить токен на сервер
  });
  
  // Обработка получения уведомления
  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('Push received: ', notification);
    // Показать локальное уведомление
  });
};
```

### 📸 Камера и галерея

**Для портфолио и KYC:**
```typescript
// src/utils/iosCamera.ts
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

export const takePicture = async () => {
  const image = await Camera.getPhoto({
    quality: 90,
    allowEditing: true,
    resultType: CameraResultType.Uri,
    source: CameraSource.Camera
  });
  
  return image.webPath;
};

export const selectFromGallery = async () => {
  const image = await Camera.getPhoto({
    quality: 90,
    allowEditing: true,
    resultType: CameraResultType.Uri,
    source: CameraSource.Photos
  });
  
  return image.webPath;
};
```

### 🗺 Геолокация

**Для поиска специалистов:**
```typescript
// src/utils/iosLocation.ts
import { Geolocation } from '@capacitor/geolocation';

export const getCurrentPosition = async () => {
  const coordinates = await Geolocation.getCurrentPosition();
  
  return {
    latitude: coordinates.coords.latitude,
    longitude: coordinates.coords.longitude,
    accuracy: coordinates.coords.accuracy
  };
};

export const watchPosition = (callback: (position: any) => void) => {
  return Geolocation.watchPosition({
    enableHighAccuracy: true,
    timeout: 10000
  }, callback);
};
```

### 💾 Локальное хранилище

**Для кэширования данных:**
```typescript
// src/utils/iosStorage.ts
import { Storage } from '@capacitor/storage';

export const setData = async (key: string, value: any) => {
  await Storage.set({
    key,
    value: JSON.stringify(value)
  });
};

export const getData = async (key: string) => {
  const { value } = await Storage.get({ key });
  return value ? JSON.parse(value) : null;
};
```

## UI/UX оптимизации для iOS

### 🎨 Safe Area

**Учет вырезов и панелей:**
```css
/* src/styles/ios.css */
.ios-safe-area {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}

.ios-header {
  padding-top: max(1rem, env(safe-area-inset-top));
}

.ios-footer {
  padding-bottom: max(1rem, env(safe-area-inset-bottom));
}
```

### 📱 Haptic Feedback

**Тактильная обратная связь:**
```typescript
// src/utils/iosHaptics.ts
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export const lightHaptic = () => {
  Haptics.impact({ style: ImpactStyle.Light });
};

export const mediumHaptic = () => {
  Haptics.impact({ style: ImpactStyle.Medium });
};

export const heavyHaptic = () => {
  Haptics.impact({ style: ImpactStyle.Heavy });
};

// Использование в компонентах
const handleJobAccept = () => {
  mediumHaptic(); // Тактильный отклик
  acceptJob();
};
```

### 🔄 Pull to Refresh

**Обновление списков:**
```typescript
// src/components/ios/PullToRefresh.tsx
import { useIonViewWillEnter } from '@ionic/react';

export const JobsList = () => {
  const [refreshing, setRefreshing] = useState(false);
  
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadJobs();
    setRefreshing(false);
    lightHaptic();
  };
  
  return (
    <div className="ios-pull-refresh">
      {/* Pull to refresh logic */}
    </div>
  );
};
```

## Производительность

### ⚡ Lazy Loading

**Оптимизация загрузки:**
```typescript
// src/components/ios/LazyImage.tsx
import { useState, useRef, useEffect } from 'react';

export const LazyImage = ({ src, alt, className }: any) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && imgRef.current) {
          imgRef.current.src = src;
          setIsLoaded(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    
    if (imgRef.current) {
      observer.observe(imgRef.current);
    }
    
    return () => observer.disconnect();
  }, [src]);
  
  return (
    <img
      ref={imgRef}
      alt={alt}
      className={className}
      style={{ opacity: isLoaded ? 1 : 0.5 }}
    />
  );
};
```

### 🎯 Memory Management

**Управление памятью:**
```typescript
// src/utils/iosMemory.ts
export const cleanupImages = () => {
  // Очистка кэша изображений
  const images = document.querySelectorAll('img');
  images.forEach(img => {
    if (!img.src.startsWith('data:')) {
      img.removeAttribute('src');
    }
  });
};

// Вызов при переходе между страницами
export const useMemoryCleanup = () => {
  useEffect(() => {
    return () => {
      cleanupImages();
    };
  }, []);
};
```

## Интеграции

### 💳 Apple Pay

**Для платежей (если нужно):**
```typescript
// src/utils/applePay.ts
export const setupApplePay = async () => {
  // Проверка поддержки Apple Pay
  if (window.ApplePaySession && ApplePaySession.canMakePayments()) {
    return true;
  }
  return false;
};
```

### 🔐 Face ID / Touch ID

**Биометрическая аутентификация:**
```typescript
// src/utils/biometrics.ts
import { BiometricAuth } from '@capacitor-community/biometric-auth';

export const authenticateWithBiometrics = async () => {
  try {
    const result = await BiometricAuth.checkBiometry();
    
    if (result.isAvailable) {
      const authResult = await BiometricAuth.authenticate({
        reason: 'Войти в ServiceHub',
        title: 'Биометрическая аутентификация',
        subtitle: 'Используйте отпечаток пальца или Face ID'
      });
      
      return authResult.succeeded;
    }
  } catch (error) {
    console.error('Biometric auth error:', error);
    return false;
  }
};
```

## Тестирование

### 🧪 iOS специфичные тесты

**Проверка функций:**
```bash
# Тест камеры
npx cap run ios --target="iPhone 15 Pro"

# Тест геолокации (требует физическое устройство)
npx cap run ios --target="device"

# Тест уведомлений
# Настроить в Xcode -> Capabilities -> Push Notifications
```

### 📊 Performance Testing

**Мониторинг производительности:**
```typescript
// src/utils/iosPerformance.ts
export const measurePerformance = (name: string, fn: () => void) => {
  const start = performance.now();
  fn();
  const end = performance.now();
  console.log(`${name} took ${end - start} milliseconds`);
};

// Использование
measurePerformance('Job loading', () => {
  loadJobs();
});
```

## Конфигурация для производства

### 🏗 Build настройки

**Оптимизация для App Store:**
```json
// capacitor.config.ts - production
{
  "server": {
    // Убрать для production
    // "url": "https://...",
  },
  "plugins": {
    "SplashScreen": {
      "launchShowDuration": 1000,
      "backgroundColor": "#1a1f2e",
      "showSpinner": false
    }
  }
}
```

### 📱 App Store оптимизация

**Размер приложения:**
- Включить App Thinning
- Оптимизировать изображения
- Удалить неиспользуемые библиотеки

**Метаданные:**
- Keywords: "услуги", "мастер", "ремонт", "Moldova"
- Category: Business
- Age Rating: 4+

Это полный набор iOS функций для ServiceHub! 🍎