# ServiceHub Mobile App

Мобильное приложение ServiceHub для iOS и Android, созданное с помощью Capacitor.

## Установка и запуск

### Первоначальная настройка

1. Склонируйте проект из GitHub:
```bash
git clone [your-repo-url]
cd servicehub
npm install
```

2. Добавьте iOS платформу:
```bash
npx cap add ios
```

3. Добавьте Android платформу (опционально):
```bash
npx cap add android
```

### Разработка

1. Соберите веб-версию:
```bash
npm run build
```

2. Синхронизируйте с нативными платформами:
```bash
npx cap sync
```

3. Запустите на iOS:
```bash
npx cap run ios
```

4. Запустите на Android:
```bash
npx cap run android
```

### Требования

#### Для iOS разработки:
- macOS
- Xcode (последняя версия)
- iOS Simulator или физическое устройство

#### Для Android разработки:
- Android Studio
- Android SDK
- Android эмулятор или физическое устройство

### Структура проекта

```
mobile/
├── README.md              # Документация мобильного приложения
├── ios-deployment.md      # Инструкции по деплою в App Store
├── android-deployment.md  # Инструкции по деплою в Google Play
└── assets/               # Ресурсы для мобильного приложения
    ├── icons/            # Иконки приложения
    ├── splash/           # Экраны загрузки
    └── screenshots/      # Скриншоты для сторов
```

### Полезные команды

```bash
# Обновить нативные платформы
npx cap update ios
npx cap update android

# Открыть проект в IDE
npx cap open ios
npx cap open android

# Синхронизация после изменений в коде
npx cap sync

# Копирование веб-ресурсов
npx cap copy
```

### Настройка hot-reload

Приложение настроено для hot-reload с URL sandbox'а Lovable. При разработке на физическом устройстве изменения будут автоматически отображаться без пересборки.

### Следующие шаги

1. Настройте иконки и splash screen в соответствующих папках
2. Протестируйте все функции на реальном устройстве
3. Настройте код signing для iOS
4. Подготовьте метаданные для App Store и Google Play