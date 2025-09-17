# Развертывание Android приложения ServiceHub

## Подготовка к публикации в Google Play

### 1. Настройка Google Play Console

1. Зарегистрируйтесь в [Google Play Console](https://play.google.com/console)
2. Создайте новое приложение
3. Настройте метаданные приложения

### 2. Подписание APK

1. Создайте keystore файл:
```bash
keytool -genkey -v -keystore servicehub-release.keystore -alias servicehub -keyalg RSA -keysize 2048 -validity 10000
```

2. Настройте подписание в `android/app/build.gradle`

### 3. Иконки и ресурсы

Создайте иконки в `mobile/assets/icons/android/`:
- mipmap-hdpi (72x72)
- mipmap-mdpi (48x48)
- mipmap-xhdpi (96x96)
- mipmap-xxhdpi (144x144)
- mipmap-xxxhdpi (192x192)

### 4. Сборка production APK

```bash
# Соберите веб-версию
npm run build

# Синхронизируйте с Android
npx cap sync android

# Откройте в Android Studio
npx cap open android

# В Android Studio:
# Build → Generate Signed Bundle/APK
```

### 5. Метаданные Google Play

Подготовьте:
- Название: "ServiceHub"
- Краткое описание (80 символов)
- Полное описание
- Скриншоты для телефонов и планшетов
- Feature Graphic (1024x500)
- Категория: Business

### 6. Требования Android

Минимальные требования:
- Android API 24+ (Android 7.0)
- Оптимизация для Android 14+
- Поддержка 64-bit архитектуры

### 7. Разрешения

Приложение использует следующие разрешения:
- INTERNET (для API запросов)
- ACCESS_NETWORK_STATE (проверка соединения)
- CAMERA (загрузка фото)
- READ_EXTERNAL_STORAGE (выбор файлов)
- WRITE_EXTERNAL_STORAGE (сохранение файлов)

### 8. Тестирование

- Используйте Internal Testing в Google Play Console
- Протестируйте на различных устройствах Android
- Проверьте производительность и совместимость

### 9. Политики Google Play

Убедитесь в соответствии:
- [Google Play Developer Policy](https://play.google.com/about/developer-content-policy/)
- Политикам конфиденциальности
- Требованиям по безопасности данных

### 10. Постепенный релиз

Рекомендуется:
1. Начать с 1% пользователей
2. Постепенно увеличивать до 100%
3. Мониторить отзывы и краши