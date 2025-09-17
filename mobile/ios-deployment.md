# Развертывание iOS приложения ServiceHub

## Подготовка к публикации в App Store

### 1. Настройка Apple Developer Account

1. Зарегистрируйтесь в [Apple Developer Program](https://developer.apple.com/programs/)
2. Создайте App ID в Apple Developer Console
3. Настройте провизионные профили

### 2. Настройка проекта в Xcode

1. Откройте проект iOS:
```bash
npx cap open ios
```

2. В Xcode настройте:
   - Bundle Identifier: `app.lovable.6e55eb01313b440fa7fe-90daae1051fc`
   - Team (ваша команда разработчика)
   - Signing Certificate

### 3. Иконки приложения

Создайте иконки в следующих размерах и поместите в `mobile/assets/icons/`:

- 1024x1024 (App Store)
- 180x180 (iPhone)
- 167x167 (iPad Pro)
- 152x152 (iPad)
- 120x120 (iPhone)
- 87x87 (iPhone)
- 80x80 (iPad)
- 76x76 (iPad)
- 60x60 (iPhone)
- 58x58 (iPhone/iPad)
- 40x40 (iPhone/iPad)
- 29x29 (iPhone/iPad)
- 20x20 (iPhone/iPad)

### 4. Splash Screen

Создайте splash screen изображения в `mobile/assets/splash/`:
- Различные размеры для iPhone и iPad
- Поддержка темной и светлой темы

### 5. Метаданные App Store

Подготовьте:
- Название приложения: "ServiceHub"
- Описание на русском и румынском языках
- Ключевые слова
- Скриншоты для различных устройств
- Категория: Business или Productivity

### 6. Сборка для App Store

1. Выберите схему "App Store" в Xcode
2. Архивируйте приложение (Product → Archive)
3. Загрузите в App Store Connect через Organizer

### 7. Тестирование

- Используйте TestFlight для бета-тестирования
- Протестируйте на различных устройствах iOS
- Проверьте все функции платформы

### 8. Отправка на ревью

1. Заполните метаданные в App Store Connect
2. Загрузите скриншоты
3. Настройте цены и доступность
4. Отправьте на ревью Apple

### Требования iOS 18+

Приложение оптимизировано для iOS 18 и включает:
- Поддержку новых API iOS 18
- Адаптивный дизайн для всех устройств
- Поддержку темной темы
- Оптимизацию производительности

### Политики App Store

Убедитесь, что приложение соответствует:
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- Требованиям по конфиденциальности
- Политикам по платежам (если используются встроенные покупки)